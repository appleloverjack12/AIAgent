import 'dotenv/config';
import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { character } from '../src/character-kajgod-agent.ts';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN_KAJGOD);

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const recipients = [
  '8015903268', // Jakov
//  '1661696326'  Tibor
];

async function generateBriefing() {
  console.log('🤖 Generating briefing with FSAAManagerAgent character...');
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const systemPrompt = `${character.system}

KNOWLEDGE BASE:
${character.knowledge.join('\n')}

Today's date: ${today}

Your task: Generate today's daily FSAA management briefing. Search the web for latest automotive industry news and provide actionable intelligence following your briefing format.`;

  const userPrompt = "What are today's automotive business developments and sponsor opportunities? Provide today's FSAA management briefing.";

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 2000,
    });
    
    return text;
  } catch (error) {
    console.error('❌ Error generating briefing:', error);
    return `⚠️ Error generating briefing: ${error.message}`;
  }
}
  
cron.schedule('* * * * *', async () => {
  console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Generating daily briefing...`);
  
  const briefing = await generateBriefing();
  
  console.log('📨 Distributing briefing to recipients...');
  
  for (const chatId of recipients) {
    try {
      await bot.sendMessage(
        chatId, 
        `🍀 *Kajgod Briefing*\n📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n${briefing}`,
        { parse_mode: 'Markdown' }
      );
      console.log(`✅ Sent to ${chatId}`);
    } catch (error) {
      console.error(`❌ Failed for ${chatId}:`, error.message);
    }
  }
  
  console.log('✅ Distribution complete');
});

console.log('═══════════════════════════════════════');
console.log('🏁 FSAA Briefing Service ACTIVE');
console.log(`📋 Character: ${character.name}`);
console.log('📅 Schedule: Every minute (testing)');
console.log(`👥 Recipients: ${recipients.length}`);
console.log('🤖 Using full FSAAManagerAgent knowledge');
console.log('═══════════════════════════════════════');