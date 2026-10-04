# T-0024 — Revisión ciega (R-33)

- **Base revisada:** rama `task/T-0024-communication-esquema-y-recepcion`, sin commits
  propios: `HEAD` = `main` = `4871850f50cb25fa1e19c790dd1cecacaa56cbd9`, más los cambios
  sin commitear del árbol de trabajo (los del diff entregado).
- **Contrato:** el de `main` (`contrato-desde-main.md`), no el de la rama. La única
  diferencia de la rama es `status: READY → ACTIVE`.
- **Contexto leído por cuenta propia:** `ENGINEERING_RULES.md` (R-16 a R-28, R-33),
  `DOMAIN.md` §52, `decisions.yaml` (D-0012, D-0013, D-0014, D-0045, D-0046, D-0063,
  D-0065, D-0066), `DECISIONS/0063-…`, `DECISIONS/0065-…`, `SLICES/CO01.md` y
  `.github/workflows/project-os-check.yml`.
- **Orden:** corrí `## Verification` antes de abrir `ops/evidence/T-0024.md`. La leí
  recién después de los tres comandos, y la contrasté en las secciones de abajo.
- **Reviewer:** subagente aislado, sin transcript ni justificación de quien implementó.

## Verificación ejecutada antes de leer evidencia

### 1. `pnpm check`

```text
$ set -o pipefail; pnpm check > check.log 2>&1; echo "EXIT=$?"
EXIT=0
$ node scripts/check-docs.mjs && node scripts/check-agent-run.mjs && node --test scripts/tests/*.test.mjs && pnpm typecheck && pnpm lint && pnpm test

✓ 66 decisiones, 29 ADRs, 24 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
[… tests de scripts/tests omitidos, todos ✔; entre ellos aparece la línea
 "fatal: Not a valid object name origin/main", que es la salida esperada del test
 "un baseRef que no se pudo resolver localmente falla explícito" …]
✔ la base del contexto communication pasa por la misma guarda (0.099625ms)
[…]
ℹ fail 0
$ tsc --noEmit && tsc --noEmit -p apps/web
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "packages/**/*.test.ts" "apps/**/src/**/*.test.ts" "contexts/**/src/**/*.test.ts"
[… 107 líneas de los tests de contexts/communication, todas ✔, y las de Broker, omitidas …]
ℹ tests 260
ℹ suites 60
ℹ pass 260
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3648.1685
```

Con el `.env` del repo, los tests del contexto corrieron sobre
`delcampo_communication_test` (la URL se deriva de `DATABASE_URL` cambiando el nombre de
la base: `contexts/communication/src/persistence/testing.ts:34-41`).

### 2. `createdb delcampo_communication_test`

```text
$ createdb delcampo_communication_test; echo "EXIT=$?"
createdb: error: database creation failed: ERROR:  database "delcampo_communication_test" already exists
EXIT=1
$ dropdb delcampo_communication_test; echo "EXIT=$?"      # permitido por ## Data effects
EXIT=0
$ createdb delcampo_communication_test; echo "EXIT=$?"
EXIT=0
```

La base existía porque el paso 1 la crea (`openTestDatabase`).

### 3. `DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test`

```text
$ set -o pipefail; DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test > test.log 2>&1; echo "EXIT=$?"
EXIT=1
[… salida omitida; los suites de contexts/communication están todos ✔ …]
✖ loadDocumentVerificationInput — T-0017 (23.06825ms)
✖ la consulta se defiende sola de las referencias duplicadas (1.302541ms)
✖ T-0023 — triggers con search_path vacío se comportan como con el de por defecto (36.222334ms)
✖ T-0023 — catálogo: toda función propia fija su search_path (12.751208ms)
✖ importarCatalogoAseguradoras (20.440459ms)
✖ importarContactos / importarCuentas / importarMembresias (23.13425ms)
[… más fallas de packages/db omitidas …]
    code: '42P01',
  relation "party" does not exist
  relation "staging_import_batch" does not exist
[ELIFECYCLE] Test failed. See above for more details.
ℹ tests 260
ℹ suites 60
ℹ pass 142
ℹ fail 118
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2740.692959
```

**La tercera línea de `## Verification`, tal como está escrita, falla.** Todas las
fallas son de `packages/db`. Después de la corrida, `delcampo_communication_test` solo
tenía tablas en `communication` (`message`, `outbound_status`, `schema_migrations`,
`unsupported_message`, `webhook_delivery`): los tests de Broker fallaron sin escribir
nada. Ver A1.

