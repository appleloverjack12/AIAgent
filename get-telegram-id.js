import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

async function getUpdates(token, botName) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    
    console.log(`\n📱 ${botName} - Last 5 chats:`);
    if (data.ok && data.result.length > 0) {
      // Get unique chats from the last 10 updates
      const chats = new Map();
      data.result.slice(-10).forEach(update => {
        const chat = update.message?.chat || update.channel_post?.chat;
        if (chat && !chats.has(chat.id)) {
          chats.set(chat.id, {
            id: chat.id,
            type: chat.type,
            title: chat.title || chat.first_name || 'Unknown',
            username: chat.username
          });
        }
      });
      
      chats.forEach((chat, id) => {
        console.log(`  Chat ID: ${id}`);
        console.log(`    Type: ${chat.type}`);
        console.log(`    Name: ${chat.title}`);
        console.log(`    Username: ${chat.username || 'N/A'}`);
      });
    } else {
      console.log('  No updates found. Send a message to the bot first.');
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Getting real chat IDs from Telegram\n');
  
  await getUpdates(process.env.TELEGRAM_BOT_TOKEN, 'FSAA Bot');
  await getUpdates(process.env.TELEGRAM_BOT_TOKEN_KAJGOD, 'Kajgod Bot');
  
  console.log('\n✅ Compare these with your .env file:');
  console.log(`FSAA_CHAT_ID=${process.env.FSAA_CHAT_ID}`);
  console.log(`KAJGOD_CHAT_ID=${process.env.KAJGOD_CHAT_ID}`);
}

main();