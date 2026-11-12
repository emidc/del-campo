# T-0055 — Revisión

No es una revisión ciega de R-33. La escribió el mismo agente que hizo el cambio, en el
modo mínimo que pidió el owner. Existe porque el diff toca un test de validadores
(`scripts/tests/check-docs-wip.test.mjs`) y CI pide un reporte.

## Qué se miró

- Al poner `waiting:` en T-0055, dos tests de `check-docs-wip` fallaron. El test sumaba
  todas las tareas ACTIVE del repo para calcular cuántas sintéticas agregar, pero el
  checker no cuenta las que tienen `waiting:` (D-0080). Con una ACTIVE en espera, el
  test agregaba una sintética de menos.
- El arreglo es sólo en el test: `existingActive` descarta las ACTIVE con `waiting:`,
  igual que el checker. `scripts/check-docs.mjs` no cambia.
- Se reprodujo antes del arreglo (3 pasan, 2 fallan) y después pasan los 250 tests de
  `scripts/tests`.

## Riesgo aceptado

Ninguno nuevo: el límite de WIP se sigue verificando con el mismo checker.
