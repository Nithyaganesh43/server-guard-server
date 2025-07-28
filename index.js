require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http = require('http');

const ping = require('./util/ping-pong');
const doc = require('./util/doc');
const prompt = require('./util/prompt');
const fack = require('./util/fack');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let cmd = '135';  
let state = { light: 1, fan: 1, pump: 1 };  

const clients = new Set();

app.use(express.json({ limit: '1kb' }));
app.use(cookieParser());
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'https://zenova-two.vercel.app',
  'http://127.0.0.1:5500',
  'https://zenovaremotecontroller.vercel.app',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(fack);
app.use(ping);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.cookies.access_token || req.ip,
  message: 'Too many requests, please try again later',
});

const updateState = (newCmd) => {
  const newState = { ...state };
  if (newCmd.includes('0')) newState.light = 0;
  if (newCmd.includes('1')) newState.light = 1;
  if (newCmd.includes('2')) newState.fan = 0;
  if (newCmd.includes('3')) newState.fan = 1;
  if (newCmd.includes('4')) newState.pump = 0;
  if (newCmd.includes('5')) newState.pump = 1;
  //console.log(newState);
  return newState;
};

app.post('/request', limiter, async (req, res) => {
  try {
    if (req.body?.API_KEY !== process.env.PASSWORD)
      throw new Error('Access Denied');

    const message = req.body?.message;
    if (!message || message.length < 3 || message.length > 100)
      return res.status(400).send('Invalid input length');

    const newCmd = await prompt(message);
    //console.log(newCmd);
    const newState = updateState(newCmd);

   const updatedCmd = Object.entries(newState)
     .filter(([_, v]) => v === 1)
     .map(([k]) => (k === 'light' ? '1' : k === 'fan' ? '3' : '5'))
     .join('');

    
     state = newState;
     cmd = updatedCmd;
     broadcastCmd(); 
    res.send(newCmd);
  } catch (e) {
    res.status(403).send('Access Denied');
  }
});

app.get('/setcmd/:cmd', (req, res) => {
  try {
    const newCmd = req.params.cmd;
    if (!newCmd) return res.status(400).send('Missing cmd parameter');

    const newState = updateState(newCmd);
    const updatedCmd = Object.entries(newState)
      .filter(([_, v]) => v === 1)
      .map(([k]) => (k === 'light' ? '1' : k === 'fan' ? '3' : '5'))
      .join('');

    if (
      updatedCmd !== cmd ||
      JSON.stringify(newState) !== JSON.stringify(state)
    ) {
      state = newState;
      cmd = updatedCmd;
      broadcastCmd();
    }

    res.send(`Command updated to: ${cmd}`);
  } catch (error) {
    //console.error('Error in setcmd:', error.message);
    res.status(500).send('Server Error');
  }
});


app.get('/getcmd', (req, res) => res.send(cmd));


   


app.use('/', (req, res) => res.send(doc(cmd)));

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(cmd);

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcastCmd() {
  for (const client of clients) {
    if (client.readyState === 1) client.send(cmd);
  }
}

server.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on port ${process.env.PORT || 3000}`)
);
// https://zenova-server.onrender.com