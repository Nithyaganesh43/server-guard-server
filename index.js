const express = require('express');
const cors = require('cors');
const ping_pong = require('./ping-pong');

const app = express();
const port = 3000; // Define the port

app.use(cors());
app.use(express.json());
app.use(ping_pong);

let cmd = '000';

app.get('/get', (req, res) => res.send(cmd));

app.get('/set/:value', (req, res) => {
  let { value } = req.params;
  let message, color;

  if (/^[0-5]{1,50}$/.test(value)) {
    cmd = value;
    message = `✅ Command updated to ${cmd}`;
    color = 'green';
  } else {
    message = '❌ Invalid command. Enter 1 to 50 digits (0-5).';
    color = 'red';
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Command Status</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div class="max-w-md w-full p-6 bg-gray-800 rounded-xl shadow-lg text-center">
            <h1 class="text-2xl font-bold mb-4" style="color: ${color};">${message}</h1>
            <a href="/" class="mt-4 inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded-md text-center">
                Go Back
            </a>
        </div>
    </body>
    </html>
  `);
});

app.use((req, res) => {
  const url = `https://${req.get('host')}${req.originalUrl}`;
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Command Control</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
    <div class="max-w-lg w-full p-6 bg-gray-800 rounded-xl shadow-lg">
        <h1 class="text-2xl font-bold text-center mb-4">Command Controller</h1>
        <p class="text-sm text-gray-400 text-center mb-4">This page explains how to interact with the backend server to control commands manually.</p>
        
        <h2 class="text-lg font-semibold text-gray-200 mb-2">Available API Routes</h2>
        <ul class="text-gray-300 text-sm mb-4 space-y-2">
            <li><strong>GET /get</strong> - Retrieves the currently stored command.</li>
            <li><strong>GET /set/:value</strong> - Updates the command with a new value (1-50 digits, only 0-5).</li>
        </ul>

        <h2 class="text-lg font-semibold text-gray-200 mb-2">Enter Command</h2>
        <input id="cmdInput" type="text" placeholder="Enter command (1-50 digits, 0-5)" class="w-full p-2 text-gray-900 rounded-md mb-4" maxlength="50">
        <button onclick="setCommand()" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded-md">Set Command</button>

        <h2 class="text-lg font-semibold text-gray-200 mt-4 mb-2">Get Current Command</h2>
        <button onclick="getCommand()" class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold p-2 rounded-md">Get Command</button>

        <h2 class="text-lg font-semibold text-gray-200 mt-4 mb-2">ESP8266 Usage</h2>
        <p class="text-sm text-gray-400">Use the following API endpoints in your ESP8266 HTTP requests:</p>
        <pre class="bg-gray-700 text-white p-2 rounded-md text-sm">
GET https://${req.get('host')}/get 
        </pre>

        <h2 class="text-lg font-semibold text-gray-200 mt-4 mb-2">Full URL of this page:</h2>
        <p class="text-gray-300 text-sm">${url}</p>
    </div>

    <script>
        function setCommand() {
            const cmd = document.getElementById('cmdInput').value;
            if (/^[0-5]{1,50}$/.test(cmd)) {
                window.open(\`/set/\${cmd}\`, '_blank');
            } else {
                alert('Invalid command. Enter 1 to 50 digits (0-5) only.');
            }
        }

        function getCommand() {
            window.open('/get', '_blank');
        }
    </script>
</body>
</html>`);
});


app.listen(port, () => console.log(`Server running on port ${port}`));
