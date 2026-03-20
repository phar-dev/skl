// Descubrimiento de skills en repositorios
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { SKL_SKILLS_DIR } from './paths.js';
import { exists, mkdirp, readdirRecursive } from './fs.js';
import type { DiscoveredSkill } from '../types/index.js';

// Paths donde buscar SKILL.md en un repo (orden de prioridad)
const SKILL_SEARCH_PATHS = [
  '',  // Root (si tiene SKILL.md directo)
  'skills',
  'skills/.curated',
  'skills/.experimental',
  'skills/.system',
];

// Directorios a excluir en búsqueda
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.nuxt',
  'coverage',
]);

/**
 * Descubre todas las skills en un directorio local
 */
export async function discoverLocalSkills(dirPath: string): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];

  // Primero buscar en paths prioritarios
  for (const searchPath of SKILL_SEARCH_PATHS) {
    const skillPath = searchPath ? path.join(dirPath, searchPath) : dirPath;
    
    if (!(await exists(skillPath))) continue;
    
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    
    // Si hay SKILL.md directo en el path prioritario
    if (await exists(skillMdPath)) {
      const skill = await parseSkillMd(skillMdPath, searchPath);
      if (skill) {
        skills.push(skill);
        continue; // No buscar más si ya encontramos
      }
    }

    // Buscar subdirectorios con SKILL.md
    const subSkills = await discoverInDirectory(skillPath, searchPath);
    skills.push(...subSkills);
  }

  return deduplicateSkills(skills);
}

/**
 * Descubre skills en un subdirectorio
 */
async function discoverInDirectory(dirPath: string, basePath: string): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (EXCLUDE_DIRS.has(entry.name)) continue;

      const skillPath = path.join(dirPath, entry.name);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      if (await exists(skillMdPath)) {
        const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
        const skill = await parseSkillMd(skillMdPath, relPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return skills;
}

/**
 * Parsea un archivo SKILL.md y extrae name y description
 */
export async function parseSkillMd(
  skillMdPath: string,
  repoPath: string = '',
): Promise<DiscoveredSkill | null> {
  try {
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const { data, content: _ } = matter(content);

    // Validar campos requeridos
    const name = data.name;
    const description = data.description;

    if (typeof name !== 'string' || !name) {
      return null;
    }

    if (typeof description !== 'string') {
      // Description es opcional pero recomendado
      return null;
    }

    return {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      path: repoPath,
      fullPath: skillMdPath,
    };
  } catch {
    return null;
  }
}

/**
 * Elimina skills duplicadas (mismo nombre)
 */
function deduplicateSkills(skills: DiscoveredSkill[]): DiscoveredSkill[] {
  const seen = new Map<string, DiscoveredSkill>();

  for (const skill of skills) {
    if (!seen.has(skill.name)) {
      seen.set(skill.name, skill);
    }
  }

  return Array.from(seen.values());
}

/**
 * Filtra skills por nombre
 */
export function filterSkills(skills: DiscoveredSkill[], names: string[]): DiscoveredSkill[] {
  if (names.length === 0) return skills;

  const normalizedNames = names.map((n) => n.toLowerCase());

  return skills.filter((skill) => {
    const skillName = skill.name.toLowerCase();
    return normalizedNames.some((n) => skillName.includes(n) || n.includes(skillName));
  });
}

/**
 * Copia una skill a ~/.agents/skills/
 */
export async function installSkill(
  skill: DiscoveredSkill,
  repoPath: string,
): Promise<string> {
  const destDir = path.join(SKL_SKILLS_DIR, skill.name);
  
  await mkdirp(SKL_SKILLS_DIR);

  // Determinar path absoluto de la skill source
  let sourceDir: string;
  if (skill.path) {
    sourceDir = path.join(repoPath, skill.path);
  } else {
    sourceDir = path.dirname(skill.fullPath);
  }

  // Copiar directorio de la skill
  await copyDirectory(sourceDir, destDir);

  return destDir;
}

/**
 * Copia un directorio recursivamente
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdirp(dest);

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Excluir archivos ocultos y .git
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    if (entry.name === '.git') continue;
    if (EXCLUDE_DIRS.has(entry.name)) continue;

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Sanitiza el nombre de una skill para uso en filesystem
 */
export function sanitizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) || 'unnamed-skill';
}
