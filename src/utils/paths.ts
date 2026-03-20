// Paths del sistema skl
import os from 'node:os';
import path from 'node:path';
import type { AgentConfig, AgentType } from '../types/index.js';

const HOME = os.homedir();

// Directorio principal de skl
export const SKL_DIR = path.join(HOME, '.agents');
export const SKL_SKILLS_DIR = path.join(SKL_DIR, 'skills');
export const SKL_CONFIG_FILE = path.join(SKL_DIR, 'config.json');

// Agentes soportados
export const AGENTS: AgentConfig[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    skillsPath: path.join(HOME, '.claude', 'skills'),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    skillsPath: path.join(HOME, '.opencode', 'skills'),
  },
  {
    id: 'codex',
    name: 'Codex',
    skillsPath: path.join(HOME, '.codex', 'skills'),
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    skillsPath: path.join(HOME, '.copilot', 'skills'),
  },
];

export function getAgentById(id: AgentType): AgentConfig | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function getAgentIds(): AgentType[] {
  return AGENTS.map((a) => a.id);
}
