# Revisión ciega de T-0023 — `search_path` fijado en las funciones de las migraciones (R-33)

Reviewer independiente. No recibí transcript ni justificación narrativa del implementador.
Base: `git diff main...task/T-0023-search-path-en-funciones` (5 archivos, +467/-9; un
commit, `52455b2`), el contrato de T-0023 leído desde `main`, `ENGINEERING_RULES.md`
(R-13, R-19, R-33), `packages/db/migrations/README.md`, `docs/despliegue/vercel-vs01.md`
§9–§10, `.github/workflows/project-os-check.yml` y, ya corrida la verificación,
`ops/evidence/T-0022.md` (para saber qué migraciones tiene producción).

## Verificación ejecutada antes de leer evidencia

```
DATABASE_URL=postgres://localhost:5432/delcampo_t0018_test pnpm check
```

**Falló, exit 1.** `check-docs` (`✓ 64 decisiones, 27 ADRs, 23 tareas, 0 aviso(s)`),
AgentRun (10 eventos), las 73 pruebas de `scripts/tests`, `tsc --noEmit` y `eslint .`
pasaron. `pnpm test`: `ℹ tests 196 / pass 192 / fail 4`. Las cuatro fallas son de
`function-search-path.integration.test.ts`:

```
✖ 0001 · prevent_party_merge_cycle: acepta lo válido y rechaza lo inválido igual en ambos
✖ ninguna función de public creada por las migraciones carece de search_path en proconfig
✖ causalidad: la prueba detecta una función redefinida sin SET search_path
    actual: [ 'party_id_is_immutable()', 'prevent_party_merge_cycle()' ]
✖ aplicar, revertir y volver a aplicar deja configuración y cuerpos iguales
    prevent_party_merge_cycle(): config null
```

En `delcampo_t0018_test`, `prevent_party_merge_cycle()` tiene `proconfig` nulo aunque
`schema_migrations` registra `0006_function_search_path.sql` (2026-10-02 12:04). La
causa está en A1 y la reproduje en una base efímera limpia.

Además corrí, sobre bases efímeras `delcampo_t0023rev_test` y `delcampo_t0023rev2_test`
(ya borradas): `db:create` + dos `pnpm test` seguidos; `db:down`/`db:migrate` con
`pg_dump --schema-only` antes y después; y el refresco de §10 con el lote sintético de
`scripts/vs01/seed-sintetico.mjs`, con y sin 0006. No leí nada bajo `data/` ni usé
`delcampo_t0013_dev`. No hay `ops/evidence/T-0023.md` en la rama.

---

## Act on

### A1 — `pnpm check` pasa una sola vez: la prueba de concurrencia de `schema.integration.test.ts` le borra el `search_path` a `prevent_party_merge_cycle()`

`packages/db/src/schema.integration.test.ts` (líneas 945–1062, no tocado por el diff)
reemplaza la función con `FUNCION_SIN_LOCK_CON_SLEEP` y en el `finally` la «restaura» con
`FUNCION_CON_LOCK`: dos `create or replace function prevent_party_merge_cycle()` **sin**
`set search_path`, con autocommit. Como el propio README nuevo dice, `create or replace`
reemplaza la configuración: después de esa prueba, la función queda sin `search_path`
de forma persistente en la base.

Reproducción en una base efímera recién creada y migrada:

| corrida | resultado | `prevent_party_merge_cycle().proconfig` después |
|---|---|---|
| 1.ª `pnpm test` | `pass 196 / fail 0` | **nulo** |
| 2.ª `pnpm test` | `pass 192 / fail 4` (las mismas cuatro de arriba) | nulo |

La primera pasa sólo porque `function-search-path…` se ordena antes que `schema…`. CI
crea la base y corre `pnpm check` una vez (`project-os-check.yml`), así que va a dar
verde; cualquier base local donde ya se corrieron las pruebas —incluida la que nombra el
propio comando de `## Verification`— da rojo. El checkbox `pnpm check` del contrato hoy
no se cumple de forma reproducible, y su resultado depende del orden en que corren los
archivos.

