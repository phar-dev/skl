#!/usr/bin/env node
/**
 * skl CLI - Wrapper que ejecuta el CLI real
 * Funciona tanto en desarrollo como en producción
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Encontrar la ubicación del paquete
function findPkgDir() {
  let dir = __dirname;
  
  // Subir en el tree hasta encontrar package.json
  while (dir !== path.dirname(dir)) {
    const pkgFile = path.join(dir, 'package.json');
    if (fs.existsSync(pkgFile)) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

const pkgDir = findPkgDir();
const distPath = path.join(pkgDir, 'dist', 'index.js');

// Ejecutar con node
const child = spawn('node', [distPath].concat(process.argv.slice(2)), {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => process.exit(code || 0));
