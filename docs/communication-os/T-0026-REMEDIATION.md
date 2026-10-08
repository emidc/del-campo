# T-0026 — Remediación de la revisión fría de Communication OS

- **Workstream:** BOS · **Fecha:** 2026-10-07 · **Tarea:** T-0026 (`READY`, `riskClass: HIGH`)
- **Rama:** `claude/brave-ride-2k3oww`, sobre `341364f` (revisión fría). Base de
  comparación: `main` en `4a33102`.
- **Quién:** una sesión que no hizo el endurecimiento (`afa9db7`) ni la revisión fría
  (`9c55f22`). Los dos informes se trataron como evidencia, no como autoridad: cada
  hallazgo que motivó un cambio se reprodujo antes de tocar código (§2).
- **Aislamiento:** no se leyó nada de `v0/fase-8/`, `v0/fase-9/` ni material de Risk OS.
- **Qué no se hizo:** nada contra producción, Meta, Vercel ni Supabase hosteado; ninguna
  credencial real; ningún cambio a D-0065, `decisions.yaml` ni a las secciones del
  contrato de T-0026; ningún PR.

---

## 1. Línea de base de la revisión fría

Veredicto **B — READY WITH FIXES** (`T-0026-COLD-REVIEW.md` §1). La arquitectura de
recuperación (crudo en autocommit antes del 200, contenido y estado de la entrega en una
transacción, unicidad por `wamid`, reproceso con `for update skip locked` y savepoint)
resistió los experimentos de concurrencia. Lo que esta remediación ataca:

| Hallazgo | Revisión fría | Severidad |
|---|---|---|
| S9b · `WHATSAPP_PHONE_NUMBER_ID` equivocado: todo queda `processed` sin contenido, la UI sana, el reproceso ciego y la retención lo borra | §5, §8, §10 | pérdida silenciosa |
| S-HOL · un lock retenido por otra sesión traba el lote del reproceso sin límite, y el rollback borra el intento | §3, §6.2 | progreso bloqueado |
| M04 · ningún test produce una falla real de base en el procesamiento inicial | §12 | test faltante |
| M30 · el job de reproceso sin número no tiene test | §12 | test faltante |
| M32 · comparar `CRON_SECRET` por prefijo deja la suite verde | §9, §12 | test faltante |
| Sin `vercel.json`: retención y reproceso no están programados | §1, §16.2 | operativo |
| Retención de no procesadas contra la letra de D-0065 | §7 | gobierno (owner) |

## 2. Hallazgos reproducidos antes de cambiar código

Postgres 16.15 local, Node 24.21.0. Script de reproducción en el scratchpad de la sesión
(no versionado); resultados transcriptos.

1. **S9b, reproducido.** Receptor con `phoneNumberId = '800000000000999'` y tres entregas
   del número `800000000000001`:
   - `webhook_delivery`: 3 × `processed`, `processing_error = null`; `message`: 0 filas;
   - salud: `failed: 0, stalled: 0`, `lastProcessedAt` reciente;
   - `reprocessDeliveries` con el número correcto: `deliveries: []`;
   - `applyRetention` a +31 días: `deliveries: 3, unprocessedKept: 0`.
2. **S-HOL, reproducido.** Dos entregas `failed` (`HELD`, `FREE`). Otra conexión, en su
   propio pool, inserta `HELD` en `message` sin confirmar. El reproceso no terminó en 8 s;
   mientras tanto las dos filas seguían `failed` con `reprocess_count = 0` (el `FREE`
   tampoco avanzó). Recién al hacer rollback la otra sesión, terminó (8018 ms).
3. **M04, reproducido como sobreviviente** (campaña de §11): marcar `processed` antes de
   la transacción deja 176/176 en verde.
4. **M30, reproducido como sobreviviente:** quitar el 503 del job y llamar al reproceso
   sin número deja 176/176 en verde. La variante "el reproceso no pasa el filtro a
   `parseDelivery`" (la M09 de la revisión fría) ya moría en la línea de base.
5. **M32, reproducido como sobreviviente:** `!secret.startsWith(given)` deja 176/176 en
   verde. La variante sufijo (`given.startsWith(secret)`) moría, por el test "otro
   secreto", que en realidad es el secreto más un sufijo.

Ningún hallazgo quedó desmentido por el repositorio. Una precisión: el código de
`CRON_SECRET` ya era correcto (SHA-256 de ambos y `timingSafeEqual`, es decir, igualdad
exacta); lo que faltaba era el test. No se cambió la comparación.

## 3. Cambios implementados