### Contraste con la evidencia, leída después

`ops/evidence/T-0024.md` declara la misma falla (118 tests, todos de `packages/db`,
`relation "party" does not exist`) en una sección propia, «Desviación declarada». No la
esconde y coincide con lo que vi. Lo que no puedo comprobar es la afirmación de que el
owner pidió no tocar Verification y eligió `COMMUNICATION_DATABASE_URL`: no la encontré
en ningún artefacto versionado. Además, la sonda de lint de la evidencia solo probó la
forma canónica de la ruta relativa (`../../../../packages/db/...`). Las variantes de A2
no las probó.

## Act on

### A1 — La tercera línea de `## Verification` no puede pasar, y la tarea no puede cerrarse así

- **Dónde:** el contrato de `main`, `## Verification`, línea 3. Su consecuencia está en
  `package.json` (script `test`) y en `contexts/communication/src/persistence/testing.ts:34-41`.
- **Problema:** `pnpm test` corre todo el workspace. Los tests de integración de
  `packages/db` usan `DATABASE_URL` y necesitan el schema de Broker. Con
  `DATABASE_URL=…/delcampo_communication_test` fallan 118 de 260 (reproducción: el paso 3
  de arriba, `EXIT=1`). No es un defecto del código. Cualquier implementación que
  respete D-0063 y deje a Broker fuera de la base del contexto falla esa línea. Además,
  con esta implementación la línea no prueba lo que pretendía: los tests del contexto
  ignoran el nombre de la base de `DATABASE_URL` y siempre usan
  `delcampo_communication_test`.
- **Por qué es Act on:** `CLAUDE.md` («Nunca: declarar terminada una tarea cuya
  `## Verification` no se ejecutó») y R-07 hacen de Verification el DoD. Hoy esa línea se
  ejecuta y da rojo. La rama no puede corregirla, porque `check-task-contract`, regla
  (c), rompe si se modifica `## Verification`. La evidencia lo declara y deja la decisión
  al owner, pero esa decisión no está registrada en ningún lado.
- **Qué hacer antes del merge:** que el owner resuelva por el canal de `main`, con un
  CHORE que enmiende la línea del contrato. Por ejemplo,
  `COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test`,
  o solo `pnpm test`, porque `pnpm check` ya corre los tests del contexto en su base. La
  otra salida es que el owner acepte la desviación por escrito en un artefacto
  versionado que la evidencia pueda citar. Sin una de las dos, la tarea no pasa a DONE.

### A2 — El aislamiento de R-25/D-0063 se cruza con rutas relativas que no empiezan con `../../`

- **Dónde:** `eslint.config.js:62`,
  `prohibirImports('/^(\\.\\.\\x2F){2,}/', …)`, dentro de `contextoAislado`.
- **Problema:** la regla mira solo el prefijo del especificador. Cualquier ruta que
  llegue a `packages/` sin empezar con dos `../` seguidos pasa el lint. El contrato
  dice: «`pnpm lint` falla si ese paquete importa algo de `packages/*`, `apps/*` u otro
  contexto».
- **Reproducción** (archivos temporales, ya borrados; `git status` quedó igual que al
  empezar):

  ```text
  # contexts/communication/src/persistence/zz-tmp-review-3.ts
  export * from './../../../../packages/db/src/index.ts'
  # contexts/communication/src/application/zz-tmp-review-6.ts
  export * from '../domain/../../../../packages/db/src/index.ts'

  $ npx eslint contexts/communication/src/application/zz-tmp-review-6.ts; echo "EXIT=$?"
  EXIT=0
  ```

  En la misma corrida, el import por nombre (`@del-campo/db`) desde el contexto, el de
  `@del-campo/communication` desde `apps/web` y el de
  `../../../contexts/communication/...` desde `packages/db` sí fallan, como corresponde.
  El de `zz-tmp-review-3.ts` no reportó nada.
- **Qué hacer:** que el contexto también prohíba por segmento, igual que la regla de
  Broker (`/(^|\x2F)contexts\x2F/`), con una regex que agarre cualquier especificador que
  contenga `(^|/)(packages|apps|contexts)/`. La otra opción es prohibir todo especificador
  relativo con `..` que salga de `src/`, normalizando la ruta. Hay que sumar estas dos
  formas a la sonda de la evidencia. El costo es una línea, y sin el cambio la frase del
  contrato es falsa.

## Consider

### C1 — Un solo elemento inválido tumba toda la entrega, y los mensajes válidos de esa entrega no se persisten

