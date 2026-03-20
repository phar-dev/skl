// Gestión de configuración ~/.agents/config.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { SKL_DIR, SKL_CONFIG_FILE } from './paths.js';
import { exists, mkdirp } from './fs.js';
import type { SklConfig, AgentType } from '../types/index.js';

const DEFAULT_CONFIG: SklConfig = {
  version: '1.0.0',
  defaultAgents: ['claude', 'opencode'],
};

export async function readConfig(): Promise<SklConfig> {
  try {
    const content = await fs.readFile(SKL_CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as SklConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: SklConfig): Promise<void> {
  await mkdirp(SKL_DIR);
  await fs.writeFile(SKL_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getDefaultAgents(): Promise<AgentType[]> {
  const config = await readConfig();
  return config.defaultAgents;
}

export async function setDefaultAgents(agents: AgentType[]): Promise<void> {
  const config = await readConfig();
  config.defaultAgents = agents;
  await writeConfig(config);
}

export async function addDefaultAgent(agent: AgentType): Promise<void> {
  const config = await readConfig();
  if (!config.defaultAgents.includes(agent)) {
    config.defaultAgents.push(agent);
    await writeConfig(config);
  }
}

export async function removeDefaultAgent(agent: AgentType): Promise<void> {
  const config = await readConfig();
  config.defaultAgents = config.defaultAgents.filter((a) => a !== agent);
  await writeConfig(config);
}

export async function configExists(): Promise<boolean> {
  return exists(SKL_CONFIG_FILE);
}
