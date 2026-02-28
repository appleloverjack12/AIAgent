import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

async function checkNow(token, botName) {
  console.log(`\n🤖 Checking ${botName} (@${botName === 'FSAA' ? 'JS63s_bot' : 'dbkg_bot'})...`);
  
  // Get the last 10 updates
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const data = await response.json();
  
  if (data.ok && data.result.length > 0) {
    console.log(`✅ Found ${data.result.length} total updates`);
    
    // Show the most recent 5 messages
    console.log(`\n📨 Last 5 messages:`);
    const recent = data.result.slice(-5);
    recent.forEach((update, i) => {
      const msg = update.message;
      if (msg) {
        console.log(`\n  ${i+1}. ${new Date(msg.date * 1000).toLocaleTimeString()}`);
        console.log(`     From: ${msg.from.first_name} (ID: ${msg.from.id})`);
        console.log(`     Chat: ${msg.chat.id} (${msg.chat.type})`);
        console.log(`     Text: ${msg.text || '[no text]'}`);
        
        // Check if this is from the scheduler
        if (msg.text?.includes('FSAA') || msg.text?.includes('briefing')) {
          console.log(`     🔴 THIS IS A SCHEDULED MESSAGE!`);
        }
      }
    });
    
    // Count messages in last minute
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    const recentMessages = data.result.filter(u => 
      u.message && u.message.date > oneMinuteAgo
    );
    
    console.log(`\n⏱️  Messages in last minute: ${recentMessages.length}`);
    if (recentMessages.length > 0) {
      console.log(`✅ Messages ARE being delivered!`);
    } else {
      console.log(`❌ No messages in last minute`);
    }
    
  } else {
    console.log(`❌ No updates found for ${botName}`);
    console.log(`   Check if you've ever messaged @${botName === 'FSAA' ? 'JS63s_bot' : 'dbkg_bot'}`);
  }
}

async function main() {
  console.log('🔍 CHECKING FOR SCHEDULED MESSAGES NOW');
  console.log('=======================================');
  console.log(`Current time: ${new Date().toLocaleTimeString()}`);
  console.log(`Scheduler should be running every minute...\n`);
  
  await checkNow(process.env.TELEGRAM_BOT_TOKEN, 'FSAA');
  console.log('\n' + '-'.repeat(50));
  await checkNow(process.env.TELEGRAM_BOT_TOKEN_KAJGOD, 'Kajgod');
}

main();