// skl doctor - Valida el estado del sistema
import pc from 'picocolors';
import { SKL_DIR, SKL_SKILLS_DIR, AGENTS } from '../utils/paths.js';
import { exists, isDirectory, isSymlink, isSymlinkValid, readdir } from '../utils/fs.js';
import { log, success, warn, error, info, header, item } from '../utils/logger.js';
import type { DoctorResult, AgentConfig } from '../types/index.js';

export async function doctor(): Promise<void> {
  header('skl doctor');
  log('');

  const results: DoctorResult[] = [];

  // 1. Verificar ~/.agents
  results.push(await checkPath('~/.agents', SKL_DIR, true));

  // 2. Verificar ~/.agents/skills
  results.push(await checkPath('~/.agents/skills', SKL_SKILLS_DIR, true));

  // 3. Verificar skills instaladas
  await checkSkills(results);

  // 4. Verificar agentes
  await checkAgents(results);

  // 5. Resumen
  log('');
  printSummary(results);
}

async function checkPath(label: string, path: string, mustExist: boolean): Promise<DoctorResult> {
  const existsPath = await exists(path);
  const isDir = existsPath ? await isDirectory(path) : false;

  if (!existsPath) {
    if (mustExist) {
      return { path: label, status: 'error', message: 'No existe' };
    }
    return { path: label, status: 'ok', message: 'No existe (opcional)' };
  }

  if (!isDir) {
    return { path: label, status: 'error', message: 'Existe pero no es un directorio' };
  }

  return { path: label, status: 'ok', message: 'OK' };
}

async function checkSkills(results: DoctorResult[]): Promise<void> {
  log(pc.cyan('Skills instaladas:'));

  if (!(await exists(SKL_SKILLS_DIR))) {
    warn('  ~/.agents/skills no existe');
    return;
  }

  const skills = await readdir(SKL_SKILLS_DIR);

  if (skills.length === 0) {
    warn('  No hay skills instaladas');
    return;
  }

  for (const skill of skills) {
    const skillPath = `${SKL_SKILLS_DIR}/${skill}`;
    const isDir = await isDirectory(skillPath);
    if (isDir) {
      success(`  ${skill}`);
    } else {
      error(`  ${skill} (no es un directorio)`);
    }
  }
}

async function checkAgents(results: DoctorResult[]): Promise<void> {
  log(pc.cyan('\nAgentes:'));

  for (const agent of AGENTS) {
    await checkAgent(agent);
  }
}

async function checkAgent(agent: AgentConfig): Promise<void> {
  const skillsDir = agent.skillsPath;

  if (!(await exists(skillsDir))) {
    warn(`  ${agent.name}: No existe (se creará en sync)`);
    return;
  }

  if (!(await isDirectory(skillsDir))) {
    error(`  ${agent.name}: Existe pero no es un directorio`);
    return;
  }

  // Verificar symlinks
  const links = await readdir(skillsDir);
  const brokenLinks: string[] = [];
  const validLinks: string[] = [];

  for (const link of links) {
    const linkPath = `${skillsDir}/${link}`;
    if (await isSymlink(linkPath)) {
      if (await isSymlinkValid(linkPath)) {
        validLinks.push(link);
      } else {
        brokenLinks.push(link);
      }
    }
  }

  if (brokenLinks.length > 0) {
    warn(`  ${agent.name}: ${validLinks.length} válidos, ${brokenLinks.length} rotos`);
    for (const link of brokenLinks) {
      item('    Roto:', link);
    }
  } else if (validLinks.length > 0) {
    success(`  ${agent.name}: ${validLinks.length} skill(s) vinculadas`);
  } else {
    info(`  ${agent.name}: Directorio vacío`);
  }
}

function printSummary(results: DoctorResult[]): void {
  const errors = results.filter((r) => r.status === 'error');
  const warnings = results.filter((r) => r.status === 'warning');
  const ok = results.filter((r) => r.status === 'ok');

  if (errors.length > 0) {
    error(`❌ ${errors.length} error(es) encontrado(s)`);
    log('');
    log('Ejecuta "skl init" para solucionar.');
  } else if (warnings.length > 0) {
    warn(`⚠️ ${warnings.length} advertencia(s)`);
    log('');
    log('Considera ejecutar "skl sync" para limpiar symlinks rotos.');
  } else {
    success('✅ Sistema en orden');
    log('');
    log('Tu entorno skl está correctamente configurado.');
  }
}
