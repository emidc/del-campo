# Trabajar con Claude Code, Codex y Gemini CLI

Los tres trabajan con el mismo contrato: `AGENTS.md`, la tarea en `TASKS/`, revisión
ciega y aprobación humana (D-0082). Esta página dice qué protege cada uno en la máquina
local, qué deja registrado y cómo se arranca y se cierra una sesión. → `T-0039`

## Qué tiene cada proveedor

| | Claude Code | Codex | Gemini CLI |
|---|---|---|---|
| Lee `AGENTS.md` | sí, vía `CLAUDE.md` | sí, nativo | sí, por `context.fileName` en `.gemini/settings.json` |
| Configuración del repo | `.claude/settings.json` | `.codex/hooks.json` | `.gemini/settings.json` |
| Bloquea escribir rutas protegidas con su herramienta de edición | sí (`permissions.deny`) | sí (hook sobre `apply_patch`, probado sólo en test) | sí (hook sobre `write_file` y `replace`) |
| Bloquea escribir rutas protegidas desde el shell | sí, para un comando que las nombra | sí, para un comando que las nombra | sí, para un comando que las nombra |
| Rutas protegidas | `.claude/`, `.github/workflows/` | `.claude/`, `.github/workflows/`, `.codex/`, `.gemini/`, `.agents/` | las mismas que Codex |
| Bloquea leer `.env` y secretos | sí (`permissions.deny`) | **no** | **no** |
| AgentRun en `ops/runs/` | sí, `provider: claude-code` | sí, `provider: codex` | sí, `provider: gemini-cli` |
| Hooks de proyecto exigen confianza | no | sí: `/hooks` los revisa y confía; un cambio de comando pide revisar otra vez | sí: carpeta confiable; un hook nuevo o cambiado avisa |

Las tres protecciones locales son guardrails, no barreras. Un comando opaco que no
nombra la ruta (variables, globs) pasa. Lo que no se puede omitir es CI y la revisión
del PR por el owner (R-17). Los hooks evitan el error común y lo hacen visible.

## Límites conocidos

- **Lectura de secretos.** Codex y Gemini no tienen el equivalente de los `Read` deny de
  Claude. Mientras no lo tengan, no se abre una sesión de Codex o Gemini en una máquina
  con `.env` de producción, y se usan sólo cuentas registradas para datos de nivel 2
  (D-0074).
- **Claude puede editar `.codex/`, `.gemini/` y `.agents/`.** Su `permissions.deny` no
  los incluye y cambiarlo exige editar `.claude/settings.json`, que necesita aprobación
  explícita del owner. La propuesta está abajo. Hasta aplicarla, un cambio de Claude a
  esas rutas sólo lo frena la revisión del PR.
- **Codex confía en el comando del hook, no en el script.** Cambiar
  `.agents/hooks/protect-paths.mjs` no vuelve a pedir revisión en `/hooks`. Por eso
  `.agents/` es una ruta protegida.
- **`apply_patch` de Codex.** El hook lo cubre y el test lo prueba con la forma
  documentada, pero la corrida real de T-0039 no pudo exponer esa herramienta: el
  modelo simulado no trae su metadata. La primera sesión real de Codex que edite un
  archivo lo confirma.
- **Reanudaciones simultáneas.** Codex y Gemini lanzan el hook por un shell, así que el
  AgentRun correlaciona sólo por `session_id`. Dos reanudaciones a la vez de la misma
  sesión fallan de forma visible en la segunda; no se mezclan.

## Arrancar una sesión

1. Rama `task/T-xxxx-…` creada desde `main`, con la tarea en `READY` o `ACTIVE`.
2. La primera vez en una máquina:
   - **Codex:** abrir `codex` en la raíz del repo, entrar a `/hooks` y confiar los
     tres hooks de `.codex/hooks.json` después de leer sus comandos.
   - **Gemini:** marcar la carpeta del repo como confiable cuando lo pregunta. Si
     avisa de hooks nuevos, leerlos antes de seguir.
3. Declarar `AGENTRUN_SETTING_SOURCES` si se sabe qué configuración está cargada; si
   no, el run queda `unknown`, que es lo honesto.

## Cerrar una sesión

1. Salir del CLI normalmente: así corre `SessionEnd` y el run queda `ENDED`.
2. `pnpm check` antes de abrir el PR. Valida también el ledger de `ops/runs/`.
3. La revisión ciega la hace un subagente aislado, del mismo proveedor o de otro (R-33);
   la independencia viene de no compartir contexto. El PR lo mergea el owner.

## Propuesta para `.claude/settings.json` (no aplicada)

Aplicarla es decisión del owner (R-15). Agrega a `permissions.deny`:

```json
"Edit(./.codex/**)",
"Edit(./.gemini/**)",
"Edit(./.agents/**)",
"Write(./.codex/**)",
"Write(./.gemini/**)",
"Write(./.agents/**)"
```

El hook de shell de Claude (`.claude/hooks/protect-paths.mjs`) sigue protegiendo sólo
`.claude/` y `.github/workflows/`. Extenderlo es otro cambio a `.claude/` y queda para
cuando el owner lo pida.

## Fuentes

Consultadas el 2026-11-08 y contrastadas con Codex CLI 0.167.0 y Gemini CLI 0.67.0:

- Codex hooks: <https://learn.chatgpt.com/docs/hooks.md>
- Gemini CLI hooks: <https://geminicli.com/docs/hooks/> y
  <https://geminicli.com/docs/hooks/reference/>
- Gemini CLI y `AGENTS.md`: <https://geminicli.com/docs/cli/gemini-md/>
