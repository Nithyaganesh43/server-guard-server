require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { OpenAI } = require('openai');
const rateLimit = require('express-rate-limit');
const ping = require('./ping-pong');
const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({ apiKey: process.env.API_KEY });
const allowedOrigins = ['http://localhost:3000'];
let cmd = '135';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.cookies.access_token || req.ip,
  message: 'Too many requests, please try again later',
});
app.use(ping);
app.use(express.json({ limit: '1kb' }));
app.use(cookieParser());

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
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.post('/getAccess', (req, res) => {
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
});

const updateCmdUsingAiWithUserInput = async (userInput) => {
  try {
    const prompt = `You are an ultra-smart home assistant that extracts control commands from Tamil or English input, including indirect speech.
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
      model: 'gpt-4-turbo',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 3,
    });

    return response.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Error:', error.message);
    return '';
  }
};

app.post('/request', limiter, async (req, res) => {
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
});

app.get('/getcmd',(req,res)=>{
    res.send(cmd);
});

app.listen(port, () => console.log(`Server running on port ${port}`));
