
const ping_pong = require('express').Router();
  
ping_pong.get('/ping', async (req, res) => { 
  res.send('Pong from Server 1'); 
}); 
module.exports=ping_pong;