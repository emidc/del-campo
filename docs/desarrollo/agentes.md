# Trabajar con Claude Code, Codex y Gemini CLI

Los tres trabajan con el mismo contrato: `AGENTS.md`, la tarea en `TASKS/`, revisión
ciega y aprobación humana (D-0082). Esta página dice qué protege cada uno en la máquina
local y cómo se arranca y se cierra una sesión. → `T-0039`, `T-0043`

## Qué tiene cada proveedor

| | Claude Code | Codex | Gemini CLI |
|---|---|---|---|
| Lee `AGENTS.md` | sí, vía `CLAUDE.md` | sí, nativo | sí, por `context.fileName` en `.gemini/settings.json` |
| Configuración del repo | `.claude/settings.json` | `.codex/hooks.json` | `.gemini/settings.json` |
| Bloquea escribir rutas protegidas con su herramienta de edición | sí (`permissions.deny`) | sí (hook sobre `apply_patch`, probado sólo en test) | sí (hook sobre `write_file` y `replace`) |
| Bloquea escribir rutas protegidas desde el shell | sí, para un comando que las nombra | sí, para un comando que las nombra | sí, para un comando que las nombra |
| Rutas protegidas | `.claude/`, `.github/workflows/`, `.codex/`, `.gemini/`, `.agents/` y los validadores de `scripts/` | las mismas | las mismas |
| Bloquea leer `.env` y secretos | sí (`permissions.deny`) | **no** | **no** |
| Hooks de proyecto exigen confianza | no | sí: `/hooks` los revisa y confía; un cambio de comando pide revisar otra vez | sí: carpeta confiable; un hook nuevo o cambiado avisa |

Las tres protecciones locales son guardrails, no barreras. Un comando opaco que no
nombra la ruta (variables, globs) pasa. Lo que no se puede omitir es CI y la revisión
del PR por el owner (R-17). Los hooks evitan el error común y lo hacen visible.

## Límites conocidos

- **Lectura de secretos.** Codex y Gemini no tienen el equivalente de los `Read` deny de
  Claude. Mientras no lo tengan, no se abre una sesión de Codex o Gemini en una máquina
  con `.env` de producción, y se usan sólo cuentas registradas para datos de nivel 2
  (D-0074).
- **Validadores desde el shell.** Ejecutarlos está permitido. El hook rechaza sólo los
  programas que escriben, mueven o borran (`sed`, `mv`, `cp`, `rm`, `tee` y similares)
  cuando nombran un validador. Un comando opaco que los modifique no se detecta en local;
  lo frena CI, que exige revisión ciega para ese diff (R-33).
- **Codex confía en el comando del hook, no en el script.** Cambiar
  `.agents/hooks/protect-paths.mjs` no vuelve a pedir revisión en `/hooks`. Por eso
  `.agents/` es una ruta protegida.
- **`apply_patch` de Codex.** El hook lo cubre y el test lo prueba con la forma
  documentada, pero la corrida real de T-0039 no pudo exponer esa herramienta: el
  modelo simulado no trae su metadata. La primera sesión real de Codex que edite un
  archivo lo confirma.

## Arrancar una sesión

1. Rama `task/T-xxxx-…` creada desde `main`, con la tarea en `READY` o `ACTIVE`.
2. La primera vez en una máquina:
   - **Codex:** abrir `codex` en la raíz del repo, entrar a `/hooks` y confiar el hook
     de `.codex/hooks.json` después de leer su comando.
   - **Gemini:** marcar la carpeta del repo como confiable cuando lo pregunta. Si
     avisa de hooks nuevos, leerlos antes de seguir.

## Cerrar una sesión

1. `pnpm check` antes de abrir el PR.
2. Si la tarea es FEATURE o MIGRATION o el diff toca una ruta sensible, el reporte de
   revisión ciega va en `REVIEWS/` con el id de la tarea; CI lo exige (D-0086).
3. La revisión ciega la hace un subagente aislado, del mismo proveedor o de otro (R-33);
   la independencia viene de no compartir contexto. El PR lo mergea el owner.

## Historial de la protección

La propuesta de seis líneas para `permissions.deny` (`.codex/`, `.gemini/`, `.agents/`)
se aplicó en `T-0043`, junto con los validadores y la extensión del hook de Bash de
Claude a las mismas rutas. La captura de AgentRun se retiró en la misma tarea (D-0085).

## Fuentes

Consultadas el 2026-11-08 y contrastadas con Codex CLI 0.167.0 y Gemini CLI 0.67.0:

- Codex hooks: <https://learn.chatgpt.com/docs/hooks.md>
- Gemini CLI hooks: <https://geminicli.com/docs/hooks/> y
  <https://geminicli.com/docs/hooks/reference/>
- Gemini CLI y `AGENTS.md`: <https://geminicli.com/docs/cli/gemini-md/>
