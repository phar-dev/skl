# skl

> Gestor de skills para agentes de código (Claude Code, OpenCode, Codex, GitHub Copilot)

`skl` te permite gestionar, crear y sincronizar **skills** desde una única fuente de verdad, evitando duplicación y manteniendo consistencia entre entornos.

## Instalación

```bash
# Con npm
npm install -g skl

# Con pnpm
pnpm add -g skl

# Con npx (sin instalar)
npx skl <comando>
```

## Conceptos

### Skills
Una **skill** es un directorio con un archivo `SKILL.md` que contiene instrucciones para tu agente de código. Se instalan desde repositorios GitHub.

### Fuente de verdad
Todas las skills viven en `~/.agents/skills/`. Desde ahí se sincronizan a los distintos agentes mediante **symlinks**.

```
~/.agents/skills/          ← Fuente de verdad
├── example-skill/
│   └── SKILL.md
└── deploy-to-vercel/

~/.claude/skills/          ← Symlinks
├── example-skill → ~/.agents/skills/example-skill
└── deploy-to-vercel → ~/.agents/skills/deploy-to-vercel
```

---

## Comandos

### `skl init`

Inicializa el entorno local creando `~/.agents/skills` con una skill de ejemplo.

```bash
skl init
```

**Output:**
```
── skl init ──
Creando ~/.agents...
✓ Directorio ~/.agents creado
Creando ~/.agents/skills...
✓ Directorio skills creado

Creando skill de ejemplo...
✓ Skill 'example-skill' creada

✓ Entorno inicializado correctamente!
```

---

### `skl list`

Lista las skills instaladas en `~/.agents/skills`.

```bash
skl list
# o con alias
skl ls
```

**Output:**
```
2 skills instaladas:

  example-skill         hoy
  deploy-to-vercel     hace 2 días
```

---

### `skl install <repo>`

Instala skills desde un repositorio GitHub. Descubre automáticamente archivos `SKILL.md` y te permite elegir cuáles instalar.

```bash
# Ver skills disponibles (sin instalar)
skl install vercel-labs/agent-skills --list

# Instalar una skill específica
skl install vercel-labs/agent-skills --skill web-design-guidelines

# Instalar múltiples skills
skl install vercel-labs/agent-skills --skill deploy-to-vercel --skill react-best-practices

# Instalar todas las skills del repo
skl install vercel-labs/agent-skills --all

# Instalación interactiva (pregunta cuáles instalar)
skl install vercel-labs/agent-skills
```

**Formatos de repo soportados:**
```bash
skl install user/repo                    # GitHub shorthand
skl install https://github.com/user/repo # URL completa
```

**Output (--list):**
```
── skl install ──
Repo: vercel-labs/agent-skills
Skills encontradas: 6

Skills disponibles:

  deploy-to-vercel
    Deploy applications and websites to Vercel...

  web-design-guidelines
    Review UI code for Web Interface Guidelines...

Para instalar: skl install user/repo --skill nombre-de-skill
```

---

### `skl sync`

Sincroniza las skills instaladas con los agentes de código. Crea symlinks en cada directorio de skills del agente.

```bash
# Modo interactivo (selecciona agentes)
skl sync

# Modo batch (especificar agentes)
skl sync --agents claude,opencode

# Múltiples agentes
skl sync --agents claude,opencode,codex,copilot
```

**Agentes disponibles:**
| Agente | Flag | Path |
|--------|------|------|
| Claude Code | `claude` | `~/.claude/skills` |
| OpenCode | `opencode` | `~/.opencode/skills` |
| Codex | `codex` | `~/.codex/skills` |
| GitHub Copilot | `copilot` | `~/.copilot/skills` |

**Output:**
```
── skl sync ──
Modo batch: claude, opencode
Skills a sincronizar: 3

→ Claude Code
  Creado: ~/.claude/skills
✓   3 skill(s) vinculada(s)

→ OpenCode
✓   3 skill(s) vinculada(s)

✓ Sincronización completa!
  6 skill(s) vinculadas a 2 agente(s).
```

---

### `skl update`

Actualiza las skills instaladas haciendo `git pull`.

```bash
# Actualizar todas las skills
skl update

# Actualizar una skill específica
skl update --skill deploy-to-vercel
```

**Output:**
```
── skl update ──
Skills a actualizar: 3

→ deploy-to-vercel
✓   Actualizada

→ example-skill
  Ya está al día

→ web-design-guidelines
✓   Actualizada

✓ 2 skill(s) actualizada(s), 1 ya estaban al día
```

---

### `skl doctor`

Valida el estado del sistema: verifica paths, skills instaladas y symlinks.

```bash
skl doctor
```

**Output:**
```
── skl doctor ──

Skills instaladas:
✓   deploy-to-vercel
✓   example-skill

Agentes:
✓   Claude Code: 2 skill(s) vinculadas
✓   OpenCode: 2 skill(s) vinculadas
⚠   Codex: No existe (se creará en sync)
⚠   GitHub Copilot: No existe (se creará en sync)

✓ ✅ Sistema en orden
```

---

## Uso Típico

```bash
# 1. Inicializar entorno
skl init

# 2. Instalar skills desde un repo
skl install vercel-labs/agent-skills --list  # Ver qué hay
skl install vercel-labs/agent-skills --skill deploy-to-vercel

# 3. Sincronizar con agentes
skl sync --agents claude,opencode

# 4. Actualizar después
skl update

# 5. Verificar estado
skl doctor
```

---

## Repos de Skills Recomendados

- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - Skills oficiales de Vercel
- [your-org/your-skills](https://github.com/) - Crea tu propio repo de skills

### Crear tu propia Skill

1. Crea un directorio `tu-skill/`
2. Agrega un archivo `SKILL.md` con frontmatter:

```markdown
---
name: tu-skill
description: Descripción de qué hace esta skill
---

# Tu Skill

Instrucciones para el agente...

## Cuándo usar

Describe escenarios de uso...

## Pasos

1. Primero haz esto
2. Luego esto otro
```

3. Sube a GitHub y comparte tu repo

---

## Configuración

`skl` guarda preferencias en `~/.agents/config.json`:

```json
{
  "version": "1.0.0",
  "defaultAgents": ["claude", "opencode"]
}
```

---

## Solución de Problemas

### "No skills found"
Asegurate de que el repositorio tenga archivos `SKILL.md` válidos con `name` y `description` en el frontmatter.

### "No existe" para un agente
Los directorios de agentes se crean automáticamente en `sync`. Ejecutá `skl sync --agents <agente>`.

### Symlinks rotos
Ejecutá `skl sync` para limpiar y recrear los symlinks.

### Permission denied
Verificá que tenés permisos de escritura en `~/.agents/`.

---

## Licencia

MIT
