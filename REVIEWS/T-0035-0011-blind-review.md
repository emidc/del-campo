# T-0035: revisión ciega del PR de la migración 0011 de Broker OS y la checklist de la fase 1 (R-33, D-0048, D-0052)

- **Base revisada:** worktree aislado en HEAD `1489105` («T-0035: VS01 deja de leer las notas
  del lote, y checklist de la fase 1»), rama `task/T-0035-pr12-notes-y-fase-1`, sobre `main`
  `1446804`. El diff del paquete (`diff.patch`, 291 líneas, sin evidencias ni revisiones)
  coincide con `git diff 1446804..HEAD -- . ':!ops/evidence'`: la migración
  `packages/db/migrations/0011_lote_sin_notas.sql` y su reversa, `packages/api/src/vs01/batch.ts`,
  una prueba modificada y otra ampliada en `packages/api/src/acceso/datos.integration.test.ts`,
  `docs/migration/T-0035-identidad-comun.md` y la nueva
  `docs/migration/T-0035-fase-1-checklist.md`.
- **Contrato:** el de `main` (`contrato-desde-main.md`).
- **Leído por mi cuenta, en este orden:** el contrato; `ENGINEERING_RULES.md` R-33 (§9);
  D-0048 y D-0052 en `decisions.yaml`; `REVIEWS/T-0035-0008-blind-review.md` como modelo de
  formato. Después de correr la verificación: el diff; `0010_lectura_vs01_restringida.sql` y
  su reversa; `packages/db/migrations/README.md`; `packages/api/src/acceso/datos.ts`,
  `acceso/modo.ts`, `db.ts`, `session/config.ts`, `session/oidc.ts` (cabecera y `hd`);
  `apps/web/src/app/_componentes/Cabecera.tsx` y las páginas que llaman a `latestBatch`;
  `apps/{risk,communication}/src/lib/identidad.ts`; `packages/identidad/src/oidc.ts`;
  `scripts/vs01/seed-sintetico.mjs`; `docs/despliegue/vercel-vs01.md` (§4, §5, §9);
  `DECISIONS/0077-autenticacion-oidc-propio.md` («Cómo se aplica»); D-0022 y D-0072 en
  `decisions.yaml`; las menciones del lote en `SLICES/VS01.md`; el plan de migración entero.
  `ops/evidence/T-0035.md` (sólo su diff) lo leí **al final**, a las 01:18 UTC del
  2026-11-04, después de cerrar todas las sondas.
- **Orden:** suites con base, `typecheck`, `lint`, `check-docs` y las pruebas de `scripts/`
  antes de leer el diff; después el diff contra el contrato y sondas propias contra
  Postgres; recién entonces la evidencia.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:** ninguno persistente. `delcampo_test` ya tenía la 0011 aplicada
  (01:10:36 UTC, antes de esta revisión, y `schema_migrations` no guarda checksum): la bajé
  con `cli.ts down` y la volví a aplicar desde esta rama antes de correr nada. Para la
  causalidad la bajé y la reapliqué otra vez; **queda aplicada**. Las sondas de la app
  corrieron en una base descartable `revision_0011_dev` (borrada al terminar), con archivos
  creados en el worktree y movidos fuera (`sondas/*.txt`). `git status` del worktree queda
  limpio. No toqué el repositorio principal ni hice commits, push ni publicaciones. Todos
  los datos de las sondas son sintéticos.

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.23.4 (el repo pide ≥ 24: `pnpm` avisa «Unsupported engine»), Postgres 16.15
(el repo fija 17), `pnpm install --frozen-lockfile --offline`.

### 1. Migraciones y suites de Broker OS con base

```text
$ DATABASE_URL=…/delcampo_test pnpm db:migrate
· 11 migración(es), ninguna pendiente
$ node packages/db/src/cli.ts down
✓ down: 0011_lote_sin_notas.sql
$ pnpm db:migrate
✓ 0011_lote_sin_notas.sql
$ DATABASE_URL=…/delcampo_test node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
    --test-force-exit "packages/**/*.test.ts" "apps/web/src/**/*.test.ts"
1..66
# tests 319
# suites 66
# pass 319
# fail 0
# cancelled 0
# skipped 0
# todo 0
exit=0
```

### 2. `pnpm typecheck`, `pnpm lint`, `check-docs` y pruebas de `scripts/`

```text
$ pnpm typecheck
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
tc=0
$ pnpm lint
$ eslint .
lint=0
$ node scripts/check-docs.mjs
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
docs=0
$ node --test scripts/tests/*.test.mjs
# tests 177
# suites 5
# pass 177
# fail 0
st=0
```

