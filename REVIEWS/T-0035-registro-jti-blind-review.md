# T-0035: revisión ciega del PR del registro persistente de `jti` (R-33, D-0048, D-0052)

- **Base revisada:** worktree aislado en HEAD `d6e0e62` («T-0035: registro persistente de jti
  en Postgres (Risk OS 0009, Communication OS 0006)»), rama `task/T-0035-registro-jti`, contra
  `main` en `c82a7da`. 24 archivos, +590/−24: las migraciones
  `contexts/risk/migrations/0009_registro_jti.sql` y
  `contexts/communication/migrations/0006_registro_jti.sql` con sus reversas;
  `persistence/jti.ts` en cada contexto con su prueba de integración; el cambio de firma de
  `RegistroJti` en `packages/identidad/src/token.ts` (`UsoJti`, `JTI_LARGO_MAXIMO`); la guarda
  `registroJti === null` en `apps/{risk,communication}/src/lib/entre-contextos.ts`; pruebas
  nuevas en los `acceso.integration.test.ts` de las dos apps, listas de tablas y fixtures; y
  `ops/evidence/T-0035.md`.
- **Contrato:** el de `main` (`contrato-desde-main.md`).
- **Criterio de aceptación del owner:** registro compartido por todas las instancias del
  destino, unicidad atómica del `jti`, vencimiento y pruebas de reutilización concurrente,
  sobre la base PostgreSQL existente.
- **Leído por mi cuenta, en este orden:** el contrato, `ENGINEERING_RULES.md` R-33 (§9) y
  `REVIEWS/T-0035-0008-blind-review.md` como modelo de formato; mientras corría la
  verificación, el diff sin la evidencia y `packages/identidad/src/token.ts` entero;
  `apps/risk/src/lib/entre-contextos.ts` y la sección del token de
  `apps/risk/src/lib/acceso.integration.test.ts`; `contexts/risk/deploy/rol-app.sql` y
  `contexts/risk/src/persistence/{migrations,testing,database,verificacion}.ts`;
  `contexts/communication/src/persistence/database.ts` y las menciones de `communication_app`
  en la migración 0005; D-0077, sección «Entre contextos»; búsquedas de `jti`, `iss` y
  `broker-os` en D-0022, `decisions.yaml`, `docs/migration/T-0035-identidad-comun.md` y
  `SLICES/`. `ops/evidence/T-0035.md` (el hunk del diff), **al final**, a las 11:46 UTC del
  2026-11-04, después de cerrar todas las sondas.
- **Orden:** `pnpm check` completo antes de leer el diff; después el diff contra el contrato y
  el alcance del owner, sondas propias contra Postgres y recién entonces la evidencia.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:** ninguno persistente. Bases descartables `revision_t0035_jti` y
  `revision_t0035_jti_comm`, creadas y borradas; las transacciones con `rol-app.sql` aplicado
  se revirtieron; el worktree quedó limpio. Datos sintéticos. Sin commits, push ni
  publicaciones. El entorno no dejó al subagente escribir este archivo: lo versionó quien
  implementó, con el texto del reporte sin cambios de contenido.

## Verificación ejecutada antes de leer el diff

Node v24.22.2, Postgres 16.15 local (CI usa 17),
`DATABASE_URL=postgres://postgres:postgres@localhost:5432/delcampo_test`.

```text
$ pnpm check   # check-docs && check-agent-run && scripts/tests && typecheck && lint && test
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
ℹ tests 177 · pass 177 · fail 0                       (scripts/tests)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
$ eslint .
ℹ tests 1458 · suites 230 · pass 1458 · fail 0 · cancelled 0 · skipped 0
EXIT 0
```

**Reversa de Risk OS (sonda R1):** `migrate` hasta 0009, `down` y `migrate` otra vez. Después
del `down`, `to_regclass('risk.jti_aceptado')` es `null`; ACL, políticas y funciones quedan
idénticas tras el ciclo.

**Reversa de Communication OS (sonda C1):** mismo ciclo; `jti_aceptado_solo_insercion()`
desaparece con la reversa; tablas, ACL, políticas, funciones y `pg_default_acl` idénticas tras
up→down→up.

## Lo que comprobé y quedó bien

- **Unicidad atómica y compartida (R5):** 50 `registrar` simultáneos del mismo (emisor, jti)
  desde dos clientes `postgres` distintos de 10 conexiones cada uno: exactamente uno `true`.
