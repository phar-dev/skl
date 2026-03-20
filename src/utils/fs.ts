// Helpers de filesystem
import fs from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function isSymlinkValid(symlinkPath: string): Promise<boolean> {
  if (!(await isSymlink(symlinkPath))) {
    return false;
  }
  try {
    const target = await fs.readlink(symlinkPath);
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function mkdirp(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function readdir(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function readdirRecursive(
  dirPath: string,
  extensions: string[] = [],
): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await readdirRecursive(fullPath, extensions);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      if (extensions.length === 0 || extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  const linkDir = path.dirname(linkPath);
  await mkdirp(linkDir);

  // Remove existing symlink/file if exists
  if (await exists(linkPath)) {
    await fs.unlink(linkPath);
  }

  await fs.symlink(target, linkPath, 'dir');
}

export async function removeSymlink(linkPath: string): Promise<void> {
  try {
    const isLink = await isSymlink(linkPath);
    if (isLink) {
      await fs.unlink(linkPath);
    }
  } catch {
    // Ignore errors
  }
}

export async function getSymlinkTarget(linkPath: string): Promise<string | null> {
  try {
    return await fs.readlink(linkPath);
  } catch {
    return null;
  }
}

export async function getModifiedTime(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

export async function rmdir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

export async function isEmptyDir(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.length === 0;
  } catch {
    return true;
  }
}
