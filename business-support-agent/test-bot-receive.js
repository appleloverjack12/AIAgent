import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

async function testBot(token, botName, botUsername) {
  console.log(`\n🤖 Testing ${botName} (@${botUsername})...`);
  
  // First, check if bot is online
  try {
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await me.json();
    if (meData.ok) {
      console.log(`✅ Bot is online: @${meData.result.username}`);
    } else {
      console.log(`❌ Bot not found: ${meData.description}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to Telegram: ${error.message}`);
    return;
  }
  
  // Check for any recent updates
  try {
    console.log(`📥 Checking for messages sent to @${botUsername}...`);
    const updates = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updatesData = await updates.json();
    
    if (updatesData.ok) {
      if (updatesData.result.length === 0) {
        console.log(`❌ No messages found. Did you send a message to @${botUsername}?`);
        console.log(`   Instructions:`);
        console.log(`   1. Open Telegram`);
        console.log(`   2. Search for @${botUsername}`);
        console.log(`   3. Click START or send any message`);
        console.log(`   4. Wait 2 seconds`);
        console.log(`   5. Run this script again`);
      } else {
        console.log(`✅ Found ${updatesData.result.length} messages!`);
        updatesData.result.forEach((update, i) => {
          const msg = update.message;
          if (msg) {
            console.log(`\n  Message ${i+1}:`);
            console.log(`    From: ${msg.from.first_name} (ID: ${msg.from.id})`);
            console.log(`    Chat ID: ${msg.chat.id}`);
            console.log(`    Text: ${msg.text}`);
            console.log(`    Date: ${new Date(msg.date * 1000).toLocaleString()}`);
          }
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error checking updates: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 TELEGRAM BOT RECEIVER TEST');
  console.log('==============================');
  
  await testBot(process.env.TELEGRAM_BOT_TOKEN, 'FSAA Bot', 'JS63s_bot');
  console.log('\n' + '-'.repeat(50));
  await testBot(process.env.TELEGRAM_BOT_TOKEN_KAJGOD, 'Kajgod Bot', 'dbkg_bot');
}

main();