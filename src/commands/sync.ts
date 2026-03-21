// skl sync - Sincroniza skills con agentes
import pc from "picocolors";
import path from "node:path";
// @ts-ignore - prompts no tiene tipos oficiales completos
import prompts from "prompts";
import {
  AGENTS,
  getAgentById,
  getAgentSkillsPathRelative,
} from "../utils/paths.js";
import {
  exists,
  mkdirp,
  createSymlink,
  removeSymlink,
  readdir,
  readdirDirsOnly,
  isSymlink,
  getSymlinkTarget,
} from "../utils/fs.js";
import { log, success, warn, error, header } from "../utils/logger.js";
import { readConfig } from "../utils/config.js";
import type { AgentType, SyncResult } from "../types/index.js";

interface SyncOptions {
  agents?: string;
}

export async function sync(options: SyncOptions): Promise<void> {
  header("skl sync");

  // Siempre toma skills del proyecto actual
  const projectName = path.basename(process.cwd());
  const skillsSourceDir = path.join(process.cwd(), ".agents", "skills");

  log(`${pc.dim("Proyecto:")} ${projectName}`);
  log(`${pc.dim("Origen:")} ${skillsSourceDir}`);

  // 1. Determinar qué agentes usar
  let targetAgents: AgentType[];

  if (options.agents) {
    // Modo batch: --agents=claude,opencode
    targetAgents = parseAgents(options.agents);
    if (targetAgents.length === 0) {
      warn("No se proporcionaron agentes válidos.");
      log("Agentes disponibles: claude, opencode, codex, copilot");
      return;
    }
  } else {
    // Modo interactivo
    targetAgents = await selectAgentsInteractive(skillsSourceDir);
    if (targetAgents.length === 0) {
      log("No se seleccionó ningún agente. Saliendo.");
      return;
    }
  }

  log(`${pc.dim("Agentes:")} ${targetAgents.join(", ")}`);

  // 2. Verificar que hay skills para sincronizar
  const skills = await readdirDirsOnly(skillsSourceDir);
  if (skills.length === 0) {
    warn("No hay skills en el proyecto.");
    log(`Ejecuta ${pc.bold("skl install")} para agregar skills.`);
    return;
  }

  log(`${pc.dim("Skills a sincronizar:")} ${skills.length}`);

  // 3. Sincronizar cada agente
  const results: SyncResult[] = [];

  for (const agentId of targetAgents) {
    const result = await syncAgent(agentId, skills, skillsSourceDir);
    results.push(result);
  }

  // 4. Resumen
  log("");
  printSummary(results);
}

/**
 * Parsea string de agentes separados por coma
 */
function parseAgents(agentsStr: string): AgentType[] {
  const agentIds = agentsStr.split(",").map((a) => a.trim().toLowerCase());
  const validAgents: AgentType[] = ["claude", "opencode", "codex", "copilot"];

  return agentIds.filter((id) =>
    validAgents.includes(id as AgentType),
  ) as AgentType[];
}

/**
 * Selección interactiva de agentes usando prompts
 */
async function selectAgentsInteractive(
  skillsSourceDir: string,
): Promise<AgentType[]> {
  const config = await readConfig();
  const defaults = config.defaultAgents;

  try {
    const response = await prompts({
      type: "multiselect",
      name: "agents",
      message: "Seleccioná los agentes a sincronizar:",
      hint: "(Espacio para seleccionar, Enter para confirmar)",
      instructions: false,
      choices: AGENTS.map((agent) => ({
        title: `${agent.name}`,
        description: `${skillsSourceDir} → ${getAgentSkillsPathRelative(agent.id, process.cwd())}`,
        value: agent.id,
        selected: defaults.includes(agent.id),
      })),
      min: 1,
    });

    if (!response.agents || response.agents.length === 0) {
      return [];
    }

    return response.agents as AgentType[];
  } catch {
    return defaults;
  }
}

/**
 * Sincroniza skills con un agente específico
 */
async function syncAgent(
  agentId: AgentType,
  skills: string[],
  skillsSourceDir: string,
): Promise<SyncResult> {
  const agent = getAgentById(agentId);
  if (!agent) {
    return {
      agent: agentId,
      success: false,
      skillsLinked: 0,
      errors: ["Agente no encontrado"],
    };
  }

  // Usar rutas relativas al proyecto
  const projectDir = process.cwd();
  const agentSkillsDir = getAgentSkillsPathRelative(agentId, projectDir);

  const result: SyncResult = {
    agent: agentId,
    success: true,
    skillsLinked: 0,
    errors: [],
  };

  log(`\n${pc.cyan(`→ ${agent.name}`)}`);

  // Crear directorio de skills del agente si no existe
  if (!(await exists(agentSkillsDir))) {
    await mkdirp(agentSkillsDir);
    log(`  ${pc.dim("Creado:")} ${agentSkillsDir}`);
  }

  // Obtener symlinks existentes
  const existingLinks = new Map<string, string>();
  const existingEntries = await readdir(agentSkillsDir);

  for (const entry of existingEntries) {
    const linkPath = `${agentSkillsDir}/${entry}`;
    if (await isSymlink(linkPath)) {
      const target = await getSymlinkTarget(linkPath);
      if (target) {
        existingLinks.set(entry, target);
      }
    }
  }

  // Crear symlinks para cada skill
  for (const skillName of skills) {
    const sourcePath = `${skillsSourceDir}/${skillName}`;
    const linkPath = `${agentSkillsDir}/${skillName}`;

    // Verificar que la skill existe
    if (!(await exists(sourcePath))) {
      continue;
    }

    try {
      await createSymlink(sourcePath, linkPath);
      result.skillsLinked++;
      existingLinks.delete(skillName); // Marcar como procesada
    } catch (err) {
      result.errors.push(`Error linking ${skillName}`);
      error(`  ${skillName} ${pc.dim("(error)")}`);
    }
  }

  // Limpiar symlinks huérfanos
  for (const [name, _] of existingLinks) {
    const linkPath = `${agentSkillsDir}/${name}`;
    await removeSymlink(linkPath);
    log(`  ${pc.dim("-")} ${name} ${pc.dim("(huérfano eliminado)")}`);
  }

  // Resultado
  if (result.errors.length === 0) {
    success(`  ${result.skillsLinked} skill(s) vinculada(s)`);
  } else {
    warn(
      `  ${result.skillsLinked} vinculada(s), ${result.errors.length} error(es)`,
    );
    result.success = false;
  }

  return result;
}

/**
 * Imprime resumen de sincronización
 */
function printSummary(results: SyncResult[]): void {
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalLinked = results.reduce((sum, r) => sum + r.skillsLinked, 0);
  const successCount = results.filter((r) => r.success).length;

  if (totalErrors === 0) {
    success(`✓ Sincronización completa!`);
    log(`  ${totalLinked} skill(s) vinculadas a ${successCount} agente(s).`);
  } else {
    warn(`⚠ Sincronización completada con ${totalErrors} error(es).`);
  }
}
