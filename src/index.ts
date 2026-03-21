#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./commands/init.js";
import { list } from "./commands/list.js";
import { install } from "./commands/install.js";
import { sync } from "./commands/sync.js";
import { update } from "./commands/update.js";
import { doctor } from "./commands/doctor.js";

const program = new Command();

program
  .name("skl")
  .description("Gestor de skills para agentes de código")
  .version("0.1.0");

program
  .command("init")
  .description("Inicializa el entorno local (~/.agents/skills)")
  .action(init);

program
  .command("list")
  .alias("ls")
  .description("Lista las skills instaladas")
  .option("-g, --global", "Listar solo skills globales")
  .action((opts) => list(opts));

const installCmd = program
  .command("install <repo>")
  .description("Instala una skill desde un repo GitHub")
  .option("-s, --skill <names...>", "Skills específicas a instalar")
  .option("-a, --all", "Instalar todas las skills del repo")
  .option("-l, --list", "Solo listar skills disponibles")
  .option("-g, --global", "Instalar en ~/.agents/skills (default)")
  .option("-p, --project", "Instalar en ./agents/skills del proyecto")
  .option("-y, --yes", "Saltar confirmaciones");

installCmd.action((repo, opts) => install(repo, opts));

program
  .command("sync")
  .description("Sincroniza skills del proyecto actual con los agentes")
  .option(
    "-a, --agents <agents>",
    "Agentes a sincronizar (comma-separated: claude,opencode)",
  )
  .action((opts) => sync(opts));

program
  .command("update")
  .description("Actualiza las skills instaladas (git pull)")
  .option("-s, --skill <name>", "Skill específica a actualizar")
  .action((opts) => update(opts));

program
  .command("doctor")
  .description("Valida el estado del sistema")
  .action(doctor);

program.parse();
