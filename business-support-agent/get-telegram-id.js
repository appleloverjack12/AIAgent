import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config'

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

bot.on('message', (msg) => {
  console.log('=========================');
  console.log('Your Chat ID:', msg.chat.id);
  console.log('Name:', msg.from.first_name);
  console.log('=========================');
  
  bot.sendMessage(msg.chat.id, `✅ Your Chat ID is: ${msg.chat.id}\n\nCopy this number and add it to schedule-fsaa-briefing.js`);
  
  // Stop after first message
  process.exit(0);
});

console.log('Waiting for you to message your bot...');
console.log('Open Telegram and send any message to @JS63s_bot');