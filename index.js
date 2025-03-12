const express = require('express');
const cookieParser = require('cookie-parser');
const help = require('./helper');
const app = express();
app.use(express.json({ limit: '1kb' }));
app.use(cookieParser());
const cors = require('cors');
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,  
  })
);
app.use(help.cors);
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
