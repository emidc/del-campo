# T-0030: revisión ciega (R-33)

- **Base revisada:** rama `task/T-0030-risk-vistas-y-acceso`, HEAD `579f59f` («T-0030:
  vistas de Risk OS y acceso por persona»), un commit sobre `main` = `36d74f1`. El diff
  que me pasaron (`diff.patch`, 4797 líneas) es `git diff 36d74f1...579f59f`: 63
  archivos, +4254/−18. Toca `apps/risk/` (nuevo), `contexts/risk/` (migración `0003`,
  acceso, vistas, exportaciones de la raíz, y dos cambios a código de Fase 2:
  `persistence/migrations.ts` y `application/importar.ts`), tests existentes del contexto
  (`esquema`, `migrations`, `index.test.ts`, `fixtures.ts`), `DECISIONS/0069-*`,
  `decisions.yaml`, `eslint.config.js`, `package.json` (script `typecheck`),
  `pnpm-lock.yaml` y `.gitignore`. No toca `DOMAIN.md`, `TASKS/`, `.claude/`,
  `.github/`, `apps/web`, `apps/communication` ni `packages/*`.
- **Contrato:** el de `main` (`contrato-desde-main.md`). No leí `TASKS/T-0030-*.md` de la
  rama.
- **Contexto leído por mi cuenta:** `ENGINEERING_RULES.md` (R-05, R-22, R-23, R-25, R-26,
  R-28, R-33), `SLICES/RO01.md` (§2 completo, §3, §6 con A8–A11 y el protocolo, §7),
  `SLICES/RO01-decisiones.md` (texto del owner, puntos 2, 4, 6 y H6),
  `SPIKES/T-0021/v1/metodologia-v1.md` (lo que dice de unidad, límite disponible y
  vistas), `contexts/risk/contrato/columnas-risks.csv` y `columnas-risk-transfer.csv`
  (`unidad_id`, `transferencia_ref`, `monto_evento`), `contexts/risk/migrations/0001`
  (`unidad_id`), `tsconfig.json`, `package.json` raíz y `REVIEWS/T-0029-blind-review.md`
  como modelo de formato.
- **Orden:** lancé `pnpm check` antes de abrir nada que no fuera el contrato; mientras
  corría leí el diff (no es evidencia). Después corrí los otros dos comandos de
  `## Verification`. No existe `ops/evidence/T-0030.md` y no lo busqué. Luego probé
  hipótesis con sondas propias: la app compilada levantada con `next start` en el puerto
  3217 contra `delcampo_risk_dev`, un script en el scratchpad contra el dominio y un
  archivo temporal de lint (borrado).
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien
  implementó.
- **Efecto de la revisión sobre `delcampo_risk_dev`:** para entrar di de alta la persona
  sintética `revisor-ciego` con el CLI de la tarea y al final la di de baja con el mismo
  CLI (para probar que la baja corta la sesión). El esquema es sólo de inserción, así que
  quedan en esa base su fila de `persona`, `usuario`, dos de `credencial` y unas diez de
  `registro_acceso`. Son sintéticas y locales; no se pueden borrar sin saltear los
  triggers, y no lo hice.

## Verificación ejecutada antes de leer evidencia

Entorno: Node 22.22.0 (pnpm avisa `wanted node >=24`, conocido), Postgres 16 en
`localhost:5432`. Antes de cada comando exporté `PGPASSWORD`, `DATABASE_URL`,
`RISK_DATABASE_URL=postgres://root:local@localhost:5432/delcampo_risk_test` y
`COMMUNICATION_DATABASE_URL` (el contrato escribe la URL sin usuario ni clave).

### 1. `pnpm check`

```text
✓ 69 decisiones, 32 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 174 · pass 174 · fail 0 · cancelled 0          (scripts/tests)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 ...
# tests 1032 · suites 148 · pass 1028 · fail 0 · cancelled 4 · skipped 0
[ELIFECYCLE] Command failed with exit code 1.
exit=1
```

`typecheck` y `lint` pasan (sin salida). Los 4 `cancelled` son los conocidos de
communication con Node 22 (`not ok 59 - cliente de envío de Cloud API`, subtests 4 a
7); no hay ningún `not ok` más. Entre los que pasan están los nuevos:
`apps/risk` (`deny.test.ts`: suites 13 a 18; `paginas.integration.test.ts`: 19 y 20) y
`contexts/risk` (`hash de contraseñas`, `inicio de sesión`, `vistas de T-0030 sobre las
8 sintéticas`). El test de regresión imprime `posiciones comparadas con
regresion-emi41.csv: 10`.

### 2. `RISK_DATABASE_URL=… pnpm test`

