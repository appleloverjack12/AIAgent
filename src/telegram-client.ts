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
    return `automotive industry news ${today} Formula Student sponsorship opportunities car manufacturer partnerships automotive events`;
  }
  
  if (this.character.name === 'KajgodIntelAgent') {
    const today = new Date().toISOString().split('T')[0];
    // Broader search - include general business and event news
    return `Croatia business news ${today} Slovenia startup funding Austria marketing events corporate events Zagreb Vienna Ljubljana new companies advertising agencies event production`;
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
  async findContactInfo(companyName: string, websiteUrl?: string): Promise<string> {
  try {
    // Search for contact information
    const contactQuery = `${companyName} contact email phone LinkedIn`;
    logger.info(`📧 Searching contacts for: ${companyName}`);
    
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(contactQuery)}&count=3`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': process.env.BRAVE_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) return '';
    
    const data: any = await response.json();
    const results = data.web?.results || [];
    
    // Extract contact information from results
    const contactInfo: string[] = [];
    
    for (const result of results) {
      const text = `${result.title} ${result.description}`.toLowerCase();
      
      // Look for email patterns
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
      if (emailMatch) {
        contactInfo.push(`Email: ${emailMatch[0]}`);
      }
      
      // Look for phone patterns
      const phoneMatch = text.match(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g);
      if (phoneMatch) {
        contactInfo.push(`Phone: ${phoneMatch[0]}`);
      }
      
      // Look for LinkedIn
      if (text.includes('linkedin.com')) {
        const linkedinMatch = result.url?.match(/linkedin\.com\/company\/[\w-]+/);
        if (linkedinMatch) {
          contactInfo.push(`LinkedIn: https://${linkedinMatch[0]}`);
        }
      }
      
      // Add website if found
      if (result.url && !contactInfo.some(c => c.includes('Website'))) {
        contactInfo.push(`Website: ${result.url}`);
      }
    }
    
    return contactInfo.length > 0 ? contactInfo.slice(0, 3).join(', ') : '';
    
  } catch (error) {
    logger.error('Contact search error:', error);
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

${searchContext ? `\n=== NAJNOVIJI WEB REZULTATI ===\n${searchContext}\n\nKoristi OVE PRAVE informacije. Analiziraj rezultate i izvuci:
- KONKRETNE tvrtke, proizvode, događaje
- KONTAKT INFORMACIJE (emailove, telefone, web stranice, LinkedIn profile)
- Imena osoba za kontakt (CEO, Marketing Director, Event Manager)
\n` : ''}

${isBriefing ? `\nOVO JE BRIEFING REQUEST. Formatiraj odgovor na ${responseLanguage} jeziku kao profesionalni izvještaj s:

**Najnovije vijesti** relevantne za ${this.character.name}
- Za SVAKU vijest navedi ime tvrtke/osobe
- Za SVAKU priliku izvuci i prikaži KONTAKT INFORMACIJE (email, telefon, LinkedIn, website)

**Prilike** (novi partneri, događaji, natječaji)
- Konkretne tvrtke koje traže partnere
- KONTAKT OSOBE i njihovi podaci (ime, pozicija, email, LinkedIn)

**Akcije** (konkretni sljedeći koraci)
- Za SVAKU akciju navedi KONKRETNU OSOBU ili tvrtku za kontaktirati
- Navedi KAKO ih kontaktirati (email, LinkedIn message, phone)

**Važni datumi** ako postoje

OBAVEZNO: Za SVAKU priliku ili tvrtku spomenutu u izvještaju pokušaj pronaći i navesti:
- 📧 Email kontakt
- 📞 Telefon (ako postoji)
- 🔗 LinkedIn profil (osobe ili tvrtke)
- 🌐 Website

Koristi **bold** za naslove sekcija i 📧📞🔗🌐 emoji za kontakt informacije.\n` : ''}

PONOVI: Odgovaraj ISKLJUČIVO na ${responseLanguage} jeziku koristeći informacije iz web rezultata. OBAVEZNO uključi kontakt informacije gdje god je moguće!`;
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