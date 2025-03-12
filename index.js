require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const help = require('./helper');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1kb' }));
app.use(cookieParser());
app.use(help.cors);

app.post('/getAccess', help.getAccess);
app.get('/checkAccess', help.check);
app.post('/request', help.limiter, help.req);
app.get('/getcmd', help.getcmd);
app.get('/setcmd/:cmd', help.setcmd);
app.use('/', help.doc);

app.listen(port, () => console.log(`Server running on port ${port}`));
