const fack = require('express').Router();
let request = '';

fack.get('/fackGetReq', (req, res) => {
  res.send(request);
});

fack.post('/fackPutReq', (req, res) => {
  try {
    if (req.body?.API_KEY !== process.env.PASSWORD)
      throw new Error('Access Denied');
    let message = req.body?.message;
    if (!message || message.length < 1 || message.length > 100) {
      return res.status(400).send('Invalid length');
    }
    request = message;
    res.send(`userInput Updated to "${request}"`);
  } catch (e) {
    res.status(403).send('Access Denied');
  }
});

module.exports = fack;