### 3. Causalidad y reversa (sonda propia)

```text
$ pg_dump -s $DATABASE_URL > schema_con_0011.sql
$ node packages/db/src/cli.ts down
✓ down: 0011_lote_sin_notas.sql
$ pg_dump -s $DATABASE_URL > schema_sin_0011.sql
$ … --test packages/api/src/acceso/datos.integration.test.ts
    not ok 3 - el resto de staging sigue cerrado para broker_app, incluidas las notas del lote (0011)
        notes
      expected: '42501'
      actual: 'leyó'
# pass 4
# fail 1
$ pnpm db:migrate
✓ 0011_lote_sin_notas.sql
$ diff schema_con_0011.sql schema_sin_0011.sql      # sólo cambia el token de \restrict y:
> GRANT SELECT(notes) ON TABLE public.staging_import_batch TO broker_app;
$ diff schema_con_0011.sql schema_reaplicada.sql    # sólo el token de \restrict
```

### 4. Otros caminos hacia `notes` (sonda propia, `delcampo_test` con 0011)

```text
relacl staging_import_batch:   {root=arwdDxt/root}              (ningún grant de tabla)
attacl: id ∅ · started_at {broker_app=r/root} · source_manifest_sha256 {broker_app=r/root} · notes ∅
pertenencias: sólo root ∈ broker_app, broker_worker, broker_mcp; los tres roles sin BYPASSRLS
políticas: staging_import_batch_leer {broker_app} SELECT using (true)
vistas que dependen de staging_import_batch: 0 filas
funciones (cualquier esquema propio) cuyo cuerpo nombra staging_import% o notes: 0 filas
políticas de otras tablas que nombran staging: 0 filas
has_column_privilege(notes): broker_app f · broker_mcp f
grants de columna `notes` (cualquier tabla) a broker_app/broker_mcp/PUBLIC: 0 filas
```

### 5. VS01 de punta a punta en `oidc` y en `legacy` (sonda propia, `sondas/sonda-0011.probe.ts.txt`)

Base descartable con 0001–0011, un Operador activo con credencial, un lote viejo y el lote
sintético del seed (`source_manifest_sha256 = '0'×64`, `notes = 'LOTE SINTÉTICO — sin datos de clientes'`):

```text
SONDA oidc latestBatch: {"known":true,"importedAt":"2026-11-04T01:17:08.771Z","manifestPrefix":"000000000000"}
SONDA oidc cabecera: Datos del lote importado el 2026-11-04
SONDA oidc consulta de main ERROR 42501 permission denied for table staging_import_batch
SONDA oidc [select * from staging_import_batch] 42501
SONDA oidc [select count(notes) from staging_import_batch] 42501
SONDA oidc [select 1 from staging_import_batch where notes like 'LOTE%'] 42501
SONDA oidc [select s from staging_import_batch s] 42501
SONDA oidc [select row_to_json(s) from staging_import_batch s] 42501
SONDA legacy latestBatch: {"known":true,"importedAt":"2026-11-04T01:17:08.771Z","manifestPrefix":"000000000000"}
SONDA legacy cabecera: Datos del lote importado el 2026-11-04
SONDA legacy consulta de main: leyó 1 fila(s)
```

Y con `batch.ts` de `main` (`git show 1446804:…`, `sondas/sonda-main.probe.ts.txt`) sobre la misma base:

```text
SONDA-main legacy: Datos del lote importado el 2026-11-04 · LOTE SINTÉTICO — sin datos de clientes
SONDA-main oidc ERROR 42501
```

## Hallazgos

Severidad: **bloqueante** (no mergear sin corregirlo), **importante** (corregir antes de la
fase que lo activa o antes de ejecutar el documento), **menor**. Bloqueante e importante son
*Act on*; menor es *Consider*.

### Act on

**1. [importante] El despliegue con el lote sintético deja de mostrar «LOTE SINTÉTICO — sin
datos de clientes», en `legacy` también, y dos pasos de la ficha de despliegue quedan
falsos.** *(comprobado con sonda)*

- Dónde: `packages/api/src/vs01/batch.ts:56-61` (el sufijo con las notas desaparece de
  `batchLabel`). La marca la escribe `scripts/vs01/seed-sintetico.mjs:69` y `:213-214` **sólo
  en `notes`**. Dos afirmaciones dependen de ella:
  - `docs/despliegue/vercel-vs01.md:115-117`: «La app muestra en pantalla “LOTE SINTÉTICO —
    sin datos de clientes”, de modo que nadie pueda confundir ese despliegue con datos de la
    correduría.»
  - `docs/despliegue/vercel-vs01.md:237-239` (§9, paso 5 de la carga real): «Redesplegá
    producción y comprobá que la cabecera ya no diga “LOTE SINTÉTICO”».
