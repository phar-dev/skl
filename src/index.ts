#!/usr/bin/env node
import { Command } from 'commander';
import { init } from './commands/init.js';
import { list } from './commands/list.js';
import { install } from './commands/install.js';
import { sync } from './commands/sync.js';
import { update } from './commands/update.js';
import { doctor } from './commands/doctor.js';

const program = new Command();

program
  .name('skl')
  .description('Gestor de skills para agentes de código')
  .version('0.1.0');

program
  .command('init')
  .description('Inicializa el entorno local (~/.agents/skills)')
  .action(init);

program
  .command('list')
  .description('Lista las skills instaladas')
  .action(list);

program
  .command('install <repo>')
  .description('Instala una skill desde un repo GitHub (user/repo)')
  .action(install);

program
  .command('sync')
  .description('Sincroniza skills con los agentes seleccionados')
  .option('-a, --agents <agents>', 'Agentes a sincronizar (comma-separated: claude,opencode)')
  .action(sync);

program
  .command('update')
  .description('Actualiza las skills instaladas (git pull)')
  .option('-s, --skill <name>', 'Skill específica a actualizar')
  .action(update);

program
  .command('doctor')
  .description('Valida el estado del sistema')
  .action(doctor);

program.parse();