| Archivo | Cambio |
|---|---|
| `contexts/communication/migrations/0004_delivery_phone_filter.sql` (+ `down/`) | Estado `ignored`; columnas `applied_count`, `ignored_count`, `phone_number_filter`; check de coherencia de `ignored`. La reversa pasa las `ignored` a `failed` con motivo, no a `processed`. |
| `domain/payload.ts` | `normalizePhoneNumberId` (trim + `^\d{1,32}$`), `appliedCount`, `deliveryOutcome`. |
| `domain/reprocessing.ts` | `IGNORED_ALERT_WINDOW_MS` (24 h) e `ignoredSince`. |
| `persistence/store.ts` | `LOCK_TIMEOUT = '5s'` y `boundLockWaits` (`set local lock_timeout`) en el procesamiento inicial y en el reproceso; `applyDelivery` registra resultado, conteos y número; el reproceso toma también las `ignored` filtradas contra otro número; retención borra `processed` e `ignored` y cuenta las `ignored`; la salud cuenta las `ignored` de 24 h. |
| `application/webhook.ts` | `phoneNumberId` obligatorio y normalizado; se pasa al store. |
| `application/reprocess.ts` | `phoneNumberId` obligatorio y normalizado (lanza si no sirve); `boundLockWaits`; resultado `ignored`. |
| `application/operations.ts`, `conversations.ts`, `index.ts` | `ignoredDeleted` en la retención; `ignored` en la salud; exporta `normalizePhoneNumberId`. |
| `apps/communication/src/app/webhook/route.ts`, `lib/jobs.ts` | Normalizan la variable; sin forma de `phone_number_id`, 503. El log del job informa `ignored` e `ignoredDeleted`. |
| `apps/communication/src/lib/delivery-alerts.ts`, `_cliente/polling.tsx`, `lib/handlers.ts` | Condición de alerta como función pura; segunda alerta para las `ignored`. |
| `apps/communication/vercel.json` | Reproceso y retención diarios (§9). |
| Tests | `reprocess.integration.test.ts` (reescrito, conserva los anteriores), `jobs.test.ts`, `delivery-alerts.test.ts`, `migrations.integration.test.ts`; el resto solo pasa el número, ahora obligatorio. |

No se cambió el envío (`cloudApiConfigFromEnv`): ya rechaza un número no numérico y ese
error se ve en la UI ("el envío no está configurado"), así que no es pérdida silenciosa.

## 4. Semántica del filtro por número

**Estados de `webhook_delivery`** (un solo `update`, en la misma transacción que el
contenido):

| Estado | Condición | `applied_count` | `ignored_count` | Se reprocesa | Retención | UI |
|---|---|---|---|---|---|---|
| `processed` con contenido | sin descartes, ≥ 1 escrito | > 0 | ≥ 0 (mixta) | no | 30 días | — |
| `processed` sin nada que guardar (campo que no es `messages`, cambio vacío) | sin descartes, nada escrito, nada ajeno | 0 | 0 | no | 30 días | — |
| `ignored` | sin descartes, nada escrito, ≥ 1 de otro número | 0 | > 0 | **solo si `phone_number_filter` ≠ número configurado ahora** | 30 días, contadas en `ignoredDeleted` | alerta 24 h |
| `failed` | descartes, o una excepción | lo escrito | — | siempre | se conserva | alerta |
| `pending` | todavía sin resultado | 0 | 0 | si lleva ≥ 15 min | se conserva | alerta a los 15 min |

Los tipos fuera de alcance (`unsupported_message`) cuentan como escritos: dejan su
marcador en el hilo. Lo "irrelevante" es la fila `processed` con `applied_count = 0` e
`ignored_count = 0`.

**Por qué `ignored` y no `failed`.** Un `failed` alerta para siempre, se reintenta en
cada corrida y nunca se borra; con el número bien configurado, el tráfico legítimo de
otro número de la WABA (el de prueba de Meta) quedaría así, con datos personales ajenos
conservados sin límite. `ignored` es visible (alerta), recuperable (el reproceso la toma
cuando el número cambia) y no gira sin fin con la configuración correcta.

**Por qué guardar el número del filtro.** Es lo que permite al reproceso distinguir "se
ignoró con la configuración de ahora" (resuelta: no hay nada que hacer) de "se ignoró con
otra configuración" (hay que volver a evaluarla). El `phone_number_id` es de Del Campo, no
del participante.

