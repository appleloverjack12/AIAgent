import cron from 'node-cron';
import { logger, type IAgentRuntime } from '@elizaos/core';
import fetch from 'node-fetch';

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    
    const data: any = await response.json();
    return data.ok;
  } catch (error) {
    logger.error(`Failed to send to chat ${chatId}:`, error);
    return false;
  }
}

async function generateBriefing(characterName: string): Promise<string> {
  try {
    // Web search
    const today = new Date().toISOString().split('T')[0];
    const searchQuery = characterName === 'FSAA' 
      ? `automotive industry news ${today} Formula Student sponsorship car manufacturer partnerships`
      : `Croatia business news ${today} Slovenia Austria marketing events Zagreb Vienna Ljubljana event production`;

    logger.info(`🔍 Generating briefing for ${characterName}: ${searchQuery}`);

    const searchResponse = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=10`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': process.env.BRAVE_API_KEY || ''
        }
      }
    );

    const searchData: any = await searchResponse.json();
    const results = searchData.web?.results || [];
    
    const formattedResults = results
      .slice(0, 10)
      .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}\n`)
      .join('\n');

    // Generate briefing with OpenAI
    const language = characterName === 'FSAA' ? 'English' : 'Croatian';
    const systemPrompt = `You are ${characterName}. 

LANGUAGE: Always respond in ${language}!

Today is ${new Date().toLocaleDateString('hr-HR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

=== WEB SEARCH RESULTS ===
${formattedResults}

Generate a professional daily briefing with:

**Latest News** relevant for ${characterName}
- For EACH news item, include company/person name
- Extract CONTACT INFORMATION (email, phone, LinkedIn, website)

**Opportunities** (new partners, events, tenders)
- Specific companies seeking partners
- CONTACT PEOPLE with details (name, position, email, LinkedIn)

**Actions** (concrete next steps)
- For EACH action, specify WHO to contact
- Include HOW to contact them (email, LinkedIn, phone)

**Important Dates** if any

MANDATORY: For EVERY opportunity or company mentioned, try to find and include:
- 📧 Email contact
- 📞 Phone (if available)
- 🔗 LinkedIn profile
- 🌐 Website

Use **bold** for section headers and 📧📞🔗🌐 emoji for contacts.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate today\'s briefing with the latest information.' }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const aiData: any = await aiResponse.json();
    return aiData.choices?.[0]?.message?.content || 'Failed to generate briefing.';

  } catch (error) {
    logger.error('Briefing generation error:', error);
    return 'Error generating briefing.';
  }
}

export function registerSchedulers(runtime: IAgentRuntime) {
  logger.info('📅 Registering schedulers...');

  // FSAA briefing at 8 AM daily
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ FSAA 8 AM briefing triggered');
    
    const briefing = await generateBriefing('FSAA');
    
    const chatIds = process.env.FSAA_CHAT_IDS?.split(',').map(id => id.trim()) || 
                    [process.env.FSAA_CHAT_ID || ''];
    
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      logger.error('TELEGRAM_BOT_TOKEN not set');
      return;
    }
    
    for (const chatId of chatIds) {
      if (chatId) {
        await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, briefing);
        logger.info(`✅ Sent FSAA briefing to ${chatId}`);
      }
    }
  }, {
    timezone: 'Europe/Zagreb'
  });

  // Kajgod briefing at 8 AM daily
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ Kajgod 8 AM briefing triggered');
    
    const briefing = await generateBriefing('Kajgod');
    
    const chatIds = process.env.KAJGOD_CHAT_IDS?.split(',').map(id => id.trim()) || 
                    [process.env.KAJGOD_CHAT_ID || ''];
    
    if (!process.env.TELEGRAM_BOT_TOKEN_KAJGOD) {
      logger.error('TELEGRAM_BOT_TOKEN_KAJGOD not set');
      return;
    }
    
    for (const chatId of chatIds) {
      if (chatId) {
        await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN_KAJGOD, chatId, briefing);
        logger.info(`✅ Sent Kajgod briefing to ${chatId}`);
      }
    }
  }, {
    timezone: 'Europe/Zagreb'
  });

  logger.info('✅ Schedulers registered - Direct briefings at 8:00 AM');
}