Hay que decir lo positivo: la prueba de catálogo hizo su trabajo. Encontró una
redefinición sin `SET` exactamente como el contrato pide. Lo que faltó fue actualizar el
otro sitio del repositorio que redefine una función de las migraciones.

Arreglo: agregar `set search_path = public, pg_temp` a `FUNCION_CON_LOCK` y a
`FUNCION_SIN_LOCK_CON_SLEEP`. Mejor todavía, que la restauración no reescriba el cuerpo
a mano. Ver N2: el cuerpo restaurado ya difería del de 0001 antes de esta tarea. Una
opción es capturar `pg_get_functiondef(...)` antes de reemplazarla y re-ejecutarlo en el
`finally`. Después, reparar `delcampo_t0018_test`: reaplicar el `alter function` de 0006
sobre esa función, o `db:reset`. Verificar con dos `pnpm check` seguidos.

---

## Consider

### C1 — La prueba de catálogo sólo mira `public`, y la motivación del contrato son los esquemas de D-0063

La consulta filtra `p.pronamespace = 'public'::regnamespace`. El contrato acota el
outcome a `public`, así que esto cumple. Pero el `## Why` justifica la tarea por
`risk` y `communication` (D-0063), y el README nuevo dice «toda función que una migración
cree en `public`». La primera función que una migración cree en `risk` sin `SET` pasa
`pnpm check`: es justo el «error esperando ocurrir» que la tarea quiere cerrar. Ampliar el
filtro a todo esquema que no sea `pg_catalog`, `information_schema` o `pg_toast`, sin
dejar de excluir lo que pertenece a extensiones, cuesta una línea y no cambia nada hoy:
verifiqué que no hay funciones propias fuera de `public`. El README debería decir lo
mismo.

### C2 — Falta la evidencia que el contrato pide

`## Notes`: «Decide el implementador y lo justifica en la evidencia». No hay
`ops/evidence/T-0023.md`. La justificación de `ALTER FUNCTION … SET` frente a calificar
las tablas está en la cabecera de la migración y es correcta: `prosrc` idéntico byte a
byte; lo comprobé con `pg_dump --schema-only` (ver N1). Aun así, el contrato la pide en la
evidencia, y ahí también tiene que quedar el último checkbox: el owner aplica 0006 en
producción. `check-docs` no lo exige hasta `DONE`, así que el verde no lo cubre.

### C3 — §9 como procedimiento: el volcado único con `document_link` ya no carga

Esto viene de antes del diff, pero el contrato pide que §9 «siga siendo correcta como
procedimiento». §9.1 vuelca `document_link` en el mismo archivo que `policy`, y `pg_dump`
la ordena antes. Con la base local que hoy tiene vínculos (T-0017/T-0022), la carga de
§9.3 aborta con `document_link.resource_id … does not reference an existing policy`. Lo
reproduje con un volcado completo del lote sintético. §10.3 ya resuelve esto separando
`document_link`. Cuando se cargó §9, `document_link` estaba vacía y el problema no
apareció. Antes, el `sed` del `search_path` ocultaba esto: el primer error era el de
`party`. Ahora es el primer error que vería quien repita §9. Una nota en §9.1 que remita a
la separación de §10.3, o el mismo `-t document_link` aparte, alcanza.

---

## Noted

- **N1 — Lógica intacta y reversa exacta, verificadas en la base.** Las 14 funciones
  propias de `public` (10 de 0001, de las cuales `require_document_link_resource` está
  redefinida por 0004, y 4 de 0002) son exactamente las 14 del `ALTER`. Con 0006 todas
  quedan en `{"search_path=public, pg_temp"}`. `pg_dump --schema-only` antes de `db:down`,
  después de `db:down` y después de volver a `db:migrate`: el primero y el último son
  idénticos salvo el token `\restrict`. El de `down` difiere **sólo** en las 14 líneas
  `SET search_path TO 'public', 'pg_temp'`. Ningún cuerpo, tabla, índice, constraint ni
  trigger cambia, y no hay funciones de `btree_gist` tocadas. Se respeta el `## Non-scope`.
