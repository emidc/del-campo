# ADR-0045 — El schema vive en migraciones SQL

- **Id en `decisions.yaml`:** D-0045
- **Fecha:** 2026-09-20
- **Supersede:** —

## Contexto

T-0012 escribe el primer schema de Broker OS, y arranca por las invariantes. Las que
`DOMAIN.md` §67 define para `PolicyVersion` no son de forma: son de contenido y de
concurrencia.

- Intervalos de vigencia no solapados dentro de una póliza: `EXCLUDE USING gist` sobre
  un `daterange`, con `btree_gist` para poder incluir la igualdad del `policyId` en la
  misma constraint.
- A lo sumo una versión abierta por póliza: índice único **parcial**, con `WHERE`.

Ninguna de las dos es expresable en los DSL de schema disponibles para TypeScript. En
todos ellos se escribe como SQL crudo dentro de un archivo de migración generado, o como
un bloque escapado dentro del modelo. El resultado es que el archivo que dice ser el
schema no contiene las invariantes centrales del dominio, y hay que leer otro archivo
para saber qué garantiza realmente la base.

El programa además ya decidió que la base debe permanecer como un Postgres plano
restaurable en cualquier proveedor (`D-0013`). Un DSL propietario le suma a esa salida un
costo que hoy no tiene.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0045.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| ORM con modelo en TypeScript como fuente de verdad | Las invariantes centrales quedan fuera del archivo que dice ser el schema; se escriben igual como SQL crudo, pero en un lugar menos visible. |
| DSL de schema con migraciones generadas | Mismo problema que arriba, más un generador cuyo output hay que revisar en cada diff. Suma lock-in sobre `D-0013` sin resolver `EXCLUDE`. |
| SQL para las constraints y DSL para el resto | Dos descripciones del mismo schema, sincronizadas a mano. Es el peor de los dos mundos y el que más rápido se desincroniza. |
| Schema sin constraints, invariantes en la aplicación | Un test que inserta dos versiones solapadas y recibe un error de la aplicación prueba que la aplicación tiene ese chequeo, no que la base no admita el dato. `DOMAIN.md` pide lo segundo. |

## Consecuencias

**Más fácil.** La constraint se lee donde se escribe. Un test negativo de T-0012 que
espera el rechazo de la base es evidencia real. La base queda restaurable en cualquier
Postgres sin traer un runtime propietario encima. Las migraciones son revisables en el
diff sin leer el output de un generador.

**Más difícil.** Los tipos de TypeScript hay que derivarlos de la base en vez de
obtenerlos gratis del modelo, y esa derivación es trabajo de T-0012 en adelante. Las
consultas se escriben sin autocompletado de tablas hasta que exista la capa de consulta
tipada. Un `ALTER` mal escrito no lo atrapa el compilador: lo atrapa CI corriendo la
migración.

Esta decisión fija **dónde vive el schema**. No elige driver ni capa de consulta: T-0010
no instala ninguno porque todavía no hay una consulta que los use (R-01), y esa elección
la toma la primera tarea que la necesite, con su propio ADR por R-05.

**Costo de revertir:** adoptar después un modelo de aplicación significa traducir las
migraciones existentes a ese modelo y reescribir las constraints que el DSL no exprese
como SQL crudo dentro de él. Crece con la cantidad de tablas: barato hoy, con cero
tablas; caro después de la migración de Zoho.

## Criterio de falsación

Que la superficie de escritura crezca hasta que el costo por consulta —escribir y
mantener SQL a mano para cada operación, y derivar los tipos— supere lo que hoy se gana
en expresividad de constraints y en costo de salida de `D-0013`. La señal a mirar no es
la cantidad de tablas sino la de operaciones de escritura distintas y lo repetitivo de su
SQL.
