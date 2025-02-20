require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const connectToDB = require('./src/config/database');
const ping_pong = require('./src/ping-pong');
const signup = require('./src/router/signup');
const app = express();

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000'
];

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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

app.use(ping_pong);

app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 60,
    message: 'Too many requests, please try again later.',
  })
);

app.use(compression());
app.use(express.json());
app.use(cookieParser());

app.use(signup);
 
 
app.use((req, res) => {
  res.status(404).json({ error: '143 Page not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);  
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
