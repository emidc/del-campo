# T-0018 — Revisión ciega del cierre por subagente aislado (R-33 / D-0052)

| | |
| --- | --- |
| **Workstream** | BOS |
| **Rama revisada** | `task/T-0018-app-interna-y-aceptacion-vs01` |
| **SHA base (`origin/main`)** | `98ff2f1a164d398843d81172e341e7ca921b227e` |
| **SHA head revisado** | `178800d2383720d3ba43f727868e5787ec7e42e6` |
| **Merge-base** | `f58208b211ccf2d29214ab30fd834bc05b653bdf` (los 4 commits de cierre están sin mergear; `origin/main` ya contiene un merge de un estado anterior de la rama, PR #37) |
| **Contrato leído desde** | `origin/main:TASKS/T-0018-app-interna-y-aceptacion-vs01.md` |
| **Procedimiento** | R-33: contrato desde `main`, diff completo con tests, comandos de `## Verification` corridos **antes** de abrir cualquier `ops/evidence/**`, criterio armado por cuenta propia sobre `DOMAIN.md`, `decisions.yaml`, `DECISIONS/`, `ENGINEERING_RULES.md` y `SLICES/VS01.md` §4. Sin transcript ni narrativa de quien implementó. |
| **Veredicto** | **GO — aprobar con cambios.** El informe de aceptación se regenera **byte a byte idéntico** desde su script, los cuatro umbrales de §4 se cumplen también en la sensibilidad, y la evidencia declara las cuatro incertidumbres sin maquillarlas. Cinco `Act on`: el artefacto versionado no permite recalcular las medianas como exige §4.7, dos invariantes del protocolo que el script no hace cumplir, un ítem de `## Verification` sin evidencia alguna, y un bypass reproducido de `guard-db-tests.mjs` (preexistente en `main`, apto para tarea de seguimiento). Ninguno contradice el resultado de la aceptación. |

---

## 1. Qué verificación corrí, antes de leer la evidencia

Corrido en el worktree `/Users/emilianodelcampo/repos/del-campo/.worktrees/T-0018`, a
`HEAD = 178800d`, **antes** de abrir `ops/evidence/T-0018.md`,
`ops/evidence/T-0018-aceptacion.md` y `ops/evidence/T-0018-casos-congelados.md`.

### `pnpm check` — el único comando del bloque `## Verification`

Código de salida **`0`**. Salida literal (encabezado y los cortes que importan):

```
$ node scripts/check-docs.mjs && node scripts/check-agent-run.mjs && node --test scripts/tests/*.test.mjs && pnpm typecheck && pnpm lint && pnpm test

✓ 62 decisiones, 25 ADRs, 19 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
...
ℹ tests 150
ℹ suites 33
ℹ pass 150
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2080.309958
```

### `node scripts/vs01/freeze-cases.mjs --verify` (casilla 4 de `## Verification`)

Código de salida **`0`**:

```
✓ Sin cambios desde el congelamiento del 2026-09-25T15:17:49.744Z
```

### `node scripts/vs01/informe-aceptacion.mjs` — regeneración del informe

Código de salida **`0`**. Salida literal completa:

```
# T-0018 — Informe de aceptación de VS01

Generado por `scripts/vs01/informe-aceptacion.mjs` desde la planilla local (ignorada por Git).
Sólo números y códigos de caso (R-19). Los motivos de fallo quedan en la planilla local.

### Resultado según el protocolo

| Criterio (§4) | Umbral | Resultado | |
| --- | --- | --- | --- |
| Pólizas encontradas | ≥ 19 de 20 | 20 de 20 | ✓ |
| Coincidencias falsas inequívocas | 0 | 0 | ✓ |
| Vínculos que abren el destino correcto | todos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 92.5 s · VS01 40 s · 20 pares · reducción 56.8 % | ✓ |

**Resultado: cumple los cuatro criterios.**

## Amenaza a la validez declarada por el owner

Durante la medición, el botón «Abrir documento» sólo estaba habilitado para las 20 pólizas
conciliadas; el resto de las pólizas mostraba el documento pendiente. El botón funcionó como
pista para elegir la póliza objetivo entre candidatos, y también acortó el recorrido.

Casos en que el operador declaró haber elegido guiado por el botón: C20.

### Sensibilidad: esos casos cuentan como no encontrados y salen de los pares de tiempo

| Criterio (§4) | Umbral | Resultado | |
| --- | --- | --- | --- |
| Pólizas encontradas | ≥ 19 de 20 | 19 de 20 | ✓ |
| Coincidencias falsas inequívocas | 0 | 0 | ✓ |
| Vínculos que abren el destino correcto | todos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 91 s · VS01 39 s · 19 pares · reducción 57.1 % | ✓ |

**Resultado: cumple los cuatro criterios.**
```

### Contraste script → evidencia

```
$ diff <(node scripts/vs01/informe-aceptacion.mjs) ops/evidence/T-0018-aceptacion.md
$ echo $?
0
```

**Sin diferencias.** El archivo versionado es exactamente la salida del script sobre la
planilla local presente en esta máquina: no hay números escritos a mano. Las medianas son
coherentes con la paridad que exige §4.6 (20 pares ⇒ `92.5` es el promedio de los dos
centrales; 19 pares ⇒ `91` es el central), y `mediana()` está cubierta en ambas paridades
por `scripts/tests/vs01-informe.test.mjs:9-12`. El umbral de 19 aparece en dos lugares
distintos del script: `informe-aceptacion.mjs:29` (`encontradas >= 19`) y
`informe-aceptacion.mjs:45` (`pares.length >= 19`), y ambos se corresponden con §4 y §4.6.

---

## 2. Hallazgos

### `Act on`

**A1 · El informe versionado no permite recalcular las medianas (§4.7 y casilla 5 de `## Verification`).**
`ops/evidence/T-0018-aceptacion.md:1-35` publica únicamente las medianas y los conteos.
No hay una sola fila por caso. `SLICES/VS01.md` §4.7 exige que «el informe agregado
permite recalcular las medianas con códigos anónimos y tiempos», y la casilla 5 del
contrato repite «permite recalcular los cuatro resultados de §4». Con los insumos en una
planilla ignorada por Git, hoy ningún revisor puede recalcular nada: sólo puede volver a
correr el script en la máquina del owner, que es lo que hice yo y no es lo que pide el
contrato. R-19 no lo impide: §4.4 y §4.7 declaran explícitamente publicables el código
anónimo y los tiempos, y el informe ya publica `C20`.
Arreglo: emitir las 20 filas (`case_code`, `base_segundos`, `vs01_segundos`,
`poliza_encontrada`, `coincidencia_falsa_inequivoca`, aperturas, `pista_boton`) en
`scripts/vs01/informe-aceptacion.mjs:67-98` y regenerar.

**A2 · El script no ata la medición al conjunto congelado; el denominador sale de la planilla.**
`scripts/vs01/informe-aceptacion.mjs:29` fija `encontradas >= 19` como constante y
`informe-aceptacion.mjs:41` reporta `casos: filas.length`. El script nunca compara los
`case_code` medidos contra los congelados, pese a que ya importa de `freeze-cases.mjs`
(`informe-aceptacion.mjs:14`). Consecuencia: una planilla de 19 filas imprimiría
«19 de 19 ✓» y una de 25, «19 de 25 ✓». `## Non-scope` prohíbe «ampliar alcance ni
reemplazar casos para compensar un criterio incumplido» y §4.5 prohíbe eliminar un fallo
del informe de los 20 casos; lo único que hoy sostiene esas dos prohibiciones es la
disciplina del operador. En esta corrida `filas.length` es 20 y el número es correcto —
el hallazgo es que el artefacto no lo hace cumplir.
Arreglo: afirmar `filas.length === 20`, afirmar que el conjunto de `case_code` iguala el
de `casos.csv` congelado, y derivar el umbral del conteo congelado.

**A3 · El criterio documental se evalúa por suma global y se puede satisfacer por vacío.**
`scripts/vs01/informe-aceptacion.mjs:36-37` acumula `esperadas`/`comprobadas` con
`num(...) ?? 0`, y `informe-aceptacion.mjs:48` exige sólo `esperadas > 0 && comprobadas === esperadas`.
Un caso con `aperturas_esperadas` vacío o no numérico aporta 0 a los dos lados y pasa en
silencio, que es exactamente lo que §4.5 prohíbe: «No hallar ningún vínculo no satisface
por vacío el criterio documental: cada caso tiene un documento objetivo declarado
previamente». Además `num()` degrada un valor malformado a 0 en vez de fallar.
Arreglo: exigir por caso `esperadas >= 1` y `comprobadas === esperadas`, y abortar ante un
valor no numérico en lugar de coercerlo.

**A4 · La casilla 6 de `## Verification` no tiene evidencia.**
«La medición acredita utilidad sin consultar Zoho durante el recorrido de VS01» —
condición central del outcome de VS01 (`SLICES/VS01.md:26`). Ni
`ops/evidence/T-0018.md:406-426` (quinta vuelta) ni `ops/evidence/T-0018-aceptacion.md`
registran que el tramo VS01 se completó sin abrir Zoho; un grep sobre toda la evidencia
versionada devuelve únicamente la propia frase del slice. La mediana de 40 s lo sugiere,
pero sugerir no es acreditar, y AGENTS.md no acepta un «Done» subjetivo.
Arreglo: una línea atestiguada por el operador o el owner en la quinta vuelta, o una
columna en la planilla que el informe agregue.

**A5 · `scripts/guard-db-tests.mjs`: bypass reproducido por desacuerdo entre lectores de `.env`.**
La guarda lee el **primer** renglón `DATABASE_URL=` del `.env`
(`scripts/guard-db-tests.mjs:24-32`, `startsWith('DATABASE_URL=')` con `return` inmediato).
Todos los consumidores arman un diccionario y se quedan con el **último**:
`packages/db/src/schema.integration.test.ts:19-31` (y el mismo patrón en
`policy-query.integration.test.ts:18`, `policy-document-reference.integration.test.ts:22`,
`document-linking/load.integration.test.ts:27`, `import/parties.integration.test.ts:18`,
`import/catalog.integration.test.ts:18`), `packages/db/src/import/db.ts:14` y
`packages/db/src/cli.ts:27`.

Vector exacto: un `.env` con dos renglones,

```
DATABASE_URL=postgres://localhost:5432/delcampo_dev
DATABASE_URL=postgres://u:p@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

Reproducido sobre una **copia** de la guarda en el scratchpad, sin tocar el `.env` del
worktree y sin intentar ninguna conexión:

```
$ node --import <copia>/scripts/guard-db-tests.mjs -e 'console.log("GUARDA PASO")'
GUARDA PASO
EXIT=0

$ # el lector last-wins que usan los tests, sobre el mismo .env:
DATABASE_URL efectiva para el test (last-wins): postgres://u:p@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
motivoDeRechazo(esa URL) = el host "aws-0-sa-east-1.pooler.supabase.com" no es local
```

La guarda rechaza esa URL cuando se la pasa directo y la aprueba cuando llega por `.env`:
`pnpm test` aplicaría y revertiría migraciones contra la base hosteada. Es el mismo modo
de falla que ya se materializó una vez (`ops/evidence/T-0018.md:375-381`: el `.env` del
checkout principal apuntaba a `delcampo_t0013_dev` y las pruebas de integración la
vaciaron), y el que D-0053 y R-13/R-19 obligan a cerrar.
Nota de alcance: el archivo **no** está en este diff — viene de `main` (`d67f03c`). No lo
propongo como bloqueante del merge de cierre, sino como tarea de seguimiento.
Arreglo: que la guarda use el mismo parser que los consumidores (un `leerEnv`
compartido), y que rechace un `.env` con `DATABASE_URL` duplicada.

### `Consider`

**C1 · Los otros DSN que la guarda acepta, hoy inertes pero no por diseño.**
`motivoDeRechazo` acepta `postgres://localhost:5432/delcampo_dev?host=aws-0.pooler.supabase.com`,
`postgres://localhost:5432/delcampo_%740013_dev` y `postgres://localhost:5432/delcampo_T0013_dev`
(probados uno por uno). Ninguno es explotable a través de `postgres@3.4.9`: `parseOptions`
toma el host sólo de `o`/`multihost`/`url.hostname`/`PGHOST` y nunca del query
(`node_modules/.pnpm/postgres@3.4.9/.../src/index.js:439`), y la base sale de
`url.pathname.slice(1)` **sin** decodificar (`index.js:469`), con nombres de base
sensibles a mayúsculas en Postgres. Pero `docs/despliegue/vercel-vs01.md` §10.3 le pasa
`$DATABASE_URL` a `psql`, y libpq **sí** honra `?host=` y **sí** percent-decodifica. La
protección depende hoy del parser de una dependencia, no de la guarda. Conviene hacerla
estructural: rechazar query params desconocidos y comparar el nombre de base decodificado
y plegado a minúsculas. (`postgres://LOCALHOST:…` se rechaza como «no local» porque
WHATWG no baja el host de un esquema no especial: falla cerrado, pero el mensaje engaña.)

**C2 · Las precondiciones de `## Notes` quedan sin tildar y `## Notes` no está congelado.**
`TASKS/T-0018-app-interna-y-aceptacion-vs01.md` `## Closure` justifica las casillas sin
tildar «por la regla de contrato congelado (T-0005)». Es correcto para `## Verification`,
pero las cuatro precondiciones humanas de `## Notes` (`[ ] 20 casos elegidos… congelados`,
`[ ] Cliente OAuth web Internal`, `[ ] Lista de cuentas admitidas`, `[ ] Proyecto Supabase
y Vercel`) también siguen en `[ ]`, y esa sección **sí** se puede modificar: el propio
checker lo testea («modificar solo ## Notes pasa en verde»). Una tarea `DONE` cuyas
precondiciones se leen incumplidas es un contrato que se contradice a sí mismo.

**C3 · El límite del análisis de sensibilidad está insinuado, no declarado.**
`ops/evidence/T-0018-aceptacion.md:21` dice que el botón «también acortó el recorrido»,
pero la sensibilidad sólo saca el caso que el operador declaró. Ningún número del informe
acota la ventaja de tiempo del botón sobre los otros 19 pares, y el informe no dice que no
la acota: −56,8 % y −57,1 % son ambos **cotas superiores** del beneficio, no estimaciones
centradas. `ops/evidence/T-0018.md:419-420` es lo más cerca que se llega («una medición
confirmatoria con otro operador y vínculos en la mayoría de las pólizas la despejaría»).
Conviene que el propio informe generado lo diga en una línea.
Relacionado: con C20 afuera la sensibilidad queda en **exactamente** 19 pares y
**exactamente** 19 encontradas, el mínimo de §4.6. Un segundo caso marcado no habría
ajustado el margen: habría invalidado la medición. El cierre dice «en el límite exacto de
los umbrales»; vale precisar que es el límite de *validez*.

**C4 · `docs/despliegue/vercel-vs01.md` §10.3: `?sslmode=require` se concatena a ciegas.**
`export DATABASE_URL="${DATABASE_URL}?sslmode=require"` produce `?…?sslmode=require` si la
cadena del Session pooler ya trae query string. Concatenar según corresponda (`?` o `&`),
o no concatenar y pasar `sslmode` aparte.

**C5 · §10 replica 13 de las 24 tablas y no dice cuáles quedan afuera ni por qué.**
`party_role`, `contact_point` y `party_source_link` no se dumpean ni se borran, pero el
importador **sí** escribe `party_source_link` (`packages/db/src/import/parties.ts:32`).
Hoy `delete from party` funciona en producción sólo porque esas tablas están vacías allí;
y `party_role` además **no se puede** vaciar nunca (INV-004 `party_role_no_delete`,
verificado en verde por `pnpm check`), así que el primer `PartyRole` en producción vuelve
inejecutable el paso 3 de §10. Conviene enumerar explícitamente las tablas fuera de la
réplica y el motivo (minimización de datos en el caso de `contact_point`).

### `Noted`

**N1 · La cadena script → evidencia es genuina.** `pnpm check` en 0 con 150 tests y 0
fallos, `freeze-cases.mjs --verify` en verde, e informe regenerado **idéntico byte a byte**
al versionado. No hay números del informe que el script no produzca.

**N2 · El congelamiento está anclado en Git, no sólo en la herramienta.**
`ops/evidence/T-0018-casos-congelados.md` publica los dos SHA-256 y tiene **un solo
commit** (`80ceee1`), sin tocar en los cuatro commits de cierre: el conjunto no se volvió
a congelar después de medir. `--verify` compara contra `data/vs01-acceptance/congelado.json`
(ignorado); el ancla verificable es la evidencia versionada, no el script.

**N3 · R-19 limpio.** Grep sobre `git diff origin/main...HEAD` por formas de CUIT/DNI,
patentes, emails, prefijos telefónicos argentinos y URLs de Drive/Zoho/`folders/`: sólo
hits de SHA de blobs. `git ls-files data` vacío; `/data/vs01-acceptance/` en
`.gitignore:19`. Dejar `contact_point` fuera de la réplica de §10 mantiene además
teléfonos y emails de clientes fuera de la base hosteada, y la consulta de VS01 no la usa.

**N4 · Las decisiones citadas existen y el estado es consistente.** D-0013, D-0019,
D-0052, D-0053, D-0057, D-0058, D-0059, D-0060 y D-0061 `ACCEPTED`; **D-0062
`PROVISIONAL`** — y el cierre asienta el plan gratuito de Vercel/Supabase como riesgo
aceptado del piloto, no como cosa resuelta. Ninguna decisión `OPEN` se resolvió en el
camino: D-0022 sigue `OPEN` y tanto `## Non-scope` como `PROJECT.md` mantienen a T-0002
fuera del camino de VS01. D-0058 y D-0060 tienen su ADR (`DECISIONS/0058-nextjs-en-vercel.md`,
`DECISIONS/0060-openid-client-y-jose.md`), como pide la casilla 1 y R-05.

**N5 · La evidencia declara las cuatro incertidumbres sin maquillarlas.** La pista del
botón en C20 con su sensibilidad (`ops/evidence/T-0018.md:415-420`), la vuelta a la
versión anterior como ensayada e informada por el owner y sin commits ni encabezados de
caché registrados (`:421-423`), `VS01_ADMITTED_ACCOUNTS` sin `sub` fijado con su
consecuencia explícita (`:424-425`), y «Los otros 19 casos no se recorrieron antes de
medir» (`:404`). También se declara que el agente no accedió a los paneles ni a la base
hosteada.

**N6 · Estado de rama.** `origin/main` (98ff2f1) ya contiene un merge de un estado
anterior de esta rama (PR #37). Los cuatro commits bajo revisión están sobre el
merge-base `f58208b` y siguen sin mergear, así que esta revisión R-33 llega a tiempo, tal
como lo anticipa el propio `## Closure`.

### `Dismissed`

**D1 · «Publicar el código `C20` expone PII.»** Descartado: §4.4 y §4.7 definen el código
anónimo como el identificador publicable y **exigen** que el informe lleve códigos. `C20`
sólo se resuelve a una póliza a través de la planilla ignorada.

**D2 · «Sacar el par de C20 de las dos medianas es manipulación favorable.»** Descartado:
§4.6 exige «el mismo conjunto de casos completados en ambos sistemas», así que un caso que
sale del lado VS01 tiene que salir también del lado base. Conservar el tiempo base y
descartar el de VS01 subiría la mediana de la línea base, que es la dirección que
favorece a quien implementa; lo que se hizo es la dirección conservadora.

**D3 · «`criterios` tiene cinco claves pero el informe habla de cuatro criterios.»**
Descartado: `tiempoValido` es la precondición de validez de §4.6, no un quinto criterio;
`fila()` la excluye del veredicto (`informe-aceptacion.mjs:75`) y `tiempo` ya la implica,
de modo que no puede haber un verde con medición inválida.

**D4 · «Nombre de base percent-encoded o en mayúsculas evade la guarda de t0013.»**
Descartado como bypass: verificado contra `postgres@3.4.9` — la base sale de
`url.pathname.slice(1)` sin decodificar (`index.js:469`) y los nombres de base de Postgres
son sensibles a mayúsculas, así que ni `delcampo_%740013_dev` ni `delcampo_T0013_dev`
llegan a `delcampo_t0013_dev`. Queda sólo como C1, por el camino de `psql` en §10.

**D5 · «Un DSN multihost (`localhost:5432,remoto:5432`) evade la guarda.»** Descartado por
prueba: `new URL()` rechaza esa autoridad con coma, así que `motivoDeRechazo` devuelve
«DATABASE_URL no es una URL válida» y la guarda aborta. `postgres.js` sí lo habría
honrado (`parseUrl`, `multihost`); la guarda falla cerrado antes.

**D6 · «Las casillas de `## Verification` sin tildar hacen del cierre un “Done”
subjetivo.»** Descartado para `## Verification`: la regla (c) del checker de rama rompe
`pnpm check` si se modifica esa sección en la rama, así que acreditar por evidencia es la
única vía disponible y el `## Closure` lo dice. Queda sólo como C2, por las casillas de
`## Notes`, que no están congeladas.

---

## 3. Qué quedó sin verificar, y por qué

1. **Todo lo que ejecutó el owner en los paneles de Vercel, Supabase y Google Cloud:** el
   deploy hosteado, el login real con Google, el ensayo de vuelta a la versión anterior,
   los conteos de producción, los 20 vínculos de Drive verificados y **la medición misma**.
   No existe salida literal y no tengo acceso; la evidencia declara esa procedencia.
2. **`data/vs01-acceptance/`** (`medicion.csv`, `casos.csv`, `seleccion.md`,
   `congelado.json`): fuera de alcance por restricción dura de la revisión. No pude
   confirmar que `congelado.json` coincida con los SHA-256 publicados en la evidencia de
   casos congelados, ni que los 20 `case_code` medidos sean los 20 congelados, ni las
   condiciones de §4.2 (mismo operador, equipo, red, y **orden de ejecución alternado**,
   que no aparece registrado en ningún archivo versionado), ni los campos por caso de §4.4
   (fecha, lote, versión probada, motivo de fallo). La regeneración idéntica prueba que el
   informe es fiel a lo que contiene esa planilla; **no** prueba que la planilla sea fiel
   al protocolo. A1 y A2 existen justamente porque hoy esa brecha no la cierra nada
   versionado.
3. **El bypass de A5** se reprodujo contra una **copia** de la guarda en el scratchpad con
   un `.env` sintético. No modifiqué el `.env` del worktree y no intenté ninguna conexión
   contra una base remota ni contra producción.
4. **Negativas de acceso contra Google real** (cuenta fuera de la lista, fuera del
   Workspace, sesión vencida): fuera del alcance de este diff y declaradas sin verificar
   desde la tercera vuelta (`ops/evidence/T-0018.md:361-362`).
5. **El recorrido de la app** (búsqueda, detalle, «Abrir carpeta del cliente», ausencia de
   referencia) no se ejecutó en esta revisión: pertenece al diff ya mergeado por PR #37 y a
   la revisión ciega anterior (`REVIEWS/T-0018/blind-review.md`).
