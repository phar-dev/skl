// skl install - Instala skills desde repositorios GitHub
import path from "node:path";
import fs from "node:fs/promises";
import pc from "picocolors";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { SKL_SKILLS_DIR } from "../utils/paths.js";
import { exists, mkdirp } from "../utils/fs.js";
import { log, success, warn, error, header } from "../utils/logger.js";
import {
  discoverLocalSkills,
  filterSkills,
  installSkill,
} from "../utils/discover.js";
import type { DiscoveredSkill } from "../types/index.js";
// @ts-ignore - prompts no tiene tipos oficiales completos
import prompts from "prompts";

const execAsync = promisify(exec);

type ScopeType = "global" | "project";

interface InstallOptions {
  skill?: string[];
  all?: boolean;
  list?: boolean;
  yes?: boolean;
  global?: boolean;
  project?: boolean;
}

export async function install(
  repo: string,
  options: InstallOptions,
): Promise<void> {
  header("skl install");

  // 1. Parsear el repo
  const parsed = parseRepo(repo);

  if (!parsed) {
    error(`Repo inválido: '${repo}'`);
    log("");
    log("Formato esperado: user/repo (ej: myuser/my-skill)");
    log("O URL completa: https://github.com/user/repo");
    return;
  }

  log(`\n${pc.dim("Repo:")} ${pc.bold(parsed.user)}/${pc.bold(parsed.name)}`);

  // 2. Determinar el scope (global vs proyecto)
  let scope: ScopeType;
  let skillsDestDir: string;

  if (options.project) {
    // --project flag
    scope = "project";
    skillsDestDir = path.join(process.cwd(), ".agents", "skills");
  } else if (options.global !== undefined) {
    // --global or --global=false
    scope = options.global ? "global" : "project";
    skillsDestDir =
      scope === "global"
        ? SKL_SKILLS_DIR
        : path.join(process.cwd(), ".agents", "skills");
  } else {
    // Interactivo
    const selectedScope = await selectScopeInteractive();
    if (!selectedScope) {
      log("No se seleccionó scope. Saliendo.");
      return;
    }
    scope = selectedScope;
    skillsDestDir =
      scope === "global"
        ? SKL_SKILLS_DIR
        : path.join(process.cwd(), ".agents", "skills");
  }

  log(
    `${pc.dim("Instalar en:")} ${scope === "global" ? "Global" : "Proyecto"}`,
  );
  log(`${pc.dim("Destino:")} ${skillsDestDir}`);

  // 3. Asegurar que existe el directorio de destino
  if (!(await exists(skillsDestDir))) {
    await mkdirp(skillsDestDir);
  }

  // 3. Clonar/fetch el repo en temp
  const tempDir = await cloneOrPullRepo(
    parsed.user,
    parsed.name,
    skillsDestDir,
  );

  if (!tempDir) {
    error("No se pudo obtener el repositorio.");
    return;
  }

  // 4. Descubrir skills en el repo
  const discoveredSkills = await discoverLocalSkills(tempDir);

  if (discoveredSkills.length === 0) {
    warn("No se encontraron skills en este repositorio.");
    log("");
    log("Las skills deben tener un archivo SKILL.md con:");
    log("  - name: nombre-de-la-skill");
    log("  - description: Descripción de la skill");
    return;
  }

  log(`${pc.dim("Skills encontradas:")} ${discoveredSkills.length}`);

  // 5. Modo --list: solo mostrar y limpiar temp
  if (options.list) {
    await listSkills(discoveredSkills);
    await cleanupTemp(tempDir);
    return;
  }

  // 6. Filtrar skills si se especificó --skill
  let skillsToInstall = discoveredSkills;

  if (options.skill && options.skill.length > 0) {
    skillsToInstall = filterSkills(discoveredSkills, options.skill);

    if (skillsToInstall.length === 0) {
      error(
        `No se encontraron skills que coincidan con: ${options.skill.join(", ")}`,
      );
      log("");
      log("Skills disponibles:");
      for (const skill of discoveredSkills) {
        log(`  - ${skill.name}`);
      }
      return;
    }
  } else if (!options.all) {
    // Interactivo: preguntar cuáles instalar
    skillsToInstall = await selectSkillsInteractive(discoveredSkills);

    if (skillsToInstall.length === 0) {
      log("No se seleccionó ninguna skill. Saliendo.");
      return;
    }
  }

  // 7. Instalar las skills seleccionadas
  log("");
  for (const skill of skillsToInstall) {
    await installSingleSkill(skill, tempDir, skillsDestDir);
  }

  // 8. Limpiar temp
  await cleanupTemp(tempDir);

  log("");
  success(`¡Listo! ${skillsToInstall.length} skill(s) instalada(s).`);
  log("");
  log(
    `Ejecuta ${pc.bold("skl list")} para verlas o ${pc.bold("skl sync")} para sincronizar.`,
  );
}