- Escenario: Preview conserva la base sintética (`vercel-vs01.md:237-238`). Con este PR su
  cabecera dice sólo «Datos del lote importado el AAAA-MM-DD · manifiesto 000000000000…»,
  igual que producción. La salvaguarda contra confundir datos sintéticos con datos de la
  correduría desaparece sin que nada falle, y la comprobación del paso 5 pasa siempre,
  también si producción quedara apuntando a la base sintética. El cambio es de código, así
  que rige en `legacy`: no depende de activar `oidc`.
- Prueba: sección 5 (`main` muestra la marca, esta rama no, con la misma base). Ninguna
  prueba lo detecta: `batchLabel` no tiene ninguna (`grep -rn batchLabel` sólo encuentra
  la definición, el export y `Cabecera.tsx`).
- Por qué *Act on*: el PR declara que VS01 no necesita `notes`, y es cierto para la fecha,
  pero no para esta propiedad documentada; el contrato pide además que cada incremento
  muestre qué cambia en `legacy`.
- Arreglo posible, sin volver a exponer `notes`: derivar la marca de un dato no
  confidencial que `broker_app` ya lee, por ejemplo la huella centinela del seed
  (`'0'.repeat(64)`, que ya es lo único que el seed usa para no pisar datos reales junto con
  `notes`), y fijarlo con una prueba unitaria de `batchLabel`. Si se prefiere no marcar,
  corregir las dos frases de `vercel-vs01.md` y reemplazar la comprobación del paso 5 por
  una consulta (por ejemplo, que el último lote no tenga la huella centinela).

**2. [importante] La checklist de la fase 1 da por hecho que en el mismo proyecto de Google
Cloud pueden convivir el cliente Internal de VS01 y una pantalla de consentimiento External,
y que crear esta última «no cambia nada para nadie».** *(no comprobado contra la consola:
no tengo acceso; se basa en cómo Google modela la audiencia)*

- Dónde: `docs/migration/T-0035-fase-1-checklist.md:8-9` («crear los clientes no cambia
  nada para nadie»), `:27-28` (proyecto: «el mismo del cliente Internal de VS01, salvo que el
  owner decida otro»), `:50` («Pantalla de consentimiento de audiencia External»),
  `:61-62` («El cliente Internal de VS01 no se toca») y `:81-82` (vuelta atrás: «Borrar los
  clientes nuevos y, si se creó, la pantalla de consentimiento External»).
- Problema: en Google Cloud el tipo de usuario (Internal/External) es una propiedad de la
  pantalla de consentimiento —la «Audience» de Google Auth Platform—, que es **una por
  proyecto** y compartida por todos sus clientes OAuth. No hay un cliente «de audiencia
  Internal» al lado de otro «de audiencia External» en el mismo proyecto. Seguir la
  checklist con su valor por defecto obliga a pasar el proyecto actual a External, y eso
  cambia el cliente con el que hoy entra Broker OS en producción. Si además la pantalla
  queda en modo de prueba (§2 lo deja abierto), sólo entran las cuentas cargadas como
  usuarios de prueba, y quien hoy entra por la lista de VS01 sin estar cargado se queda
  afuera. Eso es un efecto en producción, y la fase 1 está presentada como inocua y sin
  cambios en las apps. La vuelta atrás tampoco es «borrar la pantalla»: sería volver la
  audiencia a Internal.
- Lo que sí se sostiene: D-0077 («Cómo se aplica») sólo pide los tres clientes External
  «en un mismo proyecto», no que sea el del cliente Internal. La fase 5 del plan («se
  retira el cliente Internal de VS01», `T-0035-identidad-comun.md:146-147`) y la vuelta
  atrás de la fase 2 también suponen que los dos conviven, así que el supuesto viene de
  antes, pero esta checklist es la que lo vuelve instrucción.
- Arreglo: que el valor por defecto sea un **proyecto nuevo** para los clientes External, y
  que la checklist lo diga, con el motivo. Si el owner prefiere el mismo proyecto,
  escribir que pasar la audiencia a External es un cambio de producción sobre el login
  actual de Broker OS, con su propia aprobación y su propia vuelta atrás, y sacarlo de la
  fase 1. En los dos casos, pedir que quien ejecuta confirme en la consola cómo se ve hoy
  la audiencia antes de empezar, igual que §2 ya pide para la publicación.

### Consider

**3. [menor] Volver a un despliegue anterior a este PR con la 0011 aplicada y `AUTH_MODE=oidc`
rompe toda la VS01.** *(comprobado con sonda)*

