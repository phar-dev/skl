// Helpers para operaciones git
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { SKL_SKILLS_DIR } from './paths.js';
import { exists, mkdirp } from './fs.js';

const execAsync = promisify(exec);

export interface GitCloneOptions {
  repo: string;
  dest: string;
  branch?: string;
}

export interface GitPullResult {
  success: boolean;
  message: string;
  updated: boolean;
}

export async function clone(repo: string, dest: string, branch?: string): Promise<void> {
  const branchFlag = branch ? `--branch ${branch}` : '';
  const cmd = `git clone --depth 1 ${branchFlag} https://github.com/${repo} "${dest}"`;

  const { stdout, stderr } = await execAsync(cmd);

  if (stderr && !stderr.includes('Cloning')) {
    console.error(stderr);
  }
}

export async function pull(dir: string): Promise<GitPullResult> {
  const originalDir = process.cwd();

  try {
    process.chdir(dir);

    // Verificar que es un repo git
    const { stderr } = await execAsync('git status --porcelain');
    if (stderr) {
      return { success: false, message: stderr, updated: false };
    }

    // Pull
    await execAsync('git pull');

    // Verificar si hubo cambios
    const { stdout } = await execAsync('git status --porcelain');
    const updated = stdout.trim().length > 0 || stdout.includes('up-to-date');

    return {
      success: true,
      message: updated ? 'Actualizado' : 'Ya está al día',
      updated: !stdout.includes('up-to-date'),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      updated: false,
    };
  } finally {
    process.chdir(originalDir);
  }
}

export function parseRepo(repo: string): { user: string; name: string } | null {
  // Formato: user/repo o https://github.com/user/repo
  const match = repo.match(/(?:github\.com[/:])?([^/]+)\/([^/]+)/);
  if (!match) {
    return null;
  }
  return { user: match[1], name: match[2].replace(/\.git$/, '') };
}

export function getRepoUrl(repo: string): string {
  if (repo.startsWith('http://') || repo.startsWith('https://')) {
    return repo;
  }
  return `https://github.com/${repo}`;
}

export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: dir });
    return true;
  } catch {
    return false;
  }
}
