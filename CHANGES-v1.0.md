# Project OS Zero v1.0 — cambios de revisión

- AgentRun ahora se captura con `SessionStart` / `SessionEnd` como eventos
  `RUN_STARTED` / `RUN_ENDED` correlacionados; `Stop` quedó eliminado.
- `decisions.yaml` es autoridad de WHAT + STATUS; los ADR conservan WHY, evidencia,
  alternativas y consecuencias sin duplicar el statement.
- Las decisiones abiertas usan ids estables `D-0022` a `D-0029`; `OPEN` vive
  exclusivamente en `status`.
- `contextRefs` es obligatorio en todas las Tasks. `T-0001` referencia el esquema
  de runs y `T-0002` declara sus fuentes reales.
- R-06 admite verificación humana explícita en SPIKE y REVIEW.
- El parser YAML casero fue reemplazado por el paquete estándar `yaml`, con lockfile.
- `docs/history/SOURCES.md` conserva hashes y declara honestamente que los originales
  completos de `DOMAIN.md` y Charter no estaban entre los adjuntos.
- `T-0002` quedó `BLOCKED` hasta incorporar `DOMAIN.md` original.
