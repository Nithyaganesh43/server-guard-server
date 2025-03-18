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

app.post('/request', limiter, async (req, res) => {
  try {
    if (req.body?.API_KEY !== process.env.PASSWORD)
      throw new Error('Access Denied');
    const message = req.body?.message;
    if (!message || message.length < 3 || message.length > 100)
      return res.status(400).send('Invalid input length');
    cmd = await prompt(message);
    broadcastCmd();
    res.send(cmd);
  } catch (e) {
    res.status(403).send('Access Denied');
  }
});

app.get('/setcmd/:cmd', (req, res) => {
  try {
    if (!req.params.cmd) return res.status(400).send('Missing cmd parameter');
    cmd = req.params.cmd;
    broadcastCmd();
    res.send(`Command updated to: ${cmd}`);
  } catch (error) {
    console.error('Error in setcmd:', error.message);
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