```text
# tests 1032 · suites 148 · pass 1028 · fail 0 · cancelled 4 · skipped 0
[ELIFECYCLE] Test failed. See above for more details.
exit=1
```

Mismos 4 `cancelled` de communication, ningún `fail`.

### 3. `pnpm --filter "./apps/risk" build`

```text
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully
  Running TypeScript ... Finished TypeScript
✓ Generating static pages using 3 workers (2/2)
Route (app): ƒ / · ○ /_not-found · ƒ /api/login · ƒ /api/logout ·
  ƒ /api/o/[org]/{actividad,escenarios,lista,plan,transferencia} · ƒ /api/organizaciones ·
  ƒ /api/r/[id] · ƒ /login · ƒ /o/[org] · ƒ /o/[org]/{escenarios,plan,transferencia} · ƒ /r/[id]
exit=0
```

Todas las rutas con datos son dinámicas (`ƒ`); sólo `/_not-found` es estática.

### Comprobaciones humanas del contrato que repetí por mi cuenta

- **Lint (R-25):** un archivo temporal en `apps/risk/src/` con imports a
  `@del-campo/db`, `@del-campo/communication`, `../../web/…`, un archivo interno de
  `contexts/risk` por ruta relativa y por subruta del paquete, `postgres` y un
  `import()` dinámico de `@del-campo/db` dio 9 errores con los mensajes de R-25/D-0063;
  el import de `@del-campo/risk` (raíz) y `node:fs` no. Lo borré.
- **Denegación con la app levantada (`curl`):** las 6 páginas con datos, sin cookie y con
  una cookie bien formada pero mal firmada, responden 307 a `/login` sin datos (el único
  `RSK-…` del cuerpo es la ruta pedida, en el payload RSC del redirect); los 7 endpoints
  responden `401 {"error":"sin credencial válida"}` (34 bytes). `registro_acceso` no
  cambió. Sin `RISK_UI_SESSION_SECRET`: `/` → 307 a `/login`, que dice «La UI no está
  configurada…»; `/api/organizaciones` y `POST /api/login` → 503 aun con una cookie
  válida.
- **Credenciales en el repo:** `git grep` de un hash `scrypt:N:r:p:<sal>:<hash>` literal
  en `579f59f` no encuentra ninguno; los únicos hashes son de ceros construidos con
  `Buffer.alloc` en tests. Los secretos de sesión que aparecen son cadenas de test
  (`secreto-de-sesion-de-prueba-…`), las mismas que ya usa `apps/communication`.

## Hallazgos

### Act on

**A1. El detalle de un padre muestra una posición calculada sin decir qué evaluación la
sostiene ni con qué versión se calculó (RO01 §3, reglas 6 y 7), y el test que debía
detectarlo la excluye con una justificación falsa.**
`apps/risk/src/vistas/detalle.ts:82-85` muestra `Posición N en el ranking de su
organización` y luego `Evaluación usada: …` con `v.evaluacionUsada`, que
`contexts/risk/src/domain/vistas.ts:855` calcula con `evaluacionUsada(o, riskId)` sobre
el propio padre. Un padre no tiene evaluación, así que sale «sin evaluación vigente»,
aunque su posición (`vistas.ts:854`) es la de su hijo prioritario, que sí tiene una. El
rótulo `calculado con las funciones de metodologia v1` sólo existe dentro de cada bloque
de criticidad (`detalle.ts:26`), y un padre no tiene ninguno.
*Escenario, reproducido con la app levantada:* `/r/<id de S05-P01>` muestra, como texto,
«Posición 1 en el ranking de su organización. Evaluación usada: sin evaluación vigente»,
y la página no contiene «calculado con» en ningún lugar. Por construcción pasa lo mismo
con S29-P01, el otro padre del ranking (no lo abrí). La
lista de la misma organización sí lo resuelve bien: la fila del padre dice «se lee por su
hijo prioritario» y la columna «Evaluación usada» trae la del hijo.
*El test:* `apps/risk/src/vistas/paginas.integration.test.ts:224` saltea la regla 7 en
todo detalle sin `data-c-raw` con el comentario «Un detalle sin evaluaciones (un padre)
no muestra nada calculado». Es falso: muestra la posición, que es calculada. Y la regla 6
(`:212-220`) sólo se comprueba en filas de la lista, nunca en el detalle.
*Arreglo sugerido:* en el detalle de un padre, `evaluacionUsada` del hijo prioritario con
el rótulo «se lee por su hijo prioritario» (como en la lista), y la línea de posición con
`calculado(v.version, 'Posición')` en todo detalle que la muestre; sacar el `continue`
del test o limitarlo a detalles sin posición ni criticidad.