**Validación de la variable.** Se recorta el espacio alrededor (pegarla en Vercel suele
dejar un salto de línea; recortar no cambia el valor intencional) y se exige `^\d{1,32}$`.
Rechaza vacío, espacios, el número visible con `+`, guiones o espacios internos, y
letras. **No prueba que el id sea del número de la WABA**: un id de 15 dígitos de otro
número, o el número visible escrito solo con dígitos, pasa. Eso solo se comprueba contra
Meta (§12) y, en operación, con la alerta `ignored` al primer mensaje.

**Mismo efecto inicial y por reproceso.** Los dos caminos llaman a `parseDelivery` con
el mismo `{ phoneNumberId }` normalizado y a `applyDelivery` con el mismo número; el
resultado sale de `deliveryOutcome`. Lo prueba "una entrega deja el mismo efecto
procesada al recibirla que reprocesada": cuatro entregas (mixta, ajena, fuera de alcance,
estado) procesadas al recibirlas y, en otra pasada, fallidas y reprocesadas, dejan
idénticos `message`, `unsupported_message`, `outbound_status` y estado y conteos de cada
entrega.

**Respuesta a S9b, en la práctica.** Con el número mal configurado, la primera entrega
queda `ignored` y la UI muestra "N entrega(s) de las últimas 24 h traían solo mensajes de
otro número…". `lastProcessedAt` no avanza. Corregida la variable, el reproceso siguiente
las procesa (una vez: el test corre otra pasada y siguen 3 mensajes). Si nadie corrige la
variable en 30 días, la retención las borra **contándolas** en `ignoredDeleted` (y en el
log): la pérdida deja de ser silenciosa, pero sigue siendo posible; ver §10.

## 5. Locks y progreso del lote

**Dónde está el bloqueo de S-HOL.** No en la fila de la entrega (esa la toma
`for update skip locked`, que nunca espera), sino en el contenido: `insert … on conflict
(wamid) do nothing` espera el resultado de otra transacción que insertó el mismo `wamid`
sin confirmar, y `applyStatus` espera el `for update` de un `outbound_status`. `SKIP
LOCKED` no se puede aplicar a un insert con conflicto de unicidad, así que no resuelve
esto.

**Estrategia elegida: `set local lock_timeout = '5s'`** como primera sentencia de cada
transacción de procesamiento (inicial y reproceso). Encaja en la semántica que ya existía:

- En el reproceso, la espera vence dentro del savepoint; Postgres cancela la sentencia,
  se vuelve al savepoint y `markDeliveryFailed` corre en la misma transacción, con la
  fila todavía bloqueada. Resultado: `failed`, con el error y **con el intento contado**
  (`reprocess_count + 1`, `last_reprocessed_at = now()`), y el lote sigue con la
  siguiente.
- En el procesamiento inicial, la espera vence, la transacción hace rollback y `store.fail`
  la marca `failed`: visible y reprocesable, en lugar de quedar colgada hasta que Vercel
  mate la función.
- `set local` dura lo que la transacción: no se filtra a otras sesiones del pooler en
  modo transacción.

| Propiedad | Antes | Ahora |
|---|---|---|
| Progreso del lote | una fila retenida traba todas las siguientes sin límite | cada fila retenida cuesta a lo sumo ~5 s; las demás se procesan |
| Inanición | la fila trabada quedaba primera (`nulls first`) y trababa también la corrida siguiente, porque el rollback deshacía el intento | el intento queda contado: la fila rota al final por `last_reprocessed_at`; con lugar limitado, primero van las nunca reprocesadas |
| Equidad | — | sin cambios: orden por `last_reprocessed_at nulls first, id` |
| Filas envenenadas | se reintentan siempre | igual, y una que siempre espera un lock es una envenenada más: `failed`, contada y a la vista |
| Reintento | ninguno hasta liberar el lock | la corrida siguiente la vuelve a tomar; si el lock ya se liberó, se procesa |
| Observabilidad | nada (el rollback borraba el rastro) | `processing_error` con el mensaje de Postgres ("canceling statement due to lock timeout"), `reprocess_count`, alerta `failed` en la UI |

**Peor caso de duración.** Un lote de 100 con todas las filas retenidas tarda ~500 s, más
que una función de Vercel. Si la función muere, lo confirmado queda (cada entrega es su
propia transacción) y la fila en curso hace rollback; la corrida siguiente sigue. Exige
100 transacciones ajenas abiertas a la vez sobre los mismos `wamid`: no se mitiga más.

**No se agregó `statement_timeout`.** La revisión fría lo sugería junto con
`lock_timeout`, pero no demostró ninguna sentencia lenta sin lock. Queda la comprobación
de producción de `show statement_timeout` (§12).

