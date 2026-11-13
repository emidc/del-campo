# Del Campo — AGENTS.md

Lo lee cualquier persona o modelo que trabaje en este repositorio, con cualquier
herramienta.

## Qué es esto

Broker OS es el sistema de trabajo de Del Campo Broker, un broker de seguros real con un
equipo de ocho personas. La prioridad única es que el equipo tenga cuanto antes una
versión útil. Emiliano del Campo decide qué entra y cuándo está lista.

## Antes de empezar

1. Leer `PROJECT.md`: qué se construye, el rumbo vigente y el plan.
2. Leer `ENGINEERING_RULES.md`: es corto y es todo lo que obliga.
3. Si la tarea toca clientes, pólizas o siniestros, mirar el esquema en
   `packages/db/migrations/` y, para el vocabulario, `DOMAIN.md`.

## Cómo trabajar

- Ir directo a lo que le sirve al equipo. Ante la duda sobre qué agrega valor,
  preguntarle a Emiliano en una línea en vez de suponer o documentar.
- Un cambio, un PR, con `pnpm check` en verde. El merge es de Emiliano.
- Pedir aprobación sólo para lo que toque producción, datos reales o a un tercero
  (`ENGINEERING_RULES.md` §2).
- No inventar requisitos, estados, roles ni pantallas porque puedan servir más adelante.
- Respuestas breves y concretas, en español.

## Qué es histórico

`DECISIONS/`, `REVIEWS/`, `SLICES/`, `SPIKES/`, `ops/` y la mayor parte de
`decisions.yaml` y de `docs/` cuentan cómo se llegó hasta acá. Sirven de consulta. No son
reglas vigentes: si contradicen a `PROJECT.md` o a `ENGINEERING_RULES.md`, valen estos dos.
