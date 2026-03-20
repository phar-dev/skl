# Roadmap skl - Sprint 1

## Descripción del Proyecto

**skl** es un CLI instalable en Node.js que actúa como gestor de skills para agentes de código (Claude Code, OpenCode, Codex, GitHub Copilot). Utiliza un directorio central (`~/.agents/skills`) y sincroniza skills hacia distintos agentes mediante symlinks.

## Historia de Usuario

> Como desarrollador que utiliza múltiples agentes de código, quiero una herramienta CLI llamada `skl` que me permita gestionar, crear y sincronizar "skills" desde una única fuente de verdad, para evitar duplicación, mantener consistencia entre entornos y poder evolucionar mis skills de forma centralizada.

---

## Arquitectura del Sistema

```
Fuente de verdad:
~/.agents/
  skills/
    skill-a/
    skill-b/
  config.json

Destinos por agente:
~/.claude/skills/
~/.opencode/skills/
~/.codex/skills/
~/.copilot/skills/
```

---

## Sprint 1: Fundamentos y MVP

### Fase 0: Setup del Proyecto

- [ ] Inicializar proyecto TypeScript (tsconfig, eslint, prettier)
- [ ] `package.json` con bin configurado para `skl`
- [ ] Estructura de carpetas:
  ```
  src/
    commands/     # cada comando es un módulo
    utils/        # path resolver, file helpers, git
    types/        # interfaces
    config/       # lectura/escritura de config
  ```
- [ ] Types: `Agent`, `Skill`, `Config`, `AgentType`
- [ ] Path resolver centralizado con expanduser
- [ ] Logger mínimo (picocolors para colores)

### Fase 1: Core Utilities

- [ ] `paths.ts` - constantes para `~/.agents`, `~/.claude`, etc.
- [ ] `fs.ts` - helpers: `exists`, `mkdirp`, `readdir`
- [ ] `git.ts` - `clone`, `pull` básicos
- [ ] `config.ts` - leer/escribir `~/.agents/config.json`

### Fase 2: Comandos Base (MVP)

#### `skl init`
- [ ] Crear `~/.agents/skills` si no existe
- [ ] Generar skill de ejemplo (`example-skill`)
- [ ] No sobrescribir contenido existente
- [ ] Dejar el sistema listo para usar con sync

#### `skl install <repo>`
- [ ] Clonar repo en `~/.agents/skills/<nombre>`
- [ ] Validar nombre de la skill
- [ ] Validar duplicados (no reinstalar si existe)
- [ ] No ejecutar sync automáticamente
- [ ] Soportar formato `user/repo` (GitHub)

#### `skl list`
- [ ] Listar skills instaladas en `~/.agents/skills`
- [ ] Mostrar nombre + última fecha de modificación
- [ ] Output claro y formateado

#### `skl doctor`
- [ ] Validar que `~/.agents` existe
- [ ] Verificar symlinks (válidos vs rotos)
- [ ] Detectar errores comunes
- [ ] Reportar estado del sistema

### Fase 3: Sync + Interactividad (Core Feature)

#### Configuración de Agentes
```typescript
type AgentType = 'claude' | 'opencode' | 'codex' | 'copilot';

interface AgentConfig {
  id: AgentType;
  name: string;
  path: string;
}
```

#### `skl sync` - Interactivo
- [ ] Selector con `enquirer` (checkbox multi-select)
- [ ] Mostrar agentes soportados:
  - Claude Code → `~/.claude/skills`
  - OpenCode → `~/.opencode/skills`
  - Codex → `~/.codex/skills`
  - GitHub Copilot → `~/.copilot/skills`
- [ ] Crear carpetas destino si no existen
- [ ] Crear symlinks por skill × agente
- [ ] Limpiar symlinks huérfanos
- [ ] Guardar última selección en `config.json`

#### `skl sync --agents=<ids>` - Batch Mode
- [ ] Saltar prompt interactivo
- [ ] Validar inputs (agentes válidos)
- [ ] Ejecutar sync directo
- [ ] Para CI/automación

#### Edge Cases
- [ ] Si el path del agente no existe → crear automáticamente
- [ ] Si el usuario no selecciona nada → abortar con mensaje
- [ ] Si hay error en un agente → no frenar los demás

### Fase 4: Update

#### `skl update`
- [ ] `git pull` en cada skill
- [ ] Reportar estado: "actualizada", "ya al día", "error"
- [ ] Respetar errores individuales

#### `skl update <skill>`
- [ ] Actualizar solo una skill específica

---

## Reglas Clave

1. **Única fuente de verdad**: skills viven en `~/.agents/skills`
2. **No duplicar archivos**: usar symlinks, no copiar
3. **Sync reconstruye todo**: limpieza + creación
4. **`init` crea, `install` consume**: responsabilidades claras
5. **CLI simple y predecible**: errores claros y manejables
6. **Interactivo por defecto, flags para automatización**

---

## Criterios de Aceptación

- [ ] `skl init` crea entorno funcional mínimo
- [ ] `skl install` agrega skills correctamente
- [ ] `skl sync` refleja el estado en todos los agentes
- [ ] El sistema se puede reconstruir con `skl sync`
- [ ] Errores son claros y manejables
- [ ] Modo batch (`--agents`) funciona en CI

---

## Dependencias Técnicas

```json
{
  "dependencies": {
    "commander": "^12.x",
    "picocolors": "^1.x",
    "enquirer": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x",
    "eslint": "^9.x",
    "prettier": "^3.x"
  }
}
```

---

## Decisiones Pendientes

| # | Pregunta | Opciones |
|---|----------|----------|
| 1 | `skl uninstall <skill>` | Eliminar solo source o también symlinks? |
| 2 | `skl sync` limpia o solo agrega? | Limpiar huérfanos (confirmado) |
| 3 | Skills de ejemplo | Template repo o inline? |
| 4 | Formato `install <repo>` | Solo `user/repo` o URLs arbitrarias? |

---

## Definición de Éxito (Sprint 1)

Un usuario puede ejecutar:
```bash
skl init
skl install user/repo
skl sync
skl update
```

Y tener todas sus skills centralizadas, sincronizadas y actualizadas entre múltiples agentes sin trabajo manual.
