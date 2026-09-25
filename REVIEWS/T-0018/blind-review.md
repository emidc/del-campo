# T-0018 — Revisión ciega por subagente aislado (R-33 / D-0052)

| | |
| --- | --- |
| **Workstream** | BOS |
| **Rama revisada** | `task/T-0018-app-interna-y-aceptacion-vs01` |
| **SHA base (`origin/main`)** | `92f14ce72b2b54e575df91e7726d8ff39c6a11c5` |
| **SHA head revisado** | `ebd0d0979ad411f799f8c19a67665a63c962e18f` |
| **Contrato leído desde** | `origin/main:TASKS/T-0018-app-interna-y-aceptacion-vs01.md` |
| **Procedimiento** | R-33: contrato desde `main`, diff completo con tests, comandos de `## Verification` corridos **antes** de abrir `ops/evidence/T-0018.md`, criterio armado por cuenta propia sobre `DOMAIN.md`, `decisions.yaml`, `ENGINEERING_RULES.md`, `SLICES/VS01.md` y `DECISIONS/`. Sin transcript ni narrativa de quien implementó. |
| **Veredicto** | **Aprobar con cambios.** No hay bypass de autenticación ni de admisión, y la fidelidad a D-0059 se sostiene bajo ataque directo. Tres `Act on`, ninguno de ellos un agujero de acceso: un `500` alcanzable sin sesión en la superficie de datos, un conteo documental que puede exceder su propio denominador, y un artefacto de build versionado. |

---

## 1. Qué verificación corrí, antes de leer la evidencia

Corrido en el worktree `/Users/emilianodelcampo/repos/del-campo/.worktrees/T-0018`, a
`HEAD = ebd0d09`, **antes** de abrir `ops/evidence/T-0018.md`.

### `pnpm check` — el único comando del bloque `## Verification`

Código de salida **`0`**. Salida literal (encabezado y los tres cortes que importan):

```
$ node scripts/check-docs.mjs && node scripts/check-agent-run.mjs && node --test scripts/tests/*.test.mjs && pnpm typecheck && pnpm lint && pnpm test

✓ 60 decisiones, 25 ADRs, 19 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
ℹ tests 59
ℹ suites 0
ℹ pass 59
ℹ fail 0

$ tsc --noEmit && tsc --noEmit -p apps/web

$ eslint .

ℹ tests 147
ℹ suites 31
ℹ pass 147
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2029.041125
```

(`fatal: Not a valid object name origin/main` aparece dentro de la suite de
`check-branch`; es un caso que ese test fabrica a propósito y no un fallo.)

### `node scripts/vs01/freeze-cases.mjs --verify` — el ítem checkable del contrato

```
$ node scripts/vs01/freeze-cases.mjs --verify
No se encuentran data/vs01-acceptance/casos.csv y seleccion.md
EXIT=1
```

Anotado con mis ojos antes de leer nada: **falla, y es el resultado correcto hoy**. Los
20 casos son una precondición humana del contrato (`- [ ] 20 casos elegidos por el owner
y congelados`), y sembrarlos sintéticamente para poner el comando en verde habría
destruido la propiedad que el comando existe para garantizar. Lo registro acá como lo
observé, no como me lo contaron.

### Comprobaciones propias, fuera del bloque `## Verification`

- **R-25 por herramienta, no por convención.** `npx eslint --print-config
  apps/web/src/lib/sesion.ts` resuelve `no-restricted-imports` en `error` con
  `@del-campo/db` y el patrón `@del-campo/db/*`. El límite se hace cumplir; no es una
  nota en un comentario.
- **Cookie de sesión malformada** contra `guarded`, con un `Request` real
  (`Cookie: vs01_session=%E0%A4%A`) → **`THREW: URIError URI malformed`**. → hallazgo 1.
- **Conteo documental con más de una referencia por póliza**, contra
  `delcampo_t0018_sintetico` dentro de una transacción **revertida** (sin tocar
  `delcampo_t0013_dev`): `filas de access para 1 póliza: 2` y
  `tally: {"denominator":1,"withDocument":2,…}`. → hallazgo 2.

### Sólo después de esto leí `ops/evidence/T-0018.md`

