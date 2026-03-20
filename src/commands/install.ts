// skl install - Instala una skill desde GitHub
import path from 'node:path';
import pc from 'picocolors';
import { SKL_SKILLS_DIR } from '../utils/paths.js';
import { exists, mkdirp, isDirectory } from '../utils/fs.js';
import { log, success, warn, error, header, item } from '../utils/logger.js';
import { clone, parseRepo, isGitRepo } from '../utils/git.js';

export async function install(repo: string): Promise<void> {
  header('skl install');

  // 1. Parsear el repo
  const parsed = parseRepo(repo);

  if (!parsed) {
    error(`Repo inválido: '${repo}'`);
    log('');
    log('Formato esperado: user/repo (ej: myuser/my-skill)');
    log('O URL completa: https://github.com/user/repo');
    return;
  }

  log(`\nInstalando ${pc.bold(parsed.user)}/${pc.bold(parsed.name)}...`);

  // 2. Asegurar que existe ~/.agents/skills
  if (!(await exists(SKL_SKILLS_DIR))) {
    log(`Creando directorio de skills...`);
    await mkdirp(SKL_SKILLS_DIR);
  }

  const destPath = path.join(SKL_SKILLS_DIR, parsed.name);

  // 3. Verificar si ya existe
  if (await exists(destPath)) {
    if (await isGitRepo(destPath)) {
      warn(`La skill '${parsed.name}' ya está instalada.`);
      log('');
      log(`  Path: ${destPath}`);
      log(`  Usa 'skl update ${parsed.name}' para actualizarla.`);
      return;
    } else {
      error(`Ya existe un directorio en '${destPath}' pero no es un repo git.`);
      log('');
      log('Opciones:');
      log('  1. Eliminar el directorio manualmente');
      log(`  2. Usar otro nombre de skill (no soportado aún)`);
      return;
    }
  }

  // 4. Clonar
  try {
    await clone(`${parsed.user}/${parsed.name}`, destPath);
  } catch (err) {
    error(`Error al clonar el repo.`);
    log('');
    if (err instanceof Error) {
      if (err.message.includes('Could not resolve host')) {
        log('Verificá tu conexión a internet.');
      } else if (err.message.includes('Authentication failed')) {
        log('El repo no es público o hay un problema de autenticación.');
      }
    }
    return;
  }

  // 5. Verificar instalación
  const installed = await exists(destPath) && await isDirectory(destPath);

  if (!installed) {
    error('La instalación parece haber fallado.');
    return;
  }

  // 6. Verificar que tiene SKILL.md (buena práctica)
  const hasSkillMd = await exists(path.join(destPath, 'SKILL.md'));

  log('');
  success(`Skill '${parsed.name}' instalada correctamente!`);
  log('');
  item('Path', destPath);

  if (hasSkillMd) {
    item('SKILL.md', '✓ Encontrado');
  } else {
    warn('SKILL.md no encontrado (recomendado)');
  }

  log('');
  log(`Próximos pasos:`);
  log(`  skl list          - Verificar que aparece`);
  log(`  skl sync          - Sincronizar con agentes`);
}
