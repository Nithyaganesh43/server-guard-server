
const ping_pong = require('express').Router();
  
ping_pong.get('/ping', async (req, res) => { 
  console.log("Pong");
  res.send('Pong from Server 1'); 
}); 
module.exports=ping_pong;