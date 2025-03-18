const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.API_KEY });

const updateCmdUsingAiWithUserInput = async (userInput, cmd) => {
  try {
    const prompt = `You are an ultra-smart home assistant that extracts control 
commands from Thanglish, Tamil or English input, including indirect speech.
Devices:Light:0=OFF,1=ON Fan:2=OFF,3=ON Pump:4=OFF,5=ON 
Instructions:
Light: ON if visibility issue or needed, else OFF.
Fan: ON if air, cooling, or relaxation needed, else OFF.
Pump: ON if water needed, OFF if tank full.
Combined: Give one cmd for multiple needs (e.g., sleeping → "12").
All: Turn all ON ("135") or OFF ("024") if needed.
Rules:
Extract intent from context (emotion/situation).
Return only necessary numbers (e.g., "14"), max 3 unique numbers for not same devices.
No extra numbers, spaces, or text.
If no action, return  (empty).
Examples:
"Thanni varala"→"4"
"Water,pump,thanni"→"4"or"5"according to on or off
"Room dark ah iruku"→"1"
"Semma heat ah iruku"→"3"
"Window kaathe pothum"→"2"
"Its too bright bro!"→"0"
User Input: (${userInput})
Return only the correct numbers or nothing`;

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
};

module.exports = updateCmdUsingAiWithUserInput;
