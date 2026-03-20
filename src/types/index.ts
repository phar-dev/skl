// Tipos del sistema skl

export type AgentType = 'claude' | 'opencode' | 'codex' | 'copilot';

export interface AgentConfig {
  id: AgentType;
  name: string;
  skillsPath: string;
}

export interface Skill {
  name: string;
  path: string;
  lastModified: Date | null;
}

export interface SkillConfig {
  name: string;
  description?: string;
  commands?: string[];
  keywords?: string[];
}

export interface SklConfig {
  version: string;
  defaultAgents: AgentType[];
}

export interface SyncResult {
  agent: AgentType;
  success: boolean;
  skillsLinked: number;
  errors: string[];
}

export interface UpdateResult {
  skill: string;
  status: 'updated' | 'up-to-date' | 'error';
  message: string;
}

export interface DoctorResult {
  path: string;
  status: 'ok' | 'missing' | 'warning' | 'error';
  message: string;
}
