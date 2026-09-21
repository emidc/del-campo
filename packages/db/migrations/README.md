# Migraciones

El schema vive acá. → `D-0045`

Una migración es un archivo `NNNN_slug.sql` con SQL plano: `0001_party.sql`. El número
es de cuatro dígitos, monótono y sin huecos declarados en el nombre; el orden de
aplicación es el orden del número, no el del sistema de archivos.

El directorio está vacío, y eso es el `## Non-scope` de T-0010 cumplido: la primera
migración es la de T-0012, junto con `CREATE EXTENSION btree_gist`, que es precondición
de las constraints `EXCLUDE USING gist` de `PolicyVersion`.

Mientras no haya archivos, `pnpm db:migrate` no toca la base: no crea siquiera la tabla
de control. Una base recién creada por `pnpm db:create` tiene cero tablas, que es
literalmente lo que T-0010 promete.

## Por qué SQL y no un DSL

Las invariantes centrales de `DOMAIN.md` —intervalos de `PolicyVersion` no solapados vía
`EXCLUDE USING gist` con `btree_gist`, a lo sumo una versión abierta vía índice único
parcial— no son expresables en los DSL de schema disponibles. Un modelo en TypeScript
dejaría las invariantes centrales fuera de la vista del archivo que dice ser el schema.
El razonamiento completo está en `DECISIONS/0045-schema-en-migraciones-sql.md`.
