// skl init - Inicializa el entorno local
import path from 'node:path';
import { SKL_DIR, SKL_SKILLS_DIR } from '../utils/paths.js';
import { exists, mkdirp, isDirectory, isEmptyDir } from '../utils/fs.js';
import { log, success, info, warn, header } from '../utils/logger.js';

const EXAMPLE_SKILL_NAME = 'example-skill';

export async function init(): Promise<void> {
  header('skl init');

  // 1. Crear ~/.agents si no existe
  if (!(await exists(SKL_DIR))) {
    log(`Creando ${SKL_DIR}...`);
    await mkdirp(SKL_DIR);
    success(`Directorio ${SKL_DIR} creado`);
  } else {
    info(`Directorio ${SKL_DIR} ya existe`);
  }

  // 2. Crear ~/.agents/skills si no existe
  if (!(await exists(SKL_SKILLS_DIR))) {
    log(`Creando ${SKL_SKILLS_DIR}...`);
    await mkdirp(SKL_SKILLS_DIR);
    success(`Directorio skills creado`);
  } else {
    info(`Directorio skills ya existe`);
  }

  // 3. Verificar si ya hay skills instaladas
  const skillsExist = await exists(SKL_SKILLS_DIR) && !(await isEmptyDir(SKL_SKILLS_DIR));

  if (skillsExist) {
    info(`Ya hay skills instaladas. Saltando creación de ejemplo.`);
    log('');
    log(`Ejecuta 'skl list' para ver las skills instaladas.`);
    return;
  }

  // 4. Crear skill de ejemplo
  await createExampleSkill();

  log('');
  success(`Entorno inicializado correctamente!`);
  log('');
  log(`Próximos pasos:`);
  log(`  1. skl list          - Ver las skills instaladas`);
  log(`  2. skl install       - Instalar una skill desde GitHub`);
  log(`  3. skl sync          - Sincronizar con agentes`);
}

async function createExampleSkill(): Promise<void> {
  const skillPath = path.join(SKL_SKILLS_DIR, EXAMPLE_SKILL_NAME);

  log(`\nCreando skill de ejemplo...`);

  await mkdirp(skillPath);

  // SKILL.md principal
  const skillMd = `# ${EXAMPLE_SKILL_NAME}

Skill de ejemplo creada por skl.

## Descripción

Esta es una skill de ejemplo que demuestra la estructura de una skill.

## Uso

Agrega tus archivos de referencia, templates y documentación aquí.

## Estructura

\`\`\`
example-skill/
├── SKILL.md           # Este archivo
├── references/       # Documentación y ejemplos
│   └── README.md
└── templates/        # Templates reutilizables
    └── README.md
\`\`\`

## Personalización

Edita este archivo y agrega tu contenido. Luego usa \`skl sync\` para
distribuir la skill a tus agentes.
`;

  // references/README.md
  const refsDir = path.join(skillPath, 'references');
  await mkdirp(refsDir);
  const refsMd = `# Referencias

Agrega aquí documentación, cheatsheets, y ejemplos relevantes para esta skill.
`;

  // templates/README.md
  const templatesDir = path.join(skillPath, 'templates');
  await mkdirp(templatesDir);
  const templatesMd = `# Templates

Agrega aquí templates reutilizables (código, configs, etc).
`;

  // Escribir archivos
  const { writeFile } = await import('node:fs/promises');

  await writeFile(path.join(skillPath, 'SKILL.md'), skillMd, 'utf-8');
  await writeFile(path.join(refsDir, 'README.md'), refsMd, 'utf-8');
  await writeFile(path.join(templatesDir, 'README.md'), templatesMd, 'utf-8');

  success(`Skill '${EXAMPLE_SKILL_NAME}' creada`);
}
