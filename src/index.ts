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
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the correct path
const envPath = path.join(process.cwd(), '.env');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

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

// Add error handling for server
server.on('error', (err) => {
  console.error('❌ Healthcheck server error:', err);
});

// Now import ElizaOS modules (after server setup)
import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';
import { registerSchedulers } from './scheduler.js';

// Declare global variables BEFORE using them
let globalRuntime: IAgentRuntime | null = null;
let schedulersRegistered = false;

console.log('🔧 Setting up message handler...');

// This is a hack to force message responses
process.on('message', (msg) => {
  console.log('📨 Received message event:', msg);
});

// Add this to prevent process from exiting
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
});

// Set up the message polling
setTimeout(async () => {
  console.log('🤖 Starting Telegram connection test...');
  
  try {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');
    
    // Test FSAA bot
    console.log('📤 Testing FSAA bot connection...');
    const fsaaTest = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.FSAA_CHAT_ID,
        text: '🤖 Bot is online and connected to Telegram!'
      })
    });
    
    const fsaaResult = await fsaaTest.json();
    if (fsaaResult.ok) {
      console.log('✅ FSAA test message sent successfully');
    } else {
      console.error('❌ FSAA test failed:', fsaaResult.description);
    }
    
    // Test Kajgod bot
    console.log('📤 Testing Kajgod bot connection...');
    const kajgodTest = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_KAJGOD}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.KAJGOD_CHAT_ID,
        text: '🤖 Bot je online i spojen na Telegram!'
      })
    });
    
    const kajgodResult = await kajgodTest.json();
    if (kajgodResult.ok) {
      console.log('✅ Kajgod test message sent successfully');
    } else {
      console.error('❌ Kajgod test failed:', kajgodResult.description);
    }
    
  } catch (error) {
    console.error('❌ Telegram test error:', error);
  }
  
  console.log('✅ Startup complete - keeping process alive');
}, 5000);

console.log('✅ All systems initialized - waiting for events...');

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