- **N2 — El cuerpo «restaurado» por `schema.integration.test.ts` ya difería del de
  0001 antes de esta tarea.** `md5(prosrc)` en base limpia es `0311f1bc…`; después de esa
  prueba es `45443089…`. Viene de antes y no lo introduce T-0023, pero significa que la
  prueba «con el advisory lock (mecanismo real de la migración)» ejercita una copia, no el
  objeto migrado. El arreglo sugerido en A1 lo resuelve de paso.
- **N3 — El refresco de §10 funciona sin `sed`.** Lote sintético, `pg_dump --data-only`
  en dos archivos como en §10.3, con la línea `set_config('search_path', '', false)`
  intacta en ambos, vaciado y carga `--single-transaction` como en §10.5: `salida=0`,
  13 `COPY` y conteos iguales al origen. Lo corrí dos veces seguidas. La misma carga
  sobre la base con `db:down` de 0006 falla con `relation "party" does not exist`: la
  causalidad del `## Why` se confirma.
- **N4 — §10.4 dice bien cuál es la migración pendiente.** «Hoy la pendiente es 0006»
  supone que producción ya tiene 0005. `ops/evidence/T-0022.md` lo registra (aplicada
  en producción en §10.4 del refresco de T-0022). El paso de migrar antes de la carga
  sigue en su lugar y con la aprobación humana de R-13. Ni §9 ni §10 piden ya quitar la
  línea.
- **N5 — Cobertura de comportamiento.** Las pruebas con `search_path` vacío cubren 7 de
  las 14 funciones, con al menos una por cada migración que define funciones (0001, 0002,
  0004), que es lo que pide el contrato. Las otras 7 las cubre sólo el catálogo. Como el
  mecanismo es uniforme (`ALTER … SET`), alcanza.
- **N6 — `delcampo_t0018_test` quedó con `prevent_party_merge_cycle()` sin
  `search_path`.** Ya estaba así antes de mi primera corrida. No la reparé, porque la
  revisión no edita estado. Se arregla con lo que indica A1.

---

## Dismissed

- **«`SET search_path` en la función degrada el rendimiento porque impide inlining»**:
  la restricción afecta a funciones SQL que se inlinean en una consulta. Estas son
  funciones `plpgsql` de trigger, que nunca se inlinean. El costo es un cambio de GUC por
  llamada, despreciable para triggers de validación.
- **«`pg_temp` al final sobra porque ninguna es `SECURITY DEFINER`»**: el contrato lo
  pide explícitamente en `## Notes`, y es la forma defensiva correcta. Sin objeción.
- **«La reversa debería restaurar un valor anterior en vez de `reset`»**: el valor
  anterior era `proconfig` nulo, porque 0001–0004 no declaraban `SET`. `reset` lo deja
  exactamente así; lo verificó el `pg_dump` de N1.
- **«Con `search_path` vacío pueden fallar las constraints de exclusión de `btree_gist`
  durante la carga»**: los operadores de una constraint se resuelven por OID al crearla,
  no por nombre al evaluarla. La carga de N3 con `search_path` vacío pasó completa.
- **«El diff toca §10.4 fuera de lo pedido»**: el contrato pide que la ficha deje de
  requerir el `sed`. Actualizar la migración pendiente del paso que aplica migraciones
  es la consecuencia directa de eso, y sin ella el refresco abortaría.

---

**Veredicto.** Un `Act on`. A1 hace que el `pnpm check` del contrato pase sólo en una base
recién creada y falle en cualquier corrida posterior. Hoy es exactamente lo que pasa con
`delcampo_t0018_test`. La migración en sí es correcta: cubre las 14 funciones, no cambia
ningún cuerpo, la reversa es exacta y el refresco de producción funciona sin el `sed`. La
prueba de catálogo es eficaz. Detectó la omisión real, sólo que en un archivo que el diff
no tocó.
