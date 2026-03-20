// skl list - Lista las skills instaladas
import { SKL_SKILLS_DIR } from '../utils/paths.js';
import { exists, readdir, getModifiedTime } from '../utils/fs.js';
import { log, info, warn } from '../utils/logger.js';
import type { InstalledSkill } from '../types/index.js';

interface ListOptions {
  global?: boolean;
}

export async function list(_opts?: ListOptions): Promise<void> {
  // Verificar que existe el directorio de skills
  if (!(await exists(SKL_SKILLS_DIR))) {
    info(`No hay skills instaladas. Ejecuta 'skl init' para comenzar.`);
    return;
  }

  // Leer skills
  const skillNames = await readdir(SKL_SKILLS_DIR);

  if (skillNames.length === 0) {
    info(`No hay skills instaladas. Ejecuta 'skl init' o 'skl install <repo>' para agregar skills.`);
    return;
  }

  // Obtener info de cada skill
  const skills: InstalledSkill[] = await Promise.all(
    skillNames.map(async (name) => {
      const skillPath = `${SKL_SKILLS_DIR}/${name}`;
      const lastModified = await getLastModifiedSkill(name);
      return { name, path: skillPath, lastModified };
    }),
  );

  // Ordenar por nombre
  skills.sort((a, b) => a.name.localeCompare(b.name));

  // Mostrar
  log(`\n${skills.length} skill${skills.length === 1 ? '' : 's'} instalada${skills.length === 1 ? '' : 's'}:`);
  log('');

  for (const skill of skills) {
    const date = skill.lastModified
      ? formatDate(skill.lastModified)
      : pc.dim('sin fecha');
    log(`  ${pc.bold(skill.name)}  ${pc.dim(date)}`);
  }

  log('');
}

async function getLastModifiedSkill(skillName: string): Promise<Date | null> {
  const skillPath = `${SKL_SKILLS_DIR}/${skillName}`;
  let latest: Date | null = null;

  const { readdirRecursive, getModifiedTime } = await import('../utils/fs.js');

  try {
    const files = await readdirRecursive(skillPath);
    for (const file of files) {
      const mtime = await getModifiedTime(file);
      if (mtime && (!latest || mtime > latest)) {
        latest = mtime;
      }
    }
  } catch {
    // Ignore
  }

  return latest;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'hoy';
  } else if (days === 1) {
    return 'ayer';
  } else if (days < 7) {
    return `hace ${days} días`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `hace ${weeks} sem${weeks === 1 ? 'ana' : 'anas'}`;
  } else {
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  }
}

// Picocolors para usar en funciones
import pc from 'picocolors';