### Consider

**C1. Con `unidad_id` en sub-riesgos y no (o distinto) en su padre, el filtro por unidad
hace desaparecer del ranking a los riesgos de esa unidad.**
`contexts/risk/src/domain/vistas.ts:257` filtra cada fila por su propio `unidadId`, y
`:329` aplica eso a las filas del ranking. La fila de un padre se filtra por la unidad
del padre; sus hijos van dentro de esa fila (`:281`) y no tienen fila propia en el
ranking (no compiten, §1.4). Nada en el esquema ni en el contrato de importación obliga
a que padre e hijos compartan unidad (`0001_risk_schema.sql:104`, `columnas-risks.csv`
línea de `unidad_id`: «asociar el riesgo a una sede o unidad»). Los sub-riesgos de un
padre por sitio son el caso natural de una unidad: los de S05-P01 son «en el edificio en
altura», «en la nave industrial» y «en la obra vial».
*Escenario, sonda en el scratchpad sobre S05 leída de `delcampo_risk_dev`:* con
S05-P01-S02 en `U-NAVE`, S01 y S03 en `U-OBRA` y el padre sin unidad, el filtro
`U-NAVE` da un ranking vacío («Ningún riesgo evaluable compite en esta selección»)
aunque el riesgo número 1 de la organización (S05-P01, Crítica) tiene un sub-riesgo en
esa unidad; `U-OBRA` muestra posiciones 2 a 6 y omite la 1, cuyo hijo prioritario está
en `U-OBRA`. No reordena (la regla 4 se cumple en sentido estricto), pero el filtro
pierde el riesgo más alto de la unidad. Hoy no ocurre con las sintéticas, que no tienen
`unidad_id`; puede ocurrir con las históricas (el contrato cita «casos históricos A1 y
E2»). Opciones: mostrar la fila del padre si él o alguno de sus hijos es de la unidad, o
rechazar en la importación un padre cuyos hijos no comparten su unidad. Cualquiera de las
dos es una decisión de modelo que conviene que tome el owner antes de cargar históricas.

**C2. La denegación de las páginas sólo se prueba por estructura, y la prueba de
estructura no comprueba lo que dice su mensaje.**
El contrato pide «denegación (R-28): sin credencial y con credencial inválida, en cada
página y cada endpoint». `apps/risk/src/lib/deny.test.ts` lo prueba con requests reales
sólo en los endpoints; para las páginas, `:186` exige que el archivo contenga
`const sesion = await requireSession()\n`, con el mensaje «no llama a
requireSession() primero». La regex no mira el orden: una página que leyera datos antes
de esa línea pasaría. Lo mitiga que todas las funciones de vista piden una `Sesion`, así
que el tipo obliga a tener una antes de leer, y comprobé el comportamiento con `curl`
(arriba). Sugerencia: anclar la regex al primer `await` del cuerpo de la función
exportada, o renderizar cada `page.tsx` con `requireSession` sobre un `cookies()` falso
y comprobar el `redirect`.

**C3. La raíz de `@del-campo/risk` ahora exporta funciones que escriben (`importarLote`,
`migrate`), y el lint de la app no distingue lectura de escritura.**
`contexts/risk/src/application/index.ts:67-68` las exporta «para los tests de
integración de la app y T-0032». El límite de R-25 que se agregó para `apps/risk`
(`eslint.config.js`, bloque «apps/risk (T-0030)») permite cualquier cosa que exporte la
raíz, así que una página o un endpoint de la app podría importar un lote o migrar la base
sin que `pnpm lint` falle. Hoy ningún archivo de la app fuera de tests las usa
(`grep` en `apps/risk/src` sin `.test.ts`: cero). El contrato dice «esta tarea sólo lee,
salvo el acceso». Opciones: una subruta de exportación sólo para tests y operación
(p. ej. `@del-campo/risk/operacion`) que el lint prohíba fuera de `*.test.ts`, o una regla
de `no-restricted-imports` por nombre en los archivos no-test de `apps/risk`.

### Noted

**N1. El límite disponible se calcula por cobertura de un riesgo, no por póliza.**
`contexts/risk/src/domain/vistas.ts:547-556` usa sólo los eventos de esa fila de
cobertura. En S36 las cuatro coberturas son de `POL-S36-1` con límite 500000; el único
consumo (1000, en S36-R02) baja el disponible de R02 a 499000 y deja R01, R03 y R06 en
500000. La metodología (§ de vistas, fila «Exposición retenida») habla de «por póliza …
límite original, consumido, disponible»; el contrato de importación ata cada evento a
una cobertura del mismo riesgo (`transferencia_ref`, RV-TRF-04). La vista rotula la regla
(«de los eventos registrados de esta cobertura») y el README lo describe así, de modo que
no engaña; pero si en las históricas un límite es agregado por póliza, el disponible de
las demás filas quedará alto. Es una pregunta para la metodología, no un defecto de esta
tarea.

