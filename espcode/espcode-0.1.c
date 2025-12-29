#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>

const char* ssid="Sorry";
const char* password="aaaaaaaa";
const char* wsHost="zenova-server.onrender.com";
const int wsPort=443;
const char* wsPath="/";
const char* apiKey="m4Z8&XqW!T2^P7Y@V9b$N1K5g*J3RC6xQz&pM^v!Gt$yXnBwK8T";

const int relayLight = D1;
const int relayFan   = D2;
const int relayPump  = D3;
const int switchLight= D5;
const int switchFan  = D6;
const int switchPump = D7;
const int statusLed  = D0;

String currentState="024";
bool lastSwitchStates[3]={false,false,false};
bool relayStates[3]={false,false,false};
bool isAuthenticated = false;

WebSocketsClient webSocket;
ESP8266WebServer server(80);

unsigned long lastBlinkTime=0;
bool ledState=false;
int blinkCount=0,targetBlinks=0;
bool isBlinking=false;

unsigned long lastSwitchTime[3] = {0, 0, 0};
const unsigned long debounceDelay = 200;

unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;

void setup(){
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n--- System Starting ---");

  pinMode(relayLight,OUTPUT);
  pinMode(relayFan,OUTPUT);
  pinMode(relayPump,OUTPUT);
  pinMode(switchLight,INPUT_PULLUP);
  pinMode(switchFan,INPUT_PULLUP);
  pinMode(switchPump,INPUT_PULLUP);
  pinMode(statusLed,OUTPUT);

  digitalWrite(relayLight,LOW);
  digitalWrite(relayFan,LOW);
  digitalWrite(relayPump,LOW);
  digitalWrite(statusLed,HIGH);

  lastSwitchStates[0]=digitalRead(switchLight);
  lastSwitchStates[1]=digitalRead(switchFan);
  lastSwitchStates[2]=digitalRead(switchPump);

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  connectWebSocket();
  server.onNotFound(handleSetCmd); 
  server.begin();
  Serial.println("HTTP Server started.");
}

void connectWebSocket() {
  Serial.println("[WS] Initiating SSL Connection...");
  webSocket.beginSSL(wsHost, wsPort, wsPath);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
  isAuthenticated = false;
}

void loop(){
  webSocket.loop();
  server.handleClient();
  handleLedBlinking();
  checkSwitchStates();
  
  if (!webSocket.isConnected() && (millis() - lastReconnectAttempt > reconnectInterval)) {
    Serial.println("[WS] Connection lost/failed. Retrying...");
    lastReconnectAttempt = millis();
    isAuthenticated = false;
  }
}

void startBlinking(int blinks){
  targetBlinks=blinks;blinkCount=0;isBlinking=true;ledState=false;
  digitalWrite(statusLed,HIGH);
  lastBlinkTime=millis();
}

void handleLedBlinking(){
  if(!isBlinking)return;
  if(millis()-lastBlinkTime>=100){
    lastBlinkTime=millis();
    ledState=!ledState;
    digitalWrite(statusLed,ledState?LOW:HIGH);
    blinkCount++;
    if(blinkCount>=targetBlinks*2){
      isBlinking=false;
      digitalWrite(statusLed,HIGH);
    }
  }
}

void checkSwitchStates(){
  unsigned long currentTime = millis();
  bool currentSwitchStates[3];
  currentSwitchStates[0]=digitalRead(switchLight);
  currentSwitchStates[1]=digitalRead(switchFan);
  currentSwitchStates[2]=digitalRead(switchPump);
  
  for(int i=0;i<3;i++){
    if(currentSwitchStates[i]!=lastSwitchStates[i] && 
       (currentTime - lastSwitchTime[i] > debounceDelay)){
      
      Serial.printf("[Switch] Physical switch %d toggled.\n", i);

      relayStates[i]=!relayStates[i];
      updateRelayState(i,relayStates[i]);
      
      String cmd=createCommandFromStates();
      Serial.print("[Switch] New System State: ");
      Serial.println(cmd);
      
      sendCommandViaWebSocket(cmd);
      
      lastSwitchStates[i]=currentSwitchStates[i];
      lastSwitchTime[i] = currentTime;
      startBlinking(2);
    }
  }
}

void updateRelayState(int relayIndex, bool state){
  int pin = (relayIndex == 0) ? relayLight : (relayIndex == 1) ? relayFan : relayPump;
  digitalWrite(pin, state ? LOW : HIGH); 
  Serial.printf("[Relay] Index %d set to %s\n", relayIndex, state ? "ON" : "OFF");
}


