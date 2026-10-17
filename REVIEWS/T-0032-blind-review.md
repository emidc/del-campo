# T-0032: revisión ciega (R-33)

- **Base revisada:** worktree aislado en HEAD `58b7f8d` («T-0032: despliegue de Risk OS y
  herramientas de aceptación»), un commit sobre `f4a42fc` (merge de la PR #88). El diff que
  me pasaron (`diff.patch`, 2920 líneas) es el de la rama contra `main` sin evidencias ni
  tareas: 37 archivos en `apps/risk/` (README, aviso de login, `vercel.json`),
  `contexts/risk/` (migración `0005` con su reversa, `deploy/rol-app.sql`,
  `src/acceptance/`, modo `--hosteada` de los CLI, `verificacion.ts`, ensayo, tests),
  `docs/despliegue/vercel-risk.md` y `scripts/guard-db-tests.mjs`. No toca `DOMAIN.md`,
  `.claude/`, `.github/`, `apps/web`, `apps/communication` ni `packages/*`. Por fuera del
  diff, la rama pasa T-0032 a `ACTIVE` y agrega `ops/evidence/T-0032.md` y
  `ops/evidence/T-0032-aceptacion.md`.
- **Contrato:** el de `main` (`contrato-desde-main.md`). Leí `TASKS/T-0032-*` de la rama
  (sólo cambia `status`) y las dos evidencias **después** de cerrar mi juicio y las sondas.
- **Contexto leído por mi cuenta:** `SLICES/RO01.md` §2, §3, §6 (A6 a A12 y protocolo) y
  §7; `SLICES/RO01-decisiones.md`; `DECISIONS/0068-*` y `0069-*`; `ENGINEERING_RULES.md`
  R-13 a R-23 y R-33; `SPIKES/T-0021/v0/fase-13/dossier-cierre-emi15.md` §5 (disparadores
  de reapertura); `REVIEWS/T-0031-blind-review.md` como modelo. Del código fuera del diff:
  `persistence/database.ts` (`connect`), `persistence/acceso.ts`, `persistence/vistas.ts`
  (`leerOrganizacion`), `domain/vistas.ts` (`armarLista`), `domain/informe.ts`,
  `application/actualizacion.ts` (`registrarOrdenPrevio`), `apps/risk/src/lib/handlers.ts`
  y `server.ts`, la lista de rutas de `apps/risk/src/app/api`, el contrato de columnas y
  `docs/despliegue/vercel-vs01.md` (para comparar la cadena de conexión).
- **Orden:** corrí los tres comandos de `## Verification` antes de leer el diff; después
  leí el diff contra el contrato y probé hipótesis con sondas en `revision/sondas/`.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien
  implementó.
- **Efectos de la revisión en el Postgres local:** las sondas crearon y borraron sus
  propias bases (`delcampo_risk_sonda_login_test`, `delcampo_risk_sonda_disp_test`,
  `delcampo_risk_sonda_dump_test`, `delcampo_risk_sonda_restore_test`) y un rol
  `risk_app_sonda` que también borré. La membresía de la sonda de `verificar` se dio dentro
  de una transacción revertida en `delcampo_risk_test` (comprobado: 0 membresías de
  `risk_app` después). No toqué `delcampo_risk_dev`. Dato del entorno: **el rol
  `risk_app` ya existe en el servidor local**, con contraseña y 43 permisos en
  `delcampo_risk_dev` (lo dejó quien implementó, según su evidencia).

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.22.0, Postgres 16.15 en `localhost:5432`, `PGUSER=root`,
`PGPASSWORD=local`; `pnpm install --frozen-lockfile --offline` sin cambios.

### 1. `pnpm check`

```text
✓ 69 decisiones, 32 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 174 · pass 174 · fail 0              (scripts/tests)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
$ eslint .
# tests 1056 · pass 1042 · fail 10 · cancelled 4
[ELIFECYCLE] Command failed with exit code 1.
```

`typecheck` y `lint` pasan sin salida. Las 10 fallas están en `packages/db/src/**` (una por
archivo de integración: la base de Broker no migra con PG16) y los 4 cancelados en
`contexts/communication/src/integration/cloud-api.contract.test.ts`. Ninguna en Risk.

### 2. `RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test`

```text
# tests 1056 · pass 1042 · fail 10 · cancelled 4      (las mismas ubicaciones)
```

Subconjunto de Risk, como pide el encargo:

```text
$ RISK_DATABASE_URL=postgres://root:local@localhost:5432/delcampo_risk_test node --import ./scripts/guard-db-tests.mjs \
    --test --test-concurrency=1 "contexts/risk/src/**/*.test.ts" "apps/risk/src/**/*.test.ts"
1..82
# tests 743 · suites 81 · pass 743 · fail 0 · cancelled 0 · skipped 0
exit=0
```

### 3. `pnpm --filter "./apps/risk" run build`

Sale con 0; 21 rutas dinámicas y `/_not-found`.

### Comprobaciones humanas del contrato

Todas dependen del owner (despliegue, migraciones en la hosteada, `curl`, carga de las
históricas, revisión, acta firmada). Ninguna está hecha y la rama no dice lo contrario:
la tarea queda `ACTIVE` y el acta está en borrador con todo «pendiente». Esta PR entrega
las herramientas y la guía; lo que se puede revisar es si alcanzan para que el owner
ejecute el protocolo sin sacar datos y midiendo lo que RO01 §6 pide.

## Hallazgos

Severidad: **bloqueante** (no seguir la guía con datos reales sin corregirlo),
**importante** (arreglar antes de medir la aceptación), **menor**. En términos de R-33:
bloqueante e importante son *Act on*; menor es *Consider*.

### Act on

**1. [bloqueante] La app desplegada se conecta a Supabase sin TLS: la guía no pide
`sslmode=require` y `connect` no lo fuerza.** *(cliente comprobado leyendo el driver; el
lado de Supabase, plausible)*

- Dónde: `contexts/risk/src/persistence/database.ts:17-18` (`connect`, lo que usa
  `apps/risk/src/lib/server.ts` con `RISK_DATABASE_URL`) no pasa `ssl`; en postgres.js
  3.4.9 el default es `ssl: false` (`node_modules/.pnpm/postgres@3.4.9/.../src/index.js:450`)
  y sólo se activa si la URL trae `sslmode` (línea 443). `docs/despliegue/vercel-risk.md:101`
  pide «Transaction pooler con el usuario `risk_app`», sin `?sslmode=require`.
- Escenario: el owner copia la cadena del panel de Supabase (que no trae `sslmode`) a
  `RISK_DATABASE_URL` de Production. Cada request de la app viaja de `gru1` al pooler en
  texto claro, con la contraseña de `risk_app` en el arranque y las filas de las
  históricas en las respuestas. Si el pooler acepta conexiones sin TLS (el default de
  Supabase es no exigirlo; no lo pude probar), funciona sin ningún error visible.
- Contraste: el modo `--hosteada` de los CLI sí exige TLS (`connectHosted`,
  `database.ts`, con test en `database.test.ts`), y `vercel-vs01.md:98` ya pide
  «agregá `?sslmode=require`». La app, que es el camino con más tráfico de datos reales,
  quedó sin eso.
- Arreglo: `sslmode=require` en la tabla de variables de §3 (y en §1.3), y mejor además
  `ssl: 'require'` en `connect` cuando el host no es local, con un test como el de
  `connectHosted`. Que `db:verificar` o el `curl` de §4 no lo detectan: conviene que el
  owner compruebe `select ssl from pg_stat_ssl where pid = pg_backend_pid()` desde la app
  o active «Enforce SSL» en Supabase, y que la guía lo diga.

**2. [importante] Restaurar la copia en un proyecto nuevo, como dice la guía, falla:
`pg_restore --exit-on-error` corta en los `GRANT ... TO risk_app`.** *(comprobado con
sonda)*

- Dónde: `docs/despliegue/vercel-risk.md:214-220`. El volcado (`pg_dump --schema=risk
  --no-owner`, línea 207) conserva los privilegios de `risk_app` y sus `ALTER DEFAULT
  PRIVILEGES`; en un proyecto nuevo ese rol no existe hasta correr `rol-app.sql`, que la
  guía pone **después** del `pg_restore` (y que no se puede correr antes, porque hace
  `revoke all on schema risk`).
- Sonda (`revision/sondas/`, con `rol-app.sql` renombrado a `risk_app_sonda` para no tocar
  el `risk_app` local): migrar una base, aplicar el rol, `pg_dump` con los flags de la
  guía, quitar el rol del servidor y `pg_restore --no-owner --exit-on-error` en una base
  vacía:

  ```text
  pg_restore: error: could not execute query: ERROR:  role "risk_app_sonda" does not exist
  Command was: GRANT USAGE ON SCHEMA risk TO risk_app_sonda;
  pg_restore exit=1
  ```

- Por qué importa: en el plan Free esta copia es la única recuperación (D-0068,
  consecuencias; contrato, `## Risks`). El owner la va a ejecutar por primera vez cuando
  algo ya salió mal.
- Arreglo: `--no-privileges` en `pg_dump` o en `pg_restore` (los permisos los rehace
  `rol-app.sql`), y que la guía pida probar la restauración una vez, sobre la base
  sintética de §3, antes de cargar las históricas.

**3. [importante] El límite de 10 logins fallidos se saltea con pedidos concurrentes.**
*(comprobado con sonda)*

- Dónde: `contexts/risk/src/application/acceso.ts:115-121`. `iniciarSesion` cuenta los
  fallidos (`fallidosRecientes`), corre scrypt y recién después inserta el fallido, sin
  bloqueo ni transacción: todos los pedidos que llegan antes del primer `insert` ven el
  contador en 0.
- Sonda `sondas/login-carrera.ts` (base propia, el `connect` de la app con su pool de 5):
  40 contraseñas equivocadas y la correcta, en paralelo:

  ```text
  contraseñas probadas contra scrypt (filas en login_fallido): 40
  la correcta, al final de la ráfaga, entró: true
  después, con la correcta, entra: false
  ```

- Escenario: en Vercel cada instancia tiene su propio pool y las instancias escalan; una
  ráfaga por ventana prueba tantas contraseñas como pedidos concurrentes admitan las
  funciones y el pooler, no 10. Con contraseñas de 20 caracteres o más al azar sigue sin
  ser práctico adivinar una, pero la propiedad que documentan el README, la guía (§5) y la
  pantalla («después de 10 intentos fallidos…») no es la que el código cumple, y D-0069
  dejó este control justamente para el despliegue.
- Arreglo: serializar por huella (`pg_advisory_xact_lock(hashtext(huella))` dentro de una
  transacción que cuente, verifique e inserte), o insertar el intento antes de verificar
  y borrar nada (es sólo inserción: contar «intentos» y no «fallidos», restando los
  exitosos de `registro_acceso`). Con un test concurrente como la sonda.

**4. [importante] `db:verificar` no ve que `risk_app` pueda hacerse dueño de las tablas:
`rol-app.sql` no revoca membresías y lo deja `NOINHERIT`, que es justo lo que oculta una
membresía a `pg_has_role(..., 'usage')` y a `has_table_privilege`.** *(comprobado con
sonda, en transacción revertida)*

- Dónde: `contexts/risk/deploy/rol-app.sql:20-27` (crea el rol «si no existe» y sólo
  ajusta atributos) y `contexts/risk/src/persistence/verificacion.ts:42` (dueño con
  `pg_has_role(c.relowner, 'usage')`; privilegios con `has_table_privilege`; atributos sólo
  de `current_user`).
- Sonda `sondas/verificar-membresia.ts`: `grant <dueño de risk.riesgo> to risk_app`, luego
  `rol-app.sql`, luego `set role risk_app`:

  ```text
  dueño de las tablas: root; db:verificar como risk_app: cumple todo
  risk_app hizo SET ROLE root y desactivó el trigger solo_insercion de risk.riesgo
  ```

- Escenario: `risk_app` ya existía en el proyecto con una membresía (creado desde el panel,
  en una prueba anterior o copiando un ejemplo con `grant postgres to …`). El owner corre
  `rol-app.sql`, `db:verificar` dice «rol de la app: cumple» y la evidencia de R-22 queda
  firmada, pero la app puede `SET ROLE postgres` y saltear el sólo inserción.
- Arreglo: en `verificar`, un punto «sin membresías» (`pg_auth_members` del rol, o
  `pg_has_role(relowner, 'member')` en lugar de `'usage'`) y los atributos de los roles
  alcanzables; en `rol-app.sql`, revocar las membresías existentes o fallar si las hay. Un
  caso en `rol-app.integration.test.ts`.

**5. [importante] Los disparadores de reapertura comparan el orden previo con el ranking de
hoy, después de los ciclos y de las revisiones del propio revisor, no con el que Risk OS
daba cuando el revisor escribió su orden.** *(comprobado con sonda sobre el ensayo)*

- Dónde: `contexts/risk/src/acceptance/medicion.ts:392-398` arma `listas` con
  `armarLista(V, d)` sobre la foto actual, y `medirA8` (`:221-244`) cuenta pares
  invertidos, bandas que coinciden y casos de seguridad contra esas posiciones y bandas.
- Sonda `sondas/disparadores-momento.ts`: el ensayo de la tarea en una base propia; en
  memoria (`medir` es pura) agrego, después del orden previo, una reevaluación aceptada
  que sube a cada riesgo que R1 puso arriba en un par invertido de H1, y comparo con la
  misma medición sobre la organización como estaba en el instante del orden previo:

  ```text
  H1: invertidos hoy 0/15, al momento del orden previo 7/15; bandas que coinciden hoy 3/3, al momento 3/3
  H2: invertidos hoy 13/28, al momento del orden previo 13/28; ...
  ```

- Por qué importa: el disparador 1 del dossier §5 es «un par que un profesional ordenó
  por escrito antes de ver Risk OS, que la v1 invierte»; el 3 mide coincidencia de
  bandas. Una reevaluación hecha durante los ciclos, ya viendo Risk OS (A7 exige ciclos
  después de la importación, y el revisor puede reevaluar), hace que una inversión que
  existió desaparezca del informe, que dice «0 de 15 pares invertidos». Es un falso «no
  dispara» en la evidencia para EMI-44 y D14, y el informe no dice contra qué momento
  compara.
- Arreglo: medir contra el ranking reconstruido con lo registrado hasta
  `ordenPrevio.registradoEn` (el esquema es sólo de inserción, así que se puede), o
  informar las dos columnas y rotular cuál es cuál. Decidir cuál vale es del owner; la
  salida tiene que decirlo.

**6. [importante] A8a «cumple» sin ninguna banda.** *(comprobado leyendo)*

- Dónde: `medicion.ts:216`, `cumpleA: previoAntesDelAcceso && op.items.length > 0`. La
  aplicación ya obliga a que el orden cubra todos los riesgos
  (`application/actualizacion.ts:743`), pero la banda de cada ítem es opcional
  (`:741`), y la medición no mira `conBanda`.
- Escenario: el revisor registra el orden de H3 sin poner ninguna banda; el informe dice
  «(a) cumple: … con 6 posiciones y 0 bandas». RO01 §6 A8 pide «su orden profesional y
  sus bandas», y el disparador 3 queda sin `n` para esa empresa sin que nada lo marque.
- Arreglo: o `cumpleA` exige bandas (todas, o al menos una, según lo que decida el owner
  sobre «las bandas que considere», decisión 6), o el informe lo marca como falta
  explícita. Hoy es una lectura que la herramienta tomó sola.

### Consider

**7. [menor] La guía no prueba los endpoints que escriben.** *(comprobado leyendo)*
`vercel-risk.md:133-140` recorre los GET y el POST de login, pero no
`POST /api/o/X/orden-previo`, `POST /api/o/X/reordenar`, `POST /api/r/X/actualizar` ni
`/api/logout`, que existen (`apps/risk/src/app/api/**/route.ts`). El contrato pide que
«cada página y cada endpoint» respondan sin datos sin credencial. Agregarlos al bucle con
`-X POST` y el `Origin` del despliegue (para que el 401 sea por sesión y no el 403 de
origen).

**8. [menor] El manifiesto repite contenido del archivo en el error, contra lo que dicen
el código y la guía.** *(comprobado: lo afirma el propio test)*
`manifiesto.ts:113` lanza `personas.${codigo}` con la clave tal como la escribió el owner,
y `manifiesto.test.ts:87` espera literalmente `'personas.Juan Pérez'`. La guía (§9) dice
«nombrando sólo el campo, sin repetir el contenido». Si la clave es un nombre, sale por
stderr. Usar `personas` (o el índice) cuando la clave no cumple el formato.

**9. [menor] `db:down --hosteada` borra una tabla con datos reales sin pedir
confirmación.** *(comprobado leyendo)* `persistence/cli.ts:59` lo ejecuta con la cadena
de administración igual que en local; hoy revertir `0005` borra `login_fallido`, y
cualquier migración futura que la siga borraría historia (R-23). La guía lo advierte en
prosa (§2); un `--confirmo` explícito, o negarlo con `--hosteada` y dejar la reversa en la
hosteada como `psql` manual, lo hace cumplir.

**10. [menor] La base sintética de Preview no tiene paso de personas.** §3 manda crearla
«con los mismos pasos 1 y 2 y las sintéticas importadas», pero para recorrer A11 en una
preview hace falta al menos una credencial (§5) en esa base, con su propio
`RISK_HOSTED_DATABASE_URL`. Una línea.

**11. [menor, plausible] `login_fallido` crece sin tope con usuarios inventados.** Cada
usuario distinto suma hasta 10 filas antes de bloquearse, la tabla es sólo inserción y
`risk_app` no la puede vaciar. En Supabase Free el espacio es chico; un barrido de usuarios
al azar consume espacio y CPU de scrypt. No lo medí. Relacionado: la huella es sha256 sin
sal, así que una contraseña tipeada en el campo de usuario queda como hash rápido; con
contraseñas largas al azar no es explotable, pero vale una línea en D-0069.

### Noted

- **Sin datos fuera (R-18/R-19):** el informe de `aceptacion` sólo tiene códigos, conteos,
  fechas, `regla_id`, prefijos de huella e ids `RSK-`/`REV-` (ULID por contrato,
  `contrato/columnas-risks.csv`); el test lo compara con todo el texto libre de la base.
  Con `--hosteada`, los tres CLI y `aceptacion` envuelven el trabajo con la base en un
  `try` que imprime sólo el código del error; el importador es sin valores por defecto y
  `--con-valores` es explícito; el informe sin valores oculta `importadoPor` y `origen`.
  Queda el `die` del importador que imprime la ruta de la carpeta privada si falta un CSV
  (stderr, no se pega en el acta) y la salida de `ciclos --hosteada --detalle`, que lleva
  ids y nombres por diseño y la guía no pide pegar.
- **Tests nunca contra la hosteada:** ningún test lee `RISK_HOSTED_DATABASE_URL`; los que
  conectan pasan por `notLocalDatabase`; `aceptacion.integration.test.ts` crea y borra su
  base en el servidor local de `delcampo_risk_test`; el guard aborta si la variable está
  definida, y los CLI sin `--hosteada` la ignoran (probado en `database.test.ts`). El paso
  de `--hosteada` por `pnpm --filter … run` funciona (lo comprobé sin la variable: falla
  antes de conectar).
- **`risk_app` en lo que sí cubre:** sin `UPDATE`/`DELETE`/`TRUNCATE`, no dueño, no crea,
  no lee `public`; los tests lo prueban con códigos 42501 y la importación, el login, una
  vista y una novedad entran con ese rol. Con el hallazgo 4 resuelto, es suficiente para
  R-22 y D-0063. No pude comprobar qué deja Supabase a `PUBLIC` en sus esquemas propios
  (`extensions`, `graphql_public`, …): si algo aparece, `db:verificar` lo va a marcar y la
  guía ya dice que lo que no coincida se corrige.
- **A6, A7, A9, A12:** fieles a §6 en lo que el script puede ver. A6 depende de que el
  manifiesto declare los intentos rechazados (no dejan rastro en la base); la medición
  sí detecta lotes cargados no declarados y lotes mezclados. A7 reutiliza `contarCiclos`
  de T-0031 y agrega trazabilidad. A9 recorre los armados del dominio, no las respuestas
  HTTP; el informe lo dice. A12 compara filas por riesgo y por tabla contra el historial.
  La comparación revisor/evaluador original es por nombre y el informe lo declara.
- **A8a, fecha contra acceso:** las dos marcas son `toISOString()`, así que la comparación
  de cadenas es correcta; el informe muestra segundos y compara con milisegundos.
- **Acta y estado:** el acta es un borrador honesto, con los trece criterios y todo
  pendiente; `status: ACTIVE`. Correcto para lo que esta PR puede cumplir.

### Dismissed

- **«El ensayo da 3 casos de seguridad y dispara»:** no es un problema; la evidencia lo
  aclara (el orden sintético es arbitrario a propósito) y el test lo usa para probar que
  el script detecta cada disparador.
- **Bloqueo de una cuenta ajena por quien conoce su usuario:** es el costo declarado en
  `acceso.ts` y en la guía, consecuencia de no guardar IP. Se acepta con dos usuarios.

## Conclusión

Verification pasa para Risk (743/743) y el build compila; las fallas de `pnpm check` y
`pnpm test` son las conocidas del entorno, fuera de Risk. El modo `--hosteada`, la guarda
de los tests y el informe sin valores aguantaron la revisión. Antes de que el owner siga
la guía con datos reales pediría el hallazgo 1 (TLS de la app), que es barato y es el único
camino por el que datos reales saldrían sin cifrar, y el 2 (restauración), que es la única
recuperación del plan Free. Antes de medir la aceptación, el 3, el 4, el 5 y el 6, porque
afectan la evidencia de D-0069, de R-22 y de A8/D14 que esta tarea existe para producir.
Los menores pueden ir en la misma ronda o quedar escritos en la guía.
