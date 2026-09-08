# Project OS Zero v1.0 — cambios de revisión

- AgentRun ahora se captura con `SessionStart` / `SessionEnd` como eventos
  `RUN_STARTED` / `RUN_ENDED` correlacionados; `Stop` quedó eliminado.
- `decisions.yaml` es autoridad de WHAT + STATUS; los ADR conservan WHY, evidencia,
  alternativas y consecuencias sin duplicar el statement.
- Las decisiones abiertas usan ids estables `D-0022` a `D-0030`; `OPEN` vive
  exclusivamente en `status`.
- `contextRefs` es obligatorio en todas las Tasks. `T-0001` referencia el esquema
  de runs y `T-0002` declara sus fuentes reales.
- R-06 admite verificación humana explícita en SPIKE y REVIEW.
- El parser YAML casero fue reemplazado por el paquete estándar `yaml`, con lockfile.
- `DOMAIN.md` v0.1 se recuperó completo desde la conversación canónica y su sección
  de decisiones abiertas se alineó con `decisions.yaml`.
- `docs/history/SOURCES.md` conserva la procedencia y el hash del documento
  incorporado; el Charter continúa pendiente.
- `T-0002` quedó `READY` al quedar disponible su contexto canónico.
