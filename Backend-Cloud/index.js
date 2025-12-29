require('dotenv').config();
const express = require('express');
const app = express();
app.use(require('./serverInt'));
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http = require('http');
const doc = require('./util/doc');
const prompt = require('./util/prompt');

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

//set cmd is always 3 digit representing the current state of the all 3 devices
// where 0=light off, 1=light on, 2=fan off, 3=fan on, 4=pump off, 5=pump on
// there are 3 ways to operate the device on off state this backend is one of the way so
// this currentState is used to store the current state of the devices if any of the device is operated in any way
// websocket will send that updated state of all device which will be 3 digit always this is the currentState
let currentState = '135';

// Set to keep track of connected WebSocket clients
// This allows us to broadcast commands to all connected clients
// when a new command is set or requested
const clients = new Set();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.cookies.access_token || req.ip,
  message: 'Too many requests, please try again later',
});

const broadcastCmd = () => {
  let count = 0;
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(currentState);
      count++;
    }
  }
  console.log(`Broadcasted command "${currentState}" to ${count} clients`);
};

const controllCmdTOsetCommand = (setCmd) => {
  if (!setCmd || setCmd.length < 1 || setCmd.length > 3)
    throw new Error('Invalid command length');
  if (!/^[0-5]{1,3}$/.test(setCmd)) throw new Error('Invalid command format');

  let stateArr = currentState.split('');
  for (let c of setCmd) {
    if (c === '0' || c === '1') stateArr[0] = c; // light
    else if (c === '2' || c === '3') stateArr[1] = c; // fan
    else if (c === '4' || c === '5') stateArr[2] = c; // pump
  }
  currentState = stateArr.join('');
  return currentState;
};

app.post('/request', limiter, async (req, res) => {
  try {
    if (req.body?.API_KEY !== process.env.PASSWORD)
      throw new Error('Access Denied');
    const message = req.body?.message;
    if (!message || message.length < 3 || message.length > 100)
      return res.status(400).send('Invalid input length');
    let cmd = await prompt(message, currentState); //give contoll cmd 1-3 digit string
    currentState = controllCmdTOsetCommand(cmd);
    broadcastCmd();
    res.send(currentState);
  } catch (e) {
    res.status(403).send(e.message);
  }
});

let ip = '127.0.0.1';
app.get('/setip/:ip', (req, res) => {
  ip = req.params.ip;
});
app.get('/getip', (req, res) => {
  if (ip) {
    res.send(ip);
  }
});

// GET /setcmd/:cmd logic — you get cmd from req.params.cmd   store it into currentState directly.
app.post('/setcmd/:cmd', (req, res) => {
  try {
    if (req.body?.API_KEY !== process.env.PASSWORD)
      throw new Error('Access Denied');
    const newCmd = req.params.cmd; //give contoll cmd 1-3 digits string

    currentState = controllCmdTOsetCommand(newCmd);
    broadcastCmd();
    res.json({ message: `Command updated to`, currentState });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.post('/getcmd', (req, res) => {
  if (req.body?.API_KEY !== process.env.PASSWORD)
    throw new Error('Access Denied');
  res.send(currentState);
});

app.use('/', (req, res) => res.send(doc(currentState)));

// Improved WebSocket connection handler - replace your existing one
wss.on('connection', (ws, req) => {
  console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
  let isAuthenticated = false;
  let clientType = 'unknown';

  clients.add(ws);

  // Send current state immediately for sync
  ws.send(currentState);
  console.log(`Sent initial state to client: ${currentState}`);

  ws.on('message', (message) => {
    try {
      const data = message.toString().trim();
      console.log(`Received WebSocket message: "${data}"`);

      // Handle empty or invalid messages
      if (!data) {
        console.log('Received empty message, ignoring');
        return;
      }

      // Try to parse as JSON for authentication
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.API_KEY) {
          if (jsonData.API_KEY === process.env.PASSWORD) {
            isAuthenticated = true;
            clientType = 'esp8266'; // Assume ESP8266 since it sends JSON auth
            console.log('✓ WebSocket client authenticated as ESP8266');
            ws.send('authenticated');
            return;
          } else {
            console.log('✗ Invalid API key provided');
            ws.send('authentication_failed');
            return;
          }
        }
      } catch (e) {
        // Not JSON, could be a command or other message
      }

      // Handle 3-digit state updates from ESP8266
      if (isAuthenticated && /^[0-5]{3}$/.test(data)) {
        console.log(`✓ Received valid state update from ESP: ${data}`);

        // Only update if different from current state
        if (data !== currentState) {
          const oldState = currentState;
          currentState = data;
          console.log(`State updated from ${oldState} to ${currentState}`);

          // Broadcast to all other clients except sender
          let broadcastCount = 0;
          for (const client of clients) {
            if (client !== ws && client.readyState === 1) {
              client.send(currentState);
              broadcastCount++;
            }
          }
          console.log(
            `Broadcasted new state to ${broadcastCount} other clients`
          );
        } else {
          console.log('State unchanged, no broadcast needed');
        }

        return;
      }

      // Handle other commands or messages
      if (!isAuthenticated) {
        console.log(
          `⚠ Received message from unauthenticated client: "${data}"`
        );
        ws.send('authentication_required');
      } else {
        console.log(
          `⚠ Received invalid command from authenticated client: "${data}"`
        );
        ws.send(`error: invalid command format`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send('error: message processing failed');
    }
  });

  ws.on('ping', () => {
    console.log('Received ping from client');
  });

  ws.on('pong', () => {
    console.log('Received pong from client');
  });

  ws.on('close', (code, reason) => {
    console.log(
      `WebSocket connection closed. Code: ${code}, Reason: ${reason}`
    );
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

server.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on port ${process.env.PORT || 3000}`)
);

//https://zenova-server.onrender.com
// Command Explanation
// The command (cmd) is a combination of 1 to 3 unique numbers from 0-5, each representing a specific device control:

// 0 = Light OFF
// 1 = Light ON
// 2 = Fan OFF
// 3 = Fan ON
// 4 = Pump OFF
// 5 = Pump ON

// Example outputs:

// "024" → Light OFF, Fan OFF, Pump OFF
// "135" → Light ON, Fan ON, Pump ON
// "3" → Fan ON

//controll cmd

//this is controll which recieve cmd form 1-3 digits , no two digit of same device
// example: 135, 024, 3, 0, 12, 45
// where 0=light off, 1=light on, 2=fan off, 3=fan on, 4=pump off, 5=pump on
// this is used to control the devices based on the cmd received update the state and broadcast the cmd to all connected clients
// this is used to update the state and cmd based on the cmd received from the client
// this is used to broadcast the cmd to all connected clients

//flow of the code
// 1. Client can send a request with a message to the server
//    - The message is processed to generate a command (cmd) based on the request
//    - The cmd is broadcasted to all connected WebSocket clients
//    - or directly set the cmd via a GET request to /setcmd/:cmd which is alternative to await prompt(message)

// 2. Server will broadcast the cmd to all connected WebSocket clients
//    - Clients will receive the cmd and can act upon it
//    - One of the client is the main controller which send the stats back to the server on websocket which is used to update the currentState

//set cmd
//is always 3 digit representing the current state of the all 3 devices
  