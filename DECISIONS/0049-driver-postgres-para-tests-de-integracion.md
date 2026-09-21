# ADR-0049 — Driver de PostgreSQL: `postgres` (porsager), sin ORM

- **Id en `decisions.yaml`:** D-0049
- **Fecha:** 2026-09-21
- **Supersede:** —

## Contexto

`D-0045` fijó dónde vive el schema: en migraciones SQL, no en un modelo de aplicación.
No fijó cómo se consulta, y `T-0010` no instaló ningún driver porque todavía no había
una consulta que lo necesitara (R-01). `T-0012` sí la necesita: sus tests de
integración deben conectarse a un PostgreSQL real y ejecutar las escrituras inválidas
que las constraints tienen que rechazar. Un mock no sirve — la observación que la
tarea busca es específicamente el rechazo de la base.

Restricciones de esta elección, tal como las fija la tarea:

- delgado, tipado, sin ORM, sin DSL de schema;
- que no describa las tablas por segunda vez en TypeScript — eso repetiría el problema
  que `D-0045` ya resolvió para el schema;
- compatible con SQL crudo como fuente canónica.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0049.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| `pg` (node-postgres) | Delgado y sin ORM, pero sus tipos son genéricos (`QueryResult<any>` salvo que se le pase un tipo por consulta a mano); no da nada gratis para tipar filas sin volver a describir cada tabla en TypeScript. Válido, pero peor ajuste que `postgres` para el mismo costo. |
| Drizzle / Kysely (query builder tipado) | Aunque no son un ORM completo, ambos exigen declarar el schema como TypeScript para tipar las consultas — exactamente la segunda descripción del schema que `D-0045` evitó para las constraints y que esta decisión evita para las consultas. |
| Prisma | ORM con su propio DSL de schema (`.prisma`) y motor de migraciones propio: contradice `D-0045` dos veces (dónde vive el schema y cómo se aplican las migraciones). |
| `postgres` (porsager/postgres) — **elegida** | Cliente delgado, sin dependencias, con tipos de TypeScript de primera clase sobre template strings (`sql<Fila[]>\`select ...\``) que no requieren declarar las tablas por adelantado: el tipo de la fila se anota en el call site de cada consulta, igual que se haría con `pg` pero con mejor inferencia y sin astar a un modelo global. Habla el protocolo binario de Postgres directamente, sin capa ORM. |

## Consecuencias

**Más fácil.** Los tests de integración de T-0012 escriben SQL crudo contra las tablas
reales y anotan el tipo de fila esperado en el sitio de la consulta; no hay generador
que correr ni modelo que mantener sincronizado con las migraciones. La biblioteca
misma no impone ninguna opinión sobre el schema.

**Más difícil.** No hay autocompletado de columnas ni chequeo de que una consulta
referencie una columna que existe: eso lo sigue atrapando CI corriendo la consulta
real contra Postgres, no el compilador. Cuando la superficie de consultas crezca lo
suficiente como para justificar tipos derivados de la base (por ejemplo, generándolos
desde `information_schema` en un paso de build), esa es una decisión nueva y no la
resuelve este ADR.

**Costo de revertir:** bajo mientras la superficie de consultas sea chica — T-0012 la
usa solo en tests. Migrar a `pg` sería mecánico. Migrar a un query builder tipado
significaría escribir el schema en TypeScript por primera vez, lo mismo que evitar es
el punto de esta decisión.

## Criterio de falsación

Que la cantidad de consultas de escritura de la aplicación (no de los tests) crezca lo
suficiente como para que anotar el tipo de cada una a mano cueste más que derivarlos
de la base con una herramienta separada. La señal es la cantidad de sitios de consulta
distintos, no la cantidad de tablas — el mismo criterio que usa D-0045 para su propia
falsación.
