# Revisión ciega de T-0022 — enlaces de Zoho en VS01 (R-33)

Reviewer independiente. No recibí transcript ni justificación narrativa del implementador.
Base: `git diff main...task/T-0022-enlaces-de-zoho-en-vs01` (28 archivos, +1583/-100), el
contrato de T-0022 leído desde `main`, `decisions.yaml` (D-0057, D-0064, D-0053, D-0054),
`ENGINEERING_RULES.md` (R-05, R-13, R-19, R-26) y `docs/despliegue/vercel-vs01.md` §9–§10.

## Verificación ejecutada antes de leer evidencia

```
DATABASE_URL=postgres://localhost:5432/delcampo_t0018_test pnpm check
```

**Pasó, exit 0.** `✓ 64 decisiones, 27 ADRs, 22 tareas, 0 aviso(s)`; AgentRun 10 eventos;
`tsc --noEmit` sobre `packages/` y `apps/web` sin errores; `eslint .` sin errores;
`ℹ tests 178 / pass 178 / fail 0` (36 suites). Las 13 pruebas de `zoho-links/load.integration.test.ts`
y las 6 de `drive-url.test.ts` corrieron en verde. No leí nada bajo `data/` ni usé
`delcampo_t0013_dev`.

Dato de contexto: el árbol de trabajo **no estaba limpio** al empezar. `packages/db/src/zoho-links/load.integration.test.ts`
tiene dos pruebas agregadas sin commitear («una carpeta de cliente comprobada prevalece…»
y «una sola carpeta de Zoho sirve a todas las pólizas…»), y hay `ops/evidence/T-0022.md`
y `ops/runs/2026-10-02.jsonl` sin versionar. Mi corrida fue sobre ese árbol: 178 pruebas
contra las «176 de `packages/` + `apps/`» que declara la evidencia — la diferencia son
exactamente esas dos. Es decir: **el commit de la rama no contiene las dos pruebas ni el
archivo de evidencia que el contrato exige**.

---

## Act on

### A1 — El refresco de producción (§10) no aplica la migración 0005 y va a abortar

`docs/despliegue/vercel-vs01.md` §10.2 nuevo dice «aplicá la migración `0005_zoho_document_links.sql`
en la base **local**». En toda la secuencia de §10 no hay ningún `pnpm db:migrate` contra
producción: `pnpm db:migrate` sólo aparece en §9.2, que es el aprovisionamiento inicial
del proyecto nuevo. El paso 3 vuelca `document_link` con `pg_dump --data-only -t document_link`,
y ese dump emite ahora `COPY public.document_link (…, link_level) FROM stdin`. Contra una
producción que todavía no tiene la columna, eso es `ERROR: column "link_level" of relation
"document_link" does not exist` y, por `--single-transaction`, **el refresco entero se
revierte**: producción queda con los datos viejos y el owner con un fallo que la ficha no
anticipó.

No es hipotético: la evidencia dice explícitamente que 0005 se aplicó en las cuatro bases
locales y que el refresco no se ejecutó, así que producción está hoy sin la columna. El
texto nuevo de §10.5 llega tarde — comprueba el desglose *después* de una carga que no
puede haber funcionado.

Arreglo: un paso explícito en §10, antes del vaciado/carga, que aplique las migraciones
pendientes en producción (`pnpm db:migrate` con el pooler de producción, con la aprobación
humana que §7.4 ya exige para migraciones), y que diga que 0005 es la pendiente de este
refresco.

### A2 — Con el vínculo humano ambiguo, el enlace de Zoho se ofrece como «Abrir documento» y ninguna prueba lo mira

En `document-linking/query.ts`, la precedencia se implementó como
`coalesce(case when document.candidatos = 1 then document.drive_url end, zoho_document.drive_url)`.
Cuando una Policy tiene **dos o más** candidatos humanos (`candidatos > 1`), la rama humana
da `null` y el `coalesce` cae en el enlace de Zoho. Igual en `client_folder`.

Efecto: una Policy donde una persona registró dos relaciones documentales —el caso que
D-0057 reserva como pendiente «ambiguo», y que T-0018 mostraba como ausencia de documento—
ahora muestra un enlace que nadie comprobó, con el rótulo `AMBIGUOUS` al lado. D-0064 dice
«un vínculo comprobado por una persona prevalece **siempre** sobre uno de Zoho»: acá existe
material comprobado para esa Policy y lo que se ofrece es el de Zoho. El comentario del
código afirma lo contrario de lo que el código hace («el de Zoho sólo aparece cuando no hay
humano que ofrecer»): con ambigüedad hay humano, y aparece el de Zoho.

