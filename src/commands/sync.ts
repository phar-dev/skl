// skl sync - Sincroniza skills con agentes
import pc from 'picocolors';
import { SKL_SKILLS_DIR, AGENTS, getAgentById } from '../utils/paths.js';
import { exists, mkdirp, createSymlink, removeSymlink, readdir, readdirDirsOnly, isSymlink, isSymlinkValid, getSymlinkTarget } from '../utils/fs.js';
import { log, success, warn, error, header, item } from '../utils/logger.js';
import { readConfig, setDefaultAgents } from '../utils/config.js';
import type { AgentType, SyncResult } from '../types/index.js';

interface SyncOptions {
  agents?: string;
  global?: boolean;
}

export async function sync(options: SyncOptions): Promise<void> {
  header('skl sync');

  // 1. Determinar qué agentes usar
  let targetAgents: AgentType[];

  if (options.agents) {
    // Modo batch: --agents=claude,opencode
    targetAgents = parseAgents(options.agents);
    if (targetAgents.length === 0) {
      error('No se proporcionaron agentes válidos.');
      log('Agentes disponibles: claude, opencode, codex, copilot');
      return;
    }
    log(`${pc.dim('Modo batch:')} ${targetAgents.join(', ')}`);
  } else {
    // Modo interactivo
    targetAgents = await selectAgentsInteractive();
    if (targetAgents.length === 0) {
      log('No se seleccionó ningún agente. Saliendo.');
      return;
    }
  }

  // 2. Verificar que hay skills para sincronizar
  const skills = await readdirDirsOnly(SKL_SKILLS_DIR);
  if (skills.length === 0) {
    warn('No hay skills instaladas para sincronizar.');
    log(`Ejecuta ${pc.bold('skl install')} para agregar skills.`);
    return;
  }

  log(`${pc.dim('Skills a sincronizar:')} ${skills.length}`);

  // 3. Sincronizar cada agente
  const results: SyncResult[] = [];

  for (const agentId of targetAgents) {
    const result = await syncAgent(agentId, skills);
    results.push(result);
  }

  // 4. Guardar selección como default
  if (!options.agents) {
    await setDefaultAgents(targetAgents);
  }

  // 5. Resumen
  log('');
  printSummary(results);
}

/**
 * Parsea string de agentes separados por coma
 */
function parseAgents(agentsStr: string): AgentType[] {
  const agentIds = agentsStr.split(',').map((a) => a.trim().toLowerCase());
  const validAgents: AgentType[] = ['claude', 'opencode', 'codex', 'copilot'];

  return agentIds.filter((id) => validAgents.includes(id as AgentType)) as AgentType[];
}

/**
 * Selección interactiva de agentes
 */
async function selectAgentsInteractive(): Promise<AgentType[]> {
  // Cargar defaults
  const config = await readConfig();
  const defaults = config.defaultAgents;

  try {
    const enquirer = await import('enquirer');

    const answers = await enquirer.prompt([
      {
        type: 'multiselect',
        name: 'agents',
        message: 'Seleccioná los agentes a sincronizar:',
        choices: AGENTS.map((agent) => ({
          name: agent.id,
          message: `${agent.name} (${agent.skillsPath})`,
          value: agent.id,
          initial: defaults.includes(agent.id) ? 0 : undefined,
        })),
      },
    ]);

    return (answers as { agents: string[] }).agents as AgentType[];
  } catch {
    warn('No se pudo usar modo interactivo. Usando defaults.');
    return defaults;
  }
}

/**
 * Sincroniza skills con un agente específico
 */
async function syncAgent(agentId: AgentType, skills: string[]): Promise<SyncResult> {
  const agent = getAgentById(agentId);
  if (!agent) {
    return { agent: agentId, success: false, skillsLinked: 0, errors: ['Agente no encontrado'] };
  }

  const result: SyncResult = {
    agent: agentId,
    success: true,
    skillsLinked: 0,
    errors: [],
  };

  log(`\n${pc.cyan(`→ ${agent.name}`)}`);

  // Crear directorio de skills del agente si no existe
  if (!(await exists(agent.skillsPath))) {
    await mkdirp(agent.skillsPath);
    log(`  ${pc.dim('Creado:')} ${agent.skillsPath}`);
  }

  // Obtener symlinks existentes
  const existingLinks = new Map<string, string>();
  const existingEntries = await readdir(agent.skillsPath);

  for (const entry of existingEntries) {
    const linkPath = `${agent.skillsPath}/${entry}`;
    if (await isSymlink(linkPath)) {
      const target = await getSymlinkTarget(linkPath);
      if (target) {
        existingLinks.set(entry, target);
      }
    }
  }

  // Crear symlinks para cada skill
  for (const skillName of skills) {
    const sourcePath = `${SKL_SKILLS_DIR}/${skillName}`;
    const linkPath = `${agent.skillsPath}/${skillName}`;

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
      error(`  ${skillName} ${pc.dim('(error)')}`);
    }
  }

  // Limpiar symlinks huérfanos
  for (const [name, _] of existingLinks) {
    const linkPath = `${agent.skillsPath}/${name}`;
    await removeSymlink(linkPath);
    log(`  ${pc.dim('-')} ${name} ${pc.dim('(huérfano eliminado)')}`);
  }

  // Resultado
  if (result.errors.length === 0) {
    success(`  ${result.skillsLinked} skill(s) vinculada(s)`);
  } else {
    warn(`  ${result.skillsLinked} vinculada(s), ${result.errors.length} error(es)`);
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
