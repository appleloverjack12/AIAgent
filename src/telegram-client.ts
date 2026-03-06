import fetch from 'node-fetch';
import { logger, type IAgentRuntime, type Character } from '@elizaos/core';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string };
    chat: { id: number };
    text?: string;
  };
}

export class CustomTelegramClient {
  private token: string;
  private runtime: IAgentRuntime;
  private character: Character;
  private offset: number = 0;
  private polling: boolean = false;

  constructor(token: string, runtime: IAgentRuntime, character: Character) {
    this.token = token;
    this.runtime = runtime;
    this.character = character;
  }

  async sendMessage(chatId: number, text: string) {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    return response.json();
  }

  async webSearch(query: string): Promise<string> {
    try {
      // Use brave search or google - adjust based on your preference
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      logger.info(`🔍 Searching web for: ${query}`);
      
      // For now, indicate that search would happen
      return `[Web search results for: ${query}]`;
    } catch (error) {
      logger.error('Web search error:', error);
      return '';
    }
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      // Check if we need web search
      const needsSearch = userMessage.toLowerCase().includes('vijesti') || 
                         userMessage.toLowerCase().includes('danas') ||
                         userMessage.toLowerCase().includes('briefing');

      let searchContext = '';
      if (needsSearch) {
        searchContext = await this.webSearch(userMessage);
      }

      // Build system prompt with character data
      const systemPrompt = `Ime: ${this.character.name}

Bio: ${this.character.bio?.join('\n') || ''}

Znanje: ${this.character.knowledge?.join('\n') || ''}

Stil odgovaranja: ${this.character.style?.all?.join(', ') || ''}
${this.character.style?.chat?.join(', ') || ''}

${searchContext ? `Koristi ove web search rezultate: ${searchContext}` : ''}

Odgovaraj u skladu sa svojim karakterom i znanjem. Ako tražiš najnovije informacije, koristi web search.`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data: any = await openaiResponse.json();
      return data.choices?.[0]?.message?.content || "Nisam mogao generirati odgovor.";
    } catch (error) {
      logger.error('OpenAI error:', error);
      return "Oprosti, došlo je do greške.";
    }
  }

  async getUpdates(): Promise<TelegramUpdate[]> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`
    );
    const data: any = await response.json();
    return data.result || [];
  }

  async handleMessage(message: TelegramUpdate['message']) {
    if (!message?.text) return;

    logger.info(`[${this.character.name}] Primio: ${message.text}`);

    const response = await this.generateResponse(message.text);
    await this.sendMessage(message.chat.id, response);
    logger.info(`[${this.character.name}] ✅ Poslao odgovor`);
  }

  startPolling() {
    this.polling = true;
    logger.info(`✅ ${this.character.name} Telegram klijent pokrenut`);

    const poll = async () => {
      while (this.polling) {
        try {
          const updates = await this.getUpdates();
          
          for (const update of updates) {
            this.offset = update.update_id + 1;
            if (update.message) {
              await this.handleMessage(update.message);
            }
          }
        } catch (error) {
          logger.error(`[${this.character.name}] Greška:`, error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    poll();
  }
}