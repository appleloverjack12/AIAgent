import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';
import { registerSchedulers } from './scheduler.js';
import { validate as uuidValidate } from 'uuid';

type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Store runtime for scheduler
let globalRuntime: IAgentRuntime | null = null;
let schedulersRegistered = false; // Flag to prevent double registration

// UUID conversion function
const chatIdToRoomId = (chatId: string): UUID => {
  if (uuidValidate(chatId)) {
    return chatId as UUID;
  }
  const hash = require('crypto').createHash('md5').update(chatId).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}` as UUID;
};

const initCharacter = async ({ runtime, characterName }: { runtime: IAgentRuntime; characterName: string }) => {
  logger.info(`Initializing character: ${characterName}`);
  
  // Store runtime when first agent initializes
  if (!globalRuntime) {
    globalRuntime = runtime;
    logger.info('Runtime stored');
  }
  
  // Register schedulers ONLY ONCE, when the first agent initializes
  if (!schedulersRegistered) {
    schedulersRegistered = true;
    logger.info('Registering schedulers...');
    
    // Small delay to ensure database is ready
    setTimeout(() => {
      try {
        registerSchedulers(runtime);
        logger.info('✅ Schedulers registered successfully');
      } catch (error) {
        logger.error('Failed to register schedulers:', error);
        schedulersRegistered = false; // Reset flag if failed
      }
    }, 2000);
  }
  
  if (characterName === 'FSAAManagerAgent') {
    logger.info(`FSAA agent ready - Chat ID: ${process.env.FSAA_CHAT_ID} -> Room: ${chatIdToRoomId(process.env.FSAA_CHAT_ID!)}`);
  }
  
  if (characterName === 'KajgodIntelAgent') {
    logger.info(`Kajgod agent ready - Chat ID: ${process.env.KAJGOD_CHAT_ID} -> Room: ${chatIdToRoomId(process.env.KAJGOD_CHAT_ID!)}`);
  }
};

export const fsaaAgent: ProjectAgent = {
  character: fsaaCharacter,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime, characterName: fsaaCharacter.name }),
};

export const kajgodAgent: ProjectAgent = {
  character: kajgodCharacter,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime, characterName: kajgodCharacter.name }),
};

const project: Project = {
  agents: [fsaaAgent, kajgodAgent],
};

export function getRuntime() {
  return globalRuntime;
}

export default project;