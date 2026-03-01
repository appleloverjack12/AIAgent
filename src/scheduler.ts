import cron from 'node-cron';
import { logger, type IAgentRuntime } from '@elizaos/core';
import fetch from 'node-fetch';

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    
    const data = await response.json() as TelegramResponse;
    return data.ok;
  } catch (error) {
    logger.error('Telegram send error:', error);
    return false;
  }
}

export function registerSchedulers(runtime: IAgentRuntime) {
  logger.info('📅 Registering schedulers...');

  const fsaaChatId = process.env.FSAA_CHAT_ID!;
  const kajgodChatId = process.env.KAJGOD_CHAT_ID!;

  // FSAA briefing at 8 AM daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('🚗 Triggering FSAA briefing...');
      
      const query = "What are today's automotive business developments, sponsor opportunities, and Formula Student news? Search the web and provide today's FSAA management briefing with specific companies and actionable insights. Include contact information for key opportunities.";
      
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN!,
        fsaaChatId,
        query
      );
      
      logger.info('✅ FSAA briefing request sent');
    },
    { timezone: 'Europe/Zagreb' }
  );

  // Kajgod briefing at 8 AM daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('🍀 Triggering Kajgod briefing...');
      
      const query = "Daj mi detaljan današnji Kajgod izvještaj. Pretraži web za najnovije poslovne vijesti, prilike za eventove, potencijalne klijente, i partnerske prilike iz Hrvatske, Slovenije i Austrije. Fokusiraj se na konkretne tvrtke i prilike.";
      
      await sendTelegramMessage(
        process.env.TELEGRAM_BOT_TOKEN_KAJGOD!,
        kajgodChatId,
        query
      );
      
      logger.info('✅ Kajgod briefing request sent');
    },
    { timezone: 'Europe/Zagreb' }
  );

  logger.info('✅ Schedulers registered - Daily briefings at 8:00 AM');
}

export function getRuntime(): IAgentRuntime | null {
  return null;
}