const { OpenAI } = require('openai');

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // Use your new DeepSeek API key
  baseURL: 'https://api.deepseek.com/v1', // This is the DeepSeek API endpoint
});

const updateCmdUsingAiWithUserInput = async (userInput, cmd) => {
  try {
    const prompt = `You are an ultra-smart home assistant that extracts control 
commands from Thanglish, Tamil or English input, including indirect speech.
Devices:Light:0=OFF,1=ON Fan:2=OFF,3=ON Pump:4=OFF,5=ON 
Instructions:
Light or bulb: ON if visibility issue or needed, else OFF.
Fan or air or ventilation: ON if air, cooling, or relaxation needed, else OFF.
Pump or water: ON if water needed, OFF if tank full.
Combined: Give one cmd for multiple needs (e.g., sleep time → "03").
All: Turn all ON ("135") or OFF ("024") if needed.
clearly understand the state of the user mind and perform the cmds 
States:
Evening : turn on the light and fan
Morning : turn of the light 
Tyrd : fan on 
Need for water : turn the pump on 
overflow of water : turn pump off
Need for air : turn fan on
No need for fan  : turn fan off
so on
Rules:
Extract intent from context (emotion/situation).
Return only necessary numbers (e.g., "14"), max 3 unique numbers for not same devices.
No extra numbers, spaces, or text.
Devices:Light:0=OFF,1=ON Fan:2=OFF,3=ON Pump:4=OFF,5=ON 
Examples:
"Thanni varala"→"5"  
"Water,pump,thanni"→"4"or"5"according to on or off
"Room dark ah iruku"→"1"
"Semma heat ah iruku"→"3"
"paper elam kathula parakuthu"→"2"
"Its too bright bro!"→"0"
Also understand the previous state ${cmd} if no need to change the previous state dont change it
User Input: (${userInput})
Return only the correct numbers or nothing`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',  
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
