const doc = (cmd)=>{
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Usage Guide</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
      </head>
      <body class="bg-blue-100 text-gray-900 font-sans text-base md:text-lg p-4 md:p-6 transition-colors duration-300">
      
      <div class="max-w-6xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-md transition-colors duration-300">
      <h1 class="text-2xl md:text-3xl font-bold mb-4 text-center">API Usage Guide</h1>
     
      
     
      <div class="mb-6">
  <h2 class="text-xl font-semibold mb-2">Request Command</h2>
  <p>Send a POST request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/request</code> with a message.</p>
  <div class="bg-blue-200 p-4 mt-2 rounded">
    <p><strong>POST</strong> https://zenova-server.onrender.com/request</p>
    <p>Headers: { "Content-Type": "application/json", "Credentials": "include" }</p>
    <p>Body: { "API_KEY": "your_api_key", "message": "User command" } (Min length: 3, Max length: 100)</p>
    <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
      <p>"command_code Eg: 024"</p>
    </div>
    <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
      <p>"Invalid input length"</p>
    </div>
    <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (403):</p>
      <p>"Access Denied"</p>
    </div>
  </div>
</div>
     <div class="mb-6">
  <h2 class="text-xl font-semibold mb-2">Fake PUT Request</h2>
  <p>Send a POST request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/fackPutReq</code> with a message.</p>
  <div class="bg-blue-200 p-4 mt-2 rounded">
    <p><strong>POST</strong> https://zenova-server.onrender.com/fackPutReq</p>
    <p>Headers: { "Content-Type": "application/json" }</p>
    <p>Body: { "API_KEY": "your_api_key", "message": "Your text" } (Min length: 1, Max length: 100)</p>
    <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
      <p>"userInput Updated to \"Your text\""</p>
    </div>
    <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
      <p>"Invalid input length"</p>
    </div>
    <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (403):</p>
      <p>"Access Denied"</p>
    </div>
  </div>
</div>
      <div class="mb-6">
      <h2 class="text-xl font-semibold mb-2">Fake GET Request</h2>
      <p>Send a GET request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/fackGetReq</code>.</p>
      <div class="bg-blue-200 p-4 mt-2 rounded">
      <p><strong>GET</strong>  https://zenova-server.onrender.com/fackGetReq</p>
      <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
      <p>Returns current request message</p>
      </div>
      </div>
      </div>
      
      <div class="mb-6">
      <h2 class="text-xl font-semibold mb-2">Get Commands</h2>
      <p>To retrieve available commands, send a GET request to <code class="bg-blue-200 px-2 py-1 rounded break-words">https://zenova-server.onrender.com/getcmd</code>.</p>
      <div class="bg-blue-200 p-4 mt-2 rounded overflow-x-auto">
      <p><strong>GET</strong> https://zenova-server.onrender.com/getcmd</p>
      <p><strong>Headers:</strong> { "Accept": "application/json" }</p>
      <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
      <p>"${cmd}"</p>
      </div>
      </div>
      </div>

       <h2 class="text-xl font-semibold mb-2">Real-Time Command Updates</h2>
  <p>ESP8266 devices can receive live command updates by connecting to the WebSocket server at <code class="bg-blue-200 px-2 py-1 rounded break-words">wss://zenova-server.onrender.com</code>.</p>
  <div class="bg-blue-200 p-4 mt-2 rounded overflow-x-auto">
    <p><strong>WebSocket URL:</strong> <code>wss://zenova-server.onrender.com</code></p>
    <p><strong>Protocol:</strong> WebSocket (ws/wss)</p>
    <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> ESP8266 WebSocket Example:</p>
<pre class="bg-black p-2 rounded break-words text-white">
// Include WebSocket library
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    if (type == WStype_TEXT) {
        Serial.print("Received Command: ");
        Serial.println((char*)payload);
        // Handle command (e.g., turn on motor)
    }
}

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("Connected to WiFi");

    webSocket.begin("zenova-server.onrender.com", 443, "/"); // Use 443 for wss
    webSocket.onEvent(webSocketEvent);
}

void loop() {
    webSocket.loop();
}
      </pre>
      <p>Upon connection, ESP8266 will receive the latest command and updates automatically.</p>
    </div>
  </div>
</div>


      <div class="mb-6">
      <h2 class="text-xl font-semibold mb-2">Set Command</h2>
      <p>Send a GET request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/setcmd/{cmd}</code> to update the command.</p>
      <div class="bg-blue-200 p-4 mt-2 rounded">
      <p><strong>GET</strong>  https://zenova-server.onrender.com/setcmd/024</p>
      <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
      <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
      <p>"Command updated to: {cmd}"</p>
      </div>
      <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
      <p>"Missing cmd parameter"</p>
      </div>
      <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
      <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (500):</p>
      <p>"Server Error"</p>
      </div>
      </div>
      </div>
      
      <div class="mb-6">
      <h2 class="text-xl font-semibold mb-2">Command Explanation</h2>
      <p>The command (cmd) is a combination of 1 to 3 unique numbers from 0-5, each representing a specific device control:</p>
      <ul class="bg-blue-200 p-4 rounded grid grid-cols-1 md:grid-cols-2 gap-2">
      <li><i class="fas fa-hand-point-right"></i> 0 = Light OFF</li>
      <li><i class="fas fa-hand-point-right"></i> 1 = Light ON</li>
      <li><i class="fas fa-hand-point-right"></i> 2 = Fan OFF</li>
      <li><i class="fas fa-hand-point-right"></i> 3 = Fan ON</li>
      <li><i class="fas fa-hand-point-right"></i> 4 = Pump OFF</li>
      <li><i class="fas fa-hand-point-right"></i> 5 = Pump ON</li>
      </ul>
      <p class="mt-4">Example outputs:</p>
      <ul class="bg-blue-200 p-4 rounded mt-2">
      <li><i class="fas fa-hand-point-right"></i> "024" → Light OFF, Fan OFF, Pump OFF</li>
      <li><i class="fas fa-hand-point-right"></i> "135" → Light ON, Fan ON, Pump ON</li>
      <li><i class="fas fa-hand-point-right"></i> "3" → Fan ON</li>
      </ul>
        </div>
        
        <div class="mb-6">
        <h2 class="text-xl font-semibold mb-2">Rate Limiter & Access Requirement</h2>
        <p>The <code class="bg-blue-200 px-2 py-1 rounded">/request</code> API is protected by a rate limiter:</p>
        <ul class="bg-blue-200 p-4 rounded">
        <li><i class="fas fa-hand-point-right"></i> Each user can make a maximum of 100 requests per 15 minutes.</li>
        <li><i class="fas fa-hand-point-right"></i> If the limit is exceeded, the API will return a 429 error: "Too many requests, please try again later."</li>
        </ul>
        <p class="mt-4">Additionally, access to the <code class="bg-blue-200 px-2 py-1 rounded">/request</code> API requires authentication using a valid API_KEY</p>
        </div>
        </div>
        
        </body>
        </html>
        `;
}


module.exports=doc;