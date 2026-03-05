// THIS MUST BE AT THE VERY TOP - Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the correct path
const envPath = path.join(process.cwd(), '.env');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error.message);
  console.log('Current working directory:', process.cwd());
} else {
  console.log('✅ Environment variables loaded successfully');
}

// Debug environment variables (without exposing full tokens)
console.log('🔍 ENVIRONMENT CHECK:');
console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_BOT_TOKEN length:', process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log('TELEGRAM_BOT_TOKEN_KAJGOD exists:', !!process.env.TELEGRAM_BOT_TOKEN_KAJGOD);
console.log('FSAA_CHAT_ID exists:', !!process.env.FSAA_CHAT_ID);
console.log('KAJGOD_CHAT_ID exists:', !!process.env.KAJGOD_CHAT_ID);

// Now import everything else
import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';
import { registerSchedulers } from './scheduler.js';

let globalRuntime: IAgentRuntime | null = null;
let schedulersRegistered = false;

const initCharacter = async ({ runtime, characterName }: { runtime: IAgentRuntime; characterName: string }) => {
  logger.info(`Initializing character: ${characterName}`);
  
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