# .claude/

Configuración del arnés. **Bajo aprobación humana obligatoria** — ver `ENGINEERING_RULES.md` R-15.
Un agente que puede modificar sus propios límites no tiene límites, por eso esta ruta está en `permissions.deny`.

## Qué hay hoy

- `settings.json` — reglas de denegación y los hooks de captura de AgentRun (tarea `T-0001`).

## Qué falta y es el próximo paso

- `skills/task-design/` — convertir un objetivo en una tarea verificable.
- `skills/spike-brief/` — briefs de spike y de POC (un skill, dos modos).
- `skills/adr/` — escribir ADRs y detectar decisiones que se están tomando sin registrar.
- `skills/critical-review/` — revisión adversarial contra `Outcome`, `Verification` y `Non-scope`.
- `agents/critical-reviewer.md` — subagente aislado para esa revisión, con `memory: project`.
- `rules/` — reglas con `paths:` cuando exista código.

Se escriben cuando haya trabajo real que las use. Cuatro skills es el techo inicial:
descripciones que se solapan hacen que se cargue la equivocada.

## Lo que NO va acá

Nada específico de una persona. La configuración personal vive en `~/.claude/` y
**no contiene nada semántico del proyecto** (R-10). Un proyecto cuya conducta depende
de configuración no versionada deja de ser reproducible.

