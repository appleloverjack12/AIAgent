import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';
import { registerSchedulers } from './scheduler.js';
import { CustomTelegramClient } from './telegram-client.js';

let globalRuntime: IAgentRuntime | null = null;
let schedulersRegistered = false;

const initCharacter = async ({ runtime, characterName }: { runtime: IAgentRuntime; characterName: string }) => {
  logger.info(`Initializing character: ${characterName}`);
  
  if (characterName === 'FSAAManagerAgent' && process.env.TELEGRAM_BOT_TOKEN) {
    const client = new CustomTelegramClient(process.env.TELEGRAM_BOT_TOKEN, runtime, fsaaCharacter);
    client.startPolling();
  }
  
  if (characterName === 'KajgodIntelAgent' && process.env.TELEGRAM_BOT_TOKEN_KAJGOD) {
    const client = new CustomTelegramClient(process.env.TELEGRAM_BOT_TOKEN_KAJGOD, runtime, kajgodCharacter);
    client.startPolling();
  }
  
  // Only set globalRuntime and schedulers ONCE
  if (!globalRuntime) {
    globalRuntime = runtime;
    logger.info('Runtime stored');
  }
  
  if (!schedulersRegistered) {
    schedulersRegistered = true;
    logger.info('Registering schedulers...');
    
    setTimeout(() => {
      try {
        registerSchedulers(runtime);
        logger.info('✅ Schedulers registered successfully');
      } catch (error) {
        logger.error('Failed to register schedulers:', error);
        schedulersRegistered = false;
      }
    }, 2000);
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