// schedule-news.js
import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const yourChatId = 'your-telegram-chat-id';

// Every day at 8:00 AM
cron.schedule('0 8 * * *', () => {
  bot.sendMessage(yourChatId, "What are today's top tech stories and stock movements?");
});