- **Dónde:** `contexts/communication/src/domain/payload.ts:62-65` (`unixSeconds`) y
  `contexts/communication/src/persistence/store.ts:61-83` (una transacción por entrega).
- **Problema:** el parser se declara «tolerante por elemento, no por entrega»
  (`payload.ts:4`). Pero `unixSeconds` acepta cualquier cadena de dígitos y devuelve un
  `Invalid Date` cuando el valor se sale de rango. El `insert` falla al serializarlo y la
  transacción revierte todos los elementos. Pasa lo mismo con un texto que contenga
  U+0000, que Postgres no admite en `text`. La entrega queda `failed` y el mensaje válido
  que venía al lado no llega a `message`. Como ya se respondió 200, Meta no reintenta.
- **Reproducción** (contra `delcampo_communication_test`, con el handler y el store
  reales, con firma válida y con dos mensajes en la misma entrega: uno correcto y otro con
  `timestamp: '99999999999999999'`; truncado después):

  ```text
  status 200
  [ { mensajes: 0 } ]
  [ { processing: 'failed', processing_error: 'Invalid time value' } ]
  ```

  Con `text.body` igual a `'a\u0000b'` en lugar del timestamp:
  `processing_error: 'invalid byte sequence for encoding "UTF8": 0x00'` y `mensajes: 0`.
- **Peso:** solo Meta puede firmar, así que la probabilidad es baja. Pero el criterio de
  CO01 es «cero perdidos». Lo que falta es poco: descartar con motivo en
  `unixSeconds` cuando `!Number.isFinite(date.getTime())`, y tratar `\u0000` del cuerpo
  (descartar o sanear, con motivo).

### C2 — No existe reproceso de entregas `pending`/`failed`, y el diseño lo presupone

- **Dónde:** `contexts/communication/src/application/webhook.ts:5-10`,
  `contexts/communication/src/persistence/store.ts:56-60` y el README («para
  reprocesar»).
- **Problema:** el orden «guardar → 200 → procesar» deja una ventana. Si el procesamiento
  falla por un error transitorio de la base, por un deadlock entre dos entregas con
  estados de los mismos `wamid` en distinto orden o por C1, o si la plataforma corta la
  función después de responder, la entrega queda `failed` o `pending`. Meta no
  reintenta, y no hay ninguna operación que la reprocese. El crudo se pierde a los 30
  días, junto con el único rastro del mensaje. La evidencia lo reconoce en «Qué NO se
  verificó».
- **Por qué es Consider y no Act on:** el contrato no pide reproceso. Pero CO01 §4 exige
  «Mensajes perdidos: cero» y recuperación ante caída. Como `processDelivery` es
  idempotente, `reprocessDelivery(id)` y `reprocessPending()` cuestan unas pocas líneas.
  Conviene agregarlo acá, o dejarlo escrito en el `## Outcome` de la tarea de despliegue
  de CO01 para que no quede implícito.

### C3 — El nombre del test de retención promete más de lo que prueba

- **Dónde:**
  `contexts/communication/src/application/retention.integration.test.ts:30-42`.
- **Problema:** el test se llama «borra las de más de 30 días y no toca mensajes,
  estados ni tipos fuera de alcance». No entrega ningún tipo fuera de alcance y no cuenta
  `unsupported_message`. La propiedad se cumple por estructura, porque no hay FK a
  `webhook_delivery`, pero el test no la prueba. Alcanza con entregar
  `inbound-image.json` y afirmar `count('unsupported_message') === 1` después del
  borrado.

## Noted

- **N1 — `failed` significa dos cosas** (`store.ts:75-81`). Una entrega que guardó todo
  lo válido y descartó un elemento queda `failed`, igual que una que no guardó nada. Un
  estado nuevo que Meta agregue (hoy, `deleted` se descarta) pondría en rojo entregas
  sanas. La decisión está documentada y es idempotente. Va a importar cuando la UI
  muestre la salud del receptor o cuando exista el reproceso de C2.
- **N2 — `signature` es una columna constante** (`migrations/0001_communication_schema.sql:10-16`,
  `check (signature = 'valid')`). Resuelve una tensión del contrato: «cada entrega… con el
  resultado de la firma» y, a la vez, «401… no persiste nada». La solución es coherente y
  está explicada en el SQL. La anoto para que el owner sepa que el «resultado de la
  firma» no registra rechazos.
