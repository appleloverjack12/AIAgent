import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';
import { registerSchedulers } from './scheduler.js';

// Store runtime for scheduler
let globalRuntime: IAgentRuntime | null = null;
let schedulersRegistered = false;

const initCharacter = async ({ runtime, characterName }: { runtime: IAgentRuntime; characterName: string }) => {
  logger.info(`Initializing character: ${characterName}`);
  
  // Store runtime when first agent initializes
  if (!globalRuntime) {
    globalRuntime = runtime;
    logger.info('Runtime stored');
  }
  
  // Register schedulers ONLY ONCE
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