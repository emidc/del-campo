# ADR-0080 — Como máximo cinco frentes activos, sin contar las esperas pasivas

- **Id en `decisions.yaml`:** D-0080
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Reemplaza:** el límite de dos tareas ACTIVE y un spike de `PROJECT.md` §5.
- **Aprobación:** el owner, el 2026-11-07, en el hilo del plan hacia la north star.

## Contexto

El límite de dos tareas activas se fijó con un solo desarrollador y un solo agente. Hoy
el owner dedica unas 48 horas por semana y tiene tres agentes (D-0082). Con dos lugares,
una espera de 14 días o de una factura bloquea la mitad de la capacidad sin trabajo real.

## Referencia canónica

La decisión vive en `decisions.yaml`, D-0080. `scripts/check-docs.mjs` la hace cumplir.

## Cómo se aplica

- Cuentan las tareas `ACTIVE` sin `waiting`. Máximo cinco, sin sublímites.
- Una tarea que sólo espera declara en el frontmatter
  `waiting: "<condición de salida> · próxima comprobación AAAA-MM-DD"`. El checker exige
  que sea un texto no vacío.
- Cuando la espera pide trabajo, se quita `waiting` y la tarea vuelve a contar.
- El cuello de botella real es la revisión del owner. El plan propone una alerta: si la
  revisión pendiente supera las horas de los próximos dos días, no se abre otro frente.
  Es una práctica, no una regla del checker.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Cinco frentes con sublímites (tres de construcción, dos de producción, un spike) | El owner prefirió un número único y simple |
| Contar las esperas | Ocupan lugares semanas enteras sin trabajo |

## Consecuencias

**Más fácil:** avanzar en paralelo con tres agentes.
**Más difícil:** la cola de revisión del owner puede crecer; se vigila en la revisión semanal.

## Criterio de falsación

Se revisa si dos semanas seguidas hay PRs esperando revisión más de tres días, o si
una espera con `waiting` esconde trabajo pendiente.
