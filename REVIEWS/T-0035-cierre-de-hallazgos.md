# T-0035: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0035-blind-review.md`, la revisión retrospectiva
de la fase 0 sobre `9451e67`. No es una segunda revisión ciega: la escribe quien implementó.
Los arreglos van en el PR #112, antes de su merge.

## Act on

- **1. Cierre «sin cambio» de la revisión propia. Arreglado en las dos capas.**
  `cerrarSinCambio` rechaza con `TRABAJO_PROPIO` cuando quien cierra es quien abrió la
  revisión pendiente. La migración `0007` agrega `authz_autor_revision` y la misma condición
  en `cierre_revision_cerrar`. La prueba nueva en
  `contexts/risk/src/application/autorizacion.integration.test.ts` («quien abrió una
  revisión pendiente no la cierra…») cubre a la Operadora y al Administrador por el caso de
  uso y por el `insert` directo, y comprueba que otra persona sí la cierra. Con la línea de
  la aplicación quitada, la prueba falla.
  - **Decidido por el owner (2026-11-03):** quien abrió la revisión sí puede cerrarla con la
    reevaluación de otra persona (`cerrarConReevaluacion`), porque lo que se acepta es trabajo
    ajeno. Queda como está.

## Consider

Ninguno se corrige en el #112. El owner decidió (2026-11-03) que el 2, el 3 y el 6 se
corrigen en un PR aparte antes de la fase 4: los corrige la migración `0008` de Risk OS. El
4 y el 5 quedan como condiciones antes de la fase que los activa.

- **2. Orden previo vacío.** La base exige que exista el orden previo, no que cubra los
  riesgos. Sólo se explota con SQL directo como `risk_persona`. **Corregido en `0008`:**
  `authz_ve_resultados` exige que el orden previo cubra cada riesgo y cada padre de la
  organización registrados hasta él, y el Revisor ya no elige `registrado_en`.
- **3. `authz_*` invocables con cualquier argumento.** Dejan ver el rol de cualquier
  persona y el riesgo de una evaluación ajena. Mismo vector: SQL directo como
  `risk_persona`. **Corregido en `0008`:** `authz_rol_de`, `authz_organizaciones_asignadas` y
  `authz_autor_de` dejan de ser ejecutables por `risk_persona`; `authz_riesgo_de` devuelve el
  riesgo sólo si quien consulta lo ve, y las de autor o revisor, el id sólo si es el suyo.
- **4. `legado_risk_app` abierta con `oidc`.** Falta en el plan de migración el paso que la
  retira después de la fase 4.
- **5. `jti` sin registro persistente.** Ya era condición de la primera llamada real entre
  contextos; el revisor agrega que el verificador hoy acepta `registroJti: null`.
- **6. Eventos de auditoría arbitrarios a nombre propio.** Mismo vector que 2 y 3.
  **Corregido en `0008` para Risk OS:** `risk_persona` sólo escribe acciones `riesgo.*`. Una
  persona todavía puede escribir a su nombre un `riesgo.*` que no hizo; lo que ya no puede es
  fingir una acción administrativa o de acceso. Communication OS y Broker OS tienen la misma
  política (`0005:235-236`, `0007:271-272`) y no entran en este cambio.

## Noted

- **Contrato y ADR-0078 sobre acceso universal.** El texto del contrato es del owner; queda
  para que lo ajuste.
- **Recuento de Communication OS.** La evidencia anotaba «fail 1» porque el suite padre de
  los 4 cancelados cuenta como fallido en esa salida; el revisor contó 0 fallas y los
  mismos 4 cancelados. Es el mismo resultado.

## Revisión ciega del PR de `0008`

`REVIEWS/T-0035-0008-blind-review.md`, sobre `5ea8aa5`, antes del merge (D-0052). Sondas en
`REVIEWS/T-0035-0008/`.

- **Act on 1. Importación concurrente con el registro del orden previo. Arreglado.** La
  primera versión de `0008` comparaba `registrado_en` de riesgo y orden previo, que son la
  hora de inicio de cada transacción: una importación que empezaba antes y confirmaba
  después dejaba al Revisor sin resultados para siempre. Ahora no se comparan instantes. Un
  constraint trigger diferido (`orden_previo_cubre_el_material`) rechaza al confirmar un
  orden previo que deje sin ítem algún riesgo o padre ya confirmado, y
  `authz_ve_resultados` acepta un orden previo de una transacción anterior (ya pasó el
  trigger) o, dentro de la propia, uno que cubra lo que esa transacción ve. Sonda con dos
  conexiones reales (`REVIEWS/T-0035-0008/sonda-arreglo-carrera.txt`): con la importación
  confirmando después, el Revisor sigue viendo resultados; confirmando antes, el registro
  falla y el reintento entra.
- **Consider 2. Transacción abierta antes de una importación. Cerrado por el mismo
  arreglo.** En `READ COMMITTED` el Revisor ve el riesgo nuevo y tiene que ordenarlo (en la
  sonda, `ve_sin_ordenar_d = f` y el `commit` falla). Con `REPEATABLE READ` no lo ve y el
  orden cubre su material; el riesgo queda como material posterior, igual que uno importado
  después.
- **Consider 3. `authz_riesgo_de` antes del orden previo. Arreglado.** Devuelve el riesgo
  sólo si quien consulta ve sus resultados; la prueba cubre al Revisor antes y después de
  su orden previo. Los booleanos `authz_ve_*` siguen ejecutables: dicen si un id existe en
  lo que la persona ve, no su contenido. No los cambio.
