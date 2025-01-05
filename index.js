 
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;


app.get('/ping', async (req, res) => {
  res.send('Pong from Server 1');
  setTimeout(() => {
    callback();
  }, 500);
});



(async () => {
   await fetch('http://localhost:3001/ping')
     .then((res) => {
       if (res.ok) {
         console.log('Server 2 is responding:', res.status);
       } else {
         console.log('Server 2 responded with an error:', res.status);
       }
     })
     .catch((err) => {
       console.error('Server 2 is not responding:', err.message);
     });
})()

  function callback() {
 fetch('http://localhost:3001/ping')
    .then((res) => {
      if (res.ok) {
        console.log('Server 2 is responding:', res.status);
      } else {
        console.log('Server 2 responded with an error:', res.status);
      }
    })
    .catch((err) => {
      console.error('Server 2 is not responding:', err.message);
    });
}
  
 
 app.use((req, res) => res.send('Hello from server 1'));

app.listen(port, () => {
  console.log(`Server 1 running at ${port}`);
});
