# T-0047 — Revisión

No es una revisión ciega de R-33: la escribió el mismo agente que implementó, con el
modo mínimo que pidió el owner. Este archivo existe porque el diff toca validadores y CI
corre también la versión de la base de `check-review-required`, que lo exige.

## Qué se miró

- `check-task-contract`: la regla que exigía la tarea en el merge-base ahora exige sólo
  que exista en la rama. Si la tarea ya estaba en `main`, el congelamiento de su contrato
  sigue igual (los tests de congelamiento no cambiaron y pasan).
- `check-review-required`: sin la exigencia por kind ni la excepción de planificación.
  Quedan como sensibles identidad y autorización, controles de acceso de las apps,
  guardrails y validadores; salen migraciones, endpoints, persistencia e integraciones.
  Un cambio sensible sin tarea sigue fallando.
- Riesgo aceptado: una migración que cambie políticas RLS ya no exige reporte. La
  cubren los tests de integración de permisos y el merge del owner.