Contraste: el `pnpm check` que la evidencia transcribe (59 y 147 tests, `fail 0`, salida
`0`) y el `freeze-cases --verify` (`EXIT=1`, mismo texto) **coinciden literalmente** con
lo que yo corrí, a un commit de distancia. La evidencia declara el SHA de rama
`ee3d5b9`, un commit por detrás del head; el delta (`ebd0d09`) es el propio archivo de
evidencia, el `ignores: '**/.next/**'` de ESLint y un rebote de `tsconfig.tsbuildinfo`.
Volví a correr `pnpm check` a `ebd0d09` y sigue en verde, así que el desfase no esconde
nada. Las ocho limitaciones de `## Qué NO se verificó` son reales y ninguna de las que yo
encontré estaba escondida allí como si estuviera cubierta.

---

## 2. Hallazgos

### `Act on` 1 — Una cookie de sesión malformada produce `500` en vez de `401`, sin sesión y desde afuera

`packages/api/src/session/guard.ts` · `readCookie` cierra con
`decodeURIComponent(entry.slice(separator + 1))`. `decodeURIComponent` lanza `URIError`
ante cualquier `%` mal formado, y nada lo atrapa: `admitRequest` propaga, `guarded`
propaga, y el route handler devuelve `500`.

Reproducido:

```
Cookie: vs01_session=%E0%A4%A   →  THREW: URIError URI malformed
```

Por qué importa, y no es un detalle cosmético:

1. Es alcanzable **sin ninguna credencial**, por cualquiera que llegue a
   `/api/vs01/search`, poniendo un byte en una cookie.
2. Contradice el invariante que el propio código se fija.
   `packages/api/src/session/session.ts` lo escribe con todas las letras: *"Nunca lanza
   por una cookie mala: devuelve el estado […] tratarla como excepción tiende a producir
   un 500 —que ya dice algo— en vez de un 401 que no dice nada"*. `readSession` cumple;
   `readCookie`, que corre **antes**, no.
3. Es exactamente la distinción observable que D-0059 quiere cerrar: un `500` se
   distingue de un `401` desde afuera. No filtra qué recurso existe, pero sí que la
   entrada llegó a romper algo del lado del servidor.
4. Las pruebas negativas no lo alcanzan porque las siete usan valores que decodifican
   bien (`'no-es-un-token'`, `'roto'`, JWEs). El caso que falta es el único que
   `decodeURIComponent` distingue.

Arreglo: envolver el `decodeURIComponent` y devolver el valor crudo (o `undefined`) ante
`URIError` — cualquiera de las dos ramas termina en `INVALID_TOKEN`. Y un test con
`vs01_session=%E0%A4%A` que exija `401` y cuerpo vacío, en la misma tabla que los otros
siete. La superficie de páginas no está afectada: `admitCookie` recibe el valor ya
decodificado por `next/headers` y no llama a `readCookie`.

### `Act on` 2 — El conteo documental puede superar su propio denominador, y el enlace "Abrir documento" se elige en silencio entre varios

`SLICES/VS01.md` §2 exige *"los conteos documentales sobre el conjunto consultado, con
denominador explícito"*, y T-0018 es la tarea que pone ese número en pantalla
(`apps/web/src/app/buscar/page.tsx`: «Sobre N pólizas consultadas: X con documento…»).

`getDocumentAccessForPolicies` (T-0017) arma el resultado con `left join` sobre tres CTEs
—`document`, `pending`, `client_folder`— sin agregación. Una Policy con dos
`policy_document_reference` en `RESOLVED` produce **dos filas**. La PK de
`policy_document_reference` es `external_reference_id`, no `policy_id`: nada en el schema
impide dos referencias por póliza, y dos notas de Zoho apuntando a documentos es
exactamente la forma del dato real.

Consecuencias, las dos dentro de lo que T-0018 agrega:

- `countDocumentLinkingCategories` itera filas y `denominator` es `policyIds.length`.
  Medido contra `delcampo_t0018_sintetico`, en transacción revertida:

  ```
  filas de access para 1 póliza: 2
  tally: {"denominator":1,"withDocument":2,"withClientFolderOnly":0,
          "withPending":0,"withoutReference":0}
  ```

  La app renderiza «Sobre 1 póliza consultada: 2 con documento». Un denominador que el
  numerador excede no es un denominador explícito: es un conteo roto mostrado con
  autoridad.
