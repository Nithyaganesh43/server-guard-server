const express = require('express');
const cookieParser = require('cookie-parser');
const help = require('./helper');
const app = express();
app.use(express.json({ limit: '1kb' }));
app.use(cookieParser());
const allowedOrigin = 'http://localhost:3000';

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  if (req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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

  next();
});

app.post('/getAccess', help.getAccess);
app.get('/checkAccess', help.check);
app.post('/request', help.limiter, help.req);
app.post('/fackSetRequest', help.fackGetReq);
app.post('/fackGetRequest', help.fackPutReq);
app.get('/getcmd', help.getcmd);
app.get('/setcmd/:cmd', help.setcmd);
app.use('/', help.doc);
app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on port ${process.env.PORT || 3000}`)
);
