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

  constructor(token: string, runtime: IAgentRuntime) {
    this.token = token;
    this.runtime = runtime;
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

  async handleMessage(message: TelegramUpdate['message']) {
    if (!message?.text) return;

    logger.info(`Received: ${message.text} from ${message.from.first_name}`);

    try {
      const response = await this.runtime.completion({
        context: message.text,
        stop: ['\n'],
      });

      if (response) {
        await this.sendMessage(message.chat.id, response);
        logger.info(`✅ Sent response to ${message.from.first_name}`);
      }
    } catch (error) {
      logger.error('Error generating response:', error);
      await this.sendMessage(message.chat.id, "Sorry, I encountered an error.");
    }
  }

  startPolling() {
    this.polling = true;
    logger.info('✅ Custom Telegram client started');

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
          logger.error('Polling error:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    poll();
  }
}