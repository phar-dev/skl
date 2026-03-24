// Paths del sistema skl
import os from "node:os";
import path from "node:path";
import type { AgentConfig, AgentType } from "../types/index.js";

const HOME = os.homedir();

// Directorio principal de skl
export const SKL_DIR = path.join(HOME, ".agents");
export const SKL_SKILLS_DIR = path.join(SKL_DIR, "skills");
export const SKL_CONFIG_FILE = path.join(SKL_DIR, "config.json");

// Agentes soportados
export const AGENTS: AgentConfig[] = [
  {
    id: "claude",
    name: "Claude Code",
    skillsPath: path.join(HOME, ".claude", "skills"),
  },
  {
    id: "opencode",
    name: "OpenCode",
    skillsPath: path.join(HOME, ".opencode", "skills"),
  },
  {
    id: "codex",
    name: "Codex",
    skillsPath: path.join(HOME, ".codex", "skills"),
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    skillsPath: path.join(HOME, ".copilot", "skills"),
  },
];

export function getAgentById(id: AgentType): AgentConfig | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function getAgentIds(): AgentType[] {
  return AGENTS.map((a) => a.id);
}

/**
 * Obtiene la ruta de skills de un agente relativa a un directorio base
 */
export function getAgentSkillsPathRelative(
  agentId: AgentType,
  baseDir: string,
): string {
  const agent = getAgentById(agentId);
  if (!agent) return "";

  // Extraer el nombre del directorio (ej: ".claude" de "/home/user/.claude/skills")
  const agentDir = path.basename(path.dirname(agent.skillsPath));
  return path.join(baseDir, agentDir, "skills");
}

// ============================================
// Paths del proyecto actual (process.cwd())
// ============================================

/**
 * Directorio .agents del proyecto actual
 */
export function getProjectSKLDir(): string {
  return path.join(process.cwd(), ".agents");
}

/**
 * Directorio de skills del proyecto actual (.agents/skills)
 */
export function getProjectSKLSkillsDir(): string {
  return path.join(getProjectSKLDir(), "skills");
}

/**
 * Obtiene el path de skills de un agente en el proyecto actual
 */
export function getProjectAgentSkillsPath(agentId: AgentType): string {
  return getAgentSkillsPathRelative(agentId, getProjectSKLDir());
}
