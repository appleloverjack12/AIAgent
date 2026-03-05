import cron from 'node-cron';
import { logger, type IAgentRuntime } from '@elizaos/core';
import fetch from 'node-fetch';

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

let fsaaLastUpdateId = 0;
let kajgodLastUpdateId = 0;

async function sendTelegramMessage(token: string, chatId: string, text: string, botName: string): Promise<boolean> {
  try {
    logger.info(`📤 [${botName}] Sending message to chat ID: ${chatId}`);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    
    const data = await response.json() as TelegramResponse;
    
    if (data.ok) {
      logger.info(`✅ [${botName}] Message sent successfully`);
      return true;
    } else {
      logger.error(`❌ [${botName}] Failed: ${data.description}`);
      return false;
    }
  } catch (error) {
    logger.error(`❌ [${botName}] Error:`, error);
    return false;
  }
}

export async function startMessagePolling(runtime: IAgentRuntime) {
  console.log('📞 Starting Telegram message polling...');
  
  const pollMessages = async () => {
    try {
      // Poll FSAA bot
      const fsaaResponse = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates?offset=${fsaaLastUpdateId + 1}&timeout=10`
      );
      const fsaaData = await fsaaResponse.json() as any;
      
      if (fsaaData.ok && fsaaData.result.length > 0) {
        for (const update of fsaaData.result) {
          fsaaLastUpdateId = update.update_id;
          
          if (update.message && update.message.text && !update.message.from.is_bot) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            console.log(`📨 FSAA received: "${text}"`);
            
            // Generate response
            let response = '';
            if (text.toLowerCase() === '/briefing') {
              response = "Generating your FSAA briefing... Please wait while I search the web.";
            } else if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
              response = "Hello! I'm the FSAA intelligence agent. Use /briefing to get today's automotive industry briefing.";
            } else {
              response = "I'm here to help with FSAA intelligence. Try /briefing for today's report.";
            }
            
            // Send response
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: response
              })
            });
            
            console.log(`✅ FSAA responded to: "${text}"`);
          }
        }
      }
      
      // Poll Kajgod bot
      const kajgodResponse = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_KAJGOD}/getUpdates?offset=${kajgodLastUpdateId + 1}&timeout=10`
      );
      const kajgodData = await kajgodResponse.json() as any;
      
      if (kajgodData.ok && kajgodData.result.length > 0) {
        for (const update of kajgodData.result) {
          kajgodLastUpdateId = update.update_id;
          
          if (update.message && update.message.text && !update.message.from.is_bot) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            console.log(`📨 Kajgod received: "${text}"`);
            
            // Generate response in Croatian
            let response = '';
            if (text.toLowerCase() === '/briefing') {
              response = "Generiram vaš Kajgod izvještaj... Molim pričekajte.";
            } else if (text.toLowerCase().includes('bok') || text.toLowerCase().includes('hello')) {
              response = "Bok! Ja sam Kajgod intel agent. Pošaljite /briefing za današnji poslovni izvještaj.";
            } else {
              response = "Kako vam mogu pomoći? Pokušajte /briefing.";
            }
            
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_KAJGOD}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: response
              })
            });
            
            console.log(`✅ Kajgod responded to: "${text}"`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  };
  
  // Run immediately and then every 2 seconds
  await pollMessages();
  setInterval(pollMessages, 2000);
}

export function registerSchedulers(runtime: IAgentRuntime) {
  logger.info('📅 Registering schedulers...');

  // Verify environment variables are loaded
  if (!process.env.FSAA_CHAT_ID || !process.env.KAJGOD_CHAT_ID || 
      !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_BOT_TOKEN_KAJGOD) {
    logger.error('❌ Missing required environment variables');
    return;
  }

  const fsaaChatId = process.env.FSAA_CHAT_ID;
  const kajgodChatId = process.env.KAJGOD_CHAT_ID;
  const fsaaToken = process.env.TELEGRAM_BOT_TOKEN;
  const kajgodToken = process.env.TELEGRAM_BOT_TOKEN_KAJGOD;

  logger.info(`📊 Scheduler configured for FSAA (${fsaaChatId}) and Kajgod (${kajgodChatId})`);

  // FSAA briefing at 8 AM daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('🚗 Triggering FSAA briefing...');
      
      const query = `/briefing

What are today's automotive business developments, sponsor opportunities, and Formula Student news? Search the web and provide today's FSAA management briefing with specific companies and actionable insights. Include contact information for key opportunities.`;
      
      await sendTelegramMessage(
        fsaaToken,
        fsaaChatId,
        query,
        'FSAA'
      );
    },
    { timezone: 'Europe/Zagreb' }
  );

  // Kajgod briefing at 8 AM daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('🍀 Triggering Kajgod briefing...');
      
      const query = `/briefing

Daj mi detaljan današnji Kajgod izvještaj. Pretraži web za najnovije poslovne vijesti, prilike za eventove, potencijalne klijente, i partnerske prilike iz Hrvatske, Slovenije i Austrije. Fokusiraj se na konkretne tvrtke i prilike.`;
      
      await sendTelegramMessage(
        kajgodToken,
        kajgodChatId,
        query,
        'Kajgod'
      );
    },
    { timezone: 'Europe/Zagreb' }
  );

  logger.info('✅ Schedulers registered - Daily briefings at 8:00 AM');
  
  // Send a test message immediately to verify everything works
  setTimeout(async () => {
    logger.info('🧪 Sending test message to verify Telegram connection...');
    await sendTelegramMessage(
      fsaaToken,
      fsaaChatId,
      "✅ Scheduler is online and will send daily briefings at 8:00 AM",
      'FSAA-Test'
    );
  }, 5000);
}

export function getRuntime(): IAgentRuntime | null {
  return null;
}