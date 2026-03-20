// skl update - Actualiza skills instaladas
import pc from 'picocolors';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { SKL_SKILLS_DIR } from '../utils/paths.js';
import { exists, readdirDirsOnly, isDirectory } from '../utils/fs.js';
import { log, success, warn, error, header } from '../utils/logger.js';
import type { UpdateResult } from '../types/index.js';

const execAsync = promisify(exec);

interface UpdateOptions {
  skill?: string;
}

export async function update(options: UpdateOptions): Promise<void> {
  header('skl update');

  // 1. Verificar que existe el directorio de skills
  if (!(await exists(SKL_SKILLS_DIR))) {
    error('No hay skills instaladas.');
    log(`Ejecuta ${pc.bold('skl init')} para comenzar.`);
    return;
  }

  // 2. Obtener lista de skills
  const allSkills = await readdirDirsOnly(SKL_SKILLS_DIR);

  if (allSkills.length === 0) {
    warn('No hay skills instaladas para actualizar.');
    return;
  }

  // 3. Determinar qué skills actualizar
  let skillsToUpdate: string[];

  if (options.skill) {
    // Solo una skill específica
    skillsToUpdate = allSkills.filter((s) => s === options.skill);
    if (skillsToUpdate.length === 0) {
      error(`La skill '${options.skill}' no está instalada.`);
      log('Skills instaladas:');
      for (const skill of allSkills) {
        log(`  - ${skill}`);
      }
      return;
    }
  } else {
    // Todas las skills
    skillsToUpdate = allSkills;
  }

  log(`${pc.dim('Skills a actualizar:')} ${skillsToUpdate.length}`);

  // 4. Actualizar cada skill
  const results: UpdateResult[] = [];

  for (const skillName of skillsToUpdate) {
    const result = await updateSkill(skillName);
    results.push(result);
  }

  // 5. Resumen
  log('');
  printSummary(results);
}

/**
 * Actualiza una skill individual
 */
async function updateSkill(skillName: string): Promise<UpdateResult> {
  const skillPath = path.join(SKL_SKILLS_DIR, skillName);

  // Verificar que es un directorio
  if (!(await isDirectory(skillPath))) {
    return {
      skill: skillName,
      status: 'error',
      message: 'No es un directorio válido',
    };
  }

  log(`\n${pc.cyan(`→ ${skillName}`)}`);

  // Verificar que es un repo git
  const isGit = await isGitRepo(skillPath);
  if (!isGit) {
    warn(`  No es un repositorio git (no se puede actualizar)`);
    return {
      skill: skillName,
      status: 'up-to-date',
      message: 'No es un repositorio git',
    };
  }

  // Hacer git pull
  try {
    const { stdout, stderr } = await execAsync('git pull --ff-only 2>&1', { cwd: skillPath });

    if (stderr && !stderr.includes('Already')) {
      warn(`  ${pc.dim(stderr.trim())}`);
    }

    if (stdout.includes('Already up to date') || stdout.trim() === '') {
      success(`  ${pc.dim('Ya está al día')}`);
      return {
        skill: skillName,
        status: 'up-to-date',
        message: 'Ya está al día',
      };
    }

    success(`  ${pc.green('Actualizada')}`);
    if (stdout.trim()) {
      log(`    ${pc.dim(stdout.trim())}`);
    }
    return {
      skill: skillName,
      status: 'updated',
      message: 'Actualizada correctamente',
    };
  } catch (err) {
    error(`  ${pc.red('Error al actualizar')}`);
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return {
      skill: skillName,
      status: 'error',
      message,
    };
  }
}

/**
 * Verifica si un directorio es un repositorio git
 */
async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: dirPath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Imprime resumen de actualización
 */
function printSummary(results: UpdateResult[]): void {
  const updated = results.filter((r) => r.status === 'updated').length;
  const upToDate = results.filter((r) => r.status === 'up-to-date').length;
  const errors = results.filter((r) => r.status === 'error').length;

  if (errors > 0) {
    warn(`⚠ ${errors} error(es), ${updated} actualizadas, ${upToDate} al día`);
  } else if (updated > 0) {
    success(`✓ ${updated} skill(s) actualizada(s), ${upToDate} ya estaban al día`);
  } else {
    log(`Todas las skills ya están al día.`);
  }
}