- **Privilegios (R2b, R2c, R3, C2, C3):** con `rol-app.sql` en una transacción revertida,
  `risk_app` inserta y lee, y recibe 42501 en update, delete y truncate y «must be owner» en
  disable trigger; `risk_persona` y `communication_app` reciben 42501 en select e insert; el
  dueño recibe 23001 en delete y truncate en los dos contextos.
- **Tipos y zona (R4):** `vence_en` es `timestamptz`; con otra zona de sesión el epoch sigue
  siendo `exp`, y un `exp` fraccionario se guarda bien.
- **Largo del `jti`:** 128 unidades UTF-16 son siempre 128 caracteres o menos para `length()`.
- **Clave por emisor:** `UsoJti.emisor` sale de `verificacion.emisor`, el `iss` ya validado por
  `jose`, no del token sin verificar.
- **Vencimiento:** como la tabla no se purga, un token dentro de los 5 s de tolerancia después
  de su `exp` sigue chocando con su fila.

## Hallazgos

### Act on

**1. Sin `legado_risk_app`, `risk_app` no puede registrar ningún `jti`.** *(sonda, PG 16)*
`contexts/risk/migrations/0009_registro_jti.sql:46-50` junto con
`contexts/risk/src/persistence/jti.ts:35` (`on conflict (emisor, jti) do nothing`). Un
`INSERT … ON CONFLICT` con columnas de conflicto exige que la fila nueva pase también las
políticas SELECT del rol, y la única de `risk_app` en `jti_aceptado` es `legado_risk_app`. Al
retirarla en la fase 4, como dice el comentario, cada token válido daría 42501 y
`admitirLlamada` un 500. Sonda `sonda-r2.sql` (`rol-app.sql`, `drop policy legado_risk_app`,
`set local role risk_app`):

```text
insert … values (…)                                → INSERT 0 1
insert … on conflict do nothing                    → INSERT 0 1
insert … on conflict (emisor, jti) do nothing      → ERROR: new row violates row-level security policy for table "jti_aceptado"
+ create policy … for select to risk_app using (true):
on conflict (emisor, jti) do nothing  (dos veces)  → INSERT 0 1 / INSERT 0 0
```

Las pruebas no lo ven porque corren con `legado_risk_app` presente. Arreglo posible: política
SELECT propia, u `on conflict do nothing` sin columnas, con una prueba sin `legado_risk_app` y
el comentario corregido.

### Consider

**2. La exigencia de «registro compartido» se reduce a «no nulo».** La guarda sólo mira
`=== null`; `registroJtiPostgres` acepta `TransactionSql`; la prueba de la app de Risk OS usa
`registroJtiPostgres(e.tx)`. Con la transacción del pedido, una acción revertida libera el
`jti` (sonda R6: `true`) y otra instancia con el mismo token queda bloqueada toda la acción
(sonda R7: 1515 ms con una acción de 1,5 s). La prueba «dos instancias» de Risk OS corre en la
misma transacción y conexión. Sugerencia: que `registroJtiPostgres` reciba sólo el pool y la
prueba de la app pase al pool.

**3. El check del emisor no coincide con lo que acepta el verificador.** La base exige
`'^[a-z][a-z0-9-]{1,40}$'` y `Verificacion.emisor` es un `string` sin forma: un `iss` con forma
de URL o de una letra termina en 23514 y `verificarToken`, que promete no lanzar por un token,
lanza. Sugerencia: validar la forma del emisor al verificar con la misma expresión.

**4. El vencimiento quedó como dato guardado, no como vencimiento del registro.** Para
seguridad alcanza, pero la tabla crece una fila por llamada y el trigger impide purgar sin
migración. Conviene que el owner confirme que «vencimiento» no pedía purga.

### Noted

1. Un `jti` con NUL hace fallar el insert (22021) y el verificador lanza en vez de `CLAIMS`;
   dos `jti` con surrogates sueltos distintos se guardan iguales. Exige un emisor de confianza.
2. `risk_app` lee todos los `jti` aceptados; son `jti` ya consumidos.
3. El registro en memoria purga con `vence < ahora` mientras `jose` acepta hasta `exp + 5`: el
   mismo token se acepta otra vez a `AHORA + 62`. Viene de `main`; sólo se usa en pruebas.
4. En Communication OS el dueño puede desactivar el trigger, igual que en `audit_event`.
5. La reversa borra los `jti` aceptados; irrelevante sin llamadas reales.
6. Todas las sondas corrieron en Postgres 16.15, no en 17.

