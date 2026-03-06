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

  private getBriefingQuery(): string {
    if (this.character.name === 'FSAAManagerAgent') {
      const today = new Date().toISOString().split('T')[0];
      return `automotive industry news ${today} OR Formula Student latest OR car manufacturer partnerships OR automotive sponsorship`;
    }
    
    if (this.character.name === 'KajgodIntelAgent') {
      const today = new Date().toISOString().split('T')[0];
      return `event management Croatia Slovenia Austria ${today} OR marketing events Zagreb Ljubljana Vienna OR sponzorstvo događaji ${today} OR business events Balkan`;
    }
    
    return 'latest news today';
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
      if (!process.env.BRAVE_API_KEY) {
        logger.warn('BRAVE_API_KEY not set');
        return '';
      }

      logger.info(`🔍 Searching web: ${query}`);
      
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&text_decorations=false`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': process.env.BRAVE_API_KEY
          }
        }
      );
      
      if (!response.ok) {
        logger.error(`Brave API error: ${response.status}`);
        return '';
      }
      
      const data: any = await response.json();
      const results = data.web?.results || [];
      
      if (results.length === 0) {
        return 'Nema pronađenih rezultata.';
      }
      
      const formattedResults = results
        .slice(0, 10)
        .map((r: any, i: number) => 
          `[${i + 1}] ${r.title}\n${r.description}\nIzvor: ${r.url}\n`
        )
        .join('\n');
        
      logger.info(`✅ Found ${results.length} search results`);
      return `NAJNOVIJE VIJESTI S WEBA:\n\n${formattedResults}`;
      
    } catch (error) {
      logger.error('Web search error:', error);
      return '';
    }
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      logger.info(`📨 Processing: ${userMessage}`);
      
      const responseLanguage = this.character.name === 'FSAAManagerAgent' ? 'English' : 'Croatian';
      
      let searchQuery = userMessage;
      const isBriefing = userMessage.toLowerCase().includes('/briefing') || 
                         userMessage.toLowerCase().includes('briefing') ||
                         userMessage.toLowerCase().includes('izvještaj');
      
      if (isBriefing) {
        searchQuery = this.getBriefingQuery();
        logger.info(`🎯 Briefing detected, searching: ${searchQuery}`);
      }
      
      const searchContext = await this.webSearch(searchQuery);

      const systemPrompt = `Ime: ${this.character.name}

Bio: ${this.character.bio?.join('\n') || ''}

Znanje: ${this.character.knowledge?.join('\n') || ''}

Stil: ${this.character.style?.all?.join(', ') || ''}

JEZIK ODGOVORA: UVIJEK odgovaraj na ${responseLanguage} jeziku!

VAŽNO: Danas je ${new Date().toLocaleDateString('hr-HR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

${searchContext ? `\n=== NAJNOVIJI WEB REZULTATI ===\n${searchContext}\n\nKoristi OVE PRAVE informacije. Analiziraj rezultate i izvuci KONKRETNE prilike, podatke o tvrtkama, događajima.\n` : ''}

${isBriefing ? `\nOVO JE BRIEFING REQUEST. Formatiraj odgovor na ${responseLanguage} jeziku kao profesionalni izvještaj s:
- **Najnovije vijesti** relevantne za ${this.character.name}
- **Prilike** (novi partneri, događaji, natječaji)
- **Akcije** (konkretni sljedeći koraci)
- **Važni datumi** ako postoje

Koristi **bold** za naslove sekcija.\n` : ''}

PONOVI: Odgovaraj ISKLJUČIVO na ${responseLanguage} jeziku koristeći informacije iz web rezultata.`;

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
            { role: 'user', content: isBriefing ? 'Generate today\'s briefing with the latest information.' : userMessage }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      const data: any = await openaiResponse.json();
      
      if (data.error) {
        logger.error('OpenAI error:', data.error);
        return `Greška: ${data.error.message}`;
      }
      
      return data.choices?.[0]?.message?.content || "Nisam mogao generirati odgovor.";
      
    } catch (error) {
      logger.error('Response generation error:', error);
      return "Oprosti, došlo je do greške pri generiranju odgovora.";
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