**Alternativas descartadas.** `nowait` (equivale a `lock_timeout = 0`: falla ante
cualquier contención breve, por ejemplo dos copias de Meta en paralelo, y llenaría la UI
de `failed` transitorias); advisory locks, colas o workers (infraestructura nueva).

**Tests con conexiones independientes** (`postgres()` propio, `reserve()` y `begin`):

- "no traba el lote…": la otra sesión retiene `HOL-RETENIDO`; el reproceso termina dentro
  de 20 s con `['failed', 'processed']`, la retenida con `reprocess_count = 1` y error;
  liberado el lock, la corrida siguiente la procesa y quedan 2 mensajes.
- "si la otra sesión confirma el mismo wamid…": el reproceso posterior no duplica (1
  mensaje).
- "una entrega bloqueada por otro reproceso se saltea…": `for update` ajeno sobre la fila
  de la entrega → `skipped`, sigue `failed` con `reprocess_count = 0` y entra en la
  corrida siguiente.
- "el procesamiento inicial tampoco espera sin tope…": receptor real con el `wamid`
  retenido → `failed` en < 20 s; reproceso posterior → 1 mensaje.
- "tres reprocesos en pools independientes…": 12 entregas con 6 `wamid` repetidos, 3
  pools en paralelo → 12 `processed`, 6 mensajes, `reprocess_count = 1` en todas.

`within(20 s)` convierte una espera sin tope en un fallo en vez de un test colgado.

## 6. M04: falla real de la base en el procesamiento inicial

Test "el receptor real deja la entrega failed sin escritos a medias, y el reproceso deja
un solo mensaje" (`reprocess.integration.test.ts`). Sin mocks: `deliveryStore(sql)` real
y un trigger `before insert` en `communication.message` que rechaza el **segundo** `wamid`
de la entrega, después de que el primero ya se insertó dentro de la misma transacción.
Comprueba:

- respuesta 200 y crudo guardado idéntico al cuerpo (recuperable);
- 0 mensajes: el rollback deshizo también el primero (sin escritos parciales);
- entrega `failed`, `processing_error = 'rechazado por el test'`, `reprocess_count = 0`;
  salud `failed: 1`, `lastProcessedAt: null`;
- con la causa todavía presente, el reproceso falla otra vez sin escribir nada;
- quitado el trigger, el reproceso la procesa; Meta reenvía la misma entrega y otra
  corrida no tiene nada que hacer; quedan exactamente los 2 `wamid`, uno por fila.

## 7. M30: el reproceso aplica el mismo filtro

- **Estructural:** `ReprocessOptions.phoneNumberId` y `WebhookConfig.phoneNumberId` son
  obligatorios en el tipo, y `reprocessDeliveries` / `createWebhookHandler` lanzan si el
  valor no tiene forma de `phone_number_id`. La rama "sin filtro" que la revisión fría
  marcaba como permisiva por omisión (§8, `reprocessDeliveries` como biblioteca) ya no
  existe.
- **Contexto, con la base:** "el reproceso aplica el mismo filtro: de una entrega mixta
  guarda solo lo propio (M30)". Una entrega con un cambio del número propio y otro de otro
  número, más una solo ajena, fallan al recibirlas; el reproceso deja solo
  `wamid.SYNTH-RP-PROPIO` en `message`, y las entregas `processed (1 escrito, 1 ignorado)`
  e `ignored (0, 1)`. Si el reproceso dejara de filtrar, aparecería el mensaje ajeno.
- **Job:** `jobs.test.ts` — sin la variable, vacía, con espacios, con `+` o con letras:
  503 sin tocar la base (un `Sql` que lanza si se lo usa); con un número válido rodeado de
  espacios, llega a la base.

## 8. M32: seguridad de `CRON_SECRET`

Transporte: solo `Authorization: Bearer <secreto>`, que es lo que manda Vercel Cron. La
comparación se mantiene (SHA-256 de ambos + `timingSafeEqual`): es igualdad exacta, y el
hash iguala largos para que `timingSafeEqual` no lance. No se agregó nada criptográfico
nuevo; el tiempo constante ya estaba y no se toca.

`jobs.test.ts`, contra `withJobSecret` con un handler que registra si corrió:

- el secreto exacto: 200 y la tarea corre;
- 401 sin correr la tarea: un prefijo, la primera letra, el secreto más un sufijo, el
  último carácter cambiado, en mayúsculas, repetido, con un espacio en el medio, `Bearer `
  vacío, `Bearer` sin valor, esquema `bearer` en minúsculas, `Basic`, otro header, sin
  header, y el secreto en el query string;
