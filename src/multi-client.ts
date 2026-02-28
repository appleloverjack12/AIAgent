import { type Character } from '@elizaos/core';
import * as fs from 'fs';
import * as path from 'path';
import { generateCharacterFromConfig } from './generate-character';

// Load all active client configurations
export async function loadAllClients(): Promise<Map<string, Character>> {
  const clients = new Map<string, Character>();
  const activeClientsPath = path.join(process.cwd(), 'clients', 'active');
  
  if (!fs.existsSync(activeClientsPath)) {
    console.log('No active clients found');
    return clients;
  }

  const files = fs.readdirSync(activeClientsPath);
  const configFiles = files.filter(f => f.endsWith('.json') && !f.includes('template'));

  for (const file of configFiles) {
    const clientId = file.replace('.json', '');
    try {
      const character = await generateCharacterFromConfig(clientId);
      clients.set(clientId, character);
      console.log(`✅ Loaded client: ${clientId}`);
    } catch (error) {
      console.error(`❌ Failed to load client ${clientId}:`, error);
    }
  }

  return clients;
}

// Get character for specific client
export function getClientCharacter(clientId: string): Character {
  const characterPath = path.join(
    process.cwd(),
    'clients',
    'active',
    `${clientId}-character.ts`
  );

  if (!fs.existsSync(characterPath)) {
    throw new Error(`Character file not found for client: ${clientId}`);
  }

  // Dynamic import
  const character = require(characterPath).character;
  return character;
}