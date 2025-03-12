require('dotenv').config();
const rateLimit = require('express-rate-limit');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const allowedOrigins = ['http://localhost:3000'];
let cmd = '135';
let request = '';

module.exports = {
  cors: (req, res, next) => {
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
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
  },
  limiter: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.cookies.access_token || req.ip,
    message: 'Too many requests, please try again later',
  }),
  getAccess: (req, res) => {
    try {
      const password = req.body.password;
      if (password === process.env.PASSWORD) {
        res.cookie('access_token', process.env.PASSWORD, {
          httpOnly: true,
          secure: true,
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.send('success');
      }
      res.status(400).send('Wrong Password');
    } catch (error) {
      console.error('Error in getAccess:', error.message);
      res.status(500).send('Server Error');
    }
  },
  check: (req, res) => {
    try {
      if (
        !req.cookies.access_token ||
        req.cookies.access_token !== process.env.PASSWORD
      )
        return res.status(403).send('Access Denied');
      res.send('Authorized');
    } catch (error) {
      console.error('Error in checkAccess:', error.message);
      res.status(500).send('Server Error');
    }
  },
  updateCmdUsingAiWithUserInput: async (userInput) => {
    try {
      const prompt = `You are an ultra-smart home assistant that extracts control commands from Thanglish, Tamil or English input, including indirect speech.
  Devices:
  Light: 0=OFF, 1=ON
  Fan: 2=OFF, 3=ON
  Pump: 4=OFF, 5=ON
  Prev Cmd: "${cmd}"
  Instructions:
  - Light: ON if visibility issue or needed, else OFF.
  - Fan: ON if air, cooling, or relaxation needed, else OFF.
  - Pump: ON if water needed, OFF if tank full.
  - Combined: Give one cmd for multiple needs (e.g., sleeping → "12").
  - All: Turn all ON ("135") or OFF ("024") if needed.
  Rules:
  - Extract intent from context (emotion/situation).
  - Return only necessary numbers (e.g., "14"), max **3** unique.
  - No extra numbers, spaces, or text.
  - If no action, return "" (empty).
  Examples:
  "Thanni varala" → "4"
  "Room dark ah iruku" → "1"
  "Semma heat ah iruku" → "3"
  "Window la kaathu pothum" → "2"
  "I have enough ventilation" → "0"
  User Input: (${userInput})
  Return only the correct numbers or ""`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 3,
      });

      return response.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('Error:', error.message);
      return '';
    }
  },
  req: async (req, res) => {
    try {
      if (req.cookies.access_token !== process.env.PASSWORD)
        throw new Error('Access Denied');
      const message = req.body?.message;
      if (!message || message.length < 3 || message.length > 100)
        return res.status(400).send('Invalid input length');
      cmd = await updateCmdUsingAiWithUserInput(message);
      res.send(cmd);
    } catch (e) {
      console.error('Error in /request:', e.message);
      res.status(403).send('Access Denied');
    }
  },
  doc: (req, res) =>
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Usage Guide</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
</head>
<body class="bg-blue-100 text-gray-900 font-sans text-base md:text-lg p-4 md:p-6 transition-colors duration-300">

    <div class="max-w-6xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-md transition-colors duration-300">
        <h1 class="text-2xl md:text-3xl font-bold mb-4 text-center">API Usage Guide</h1>
       
        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Get Access</h2>
            <p>To obtain access, send a POST request to <code class="bg-blue-200 px-2 py-1 rounded break-words">https://zenova-server.onrender.com/getAccess</code> with the correct password.</p>
            <div class="bg-blue-200 p-4 mt-2 rounded overflow-x-auto">
                <p><strong>POST</strong> https://zenova-server.onrender.com/getAccess</p>
                <p><strong>Headers:</strong> { "Content-Type": "application/json" }</p>
                <p><strong>Body:</strong> { "password": "your_password" } (Min length: 6, Max length: 20)</p>
                <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
                    <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
                    <p>"success"</p>
                </div>
                <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
                    <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
                    <p>"Wrong Password"</p>
                </div>
            </div>
        </div>

        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Check Access</h2>
            <p>Send a GET request to <code class="bg-blue-200 px-2 py-1 rounded break-words">https://zenova-server.onrender.com/checkAccess</code> with a valid access token.</p>
            <div class="bg-blue-200 p-4 mt-2 rounded overflow-x-auto">
                <p><strong>GET</strong> https://zenova-server.onrender.com/checkAccess</p>
                <p><strong>Headers:</strong> { "Content-Type": "application/json", "Credentials": "true" }</p>
                <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
                    <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
                    <p>"Authorized"</p>
                </div>
                <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
                    <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (403):</p>
                    <p>"Access Denied"</p>
                </div>
            </div>
        </div>
        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Request Command</h2>
            <p>Send a POST request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/request</code> with a message.</p>
            <div class="bg-blue-200 p-4 mt-2 rounded">
                <p><strong>POST</strong> https://zenova-server.onrender.com/request</p>
                <p>Headers: { "Content-Type": "application/json", "Credentials": "true" }</p>
                <p>Body: { "message": "Your command" } (Min length: 3, Max length: 100)</p>
                <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
                    <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
                    <p>"command_code Eg: 024"</p>
                </div>
                <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
                    <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
                    <p>"Invalid input length"</p>
                </div>
                <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
                    <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (403):</p>
                    <p>"Access Denied"</p>
                </div>
            </div>
        </div>
        <div class="mb-6">
    <h2 class="text-xl font-semibold mb-2">Fake PUT Request</h2>
    <p>Send a post request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/fackPutReq</code> with a message.</p>
    <div class="bg-blue-200 p-4 mt-2 rounded">
        <p><strong>POST</strong> https://zenova-server.onrender.com/fackPutReq</p>
        <p>Headers: { "Content-Type": "application/json" }</p>
        <p>Body: { "message": "Your text" } (Min length: 1, Max length: 100)</p>
        <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
            <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
            <p>"Your text"</p>
        </div>
        <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
            <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
            <p>"Invalid length"</p>
        </div>
    </div>
