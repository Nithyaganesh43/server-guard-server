require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const connectToDB = require('./src/config/database');
const ping_pong = require('./src/ping-pong');
const api = require('./src/api');
const signup = require('./src/router/signup');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
  })
);
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(ping_pong);

app.use((req, res, next) => {
  if (req.headers.origin !== process.env.FRONT_END_URL) {
    res.status(403).send('Access denied');
  } else {
    next();
  }
});

app.use(api);
app.use(signup);
 
app.use((req, res) => {
  res.status(404).json({ error: 'Page not found' });
});
 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

connectToDB()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} successfully`);
    });
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
  });
