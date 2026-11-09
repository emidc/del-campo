# .claude/

Configuración del arnés. **Bajo aprobación humana obligatoria** — ver `ENGINEERING_RULES.md` R-15.
Un agente que puede modificar sus propios límites no tiene límites, por eso esta ruta está en `permissions.deny`.

## Qué hay hoy

- `settings.json` — reglas de denegación (secretos, las cinco rutas de guardrails y los
  validadores de `scripts/`) y el hook de Bash que protege esas mismas rutas.
- `hooks/protect-paths.mjs` — ese hook. Cubre las mismas rutas que
  `.agents/hooks/protect-paths.mjs` para Codex y Gemini (`T-0043`).

La captura de AgentRun se retiró en `T-0043`; el ledger histórico sigue en `ops/runs/`.

## Lo que NO va acá

Nada específico de una persona. La configuración personal vive en `~/.claude/` y
**no contiene nada semántico del proyecto** (R-10). Un proyecto cuya conducta depende
de configuración no versionada deja de ser reproducible.