String createCommandFromStates(){
  String cmd="";
  cmd+=relayStates[0]?"1":"0";
  cmd+=relayStates[1]?"3":"2";
  cmd+=relayStates[2]?"5":"4";
  return cmd;
}

void applyStateFromCommand(String cmd){
  Serial.print("[Control] Applying command: ");
  Serial.println(cmd);
  
  for(int i=0;i<cmd.length();i++){
    char c=cmd[i];
    if(c=='0'||c=='1'){relayStates[0]=(c=='1');updateRelayState(0,relayStates[0]);}
    else if(c=='2'||c=='3'){relayStates[1]=(c=='3');updateRelayState(1,relayStates[1]);}
    else if(c=='4'||c=='5'){relayStates[2]=(c=='5');updateRelayState(2,relayStates[2]);}
  }
  currentState=createCommandFromStates();
}

void sendCommandViaWebSocket(String cmd) {
  if (webSocket.isConnected() && isAuthenticated) {
    webSocket.sendTXT(cmd);
    Serial.print("[WS] Sent: ");
    Serial.println(cmd);
  } else if (!webSocket.isConnected()) {
    Serial.println("[WS] Not connected. Attempting reconnect...");
    connectWebSocket();
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Event: Disconnected!");
      isAuthenticated = false;
      digitalWrite(statusLed, LOW);
      break;
      
    case WStype_CONNECTED: {
      Serial.println("[WS] Event: Connected!");
      String authMsg = "{\"API_KEY\":\"" + String(apiKey) + "\"}";
      webSocket.sendTXT(authMsg);
      Serial.println("[WS] Auth Packet Sent.");
      break;
    }
      
    case WStype_TEXT: {
      String message = String((char*)payload);
      Serial.print("[WS] Message Recv: ");
      Serial.println(message);
      
      if (message == "authenticated") {
        isAuthenticated = true;
        digitalWrite(statusLed, HIGH);
        startBlinking(3);
        Serial.println("[WS] Authentication Successful.");
      } 
      else if (message == "authentication_failed") {
        isAuthenticated = false;
        Serial.println("[WS] Authentication FAILED.");
      }
      else if (message.length() == 3) {
        bool validCmd = true;
        for (int i = 0; i < 3; i++) {
          if (message[i] < '0' || message[i] > '5') {
            validCmd = false;
            break;
          }
        }
        if (validCmd) {
          applyStateFromCommand(message);
          startBlinking(1);
        } else {
          Serial.println("[WS] Invalid command format received.");
        }
      }
      break;
    }
    
    case WStype_ERROR:
      Serial.println("[WS] Error occurred!");
      isAuthenticated = false;
      break;
      
    case WStype_PONG:
      Serial.println("[WS] Pong received.");
      break;
      
    default:
      break;
  }
}

void handleSetCmd(){
  String path = server.uri();
  Serial.print("[HTTP] Request: ");
  Serial.println(path);
  
  if (path.startsWith("/setcmd/")) {
    String cmd = path.substring(String("/setcmd/").length());
    
    if (cmd.length() >= 1 && cmd.length() <= 3) {
      applyStateFromCommand(cmd);
      
      String fullState = createCommandFromStates();
      sendCommandViaWebSocket(fullState);
      
      DynamicJsonDocument response(256);
      response["message"] = "Command updated and sent via WebSocket";
      response["currentState"] = currentState;
      response["websocketConnected"] = webSocket.isConnected();
      response["authenticated"] = isAuthenticated;
      String jsonResponse;
      serializeJson(response, jsonResponse);
      server.send(200, "application/json", jsonResponse);
      return;
    }
  }
  
  if (path == "/") {
    DynamicJsonDocument status(512);
    status["currentState"] = currentState;
    status["websocketConnected"] = webSocket.isConnected();
    status["authenticated"] = isAuthenticated;
    status["relayStates"][0] = relayStates[0];
    status["relayStates"][1] = relayStates[1];
    status["relayStates"][2] = relayStates[2];
    status["ip"] = WiFi.localIP().toString();
    String jsonResponse;
    serializeJson(status, jsonResponse);
    server.send(200, "application/json", jsonResponse);
    return;
  }
  
  server.send(404, "text/plain", "Not Found");
}