Se puede sostener la lectura opuesta —con ambigüedad no hay *un* vínculo comprobado que
prevalecer— pero no está escrita en ningún lado, ni en la tarea, ni en el ADR, ni en un
comentario, y **ninguna prueba cubre el caso**: las 13 integraciones prueban cero candidatos
humanos o exactamente uno. Es la clase de decisión que no debería quedar implícita en un
`coalesce`. Arreglo mínimo: decidir el caso explícitamente (lo natural, y lo que preserva
la aceptación de VS01, es que Zoho aparezca sólo cuando `document.candidatos is null`), y
dejarlo con prueba en `load.integration.test.ts` para los dos niveles (documento y carpeta).

### A3 — Las dos pruebas y la evidencia que el contrato exige no están en el commit

Ver arriba. El checkbox «un vínculo comprobado prevalece» de `## Verification` sólo está
cubierto para el documento de la Policy en lo commiteado; la variante de carpeta del cliente
—y la prueba de que una carpeta de Zoho sirve a varias pólizas del mismo cliente, que es la
que protege la semántica de `client_holder`— viven únicamente en el árbol de trabajo.
`ops/evidence/T-0022.md` tampoco está versionado, y `check-docs.mjs` exige evidencia recién
cuando la tarea pasa a `DONE` (hoy está `ACTIVE`), así que el verde de `pnpm check` **no**
cubre esto. Commitearlos antes del merge, y corregir el «176» de la evidencia a 178.

---

## Consider

### C1 — `forms` en el regex de archivo: un Google Form ofrecido como documento de la póliza

`FILE_PATH = /^\/(?:file|document|spreadsheets|presentation|forms)\/d\/[^/]+/`. El comentario
inmediatamente arriba enumera tres nativos (`/document/`, `/spreadsheets/`, `/presentation/`)
y la prueba cubre esos tres más `/file/d/`. `forms` entró sin comentario y sin prueba. Un
formulario no es el documento de una póliza; si el lote real trae uno en «URL drive doc
poliza», esto lo presenta como tal. Quitarlo, o si fue deliberado, decir por qué y probarlo.

### C2 — `FUERA_DEL_SCOPE` también absorbe las filas sin «ID de registro»

En `recorrerModulo`, `sourceId === '' ? undefined : resolver.get(sourceId)` manda al mismo
motivo una fila cuyo registro de origen no está importado y una fila del lote **sin id**.
La primera es esperable y masiva; la segunda sería un defecto del export que conviene ver.
Mezclados, el conteo agregado que el owner pega en la evidencia no permite distinguirlos.
Un motivo propio (`SIN_ID_DE_ORIGEN`) cuesta una línea y no imprime ningún dato.

### C3 — La resolución de Pólizas por `source_event_id` depende de un criterio no probado acá

`mapaDePolicies` agrupa `policy_version` por `source_event_id` con
`source_event_type = 'Polizas'` y descarta los que resuelven a más de una Policy
(`candidatos != 1`). El criterio es el correcto y coincide con T-0017, pero ninguna prueba
de T-0022 construye el caso de un `source_event_id` con dos Policies: el `FUERA_DEL_SCOPE`
probado es el del id inexistente. Es la única vía por la que un enlace podría terminar en
la Policy equivocada, y hoy sólo la sostiene la inspección. Una prueba sintética con dos
Policies compartiendo `source_event_id` cierra el checkbox de «fuera del scope» de verdad.

---

## Noted

- **Fan-out de `zoho_client_folder`**: la CTE no agrupa, a diferencia de `client_folder`.
  No duplica filas porque `client_holder` es `distinct on (pv.policy_id)` y el índice único
  parcial de 0005 garantiza una sola fila ZOHO por Party. Es correcto, pero descansa en dos
  invariantes a la vez; el comentario sólo nombra una (el índice), no el `distinct on`.
- **`down/0005` borra datos**: es lo que D-0064 autoriza explícitamente, y el `drop index`
  previo al `drop column` es redundante (el drop de la columna se lleva el índice). Inocuo.
- **Fugas (R-19)**: revisé CLI, loader, conteos y pantalla. Ninguna URL, id de origen ni
  valor de columna del lote atraviesa la salida: el CLI imprime sólo números y nombres de
  categoría, y hay una prueba que lo afirma sobre el objeto de retorno. En el camino de
  error, `postgres.js` no adjunta el texto de la consulta ni los parámetros al Error, y la
  única constraint nueva es sobre `(resource_type, resource_id)` —uuids internos—, así que
  un `DETAIL` de violación no expone URLs. Las URLs de todos los fixtures son sintéticas.
- **R-05 (dependencias)**: no hay dependencias nuevas. El único cambio en `package.json` es
  extender el glob de `test` a `apps/**/src/**/*.test.ts`, manteniendo
  `--import ./scripts/guard-db-tests.mjs`, así que la guarda de D-0053 sigue cubriendo las
  pruebas nuevas.
- **`http:` aceptado** por `classifyDriveUrl`. Drive no sirve por http; aceptarlo no crea
  un riesgo de rotulado, sólo ofrecería un enlace que redirige.