- `accessByPolicy` (`packages/api/src/vs01/queries.ts`) hace
  `new Map(entries.map((e) => [e.policyId, e]))`: ante duplicados **la última fila gana**,
  sin orden determinado por la consulta. La tarjeta ofrece entonces uno de los documentos
  candidatos rotulado «Abrir documento» —que D-0057 define como *el* archivo de la póliza
  con asociación revisada— sin señal alguna de que había más de uno. Es la misma familia
  de error que §2 prohíbe para los candidatos de búsqueda ("no se presenta un candidato
  ambiguo como coincidencia inequívoca"), trasladada al eje documental.

La causa raíz está en `packages/db/src/document-linking/query.ts`, que este diff no toca;
pero T-0018 es su primer consumidor y el que convierte el defecto en algo que una persona
lee y usa. Como mínimo, la capa de T-0018 debería detectar el duplicado en vez de
colapsarlo, y el conteo debería ser por Policy distinta. El lote sintético no produce el
caso, así que el recorrido de la evidencia no podía revelarlo.

### `Act on` 3 — `apps/web/tsconfig.tsbuildinfo` es un artefacto de build versionado

`.gitignore` suma `apps/web/.next/` y explica bien por qué `next-env.d.ts` **sí** se
versiona, pero `tsconfig.tsbuildinfo` —que `"incremental": true` genera en
`apps/web/tsconfig.json`— quedó adentro. Que es artefacto y no fuente ya está demostrado
dentro de la propia rama: `ebd0d09`, un commit cuyo contenido es evidencia y una línea de
ESLint, lo modifica igual. Es ruido garantizado en cada diff y conflicto garantizado en
cada merge, y el mismo argumento escrito para `.next/` —*"lintearlos haría fallar según
si alguien construyó antes o no, que es la peor propiedad posible para un guardrail"*—
aplica acá literalmente. Agregar `apps/web/tsconfig.tsbuildinfo` (o `*.tsbuildinfo`) al
`.gitignore` y sacarlo del índice.

---

### `Consider` 1 — `latestBatch()` es el caso de uso de `vs01/` que no recibe `Principal`

`DECISIONS/0059-sesion-y-admision-vs01.md` afirma una propiedad estructural, no una
convención: *"todos los casos de uso de `packages/api/src/vs01/` reciben un `Principal`
como primer parámetro […] Una consulta de datos sin sesión no es un camino que el código
deje abierto y el guard cierra: es un programa que no tipa."* `packages/api/src/vs01/batch.ts`
está en ese directorio, consulta `staging_import_batch` y **no** recibe `Principal`.

Hoy no hay fuga: las tres páginas llaman `requireAdmitted()` antes de `latestBatch()`, y
lo verifiqué leyendo las tres. Pero la garantía que el ADR declara es "el compilador lo
impide", y para esta función el compilador no impide nada: la próxima ruta que la use
antes del guard compila. O `latestBatch` toma un `Principal` como las otras tres, o el
ADR acota su afirmación a las consultas de negocio y dice por qué la fecha del lote queda
afuera. Lo que no conviene es que el documento prometa una propiedad que el código tiene
con una excepción no escrita.

### `Consider` 2 — La cookie que se prueba no es la cookie que se emite

`session.test.ts` verifica `HttpOnly`, `SameSite=Lax`, `Secure`, `path: '/'` y el
`maxAge: 0` del cierre sobre `sessionCookie()` / `clearedSessionCookie()`. Ninguna de las
dos se llama desde `apps/web`: el callback construye los atributos **inline**
(`route.ts`, `response.cookies.set({…})`) y el logout usa `response.cookies.delete()`.
`principalOf` y `assertAuthConfigured` tampoco se usan en ningún lado.

Hoy los atributos inline coinciden con los que el test exige —los comparé uno por uno—,
así que no hay defecto de conducta. Lo que hay es un test que no puede detectar que
dejen de coincidir: quien edite el `cookies.set` del callback y le saque `httpOnly`
tendrá la suite en verde. Que el route handler use el helper probado, o que el test
ataque la respuesta del handler, convierte esas cinco aserciones en un guardrail real en
lugar de en la descripción de una función muerta. Es la misma disciplina que `http.ts`
aplica bien y explica bien (*"lo que corre acá es lo mismo que esas pruebas ejercitan"*);
la cookie es el lugar donde esa disciplina no se aplicó.

### `Consider` 3 — Un discovery fallido queda cacheado para siempre en la instancia

`packages/api/src/session/oidc.ts`: `discovered ??= client.discovery(…)`. Si esa promesa
**rechaza** —un blip de red contra `accounts.google.com`, un timeout de arranque en frío—
la promesa rechazada queda guardada en el módulo, y todo login posterior en esa instancia
falla con el mismo error, sin reintento posible, hasta que la instancia se recicle. En
Vercel las instancias son cortas y eso acota el daño, pero el síntoma —"a veces el login
queda muerto un rato y después se arregla solo"— es del tipo que cuesta días diagnosticar
durante un piloto de una sola persona. `.catch(() => { discovered = undefined })` sobre la
promesa cacheada, o cachear sólo tras la resolución, lo cierra en una línea.

### `Consider` 4 — El test de no-filtración de existencia no puede fallar

`http.test.ts` · *"ninguna respuesta negativa revela si el recurso pedido existe"* compara
dos `Request` **ambas sin cookie**. `deniedResponse` no recibe ni mira la URL, así que las
dos respuestas son idénticas por construcción: el test pasa aunque el handler filtrara
todo, porque el handler nunca corre. Prueba una tautología con el nombre de una propiedad
importante.

La propiedad real —que el `404` sólo se alcance después de la admisión— sí está
verificada, pero en la **observación externa** de la evidencia (`sin sesión, id
inexistente: 401` / `admitida, id inexistente: 404` / `admitida, id existente: 200`), no
en la suite. Subir esa tríada al test, con un handler que devuelva `404` para un id y
`200` para otro, le daría al archivo la aserción que su título promete. No es un defecto
de conducta: es un test que mide otra cosa de la que dice medir, que es exactamente la
clase de hallazgo que R-33 existe para producir.

### `Consider` 5 — Confirmar `cache-control` en el HTML autenticado del entorno hosteado

`jsonResponse` y `deniedResponse` fijan `cache-control: no-store` explícitamente; las
páginas no fijan ninguno y dependen de lo que Next derive de `dynamic = 'force-dynamic'`.
Por defecto Next marca esas respuestas como privadas y sin store, así que lo más probable
es que esté bien — pero el HTML de `/poliza/[id]` lleva número de póliza y nombre del
tomador, y la diferencia entre "casi seguro" y "verificado" en una cabecera de caché es
una línea de `curl -i` contra el despliegue. La ficha de `docs/despliegue/vercel-vs01.md`
§7 ya manda comprobar `/login` y el `401` de `/api/vs01/search` tras un rollback; agregar
ahí la cabecera de una página con datos cuesta lo mismo y cierra el punto.

---

### `Noted`

1. **Ningún test preexistente fue modificado.** Es lo primero que busqué (R-33 §2). Contra
   `origin/main` no hay una sola línea tocada en un test que ya existiera; todos los
   `.test.ts` del diff son nuevos. Dentro de la rama sí hubo dos ediciones de tests
   propios en `48864a1`, y las dos **aprietan** en vez de aflojar: `assert.equal(outcome.admitted,
   false)` seguido de `return ''` pasa a `assert.fail`, y dos `if (…) return` —que hacían
   que el test pasara en silencio cuando el estrechamiento fallaba— pasan a `assert.ok`.
   Es el movimiento contrario al que esta revisión busca.
2. **R-05 se cumple con el orden correcto, y es verificable en el grafo de commits.** Los
   tres ADR (0058 Next.js/React, 0059 sesión y admisión, 0060 `openid-client` + `jose`)
   entran completos en `0d9fd54`, el primer commit de la rama; el primer `package.json`
   con esas dependencias es `1b04a79` y el lockfile viene después. `postgres` no necesita
   ADR nuevo: ya lo tiene en D-0049. La entrada `adr:` quedó agregada también a D-0058 y
   D-0059, que antes no la tenían.
3. **R-25 se hace cumplir por herramienta, con un hueco de forma.** Verificado por
   `--print-config`, no por lectura. El hueco: la regla nombra `@del-campo/db` y
   `@del-campo/db/*`, de modo que un import relativo desde `apps/web` hacia
   `../../packages/db/src/…` no lo frena. Hoy no existe ninguno y la resolución estricta
   de pnpm además impediría que `apps/web` resuelva `postgres` por su cuenta, así que no
   es un defecto actual; es el borde de la regla, por si alguna vez alguien la prueba.
4. **`export type { PartyOverview } from '@del-campo/db'`** en el barril de `packages/api`
   es un re-export de **tipo**, dentro de `api`, que es el paquete al que R-25 sí le
   permite conocer `db`. `apps/web` importa el tipo desde `@del-campo/api`. No es un cruce
   de límite; lo dejo anotado porque a primera vista lo parece.
5. **R-19: limpio.** No hay dato de cliente real en el diff, en los tests, en las fixtures
   ni en la evidencia. Las identidades de test son `@ejemplo-sintetico.test`, el lote
   sembrado es «Ana Ejemplo» / «Comercio Sintético SRL» con DNI y CUIT inventados, y las
   URLs de Drive no apuntan a nada. Las dos guardas del seeder —nombre que contiene
   `t0013`, y nombre que no se declara sintético— están escritas de modo que escribir
   sobre datos reales exija renombrar la base a propósito.
6. **`secureCookies: process.env.NODE_ENV === 'production'`.** El comentario dice que se
   apaga "fuera de producción: en local la app corre sobre http", pero `next start` local
   —el modo con el que se produjo la observación externa— también es `NODE_ENV=production`.
   Sin efecto práctico: la ficha de despliegue registra `http://localhost:3000/...`, que es
   `next dev`, y la evidencia emitió sus cookies aparte. Queda anotado porque el comentario
   describe una condición ligeramente distinta de la que el código evalúa.
7. **La rama documental pierde el rótulo «Pendiente documental:».** En
   `AccesoDocumental.tsx`, con carpeta y pendiente el texto queda «No es el documento de la
   póliza · ambiguo» en vez de nombrar el pendiente como tal. El pendiente sobrevive —que
   es lo que D-0057 exige— pero con menos nombre que en las otras dos ramas.
8. **El `taskId` de los AgentRuns quedó en `T-0017`.** La evidencia lo declara en
   Procedencia y en el punto 8 de sus límites, con el mecanismo (el hook lo deriva del
   nombre de rama en `SessionStart`) y la razón para no reescribir un ledger append-only.
   Es la conducta correcta frente a `ops/AGENTRUN.md` y R-23; lo anoto para que quede en
   el informe de revisión y no sólo en el de quien ejecutó.

---

### `Dismissed` — con su justificación, una por una

1. **«La configuración ausente abre la app».** No. Lo perseguí explícitamente porque es la
   forma clásica del bypass. `admissionConfig()` y `sessionConfig()` llaman a `required()`,
   que **lanza** ante variable ausente o vacía, y `guardConfig()` las llama en el camino de
   toda página y de toda consulta de datos. Una lista presente pero vacía (`","`) parsea a
   `[]`, y `evaluateAdmission` niega todo con `NOT_ADMITTED`. Falta de configuración =
   error visible, nunca puerta abierta. Lo que sí es cierto es que `assertAuthConfigured`,
   la función escrita para hacerlo explícito, no se invoca en ningún lado (→ `Consider` 2);
   la propiedad se sostiene igual, por otra vía.
2. **«Hay alguna ruta que llega a datos sin pasar por la admisión».** No. Enumeré los 17
   archivos de `apps/web/src`: las tres páginas con datos (`/buscar`, `/poliza/[id]`,
   `/parte/[id]`) llaman `requireAdmitted()` **antes** de cualquier consulta; las dos rutas
   de datos pasan por `guarded`; `/` sólo redirige; `/login`, `/not-found` y las tres de
   auth no tocan la base. No hay `middleware.ts`, y su ausencia acá es una ventaja: la
   verificación está en cada destino y no en un matcher de rutas que se puede desalinear.
   El salida del build que la evidencia transcribe lo confirma por otro lado: toda página
   con datos es `ƒ`, ninguna prerenderizada.
3. **«El header `x-vs01-denial` filtra».** Lo miré de cerca porque es información que
   viaja al cliente. Distingue seis motivos, pero: el código de estado ya separa 401 de
   403; para ver un `EMAIL_UNVERIFIED` / `OUTSIDE_WORKSPACE` / `NOT_ADMITTED` hay que
   presentar una cookie JWE válida, que sólo la app puede emitir; y la página de login le
   dice a esa misma persona exactamente lo mismo en castellano. No identifica el recurso
   pedido ni distingue existencia. No es un canal.
4. **«"Abrir documento" se muestra sin comprobar que la asociación fue revisada».** La
   consulta filtra por `er.resolution_status = 'RESOLVED'` y no consulta
   `document_verification_input`, donde viven `verified_by` / `verified_at` /
   `verified_account` que D-0057 exige registrar. Parecía un salto. No lo es:
   `packages/db/src/document-linking/load.ts` sólo escribe `RESOLVED` cuando la relación
   quedó verificada, y deja `UNRESOLVED` con motivo en caso contrario. `RESOLVED` **es** la
   marca de revisada, puesta por el cargador de T-0017.
5. **«Un ADR para dos paquetes viola R-05».** R-05 exige ADR por dependencia nueva, no un
   archivo por paquete. D-0060 nombra `openid-client` y `jose` con versión, rol y
   alternativas descartadas, argumenta por qué son una sola decisión, y cita el precedente
   del repositorio (D-0047 cubre TypeScript, ESLint y el runner en una sola). El registro
   existe y es específico.
6. **«`freeze-cases --verify` falla, así que la tarea no verifica».** Falla, sí, y debe
   fallar: los 20 casos son una precondición humana que el contrato deja sin tildar. La
   tarea sigue en `ACTIVE`, no en `DONE`, y ni el contrato de VS01 se marcó histórico ni
   se declaró entrega. Sembrar casos para poner el comando en verde habría sido el
   hallazgo grave de esta revisión; no ocurrió, y la evidencia dice por qué en vez de
   disimularlo.
7. **«`SIN_REFERENCIA` en `buscar/page.tsx` infiere inexistencia».** La constante rellena
   el caso en que el `Map` no trae entrada para una Policy y muestra «Sin referencia
   documental sustentada» — que es *no afirmar una relación*, no *afirmar que no existe*.
   Es la misma lectura que `queries.ts` deja escrita para el detalle y la que
   `query.ts` documenta para INV-019. Coherente con D-0057.
8. **«`apps/web` alcanza `packages/db`».** No hay ningún import, ni directo ni relativo, ni
   dinámico: lo busqué en los 17 archivos y la regla de ESLint está activa sobre
   `apps/web/**/*.{ts,tsx}`. La única superficie compartida es el tipo re-exportado del
   punto 4 de `Noted`.

---

## 3. Por qué el veredicto no es "aprobar sin cambios"

Lo que la tarea declara como su núcleo —que páginas y consultas de datos no puedan
divergir, y que ninguna respuesta negativa diga si el recurso existe— se sostiene, y se
sostiene por construcción y no por disciplina: `Principal` sólo sale del guard,
`admitCookie` y `admitRequest` están probados como equivalentes ante la misma cookie, y
las seis negativas devuelven cuerpo vacío. Eso lo verifiqué yo, corriendo la suite y
atacando `guarded` con `Request` fabricados, antes de leer una línea de evidencia.

Los tres `Act on` no tocan ese núcleo, y ninguno se resuelve discutiendo: el `URIError` lo
reproduje, el `withDocument: 2` sobre `denominator: 1` lo reproduje, y el `.tsbuildinfo`
ya se ensució solo dentro de la propia rama. Dos de ellos comparten una forma: el código
es correcto en el camino que los tests recorren y se rompe en el borde que ningún test
recorre —una cookie con `%` de más, una póliza con una referencia de más—. Es el lugar
donde una revisión que no comparte contexto tiene algo que aportar que la suite en verde
no aporta.

El `Consider` 4 es el hallazgo que más me interesa de los seis, aunque no cambie una línea
de conducta: un test cuyo nombre promete "ninguna respuesta negativa revela si el recurso
existe" y cuyo cuerpo compara dos peticiones que nunca llegan al recurso. R-33 abre
diciendo que un check en verde prueba que el código hace lo que el test dice, no que el
test diga lo correcto. Ese archivo es el ejemplo.
