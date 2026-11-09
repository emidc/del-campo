# Revisión ciega — T-0043

- **Procedimiento:** R-33, subagente aislado de Claude Code, sin el historial de la sesión
  que implementó.
- **Revisado:** rama `chore/T-0043-control-del-cambio`, commit `4cba396`, contra `main` en
  `6a1126e`.
- **Excepción declarada:** T-0043 es nueva y no existe en `main`; el contrato se leyó
  desde la rama.
- **Orden:** el revisor corrió la verificación antes de leer evidencia (no había
  evidencia todavía). No pudo correr `pnpm test` (sin Postgres 17).

## Resultado del revisor y respuesta

| # | Categoría | Hallazgo | Respuesta en esta rama |
|---|---|---|---|
| 1 | Act on | `git diff --name-status` cita las rutas con acentos y los dos checkers no las reconocen: falso verde en el contrato, falso rojo en `REVIEWS/` | Corregido: `core.quotePath=false` en ambos; pruebas con `ñ` |
| 2 | Act on | La exigencia por FEATURE/MIGRATION dependía del id en el nombre de rama | Corregido: cuentan también las tareas que el diff toca; prueba `chore/impl` |
| 3 | Act on | Una enmienda de una FEATURE quedaba trabada (no podía llevar su reporte) y una enmienda que bajaba el kind evitaba la revisión | Corregido: `amend/` admite `REVIEWS/<id>*`; el kind exigible es el de la base o el de la rama, el que pida revisión |
| 4 | Act on | `SENSITIVE` no incluía la lógica de los endpoints (`handlers`, `server`, `jobs`), `packages/api/src/http.ts`, `vs01/`, `migraciones.ts` ni los `deny.test.ts` | Corregido, más `scripts/tests/` (R-13: tests existentes modificados) |
| 5 | Act on | Los hooks dejaban `cp x scripts/`, `mv x scripts` y `rm -r scripts`; el de Claude no reconocía `/usr/bin/rm` | Corregido en los dos hooks, con pruebas |
| 6 | Act on | T-0043 en DONE con la casilla de revisión marcada antes de existir el reporte | Este archivo y la evidencia entran en el mismo commit que deja DONE |
| 7 | Consider | En `pull_request` el YAML del workflow es el de la rama: un PR podría quitar la corrida de la base | Declarado como límite en ADR-0086 y R-15; cerrarlo exige un ruleset desde `main`, fuera de alcance |
| 8 | Consider | La guarda `import.meta.url === file://argv[1]` falla en rutas con espacios o acentos y sale 0 sin correr | Corregido con `fileURLToPath` en los dos scripts nuevos o cambiados |
| 9 | Consider | Comandos opacos que escriben un validador (`echo x > scripts/check-docs.mjs`) pasan en local | Se mantiene: compromiso documentado en `agentes.md`; lo frena CI por la revisión exigida |
| 10 | Consider | Ningún test cubría `- [x]` dentro de un bloque de código | Agregado |
| 11 | Consider | `decisionRefs` no está congelado | Se mantiene: no es parte del contrato en D-0086 |
| 12 | Consider | GOV-04b del plan seguía planificando la captura | Anotado en el plan como hecho en T-0039 y retirado por D-0085 |
| 13 | Consider | R-28 ACTIVA no verificada para las rutas de `apps/web` | Se mantiene como límite en la evidencia |
| — | Noted | CRLF completo da falso rojo (lado seguro); `CHECK_BRANCH_NAME` vacío se trata distinto; T-0042 se cierra en este PR; el test del hook dejó de comparar con la propuesta de T-0008 a propósito; consistencia de documentos y decisiones verificada | Sin cambio |
| — | Dismissed | Id duplicado como tarea nueva (lo detecta `check-docs`); renombres (fallan); `riskClass` ausente (lado seguro); `yaml` desde `.ci-base/` (resuelve) | Justificación del revisor |

Después de las correcciones, el implementador volvió a correr la verificación; la salida
literal está en `ops/evidence/T-0043.md`. Las correcciones no pasaron por una segunda
revisión ciega.