### Dismissed

1. **Concurrencia a través de `verificarToken`:** hay una sola llamada a `registrar` y la
   atomicidad depende sólo del insert, cubierta por las pruebas y la sonda R5.
2. **El `jti` se quema aunque la admisión deniegue:** es lo correcto, el token ya se usó.
3. **Un `exp` extremo rompe `new Date`:** acotado por `exp − iat ≤ 120` e `iat ≤ ahora + 5`.
4. **La tabla de Communication OS no tiene políticas:** es lo más cerrado, como `audit_event`.
5. **`risk_app` sin grants en producción:** `rol-app.sql` tiene `alter default privileges` y se
   vuelve a correr después de migrar.

## Evidencia (leída al final) contra lo comprobado

Coincide en la tabla, las carreras, la ráfaga, el pool, el rol restringido, `VENCIDO` y
`rol-app.sql`. Exagera «dos instancias con registros distintos» (en Risk OS era la misma
transacción) y «`admitirLlamada` no acepta llamadas sin él» (sólo rechaza `null`). Omite que
retirar `legado_risk_app` rompe el registro.

## Veredicto

Un Act on, latente: hoy no cambia producción. El resto del alcance del owner está cumplido y
verificado.

---

## Cierre de hallazgos (quien implementó)

- **Act on 1 — corregido.** `registrarJti` usa `on conflict do nothing` sin columnas (la clave
  primaria es la única restricción única). El comentario de 0009 dice por qué alcanza la
  política propia, y una prueba nueva en `contexts/risk/src/persistence/jti.integration.test.ts`
  registra como `risk_app` después de `drop policy legado_risk_app`.
- **Consider 2 — corregido.** `registroJtiPostgres` recibe sólo `Sql` y lanza si se le pasa una
  transacción (tiene `savepoint`); la sentencia queda en `registrarJti`, que usan las pruebas de
  permisos dentro de una transacción. Las pruebas de las dos apps usan dos pools distintos sobre
  la misma base como dos instancias. La guarda de `admitirLlamada` sigue siendo contra `null`:
  el tipo no distingue el registro en memoria, y el de Postgres ya no se puede construir mal.
- **Consider 3 — corregido.** `FORMATO_CONTEXTO` en `@del-campo/identidad`, el mismo de la
  columna: `emitirToken` y `verificarToken` lanzan con un emisor fuera de formato, como error de
  configuración, antes de llegar a la base.
- **Consider 4 — resuelto por el owner (2026-11-04): purgar.** `registrar_jti`, en Risk OS (0010)
  y en Communication OS (0006), borra después de cada registro los `jti` vencidos hace más de
  10 minutos, con un índice por `vence_en`. La tabla deja de tener el trigger de sólo inserción
  y sólo la función borra: ni `risk_app`, ni `risk_oidc`, ni `communication_app` tienen DELETE.
- **Noted 1 — corregido.** El verificador exige un `jti` de ASCII visible, hasta 128: NUL,
  surrogates, espacios y no ASCII son `CLAIMS`.
- **Noted 3 — corregido.** El registro en memoria olvida un `jti` recién pasada la tolerancia.
- **Noted 2, 4, 5 y 6:** sin cambios. CI corre Postgres 17.

Después de las correcciones, `pnpm check` local: 177 y 1463 pruebas, sin fallas.

## Después del merge de #116 (2026-11-04)

#116 llevó a `main` la migración 0009 de Risk OS (`camino_oidc`), con el rol de conexión
`risk_oidc`, que no tiene privilegios sobre ninguna tabla. Para no chocar, la migración de este
PR pasa a ser **0010** (`0010_registro_jti.sql`): el reporte de arriba la nombra 0009 porque
revisó el commit anterior. Y como en el modo `oidc` las llamadas entre contextos corren con
`risk_oidc`, el registro dejó de insertar en la tabla con la conexión: ahora llama a
`risk.registrar_jti`, SECURITY DEFINER con search_path vacío y EXECUTE sólo para `risk_oidc`,
igual que las funciones de admisión de 0009. Sin la política propia de inserción de
`risk_app` (el modo `legacy` no recibe tokens), `verificar-oidc` acepta y exige esa función, y
`rol-oidc.sql` le vuelve a sacar EXECUTE a PUBLIC. El Act on 1 queda cerrado de otra forma: la
función corre como dueña y no depende de ninguna política. `pnpm check` local: 177 y 1479
pruebas, sin fallas.