- **Consider 4. Auditoría.** Arreglado lo barato: el actor tiene que ser el principal, nunca
  `null`. Sigue abierto que una persona escriba a su nombre un `riesgo.*` falso o sobre un
  objeto que no ve: la app arma la acción como `riesgo.<op>`, así que una lista cerrada o
  la visibilidad del objeto en la política son un cambio aparte, si el owner lo quiere.

## Revisión ciega del PR de `0011` (#114)

`REVIEWS/T-0035-0011-blind-review.md`, sobre `1489105`, antes del merge (D-0052). Sondas en
`REVIEWS/T-0035-0011/`.

- **Act on 1. Se perdía la marca «LOTE SINTÉTICO — sin datos de clientes». Arreglado.**
  La marca vivía sólo en `notes`, así que el despliegue de Preview dejaba de mostrarla.
  Ahora VS01 reconoce el lote sintético por su huella fija (`MANIFIESTO_SINTETICO`, la
  misma que escribe `scripts/vs01/seed-sintetico.mjs`) y la cabecera vuelve a decirlo, sin
  leer `notes`. `packages/api/src/vs01/batch.test.ts` prueba la etiqueta con y sin la marca
  y que el seed escribe esa huella y esa marca. `docs/despliegue/vercel-vs01.md` vuelve a
  ser cierto sin cambios.
- **Act on 2. La checklist suponía el mismo proyecto de Google Cloud para el cliente
  Internal y la pantalla External. Arreglado en la checklist y en el plan.** Los clientes
  External van en un proyecto nuevo y el del Internal no se toca. Queda marcado para
  confirmarlo en la consola, porque no se probó contra Google.
- **Consider 3. Instant Rollback con `oidc` y la 0011 aplicada.** Anotado en la vuelta
  atrás de la fase 2: se vuelve con `AUTH_MODE=legacy`, no con un despliegue anterior.
- **Consider 4. Ninguna prueba ejercitaba la consulta del lote. Arreglado.** La consulta
  sale a `leerLote`, que usan `latestBatch` y la prueba de `datos.integration.test.ts`; si
  alguien vuelve a pedir `notes`, esa prueba falla en `oidc`.
- **Consider 5. La checklist pedía anotar un nombre. Arreglado:** se acuerda fuera del
  repositorio y la evidencia anota sólo el rol.
- **Consider 6. Las credenciales del Internal se reemplazan en la fase 2. Arreglado en el
  plan y en la checklist:** se guardan antes, fuera del repositorio, y la vuelta atrás de
  la fase 2 las restituye.

## Revisión ciega del PR de `0009` (#116)

`REVIEWS/T-0035-0009-blind-review.md`, sobre `d168235`, antes del merge (D-0052). Sondas en
`REVIEWS/T-0035-0009/`.

- **Act on 1. Una restauración con `--no-privileges` abría las `admision_*` a PUBLIC y
  `db:verificar-oidc` decía «cumple». Arreglado.** `rol-oidc.sql` hace `revoke … from public`
  de las tres antes de darlas a `risk_oidc`. `verificar-oidc` agrega cuatro puntos: ninguna
  SECURITY DEFINER de `risk` para PUBLIC, ninguna otra ejecutable por `risk_oidc`,
  `risk_persona` con USAGE y lectura (si no, `oidc` niega todo) y sólo las columnas del evento
  en la auditoría. `vercel-risk.md` §8 restaura **con** privilegios, después de crear los
  roles, y explica por qué `--no-privileges` ya no sirve desde la 0006; probado con
  `pg_dump`/`pg_restore` a una base descartable. La prueba «después de una restauración con
  --no-privileges…» de `camino-oidc.integration.test.ts` reproduce el estado y comprueba las
  dos cosas.
- **Consider 2. `risk_oidc` podía elegir `id` y `ocurrido_en`. Arreglado.** El grant es por
  columna, sin esas dos, en la 0009 y en `rol-oidc.sql`; la prueba de rechazos intenta
  `overriding system value` y una fecha propia y recibe 42501.
- **Consider 3. La base comparaba el email de la invitación consigo mismo. Arreglado.**
  `ingresar` pasa el email normalizado de la identidad que entra.
- **Consider 4. Si `drop role` fallaba, la reversa dejaba a `risk_oidc` con LOGIN y miembro
  de `risk_persona`. Arreglado:** antes del `drop`, la reversa le saca la membresía y el
  LOGIN, y el aviso lo dice. Además vuelve a dar `risk_persona` a `risk_app` sólo donde
  `risk_app` puede entrar, que es donde el `rol-app.sql` anterior se la había dado.
- **Consider 5. `verificar-oidc` sólo miraba tablas y las `admision_*`. Arreglado:** mira
  tablas, vistas, materializadas, foráneas y particionadas, grants por columna, toda SECURITY
  DEFINER de `risk` y que la membresía en `risk_persona` tenga SET. La prueba de la
  restauración crea una vista para PUBLIC y la detecta.
- **Consider 6. La etapa C no tenía pasos ni observación. Arreglado en el procedimiento:**
  pasos, prueba de la CLI contra una copia, catorce días de observación con sus criterios y
  vuelta atrás. La decisión sobre el rol de la CLI queda en la tabla de pendientes como
  condición para cerrar la fase 5. La observación de la etapa A pasa a usar los logs de
  conexión de Postgres en vez de una foto de `pg_stat_activity`.
- **Noted.** Que la admisión no protege contra la credencial de `risk_oidc` filtrada (puede
  declararse cualquier principal) es el modelo de D-0022 y queda así. El recuento de 819 contra
  820 es por `--test-force-exit` en `deny.test.ts` (ver más arriba); sin esa opción son 142 y
  estables.