- `CRON_SECRET` vacío o ausente: 503, también con `Bearer ` vacío.

`deny.test.ts` sigue cubriendo los route handlers reales y el test de estructura (todo
handler de `api/jobs/` pasa por `withJobSecret`).

**Logging.** Ningún camino loguea headers ni el secreto: `jobDenial` devuelve cuerpos
fijos, y las líneas de log de las tareas solo llevan conteos e ids.

## 9. Programación de las tareas

`apps/communication/vercel.json` (el directorio raíz del proyecto de Vercel, como
`apps/web/vercel.json` en VS01):

```json
{ "crons": [
  { "path": "/api/jobs/reprocess", "schedule": "0 10 * * *" },
  { "path": "/api/jobs/retention", "schedule": "0 6 * * *" } ] }
```

- **Por qué diario.** Según la documentación pública de Vercel (consultada el
  2026-10-07, sin acceder a ninguna cuenta), Hobby solo admite cron diarios y **falla el
  deploy** con una expresión más frecuente; además dispara con precisión de hora (± 59
  min). El plan del proyecto de Communication OS no está decidido (T-0026 deja la
  contratación al owner; D-0062 cubre solo VS01). Un cron diario corre en cualquier plan,
  así que es lo único que se puede versionar sin asumir un plan pago.
- **Horas (UTC).** Retención 06:00 (03:00 en Mendoza). Reproceso 10:00 (07:00 en
  Mendoza), antes de la revisión diaria de la prueba.
- **Lo que queda del owner.** Con reproceso diario, una `failed` o una atascada puede
  esperar hasta 24 h, y la UI la muestra mientras tanto. Para la prueba de 72 h hay dos
  alternativas, a decidir por el owner:
  1. **Hobby (o sin decidir):** dejar `vercel.json` como está y correr el reproceso a
     pedido cuando la UI muestre atraso:
     `curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/jobs/reprocess`.
  2. **Pro (contratado por el owner):** cambiar el reproceso a `"0 * * * *"` (cada hora)
     o `"*/15 * * * *"`. Es un cambio de una línea; en Hobby rompería el deploy.
- El reproceso a pedido del owner sigue disponible con el mismo endpoint y secreto.

## 10. Retención: la decisión sigue abierta

Esta remediación **no** edita D-0065 ni `decisions.yaml` y no crea el ADR: cambiar una
decisión `ACCEPTED` exige un ADR nuevo que la reemplace, y eso es del owner (CLAUDE.md:
plan mode para ADR aceptados). Lo que hace el código hoy:

- `processed` e `ignored`: se borran a los 30 días (letra de D-0065); las `ignored`, con
  conteo propio.
- `pending` y `failed`: se conservan sin tope, contadas en `unprocessedKept` (lo que ya
  hacía la rama; no se amplió ni se acortó).

**Propuesta para un ADR futuro** (borrador para el owner; no es una decisión):

- **Cláusula vigente (D-0065):** *"El payload crudo de cada webhook se conserva 30 días
  para reprocesar y después se borra."*