- Dónde: `0011_lote_sin_notas.sql:11` frente a `batch.ts` de `main`, que pide `notes`.
  `latestBatch` corre en `buscar/page.tsx:137`, `poliza/[id]/page.tsx:22` y
  `parte/[id]/page.tsx:20`.
- Sonda: `SONDA-main oidc ERROR 42501` (sección 5). En `legacy` no pasa nada.
- La vuelta atrás que el plan prevé (`AUTH_MODE=legacy`) funciona. El riesgo es otro tipo de
  vuelta atrás, el «Instant Rollback» de Vercel a un despliegue viejo estando en `oidc`.
  Conviene una línea en la fase 2: con la 0011 aplicada no se vuelve a código anterior a
  este PR en `oidc`; o se baja la 0011 primero, o se pasa a `legacy`.

**4. [menor] Ninguna prueba ejercita `latestBatch` ni `batchLabel`. La prueba que habla del
lote copia la consulta.**

- Dónde: `datos.integration.test.ts:166` repite a mano `select started_at,
  source_manifest_sha256 …` en lugar de correr la de `batch.ts:40-45`. Si alguien vuelve a
  agregar `notes` a `latestBatch`, las 319 pruebas siguen en verde y VS01 falla recién en
  `oidc`. Lo mismo vale para `batchLabel` y el hallazgo 1.
- El nombre «la referencia documental y el lote se leen igual que en legacy» promete más
  que esto. Arreglo posible: que `latestBatch` reciba la conexión (como ya hace `conDatos`)
  y probarla en `oidc`, más una prueba unitaria de `batchLabel`.

**5. [menor] La checklist se contradice sobre los nombres de personas.**

- `T-0035-fase-1-checklist.md:11-12` dice que no entran «nombres de personas» al
  repositorio. Pero `:26` deja una casilla «Nombre de la persona que ejecuta en Google
  Cloud» en el mismo archivo versionado, y `:86` pide registrar en la evidencia «quién
  creó los clientes». Aclarar si va el rol o si el nombre queda fuera del repositorio.

**6. [menor] «El código ya los separa» vale entre apps, no entre modos de Broker OS.**

- Dónde: checklist `:34-36`. Broker OS lee `GOOGLE_OAUTH_CLIENT_ID`/`_SECRET`
  (`session/config.ts:60-61`) tanto en `legacy` como en `oidc`. Con el cliente nuevo, la
  fase 2 sobrescribe en Vercel las credenciales del cliente Internal. La vuelta atrás de esa
  fase (`AUTH_MODE=legacy`, «el cliente Internal sigue intacto») no dice que también hay
  que restaurarlas.
- Probablemente `legacy` funcione igual con el cliente External, porque admite por `hd` y
  por la lista. Igual conviene decidirlo: o la checklist pide guardar las credenciales
  actuales del Internal junto con las nuevas (§1), o el plan dice explícitamente que la
  vuelta atrás de la fase 2 sigue con el cliente External.

### Noted

- La checklist (`:52-53`) cita `SCOPES` de `packages/identidad/src/oidc.ts`, pero Broker OS
  usa `GOOGLE_SCOPES` de `packages/api/src/session/config.ts:31`. Las dos constantes valen
  `'openid email profile'`. Las variables (`COMMUNICATION_*`, `RISK_*`, `*_BASE_URL`) y la
  ruta `/api/auth/google/callback` (`GOOGLE_REDIRECT_PATH`, `RUTA_CALLBACK`) coinciden con
  el código.
- Sobre el cliente por app, el plan se contradice: §3 dice que la elección «queda en el PR
  de la fase 0» (`T-0035-identidad-comun.md:73-75`) y §5.3, que «se evalúan clientes
  separados por app (fase 1)». La checklist sigue a §5.3 («el owner la confirma acá»). Este
  PR no corrige §3.
- `datos.integration.test.ts:3` sigue diciendo «migraciones hasta 0010 aplicadas». Ahora
  la prueba ampliada necesita la 0011.
- En `legacy`, la cabecera de producción mostraba hoy las notas del lote real a toda
  persona admitida, porque `batch.ts` de `main` las concatenaba. Este PR deja de hacerlo
  también en `legacy`. Es lo que el owner pidió, pero es un cambio visible en producción, y
  la evidencia lo cuenta como si sólo afectara a `oidc`.
- El owner pidió para el registro de `jti`: un registro compartido, unicidad atómica,
  vencimiento y pruebas de reutilización concurrente. La evidencia sólo registra «en
  Postgres, compartido por las instancias del destino», y el plan de migración no lo
  menciona.
