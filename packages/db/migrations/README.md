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

## Funciones: `search_path` fijado

Toda función que una migración cree —en `public` o en cualquier otro esquema propio,
como los de `D-0063`— declara su `search_path`:

```sql
create function nombre() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$ … $$;
```

Una función sin esa cláusula resuelve sus tablas contra el `search_path` de la sesión
que dispara el trigger, no contra el de quien escribió la migración. Un volcado de
`pg_dump` lo deja vacío, y la carga fallaba con `relation "party" does not exist`
(`ops/evidence/T-0018.md`); con los esquemas por contexto de `D-0063` el mismo error
aparece con cualquier sesión que no tenga `public` adelante. `pg_temp` va al final para
que una tabla temporal homónima no gane sobre la de `public`. → T-0023

`create or replace function` reemplaza también la configuración: una migración que
redefine una función existente repite la cláusula. Si la olvida,
`src/function-search-path.integration.test.ts` falla en `pnpm check`, porque recorre
`pg_proc` y exige `search_path` en toda función de un esquema propio que no pertenezca
a una extensión. Una función de otro esquema lista el suyo y después `public` si lo usa.
