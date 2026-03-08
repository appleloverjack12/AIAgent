import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import { character as fsaaCharacter } from './character-fsaa-manager-agent.js';
import { character as kajgodCharacter } from './character-kajgod-agent.js';

export const fsaaAgent: ProjectAgent = {
  character: fsaaCharacter,
};

export const kajgodAgent: ProjectAgent = {
  character: kajgodCharacter,
};

const project: Project = {
  agents: [fsaaAgent, kajgodAgent],
};

export default project;