</div>

<div class="mb-6">
    <h2 class="text-xl font-semibold mb-2">Fake GET Request</h2>
    <p>Send a GET request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/fackGetReq</code>.</p>
    <div class="bg-blue-200 p-4 mt-2 rounded">
        <p><strong>GET</strong>  https://zenova-server.onrender.com/fackGetReq</p>
        <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
            <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
            <p>Returns current request message</p>
        </div>
    </div>
</div>

        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Get Commands</h2>
            <p>To retrieve available commands, send a GET request to <code class="bg-blue-200 px-2 py-1 rounded break-words">https://zenova-server.onrender.com/getcmd</code>.</p>
            <div class="bg-blue-200 p-4 mt-2 rounded overflow-x-auto">
                <p><strong>GET</strong> https://zenova-server.onrender.com/getcmd</p>
                <p><strong>Headers:</strong> { "Accept": "application/json" }</p>
                <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
                    <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
                    <p>current cmd : "${cmd}"</p>
                </div>
            </div>
        </div>
        <div class="mb-6">
    <h2 class="text-xl font-semibold mb-2">Set Command</h2>
    <p>Send a GET request to <code class="bg-blue-200 px-2 py-1 rounded">https://zenova-server.onrender.com/setcmd/{cmd}</code> to update the command.</p>
    <div class="bg-blue-200 p-4 mt-2 rounded">
        <p><strong>GET</strong>  https://zenova-server.onrender.com/setcmd/024</p>
        <div class="bg-green-200 border-l-4 border-green-500 p-4 mt-2">
            <p class="text-green-700 font-bold"><i class="fas fa-check-circle"></i> Success Response (200):</p>
            <p>"Command updated to: {cmd}"</p>
        </div>
        <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
            <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (400):</p>
            <p>"Missing cmd parameter"</p>
        </div>
        <div class="bg-red-200 border-l-4 border-red-500 p-4 mt-2">
            <p class="text-red-700 font-bold"><i class="fas fa-times-circle"></i> Failed Response (500):</p>
            <p>"Server Error"</p>
        </div>
    </div>
</div>

        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Command Explanation</h2>
            <p>The command (cmd) is a combination of 1 to 3 unique numbers from 0-5, each representing a specific device control:</p>
            <ul class="bg-blue-200 p-4 rounded grid grid-cols-1 md:grid-cols-2 gap-2">
                <li><i class="fas fa-hand-point-right"></i> 0 = Light OFF</li>
                <li><i class="fas fa-hand-point-right"></i> 1 = Light ON</li>
                <li><i class="fas fa-hand-point-right"></i> 2 = Fan OFF</li>
                <li><i class="fas fa-hand-point-right"></i> 3 = Fan ON</li>
                <li><i class="fas fa-hand-point-right"></i> 4 = Pump OFF</li>
                <li><i class="fas fa-hand-point-right"></i> 5 = Pump ON</li>
            </ul>
            <p class="mt-4">Example outputs:</p>
            <ul class="bg-blue-200 p-4 rounded mt-2">
                <li><i class="fas fa-hand-point-right"></i> "024" → Light OFF, Fan OFF, Pump OFF</li>
                <li><i class="fas fa-hand-point-right"></i> "135" → Light ON, Fan ON, Pump ON</li>
                <li><i class="fas fa-hand-point-right"></i> "3" → Fan ON</li>
            </ul>
        </div>

        <div class="mb-6">
            <h2 class="text-xl font-semibold mb-2">Rate Limiter & Access Requirement</h2>
            <p>The <code class="bg-blue-200 px-2 py-1 rounded">/request</code> API is protected by a rate limiter:</p>
            <ul class="bg-blue-200 p-4 rounded">
                <li><i class="fas fa-hand-point-right"></i> Each user can make a maximum of 100 requests per 15 minutes.</li>
                <li><i class="fas fa-hand-point-right"></i> If the limit is exceeded, the API will return a 429 error: "Too many requests, please try again later."</li>
            </ul>
            <p class="mt-4">Additionally, access to the <code class="bg-blue-200 px-2 py-1 rounded">/request</code> API requires authentication using a valid access token.</p>
        </div>
    </div>

</body>
</html>
`),
  getcmd: (req, res) => {
    res.send(cmd);
  },
  setcmd: (req, res) => {
    try {
      if (!req.params.cmd) return res.status(400).send('Missing cmd parameter');
      cmd = req.params.cmd;
      res.send(`Command updated to: ${cmd}`);
    } catch (error) {
      console.error('Error in setcmd:', error.message);
      res.status(500).send('Server Error');
    }
  },
  fackPutReq: (req, res) => {
    let message = req.body.message;
    if (!message || message.length < 1 || message.length > 100) {
      return res.status(400).send('Invalid length');
    }
    res.send(message);
  },

  fackGetReq: (req, res) => {
    res.send(request);
  },
};
