import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

async function getChatId(token, botName, botUsername) {
  try {
    console.log(`\n🔍 Getting updates for ${botName} (@${botUsername})...`);
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      console.log(`✅ Found ${data.result.length} updates`);
      
      // Show all unique chats
      const chats = new Map();
      data.result.forEach(update => {
        const chat = update.message?.chat;
        if (chat && !chats.has(chat.id)) {
          chats.set(chat.id, chat);
        }
      });
      
      console.log(`\n📱 Available chats for ${botName}:`);
      chats.forEach((chat, id) => {
        console.log(`\n  Chat ID: ${id}`);
        console.log(`    Type: ${chat.type}`);
        console.log(`    Name: ${chat.first_name || chat.title || 'Unknown'}`);
        console.log(`    Username: @${chat.username || 'N/A'}`);
        console.log(`    Last message: ${update.message?.text || 'N/A'}`);
      });
      
      // Return the most recent chat ID
      const lastUpdate = data.result[data.result.length - 1];
      const lastChatId = lastUpdate.message?.chat?.id;
      
      console.log(`\n  ➡️  Most recent chat ID: ${lastChatId}`);
      return lastChatId;
    } else {
      console.log(`❌ No updates found for ${botName}`);
      console.log(`   Send a message to @${botUsername} on Telegram NOW, then run this script again.`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 GETTING REAL TELEGRAM CHAT IDs');
  console.log('==================================');
  console.log('⚠️  First, message both bots on Telegram if you haven\'t recently:');
  console.log('   - @JS63s_bot (FSAA Bot)');
  console.log('   - @dbkg_bot (Kajgod Bot)');
  console.log('\nPress Enter after you\'ve messaged both bots...');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  console.log('\n' + '='.repeat(50));
  
  const fsaaChatId = await getChatId(
    process.env.TELEGRAM_BOT_TOKEN, 
    'FSAA Bot', 
    'JS63s_bot'
  );
  
  const kajgodChatId = await getChatId(
    process.env.TELEGRAM_BOT_TOKEN_KAJGOD, 
    'Kajgod Bot', 
    'dbkg_bot'
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📝 UPDATE YOUR .env FILE WITH THESE VALUES:\n');
  
  if (fsaaChatId) {
    console.log(`FSAA_CHAT_ID=${fsaaChatId}`);
  } else {
    console.log('# FSAA_CHAT_ID - could not detect, check above errors');
  }
  
  if (kajgodChatId) {
    console.log(`KAJGOD_CHAT_ID=${kajgodChatId}`);
  } else {
    console.log('# KAJGOD_CHAT_ID - could not detect, check above errors');
  }
  
  console.log('\n✅ After updating .env, restart your app: npm run start:production');
}

main();