- **N3 — Los tests del contexto derivan su base de la `DATABASE_URL` de Broker**
  (`persistence/testing.ts:20-41`, que lee el `.env` raíz). No viola D-0063, porque no lee
  el schema de Broker, solo el host. Pero acopla el contexto a la variable de Broker, y es
  la causa de A1. La evidencia lo atribuye a una decisión del owner que no encontré
  registrada.
- **N4 — El lint de aislamiento cubre solo `.ts`** (`eslint.config.js:177,183,193`:
  `contexts/communication/**/*.ts`). Si la tarea de UI agrega `.tsx` dentro del contexto,
  esos archivos quedan sin la regla. La regla de Broker cubre `apps/**/*.{ts,tsx}`, pero
  no `.js`, aunque `apps/web` tiene `allowJs`.
- **N5 — Concurrencia de estados** (`store.ts:37-54`). Por razonamiento es correcta: el
  `insert … on conflict do nothing` espera a la inserción no confirmada que choca y
  después `select … for update` serializa. No hay test con dos sesiones, y la evidencia
  lo declara. Dos entregas con varios `wamid` en orden inverso pueden producir un
  deadlock: Postgres aborta una y esa entrega termina en C2.
- **N6 — Cuerpo leído entero antes del tope** (`webhook.ts:85-88`). Sin
  `content-length`, `arrayBuffer()` lee todo antes de comparar con `MAX_BODY_BYTES`. En
  Vercel lo acota la plataforma; en otro host, no.
- **N7 — El runner de migraciones no toma un lock** (`persistence/migrations.ts:86-97`).
  Dos `migrate` concurrentes podrían competir. Hoy no pasa: los tests son seriales y el
  despliegue migra una vez.
- **N8 — Fixtures.** `diff -r SPIKES/T-0020/fixtures contexts/communication/fixtures`
  da idénticos, y los revisé a mano: teléfonos `1555…`, nombres y textos sintéticos,
  `wamid` `SYNTH-*`. Los `real-*` conservan los timestamps reales de la captura; la
  evidencia lo declara.

## Dismissed

- **D1 — El GET devuelve `hub.challenge` sin filtrar** (`webhook.ts:71-81`). Solo lo hace
  después de que coincide el token de verificación, comparado en tiempo constante, y con
  `text/plain`. Sin el token no hay reflejo posible. No es explotable.
- **D2 — El 413 se evalúa antes que la firma** (`webhook.ts:85-91`). Un POST sin firma y
  demasiado grande recibe 413 en lugar de 401. No persiste nada y no filtra
  información. El contrato pide que no se acepte ni se persista sin firma, y eso se
  cumple.
- **D3 — `failed` le gana a `read`** (`domain/status.ts:16`). Podría parecer que un
  estado tardío pisa a uno más avanzado. Pero `failed` es el dato que el contrato manda
  conservar («`failed` queda registrado con su error»), la elección está documentada y
  tiene test, y en el flujo normal Meta no manda `failed` después de `read`.
- **D4 — Desempate por `id` y no por `wamid`** (`store.ts:141-153`, índices de
  `0001_…sql:53-56`). Responde al hallazgo 7 de T-0020: el `wamid` no ordena
  cronológicamente. Que el orden de inserción refleje la llegada y no el envío es la
  mejor aproximación disponible, y está probado.
- **D5 — Atribuir A1 al código.** Lo descarto como defecto de implementación: falla
  cualquier implementación que respete D-0063. Por eso A1 pide una acción del owner
  sobre el contrato y no un cambio en el código.
- **D6 — Estados sin participante para `wamid` ajenos** (`outbound_status` sin FK). El
  contrato pide expresamente registrarlos sin crear un mensaje sin cuerpo.

## Límites de esta revisión

- No revisé el diff de `pnpm-lock.yaml`: la herramienta rechazó el comando. Por
  `contexts/communication/package.json`, la única dependencia es `postgres@^3.4.9`, que
  Broker ya usa.
- No corrí yo mismo el CLI del runner (`down`/`migrate`) ni sus caminos de rechazo: la
  herramienta también rechazó ese comando. Aplicar, revertir y volver a aplicar lo cubre
  `persistence/migrations.integration.test.ts`, que pasó en los pasos 1 y 3.
- No modifiqué ningún archivo del repositorio salvo este informe. Las sondas de lint
  (A2) fueron archivos temporales, borrados en el mismo comando. Las sondas de C1
  corrieron desde el scratchpad contra `delcampo_communication_test` y truncaron las
  tablas al terminar.
