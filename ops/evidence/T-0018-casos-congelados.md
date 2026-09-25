# T-0018 — Casos de aceptación de VS01 congelados

Evidencia agregada y sin PII (R-19). Los casos viven en `data/vs01-acceptance/`, ignorado por Git.

- Congelado: 2026-09-25T15:17:49.744Z
- Casos: 20 (C01–C20), con consulta inicial, Policy objetivo, documento objetivo y vínculos a comprobar
- Registro de selección: `seleccion.md` completo
- SHA-256 `casos.csv`: `f2ca32043ae67212f18d027774884620bdac2d2e20e68e22bb7ebd2d669dfcc3`
- SHA-256 `seleccion.md`: `d92360cbc54f6bd6c8322acfe7f1fee00161cbe4cc6f7134c49b84375fa91f93`

Comprobación: `node scripts/vs01/freeze-cases.mjs --verify`. Si las huellas no coinciden,
los casos cambiaron después del congelamiento y la medición no es válida para aceptación.
