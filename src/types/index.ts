// Tipos del sistema skl

export type AgentType = 'claude' | 'opencode' | 'codex' | 'copilot';

export interface AgentConfig {
  id: AgentType;
  name: string;
  skillsPath: string;
}

// Skill descubierta en un repo
export interface DiscoveredSkill {
  name: string;
  description: string;
  path: string;           // Path relativo al repo
  fullPath: string;        // Path absoluto
  repoPath?: string;      // Path al repo local
}

// Skill instalada localmente
export interface InstalledSkill {
  name: string;
  path: string;
  lastModified: Date | null;
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

// Options para install
export interface InstallOptions {
  repo?: string;
  skill?: string[];      // Nombres de skills a instalar
  list?: boolean;         // Solo listar skills disponibles
  all?: boolean;          // Instalar todas
  global?: boolean;       // Instalar globalmente (~/.agents)
  yes?: boolean;          // Skip confirmaciones
}
