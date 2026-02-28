import cron from 'node-cron';
import { logger, type IAgentRuntime } from '@elizaos/core';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// Type for UUID string
type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Convert Telegram chat ID to a valid UUID format
function chatIdToUUID(chatId: string): UUID {
  // If it's already a valid UUID, return it
  if (uuidValidate(chatId)) {
    return chatId as UUID;
  }
  
  // Create a deterministic UUID from the chat ID using MD5 hash
  // This ensures the same chat ID always maps to the same UUID
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(chatId).digest('hex');
  
  // Format as UUID: 8-4-4-4-12
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}` as UUID;
}

export function registerSchedulers(runtime: IAgentRuntime) {
  logger.info('📅 Registering schedulers...');

  const fsaaChatId = process.env.FSAA_CHAT_ID!;
  const kajgodChatId = process.env.KAJGOD_CHAT_ID!;

  // Convert chat IDs to proper UUID format for the database
  const fsaaRoomId = chatIdToUUID(fsaaChatId);
  const kajgodRoomId = chatIdToUUID(kajgodChatId);

  logger.info(`📊 Scheduler configured:`);
  logger.info(`   - FSAA Chat ID: ${fsaaChatId} -> Room UUID: ${fsaaRoomId}`);
  logger.info(`   - Kajgod Chat ID: ${kajgodChatId} -> Room UUID: ${kajgodRoomId}`);

  // Send /briefing command to FSAA at 8 AM daily
  cron.schedule(
    '0 8 * * *', // 8:00 AM every day
    async () => {
      logger.info('🚗 Sending FSAA /briefing command');
      
      try {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: fsaaRoomId, // Now using proper UUID format
            content: {
              text: "/briefing",
            },
            createdAt: Date.now()
          },
          'messages'
        );
        logger.info('✅ FSAA /briefing command sent');
      } catch (error) {
        logger.error('❌ Error sending FSAA command:', error);
      }
    },
    { timezone: 'Europe/Zagreb' }
  );

  // Send /briefing command to Kajgod at 8 AM daily
  cron.schedule(
    '0 8 * * *',
    async () => {
      logger.info('🍀 Sending Kajgod /briefing command');
      
      try {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: kajgodRoomId, // Now using proper UUID format
            content: {
              text: "/briefing",
            },
            createdAt: Date.now()
          },
          'messages'
        );
        logger.info('✅ Kajgod /briefing command sent');
      } catch (error) {
        logger.error('❌ Error sending Kajgod command:', error);
      }
    },
    { timezone: 'Europe/Zagreb' }
  );

  logger.info('✅ Schedulers active - Daily briefings at 8:00 AM');
}