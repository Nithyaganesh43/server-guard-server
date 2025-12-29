require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const router = express.Router();
router.use(express.json({ limit: '1kb' }));
router.use(cookieParser());
const axios = require('axios');
const https = require('https');

const TARGET_URL = 'https://internetprotocal.onrender.com/ZeNoVa';

const PING_TIMEOUT = 5000;


const client = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: PING_TIMEOUT,
  validateStatus: () => true,
});

function pingOnce() {
  client.get(TARGET_URL).catch(() => {});
}

function schedulePing() {
  setTimeout(() => {
    pingOnce();
    schedulePing();
  }, 10 * 60 * 1000);
}

schedulePing();

const allowedOrigins = [
  'http://localhost:3000',
  'https://zenova-assistant.vercel.app',
  'https://zenova-two.vercel.app',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://humalvo-switch.vercel.app',
  'https://humalvo-voice.vercel.app',
  'https://zenovaremotecontroller.vercel.app',
];

router.use(require('./util/ping-pong'));

router.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

module.exports = router;
