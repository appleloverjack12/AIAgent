console.log('\n\n');
console.log('██████╗  ██████╗ ████████╗    ███████╗████████╗ █████╗ ██████╗ ████████╗');
console.log('██╔══██╗██╔═══██╗╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝');
console.log('██████╔╝██║   ██║   ██║       ███████╗   ██║   ███████║██████╔╝   ██║   ');
console.log('██╔══██╗██║   ██║   ██║       ╚════██║   ██║   ██╔══██║██╔══██╗   ██║   ');
console.log('██████╔╝╚██████╔╝   ██║       ███████║   ██║   ██║  ██║██║  ██║   ██║   ');
console.log('╚═════╝  ╚═════╝    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ');
console.log('\n');
console.log('='.repeat(80));
console.log('🚀 BUSINESS SUPPORT AGENT STARTING UP');
console.log('📅 ' + new Date().toISOString());
console.log('💻 Node version:', process.version);
console.log('📂 Current directory:', process.cwd());
console.log('='.repeat(80));

// Import required modules
//import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the correct path
const envPath = path.join(process.cwd(), '.env');
console.log('📁 Loading .env from:', envPath);
//const result = dotenv.config({ path: envPath });



// Debug environment variables
console.log('🔍 ENVIRONMENT CHECK:');
console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_BOT_TOKEN length:', process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log('TELEGRAM_BOT_TOKEN_KAJGOD exists:', !!process.env.TELEGRAM_BOT_TOKEN_KAJGOD);
console.log('FSAA_CHAT_ID exists:', !!process.env.FSAA_CHAT_ID);
console.log('KAJGOD_CHAT_ID exists:', !!process.env.KAJGOD_CHAT_ID);

// Create healthcheck server
const server = http.createServer((req, res) => {
  console.log(`📡 Healthcheck request received: ${req.url}`);
  
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
    console.log('💓 Healthcheck ping successful');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Healthcheck server listening on port 3000');
});

// Add error handling
server.on('error', (err) => {
  console.error('❌ Healthcheck server error:', err);
});

// Now import ElizaOS modules
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