- **Conflicto demostrado:** la rama conserva `pending` y `failed` sin límite (revisión
  fría §7.1; en su S19 sobrevivió una de 400 días). La razón de la cláusula ("para
  reprocesar") respalda conservarlas; la letra no prevé la excepción.
- **Riesgo de borrar lo no recuperado:** se pierde la única copia de un mensaje que Meta
  no reenvía (respondió 200) y que Cloud API no permite releer. Antes del endurecimiento
  esa pérdida era silenciosa.
- **Riesgo de conservar sin límite:** el crudo trae teléfono, `wa_id`, nombre de perfil y
  texto (R-19). Las envenenadas se acumulan, la alerta queda encendida para siempre y no
  hay operación del owner para cerrarlas salvo SQL en producción.
- **Semántica propuesta:**
  1. las entregas `processed` (e `ignored`) borran su crudo automáticamente a los 30 días
     de recibidas, como hoy;
  2. una entrega sin resolver (`pending` o `failed`) se conserva mientras sea
     recuperable y exige una **disposición explícita**: recuperarla (reproceso) o
     descartarla por decisión del owner;
  3. el descarte autorizado borra `body_raw` y deja una marca sin contenido (id,
     `received_at`, motivo, quién y cuándo), que la UI cuenta como pérdida declarada;
  4. la retención informa lo que borró y lo que conservó (ya lo hace).
- **Decisión que sigue faltando:** el **tope máximo** de conservación de una entrega sin
  resolver (la revisión fría sugiere 90 días como ejemplo; no se adopta acá), qué pasa al
  vencerlo (descarte automático con marca, o alerta que exige decisión), y si las
  `ignored` cuyo número de filtro difiere del configurado deben tratarse como sin
  resolver en lugar de borrarse a los 30 días.

Para CO01 (72 h, contenido inventado) cualquiera de las dos lecturas es segura: nada
llega a 30 días durante la prueba.

## 11. Mutaciones: antes y después

Misma suite que la revisión fría (Communication OS: `contexts/**` y
`apps/communication/**`), `--test-concurrency=1 --test-timeout=60000`, una mutación por
vez, restaurando el archivo por contenido después de cada una. "Muerta" = al menos un
`fail` o `cancelled`.

**Antes** (código de `341364f`, 176 tests):

| Mutación | Resultado |
|---|---|
| M04 · `processed` antes de la transacción del procesamiento inicial | sobrevive (176/176) |
| M30 · el job reprocesa sin número | sobrevive (176/176) |
| M30-b · el reproceso no pasa el filtro a `parseDelivery` (M09 de la revisión fría) | muerta: "el reproceso aplica el mismo filtro" |
| M32 · secreto aceptado por prefijo | sobrevive (176/176) |
| M32-b · secreto aceptado con sufijo | muerta: "otro secreto" (es el secreto + `-otro`) |
| S9b · todo ignorado queda `processed` | no es una mutación: es el comportamiento de la línea de base |
| S-HOL · sin tope de espera de locks | no es una mutación: es el comportamiento de la línea de base |

**Después** (este cambio):

216 tests de Communication OS en la línea sin mutar. **23 mutaciones, 23 muertas, todas
de forma directa** (el test que falla es el que describe el bug, no uno accidental).

| Id | Bug representado | Test que la detecta | Fallas |
|---|---|---|---|
| M04 | `processed` antes de la transacción del procesamiento inicial | "el receptor real deja la entrega failed sin escritos a medias…" (y el de lock inicial) | 2 |
| R-rollback | El procesamiento inicial sin transacción: un error deja escritos a medias | "el receptor real deja la entrega failed sin escritos a medias…" | 2 |
| R-invisible | `store.fail` marca `processed`: la falla inicial queda invisible para siempre | "la entrega queda failed, visible…", "el receptor real…" y 14 más | 16 |
| M30 | El job reprocesa sin número (o con uno inválido) | "el reproceso exige un phone_number_id válido (M30)": 5 casos 503 | 5 |
| M30-b | El reproceso no pasa el filtro a `parseDelivery` | "el reproceso aplica el mismo filtro: de una entrega mixta…", "una entrega deja el mismo efecto…" | 2 |
| M30-c | El reproceso toma toda `ignored` (gira sin fin con el número correcto) | "con el número sin corregir… no las vuelve a tomar", "el tráfico de otro número… no se reprocesa en cada corrida" | 2 |
| M30-d | El reproceso nunca toma `ignored` (sin recuperación al corregir el número) | "…corregido, las recupera una vez" | 1 |
| M30-e | El reproceso informa `processed` lo que quedó `ignored` | "el reproceso aplica el mismo filtro…" | 1 |
| M32 | Secreto aceptado por prefijo | "un prefijo del secreto", "la primera letra del secreto" | 2 |
| M32-b | Secreto aceptado con sufijo | "el secreto más un sufijo" (y "otro secreto" de `deny.test`) | 4 |
| M32-c | Comparación sin distinguir mayúsculas | "el secreto en mayúsculas" | 1 |
| M32-d | Secreto aceptado por query string | "el secreto en el query string no cuenta" | 1 |
| PH-1 | Todo ignorado marcado `processed` (S9b) | "el receptor ignora lo de otro número: …ignored, no processed", "no se ve sano…" y 3 más | 5 |
| PH-2 | La salud deja de contar las `ignored` | "no se ve sano: las entregas quedan ignored y la salud las cuenta" | 1 |
| PH-3 | La UI no alerta las `ignored` | "entregas recientes con todo de otro número alertan aparte" | 1 |
| PH-4 | La UI ignora las atascadas (M19 de la revisión fría) | "procesamiento detenido: las atascadas solas alertan" | 1 |
| PH-5 | No se guarda el número del filtro en las procesadas | "los espacios y saltos de línea… no cambian el filtro" | 1 |
| PH-6 | Sin `trim` de la variable | "…aun con espacios alrededor, llega a la base", "los espacios y saltos de línea…" | 2 |
| PH-7 | Sin validación de formato (solo no vacío) | "un phone_number_id vacío o sin forma de uno…", job con `+` y con letras | 3 |
| PH-8 | La retención borra `ignored` sin contarlas | "al vencer, la retención la borra… y lo informa aparte" | 1 |
| LOCK-1 | Reproceso sin `lock_timeout` (S-HOL) | "no traba el lote…", "si la otra sesión confirma…" (vencen el plazo de 20 s) | 2 |
| LOCK-2 | Procesamiento inicial sin `lock_timeout` | "el procesamiento inicial tampoco espera sin tope…" | 1 |
| LOCK-3 | Claim con `for update` sin `skip locked` | "una entrega bloqueada por otro reproceso se saltea…" | 1 |

En la revisión fría, `for update` sin `skip locked` (M02) era un control que no cambiaba
la corrección. Sigue sin cambiarla; lo que el test nuevo detecta es que una fila tomada
por otra sesión vuelve a trabar el lote, que es la propiedad de esta remediación.

## 12. Comprobaciones que dependen de producción

Ninguna se ejecutó; todas son del owner (R-13). Las de la checklist del informe de
endurecimiento siguen vigentes; esta tabla agrega o precisa lo que faltaba.

| Ítem | Cómo comprobarlo (solo lectura salvo que se indique) | Resultado esperado |
|---|---|---|
| **`phone_number_id` real** | `GET https://graph.facebook.com/<versión>/<WHATSAPP_PHONE_NUMBER_ID>?fields=display_phone_number,verified_name` con el token de usuario del sistema. Después del deploy, un mensaje de un participante al número dedicado. | El `display_phone_number` es el del número dedicado. El mensaje aparece en la UI y **no** aparece la alerta de "otro número". Si aparece, la variable está mal: corregirla y correr el reproceso. |
| Otros números de la WABA | `GET /<waba-id>/phone_numbers` | Anotar cuáles hay; si el de prueba de Meta está, un mensaje a él debe producir la alerta `ignored`, no un mensaje en la UI. |
| Suscripciones de Meta | `GET /<waba-id>/subscribed_apps`; `GET /<app-id>/subscriptions` con el token de app | La app listada; objeto `whatsapp_business_account` con el campo `messages`. |
| Data API / RLS | Las tres consultas del informe de endurecimiento (H6) y, por tabla, `select has_table_privilege('anon', 'communication.<tabla>', 'select')` para las 5 tablas (y lo mismo para `authenticated`) | Siempre `false`; PostgREST con `Accept-Profile: communication` devuelve PGRST106 o 401/404, nunca filas. |
| Rol de mínimo privilegio | Los grants del informe de endurecimiento, más `update` sobre las columnas nuevas de `webhook_delivery` (el grant de tabla las cubre). | Receptor, reproceso, lista y retención funcionan; `delete from communication.message` se niega. |
| Transaction pooler | Con el rol de la app: `show idle_in_transaction_session_timeout; show statement_timeout; show lock_timeout;` | Anotar valores. `set local lock_timeout` del código vale por transacción y no depende de ellos. |
| Vercel Cron | Después del deploy: Settings → Cron Jobs del proyecto | Las dos tareas listadas. Si el plan es Hobby, el deploy pasa con la programación diaria; no cambiar a horaria sin plan Pro. |
| Cron con secreto | Logs de la función después de la primera ejecución | Líneas `reproceso: …` y `retención: … (N ignoradas por ser de otro número)`, sin el secreto. |

## 13. Bloqueantes antes de la corrida de 72 h de CO01

Locales: **ninguno de los cinco objetivos de esta remediación** (§14). Quedan, sin
resolver en esta rama:

1. **Del owner — cadencia del reproceso durante las 72 h** (§9): Hobby con reproceso a
   pedido, o Pro con cron horario.
2. **Del owner — ADR de retención de no procesadas** (§10). No bloquea la prueba (nada
   llega a 30 días), sí el cierre de CO01.
3. **Del owner — comprobaciones de §12**, en especial el `phone_number_id` real y las
   suscripciones, antes del primer mensaje de la prueba.
4. **Del contrato de T-0026, sin empezar:** `docs/despliegue/vercel-communication.md`,
   fixtures reales de envío (R-27), script de aceptación y la revisión ciega (R-33).
5. **Sobrevivientes de la revisión fría fuera de este alcance** (no se tocaron):
   M14 (umbral de atasco tautológico en los tests), M18 (salud después de un reintento
   fallido), M25 (estados de salientes concurrentes sin test), M28/M29 (la ruta `/webhook`
   no tiene test), M39 (metadata faltante con filtro activo). M19 (la alerta ignora
   `stalled`) ahora tiene test por `delivery-alerts.test.ts`.
6. **Excepción no capturada de `postgres.js` al cortarse la conexión** (revisión fría §3):
   sin cambios; confirmarla contra el pooler o aceptarla por escrito.
7. **Pérdida residual sin alerta:** una entrega `processed` con `applied_count = 0` e
   `ignored_count = 0` es indistinguible, para la UI, de un cambio de forma del payload de
   Meta que el parser no reconozca (por ejemplo, otra clave en lugar de `messages`). Queda
   registrado en la fila (`applied_count = 0`) pero no alerta, porque los campos que no
   son `messages` producen lo mismo legítimamente.

## 14. Criterios de éxito

| Criterio | Estado |
|---|---|
| Un número mal configurado no produce un "éxito sano" silencioso | **Cumplido:** `ignored`, alerta en la UI, reproceso al corregir, borrado contado. |
| Un lock retenido no traba indefinidamente el resto | **Cumplido:** `lock_timeout` 5 s; test con conexión independiente. |
| M04 detectada por un test con la base real | **Cumplido.** |
| M30 detectada directamente | **Cumplido** (contexto y job). |
| M32 detectada directamente | **Cumplido.** |
| Sin duplicados | **Cumplido:** tests de idempotencia, reproceso concurrente (un pool y tres pools), lock confirmado por otra sesión y M04 con reenvío. |
| Ninguna decisión aceptada cambiada en silencio | **Cumplido:** D-0065, `decisions.yaml` y T-0026 sin cambios; propuesta de ADR en §10. |

### Garantías, sin "exactly once" suelto

- **Meta → `webhook_delivery`:** at-least-once (crudo escrito antes del 200; cada POST es
  una fila).
- **Entrega → intento de procesamiento:** at-least-once mientras corra el reproceso
  (programado diario, o a pedido), incluidas las `ignored` cuando cambia el número.
- **Intento → filas de dominio:** effectively-once por `wamid`: a lo sumo una fila por
  `wamid` en `message`, `unsupported_message` y `outbound_status`, y un estado que solo
  avanza.
- **Exactly-once solo dentro de Postgres:** una entrega llega a `processed` o `ignored`
  si y solo si su contenido se confirmó en la misma transacción. No hay efectos externos
  en el procesamiento, así que no hay nada fuera de la base que se pueda duplicar.

## 15. Verificación ejecutada

Entorno: **Node 24.21.0** (vía `npx node@24`; el sistema trae 22.22.0) y **Postgres
16.15** local. El repo fija Postgres 17 y CI usa `postgres:17`; el repositorio de
paquetes de PGDG respondió 403 desde este entorno. `lock_timeout`, `set local`,
savepoints, `skip locked` y la espera de inserts con conflicto de unicidad no cambian
entre 16 y 17, pero **el veredicto lo da CI con 17**.

| Comando | Resultado |
|---|---|
| `pnpm check` (con `DATABASE_URL` a `delcampo_test` y `COMMUNICATION_DATABASE_URL` sin definir, como en CI) | exit 0: docs, AgentRun, scripts, `typecheck`, `lint` y **413/413** tests |
| `pnpm test`, dos corridas más | 413/413 y 413/413, 0 `cancelled` |
| Suite de Communication OS (`contexts/communication` y `apps/communication`) | 216/216 (antes 176) |
| `reprocess.integration.test.ts` × 10 seguidas (locks y concurrencia reales) | 25/25 en las 10 |
| `pnpm --filter "./apps/communication" build` | ok; `/api/jobs/reprocess`, `/api/jobs/retention` y `/webhook` dinámicas |
| Migraciones: aplicar, revertir todas y volver a aplicar; reversa de 0003 (ahora después de la de 0004); reversa de 0004 con una fila `ignored` | ok (`migrations.integration.test.ts`) |
| Campaña de mutaciones (§11) | antes: 3 de 5 sobrevivían; después: 23/23 muertas |

La base de Broker para la suite completa se creó con `createdb delcampo_test` y
`pnpm db:migrate`, porque `pnpm db:create` exige la mayor de `.postgres-version` (17).
No se vio la falla intermitente de Broker que la revisión fría registró en
`schema.integration.test.ts:998` en estas tres corridas, lo que no prueba que haya
desaparecido.