- **`rutaDeModulo` extraído a `import/lote.ts`** desde el CLI de T-0013 sin cambiar los
  hashes: verificado contra el original, los cuatro `file_id` son idénticos.
- **Idempotencia**: el modelo «borrar todos los ZOHO e reinsertar en la transacción del
  llamador» es correcto y está probado en los dos sentidos (misma foto / foto distinta,
  con un vínculo humano atravesando las dos cargas intacto). El `delete` es global al nivel,
  no por lote, que es exactamente lo que «foto» significa en D-0064.
- **Rotulado (D-0057/D-0064)**: extraer `describirAcceso` a una función pura es la decisión
  correcta y vuelve verificable el checkbox de pantalla. La prueba que recorre todos los
  textos buscando `/comprobad[oa]\b/` es un buen guardián, aunque sólo cubre esa palabra.
  Nada en el camino de la carpeta puede producir el texto de documento: son ramas separadas
  con tipos distintos (`forma: 'CARPETA'` no tiene `pendiente`, y su `aclaracion` es
  obligatoria).

---

## Dismissed

- **«Modificar tests existentes es señal de alarma» (R-13)**: revisé las seis
  modificaciones a pruebas preexistentes (`document-linking/load.integration.test.ts`,
  `policy-query.integration.test.ts`, `schema.integration.test.ts`). **Ninguna afloja una
  aserción.** Cinco agregan `link_level, 'HUMAN'` a inserts que ahora requieren la columna
  (default quitado en 0005) y tres agregan `level: 'HUMAN'` dentro de `deepEqual` existentes
  — con `deepEqual` eso es *endurecer*: la prueba ahora falla si el nivel cambia. El único
  agregado de aserción nueva (`withZohoDocument: 0, withZohoClientFolderOnly: 0` en el
  conteo por categorías) comprueba el caso que importa: sin lote de Zoho, cero cobertura sin
  comprobar. No hay `assert` eliminado ni caso borrado en todo el diff.
- **«Una carpeta puede presentarse como documento»**: descartado en los tres puntos donde
  podría pasar. La clasificación por forma de URL es excluyente (carpeta antes que archivo,
  y cualquier forma ambigua —`open?id=`, `/drive/my-drive`— cae en `FORMA_DESCONOCIDA` y se
  omite); el loader rechaza por módulo cruzado (`CARPETA_EN_POLIZA` / `ARCHIVO_EN_CLIENTE`);
  y la consulta y la pantalla mantienen columnas y ramas separadas. `drive_item_type` se
  escribe con el tipo clasificado, no con el esperado.
- **«El nivel debería ser tabla aparte, no columna»**: la columna es la elección correcta y
  está argumentada donde corresponde. La `## Notes` del contrato lo anticipa («si el nivel
  se guarda en otra tabla, esa tabla se suma a la copia y al vaciado»), y como columna el
  refresco de §10 no necesita cambios de inventario. Sin objeción.
- **«Los enlaces de Zoho deberían pasar por `external_reference`/`policy_document_reference`»**:
  no. Esas estructuras son de D-0054 y representan una relación sustentada; meter ahí un
  enlace sin comprobar es precisamente el falseo que D-0064 evita. El loader lo evita y lo
  dice.
- **«`reconciliation_status = 'NOT_REFERENCED'` es incorrecto para un enlace de Zoho»**: es
  el valor honesto del enum existente —el enlace no está referenciado por una relación
  documental— y no afirma ninguna comprobación. `last_seen_at` queda en null, que también
  es correcto: nadie lo vio.
- **«Los conteos de la pantalla pueden presentar cobertura sin comprobar como comprobada»**:
  `withZohoDocument` y `withZohoClientFolderOnly` se cuentan dentro de las mismas ramas que
  `withDocument`/`withClientFolderOnly`, así que son subconjuntos estrictos y el denominador
  sigue cerrando. El texto de `buscar/page.tsx` dice «vienen de Zoho y nadie los comprobó» y
  se omite cuando la suma es cero.
- **«Riesgo de PII en la corrida real»**: el CLI toma la ruta del lote por argumento y el
  contrato, la evidencia y §10.2 son consistentes en que la corrida sobre
  `data/zoho-export-2026-09-16` la hace el owner. Nada en el diff lee `data/` desde una
  prueba ni desde el código de la app; los fixtures se escriben en `mkdtemp`.

---

**Veredicto.** Tres `Act on`. A1 es un defecto operativo que hace fallar el refresco la
primera vez que el owner lo corra; A2 es una divergencia no documentada y no probada de la
cláusula de precedencia de D-0064; A3 es el contrato de tarea incumplido por un commit
incompleto. El resto del trabajo es sólido: la separación de niveles está bien modelada,
el rotulado quedó verificable en vez de visual, la foto del lote es genuinamente idempotente
y no toca registros humanos, y R-19 se respeta en todas las salidas que revisé.