- La nueva sección de la fase 4 del plan (`:134-139`) reproduce fielmente la decisión del
  owner sobre `legado_risk_app`. Las migraciones 0006 a 0008 de Risk OS que cita existen.

### Dismissed

- **«Queda otro camino para que `broker_app` o `broker_mcp` lean `notes`».** Descartado con
  las sondas de las secciones 4 y 5. No hay grant de tabla ni de PUBLIC, y los roles de app
  no pertenecen a ningún grupo. No hay vistas, ni funciones (`SECURITY DEFINER` o no), ni
  políticas de otras tablas que la lean. `broker_mcp` nunca tuvo grant sobre la tabla. En
  `oidc` dan 42501 `select *`, la fila entera, `row_to_json`, `count(notes)` y un `where`
  sobre `notes`.
- **«La reversa no vuelve al estado anterior».** Descartado: entre la base con 0011 y la
  base después del `down`, `pg_dump -s` difiere sólo en `GRANT SELECT(notes) … TO
  broker_app`, que es exactamente lo que da la 0010. Al reaplicar, el resultado es idéntico
  al original.
- **«VS01 en `oidc` deja de mostrar la fecha del lote».** Descartado: `latestBatch` en
  `oidc` devuelve la fecha y la huella, y `batchLabel` las muestra (sección 5).
- **«Otro consumidor dependía de que la app leyera `notes`».** Descartado salvo el hallazgo
  1. La CLI de importación (`packages/db/src/import/cli.ts:71`), el seed y las pruebas que
  insertan lotes corren como dueños de las tablas, y en `apps/web` sólo `Cabecera.tsx` usa
  `BatchStamp`, con `batchLabel` y `manifestPrefix`. `typecheck` pasa. El *lint* de
  límites de R-25 también.
- **«La prueba ampliada pasa por otra razón».** Descartado: sin la 0011, la iteración
  `notes` da `actual: 'leyó'` y la prueba falla (sección 3). La de `id` no cambia.
- **«La checklist autoriza pasos que el plan reserva al owner».** Descartado: dice tres
  veces que no autoriza nada (`:7-9`, §7 en `:90-93` y el encabezado de §4) y deja al owner la
  aprobación, las variables de Vercel y `AUTH_MODE`. El problema del hallazgo 2 es otro:
  presenta como inocuo un paso que no lo es.

## Contraste con `ops/evidence/T-0035.md` (leído al final)

- **Coincide:** 319/319 en la suite de Broker OS. La causalidad de la prueba ampliada
  (`# pass 4 # fail 1` sin la 0011, `# pass 5` con ella) la reproduje con `cli.ts down` en
  lugar de `psql -f`, con el mismo resultado.
- La evidencia dice que VS01 «sólo la usaba como sufijo opcional de la cabecera del lote».
  Es cierto para el código, pero omite que ese sufijo era la marca del despliegue sintético
  documentada en `vercel-vs01.md` (hallazgo 1).
- La tabla de estado («Fase 0 completada, #103 a #113 mergeados») no la puedo comprobar:
  no consulté GitHub, por restricción del encargo. Coincide con lo que dice el owner.
- Quita de los pendientes «los *Consider* de la revisión ciega y la decisión sobre cerrar
  una revisión propia con la reevaluación de otra persona». La tabla de estado los da por
  «atendidos». No verifiqué `REVIEWS/T-0035-cierre-de-hallazgos.md` para confirmarlo.
- El pendiente de `jti` queda registrado con menos condiciones que las que pidió el owner
  (Noted).
- La evidencia no menciona el efecto en `legacy` ni el de volver a código anterior estando
  en `oidc` (hallazgos 1 y 3).

## Conclusión

Dos *Act on*. El retiro del permiso está bien hecho: es completo, su reversa es exacta, no
rompe la VS01 en `oidc` ni en `legacy`, y la prueba nueva depende de verdad de la 0011.
Pero dejar de leer `notes` también borra la marca «LOTE SINTÉTICO» del despliegue de
Preview, que la ficha de despliegue presenta como salvaguarda y usa como comprobación de la
carga real (hallazgo 1). La checklist de la fase 1 tiene un supuesto sobre Google Cloud
que, ejecutado tal cual, cambiaría el login actual de Broker OS en producción (hallazgo
2). Ninguno de los dos afecta hoy a producción por sí solo. El primero conviene
corregirlo en este PR. El segundo, antes de que nadie ejecute la checklist. Los
*Consider* son de robustez: la vuelta atrás de código en `oidc`, las pruebas de
`latestBatch` y `batchLabel` y dos imprecisiones de la checklist.
