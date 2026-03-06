import fetch from 'node-fetch';
import { logger, type IAgentRuntime } from '@elizaos/core';

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
  private offset: number = 0;
  private polling: boolean = false;
  private characterName: string;

  constructor(token: string, runtime: IAgentRuntime, characterName: string) {
    this.token = token;
    this.runtime = runtime;
    this.characterName = characterName;
  }

  async sendMessage(chatId: number, text: string) {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    return response.json();
  }

  async getUpdates(): Promise<TelegramUpdate[]> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`
    );
    const data: any = await response.json();
    return data.result || [];
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      // Use OpenAI directly
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `You are ${this.characterName}. Respond helpfully.` },
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data: any = await openaiResponse.json();
      return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
      logger.error('OpenAI error:', error);
      return "Sorry, I encountered an error.";
    }
  }

  async handleMessage(message: TelegramUpdate['message']) {
    if (!message?.text) return;

    logger.info(`[${this.characterName}] Received: ${message.text} from ${message.from.first_name}`);

    const response = await this.generateResponse(message.text);
    await this.sendMessage(message.chat.id, response);
    logger.info(`[${this.characterName}] ✅ Sent response`);
  }

  startPolling() {
    this.polling = true;
    logger.info(`✅ ${this.characterName} Telegram client started`);

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
          logger.error(`[${this.characterName}] Polling error:`, error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    poll();
  }
}