/**
 * Selección interactiva de scope (global vs proyecto)
 */
async function selectScopeInteractive(): Promise<ScopeType | null> {
  try {
    const response = await prompts({
      type: "select",
      name: "scope",
      message: "Dónde querés instalar las skills?",
      hint: "(Seleccioná con las flechas)",
      choices: [
        {
          title: "Global",
          description: "~/.agents/skills (disponible para todos los proyectos)",
          value: "global",
        },
        {
          title: "Proyecto",
          description: "./.agents/skills (solo para este proyecto)",
          value: "project",
        },
      ],
    });

    return response.scope || null;
  } catch {
    warn("No se pudo usar selección interactiva. Usando global.");
    return "global";
  }
}

/**
 * Clona o hace pull de un repo
 */
async function cloneOrPullRepo(
  user: string,
  repo: string,
  destDir: string,
): Promise<string | null> {
  const tempDir = path.join(destDir, ".tmp", `${user}-${repo}`);

  // Intentar hacer pull si ya existe
  if (await exists(tempDir)) {
    try {
      await execAsync("git pull", { cwd: tempDir });
      return tempDir;
    } catch {
      // Si falla, eliminar y clonar de nuevo
      await execAsync("rm -rf", { cwd: tempDir });
    }
  }

  // Crear temp dir y clonar
  await mkdirp(path.dirname(tempDir));

  try {
    const url = `https://github.com/${user}/${repo}`;
    await execAsync(`git clone --depth 1 ${url} "${tempDir}"`, {
      cwd: destDir,
    });
    return tempDir;
  } catch (err) {
    error(`Error al clonar ${user}/${repo}`);
    if (err instanceof Error) {
      log(pc.dim(err.message));
    }
    return null;
  }
}

/**
 * Lista las skills disponibles
 */
async function listSkills(skills: DiscoveredSkill[]): Promise<void> {
  log("");
  log(pc.cyan("Skills disponibles:\n"));

  for (const skill of skills) {
    log(`  ${pc.bold(skill.name)}`);
    log(`    ${pc.dim(skill.description)}`);
    if (skill.path) {
      log(`    ${pc.dim("Path:")} ${skill.path}`);
    }
    log("");
  }

  log(pc.dim("Para instalar: skl install user/repo --skill nombre-de-skill"));
}

/**
 * Selección interactiva de skills usando prompts
 */
async function selectSkillsInteractive(
  skills: DiscoveredSkill[],
): Promise<DiscoveredSkill[]> {
  try {
    const response = await prompts({
      type: "multiselect",
      name: "skills",
      message: "Seleccioná las skills a instalar:",
      hint: "(Espacio para seleccionar, Enter para confirmar)",
      instructions: false,
      choices: skills.map((s) => ({
        title: s.name,
        description: s.description,
        value: s.name,
      })),
      min: 1,
    });

    if (!response.skills || response.skills.length === 0) {
      warn("No se seleccionó ninguna skill. Instalando todas.");
      return skills;
    }

    const selectedNames = response.skills as string[];
    return skills.filter((s) => selectedNames.includes(s.name));
  } catch {
    // Si falla prompts, instalar todas
    warn("No se pudo usar modo interactivo. Instalando todas.");
    return skills;
  }
}

/**
 * Instala una sola skill
 */
async function installSingleSkill(
  skill: DiscoveredSkill,
  repoPath: string,
  destDir: string,
): Promise<void> {
  const finalDestDir = path.join(destDir, skill.name);

  // Verificar si ya existe
  if (await exists(finalDestDir)) {
    warn(`  ${skill.name} ${pc.dim("(ya instalada, saltando)")}`);
    return;
  }

  try {
    await installSkill(skill, repoPath, destDir);
    success(`  ${skill.name}`);
    log(`    ${pc.dim(skill.description)}`);
  } catch (err) {
    error(`  ${skill.name} ${pc.dim("(error)")}`);
  }
}

/**
 * Parse repo string
 */
function parseRepo(repo: string): { user: string; name: string } | null {
  const match = repo.match(/(?:github\.com[/:])?([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { user: match[1], name: match[2].replace(/\.git$/, "") };
}

/**
 * Limpia el directorio temporal
 */
async function cleanupTemp(tempDir: string): Promise<void> {
  try {
    // Borrar el dir del repo específico
    await execAsync(`rm -rf "${tempDir}"`);

    // Borrar el .tmp si está vacío
    const tmpDir = path.dirname(tempDir);
    const entries = await fs.readdir(tmpDir);
    if (entries.length === 0) {
      await fs.rmdir(tmpDir);
    }
  } catch {
    // Ignore cleanup errors
  }
}