**N2. El oráculo externo compara exactamente el mínimo que exige.**
`contexts/risk/src/application/vistas.integration.test.ts:172` exige `comparadas >= 10` y
la corrida imprime `10`. Cualquier cambio que saque una organización del grupo «sin filas
de la 15b» hace fallar el test por cantidad y no por posición. No es un error; conviene
saberlo.

**N3. La forma de `C_raw` en el JSON del detalle se comprueba sólo para riesgos del
ranking y no evaluables.** El test de endpoints (`paginas.integration.test.ts:277`)
recorre `lista.ranking`, y `vistas.integration.test.ts` agrega los no evaluables; los
detalles de sub-riesgos, escenarios y miembros sólo se prueban como HTML. Como
`CriticidadDetalle` se arma en un único lugar (`criticidadDe`), el riesgo es bajo.

**N4. Registro de accesos (A8):** comprobé con la app levantada que lista, escenarios y
detalle (página y endpoint) agregan exactamente una fila `vista_resultados` por request,
y que `/`, plan, transferencia y actividad no agregan ninguna; un login válido agrega un
`inicio_sesion`. Plan, transferencia y actividad no muestran banda, posición, techo ni
`C_raw` (contado en el HTML y el JSON de S32), así que no registrarlas es coherente con
la decisión 6.

**N5. R-05 pide el ADR «antes de implementarlo»;** D-0069 y la implementación llegan en el
mismo commit, así que el orden no se puede comprobar desde el diff. El ADR existe, está
`PROVISIONAL` y su `falsified_by` es concreto.

### Dismissed

**D1. «Los cambios a `migrations.ts` e `importar.ts` (Fase 2) rompen a sus
consumidores».** `MIGRATIONS_DIR` pasa de `fileURLToPath(new URL('../../migrations/',
…))` (con barra final) a `join(…, 'migrations')` (sin barra). Sus únicos usos
(`migrations.ts:90,104`, `migrations.test.ts:35-36`) lo pasan por `readdirSync` y
`join`, que no dependen de la barra. `CONTRATO_DIR` sigue siendo una URL con barra final,
y `importar.test.ts` (que compara byte a byte contra el spike) pasa. Los tests de
migraciones y de importación pasan en las dos corridas. Descartado.

**D2. «El login filtra por tiempo si el usuario existe».** Medí 4 rondas de `POST
/api/login` con contraseña incorrecta para un usuario inexistente, uno existente, otro
existente y uno con formato inválido: todos entre 0,108 y 0,137 s salvo un 0,22 s aislado
de un inexistente (ruido; el primero de la serie calcula el hash de relleno). La
implementación calcula scrypt en todos los caminos (`acceso.ts`, `verificarContrasena`).
Descartado.

**D3. «Los límites de `leerHash` permiten un scrypt de 4 GiB por login»**
(`acceso.ts:41-42`: N hasta 2^20 y r hasta 32). Es cierto en teoría, pero el hash sólo
lo escribe el owner con el CLI, que siempre usa N = 2^15, r = 8; un atacante no controla
el hash guardado. Descartado.

**D4. «Hay secretos en el repositorio».** Los únicos son cadenas de test con forma de
secreto (`secreto-de-sesion-de-prueba-…`, `una contraseña de prueba larga`) y hashes de
ceros (`HASH_SINTETICO`), que no corresponden a ninguna contraseña. Mismo patrón que
`apps/communication`. No hay `.env` versionado. Descartado.

**D5. «La cookie de sesión es reutilizable tras la baja».** Lo probé: con una sesión
abierta, `persona baja` hace que el siguiente `GET /api/organizaciones` dé 401 y `/` 307 a
`/login`. El guard compara la credencial de la cookie con la vigente en cada request.
Descartado.

## Conclusión

Un `Act on` (A1: el detalle de un padre incumple las reglas 6 y 7 y el test lo saltea
con una justificación incorrecta), tres `Consider` (filtro por unidad con padres e hijos
en unidades distintas; denegación de páginas sólo estructural; escrituras exportadas a la
app sin límite de lint) y el resto verificado. Las reglas 1 a 5 de RO01 §3, la ausencia
de riesgo neto, el acceso por persona (hash, tiempo constante, cookie firmada, guard,
negación sin configuración, baja y rotación) y los límites de R-25 se comportan como
pide el contrato en lo que pude probar con las 8 sintéticas.
