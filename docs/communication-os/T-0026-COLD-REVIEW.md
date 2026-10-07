# T-0026 — Revisión fría y adversarial del endurecimiento de Communication OS

- **Workstream:** BOS · **Fecha:** 2026-10-07 · **Tarea:** T-0026 (`READY`, `riskClass: HIGH`)
- **Rama revisada:** `claude/brave-ride-2k3oww`. Base de comparación: `4a33102` (merge de #61).
  Lo revisado son los commits `afa9db7` (código) y `94f8be3` (AgentRun).
- **Quién:** una sesión que **no** implementó estos cambios. El informe
  `docs/communication-os/t-0026-hardening-report.md` se trató como hipótesis: cada
  afirmación se contrastó con el código o con un experimento.
- **Aislamiento:** no se leyó nada de `v0/fase-8/` ni de `v0/fase-9/`, ni salidas de
  evaluadores, ni material de Risk OS.
- **Qué no se hizo:** nada contra producción, Meta, Vercel ni Supabase hosteado; ninguna
  credencial real; ningún cambio a D-0065, `decisions.yaml`, el contrato de T-0026 ni el
  código. Las mutaciones fueron temporales y quedaron revertidas (`git status` limpio
  salvo este archivo y la línea de AgentRun que agrega el hook).
- **Experimentos:** los scripts de los experimentos y de la campaña de mutaciones viven en
  el scratchpad de la sesión, no en el repositorio. Este informe transcribe sus
  resultados.

---

## 1. Veredicto ejecutivo

**B — READY WITH FIXES.**

La arquitectura de recuperación es sólida y se sostuvo bajo ataque:

- la entrega cruda se escribe en autocommit **antes** del 200;
- el contenido de cada entrega se aplica en una sola transacción, junto con el cambio de
  estado de la entrega;
- `message.wamid` es único y `unsupported_message.wamid` y `outbound_status.wamid` son
  clave primaria;
- los estados de un saliente solo avanzan, con la fila bloqueada;
- el reproceso toma cada fila con `for update skip locked`, vuelve a comprobar su estado
  y escribe el contenido en un savepoint.

No se pudo construir ningún caso en que una entrega procesada dos veces deje dos efectos
de dominio. Con cuatro reprocesos en paralelo, en pools independientes, hubo 180 claims salteados
(por lock tomado o porque otro ya la había procesado), y cada fila se reclamó
exactamente una vez.

No es A por tres razones, todas locales y acotadas:

1. **Pérdida silenciosa con indicador sano por configuración** (demostrada). Si
   `WHATSAPP_PHONE_NUMBER_ID` no coincide exactamente con el `phone_number_id` que manda
   Meta, pasa lo siguiente:
   - cada entrega queda `processed` sin contenido;
   - la UI muestra recepción y procesamiento al día, con 0 `failed` y 0 atascadas;
   - el reproceso no las ve, porque solo toma `failed` y `pending`;
   - a los 30 días la retención borra el crudo.

   Basta un error de tipeo, el id del número de prueba de Meta, el número visible en lugar
   del `phone_number_id`, o un espacio o salto de línea al pegar la variable en Vercel.
   Nada valida el formato.
2. **El reproceso y la retención no están programados en el repositorio.**
   `apps/communication` no tiene `vercel.json`. Sin cron, una `failed` o una atascada
   espera a que alguien corra `curl` a mano. T-0026 pide que el reproceso corra "de forma
   programada".
3. **La suite deja pasar errores serios.** Sobrevivieron **10 mutaciones sustantivas**
   (§12). La más grave (M04) es una pérdida silenciosa en el camino inicial que deja toda
   la suite en verde: **ningún test produce una falla real de base en el procesamiento
   inicial**, porque todos simulan `store.process` con un mock.

Si el punto 1 no se corrige antes de las 72 h, el veredicto práctico se acerca a C. El
arreglo mínimo es pequeño y local (§16).

---

## 2. Máquina de estados real de `webhook_delivery`

Reconstruida del código, no del informe.

```
                    POST firmado
(no existe) ───────────────────────────────▶ pending                    [autocommit; 200 recién después]
   │  firma inválida / >1 MiB / sin config   │
   └─▶ (nada escrito: 401 / 413 / 503)       │ after(): sql.begin(applyDelivery)
                                             ├──────────────▶ processed  (sin descartes; lo de otro número se IGNORA)
                                             ├──────────────▶ failed     (descartes > 0; lo válido ya está escrito)
                                             │ excepción en la tx → rollback → markDeliveryFailed (otra sentencia)
                                             ├──────────────▶ failed     (guard: processing <> 'processed')
                                             │ crash / after() no corre / el fail también falla
                                             └── queda pending ──(≥ 15 min)──▶ "atascada"

failed | pending atascada ──reprocessOne: BEGIN; select … for update skip locked (re-chequea estado);
                             reprocess_count++; SAVEPOINT applyDelivery──▶ processed | failed ; COMMIT
   │ error dentro del savepoint → rollback al savepoint → markDeliveryFailed en la tx → failed (intento contado)
   │ error fuera del savepoint (claim, conexión, commit) → ROLLBACK (el intento NO se cuenta) →
   │        markDeliveryFailed(sql) fuera de la tx, sin lock → failed (o sin cambios si ya processed)
   └ kill del proceso con la tx abierta → Postgres hace rollback; el lock se libera; la fila queda como estaba

processed ──retención (received_at < now − 30 d)──▶ borrada
failed | pending ──retención──▶ NUNCA se borran (se cuentan en unprocessedKept)
```

| Transición | Transacción | Lock | Crash | Error de base | Concurrencia | ¿Monótona? | ¿Puede quedar irrecuperable? |
|---|---|---|---|---|---|---|---|
| → `pending` (`recordDelivery`, `store.ts:14`) | autocommit, antes del 200 | ninguno | antes del insert: no hay 200 y Meta reintenta | igual: 500 y Meta reintenta | cada POST es una fila nueva | sí | no |
| `pending` → `processed`/`failed` (`processDelivery`, `store.ts:90`) | una tx: contenido y `update` de la entrega | lock de fila solo en el `update` final; el contenido toma los locks de unicidad | rollback; queda `pending` y se ve atascada a los 15 min | rollback y `markDeliveryFailed` → `failed` | `wamid` único: N copias dan un mensaje (S6) | el `update` final **no tiene condición de estado** (`store.ts:85`): sobrescribe lo que haya, pero con el mismo resultado, porque el parseo es determinista | **sí, si el número configurado está mal**: queda `processed` vacía (§8) |
| → `failed` (`markDeliveryFailed`, `store.ts:98`) | sentencia suelta | lock de fila implícito | sigue `pending` | sigue `pending` | el guard impide pasar de `processed` a `failed` | sí | no |
| `failed`/atascada → `processed`/`failed` (`reprocessOne`) | una tx por entrega, con savepoint | `for update skip locked` desde el claim hasta el commit | rollback: lock liberado, intento sin contar, fila intacta (S13) | dentro del savepoint: `failed` con el intento contado; fuera: rollback y `failed` sin contar (S18) | se reclama una sola vez (S10); un segundo reproceso la saltea | `failed` → `processed` sí; `failed` → `failed` cuenta | no; pero un `wamid` bloqueado traba el lote (§6) |
| `processed` → borrada (retención) | sentencia suelta | una fila tomada por el reproceso se ve con su estado confirmado (`failed`): no se borra y entra en la corrida siguiente | — | — | correcto frente al reproceso (S28) | — | no (solo borra `processed`) |
| `failed` envenenada | — | — | — | — | — | se reintenta en cada corrida, sin tope | no se pierde, pero vive para siempre (§7) |

No hay un estado lógico `processing` ni un lease en la tabla. El lease es implícito: una
`pending` de menos de 15 min se presume en curso. Por eso **un crash no puede dejar un
lease colgado**; el costo es que el procesamiento colgado se ve recién a los 15 minutos.

---

## 3. Transacciones y locks

- **El lock cubre toda la sección crítica.** Va desde el `select … for update skip
  locked` hasta el commit, e incluye el savepoint y el `markDeliveryFailed` interno. La
  única escritura fuera del lock es el `markDeliveryFailed(sql, …)` del `catch` externo
  (`reprocess.ts:67`), que corre después del rollback. Es inocua: el guard
  `processing <> 'processed'` impide retroceder una fila ya procesada.
- **El claim vuelve a comprobar el estado.** La lista se arma sin lock; el claim vuelve a
  evaluar `processing = 'failed' or (pending and received_at < cutoff)` con una
  instantánea nueva (READ COMMITTED). Una fila que otro proceso terminó entre la lista y
  el claim se saltea. Si se quita ese chequeo, la mutación M03 la reprocesa dos veces, y
  la suite la detecta.
- **`SKIP LOCKED` no es necesario para la corrección.** Con un `for update` bloqueante
  (M02, control) el resultado es el mismo. Sirve para que dos corridas no se esperen
  entre sí; vale conservarlo.
- **Deadlocks.**
  - El reproceso bloquea la fila de entrega y después las del contenido. El camino
    inicial bloquea el contenido y recién al final la fila de entrega.
  - La inversión solo existe entre el camino inicial y el reproceso **de la misma
    entrega**. Eso exige una `pending` de más de 15 min todavía en curso, y Postgres lo
    resuelve abortando una de las dos, que queda `failed` y se recupera.
  - Entre entregas distintas, los textos se insertan en el orden del payload y no se
    ordenan. Dos entregas con los mismos `wamid` en orden inverso podrían trabarse. Meta
    no hace eso en la práctica, y si pasa, una aborta y se recupera.
  - Los estados sí se ordenan por `wamid`.
- **Rollback.** Un rollback deja la fila en un estado genuinamente reintentable:
  comprobado matando el proceso con `pg_terminate_backend` en S13 y S14.
- **Un lock retenido traba todo el lote** (S-HOL, demostrado).
  - No hay `lock_timeout` ni `statement_timeout`. Si otra sesión tiene una transacción
    abierta con el mismo `wamid`, el reproceso espera sin límite. El lote es secuencial,
    así que **ninguna de las entregas siguientes se procesa**.
  - Cuando Vercel mata la función, el rollback **deshace el `reprocess_count++` y el
    `last_reprocessed_at`**. La fila trabada queda primera en el orden
    (`nulls first`) y traba también la corrida siguiente, como se comprobó.
  - Hace falta una sesión `idle in transaction`, que es rara pero posible con el pooler.
    Si Supabase configura `idle_in_transaction_session_timeout` en el proyecto, el riesgo
    queda acotado (ver §15).
- **Crash de cliente.** Al matar el backend en S13, S14 y S-HOL, `postgres@3.4.9` lanzó
  en los tres casos una excepción no capturada: `TypeError: Cannot read properties of
  null (reading 'write')`, en `connection.js:255`, desde un `setImmediate`.
  - En un proceso Node sin manejador, eso tira abajo la instancia. Con fluid compute,
    puede llevarse los `after()` de otros requests que compartían la instancia.
  - No hay pérdida: esas entregas quedan `pending` y el reproceso las recupera a los
    15 min, **si está programado**.
  - Es un hallazgo de la biblioteca y no está verificado contra Supavisor.

---

## 4. Semántica: at-least-once, effectively-once y exactly-once

| Tramo | Garantía | Por qué |
|---|---|---|
| Meta → `webhook_delivery` | **at-least-once** | La entrega se escribe antes del 200. Si la escritura falla, la respuesta es 500 y Meta reintenta hasta 7 días. Cada POST es una fila, así que hay duplicados por diseño. |
| `webhook_delivery` → intento de procesamiento | **at-least-once, condicionado** | Toda `pending` o `failed` vuelve a intentarse **solo si el reproceso corre** (hoy no está programado) **y si la fila no quedó `processed` con el contenido ignorado** (§8). |
| Intento → filas de dominio | **effectively-once por `wamid`** | `message.wamid unique` con `on conflict (wamid) do nothing`; `unsupported_message.wamid` y `outbound_status.wamid` son clave primaria; los estados avanzan con `for update` y `outranks`. |
| Exactly-once en un límite | **Exactly-once en la base, por `wamid`, para mensajes entrantes:** existe a lo sumo una fila por `wamid`, y existe al menos una si la entrega llega a `processed`, porque contenido y estado comparten transacción. | — |

**Contraejemplo buscado.** Se buscó una entrega procesada dos veces cuyos dos intentos
dejaran efectos visibles. No existe. El procesamiento no tiene efectos externos: no envía
nada ni llama a la API. Todos sus efectos internos están detrás de una unicidad o de una
comparación monótona bajo lock.

Lo único que depende de qué intento gana son tres metadatos del primer insert:

- `message.received_at`, que se toma de la entrega que ganó (con dos copias de Meta, la
  primera procesada);
- `message.id`, que desempata el orden del hilo dentro del mismo segundo;
- `profile_name`.

No son duplicados. El efecto sobre el orden ya está documentado en el informe de
endurecimiento (§4).

**Caso límite teórico.** Un cambio de código entre dos intentos podría clasificar el
mismo `wamid` como texto en uno y como fuera de alcance en el otro. Las dos tablas no
comparten unicidad, así que aparecerían las dos filas. Hace falta un deploy en el medio y
una entrega con un elemento descartado. Se anota, pero no bloquea.

---

## 5. Inyección de fallas

**E** = experimento ejecutado en esta revisión (Postgres 16 local, pools independientes
cuando se indica). **T** = cubierto por un test existente, verificado leyéndolo.
**R** = razonamiento sobre el código.

| # | Escenario | Cómo | Resultado |
|---|---|---|---|
| 1 | Crash antes del insert | R + T (`webhook.test`: si `record` falla, no hay 200) | No hay 200; Meta reintenta. Sin pérdida. |
| 2 | Crash después del insert y antes de procesar | T + E (S31) | Queda `pending`; a los 15 min cuenta como atascada y el reproceso la recupera. **Sin cron, espera indefinidamente**, visible. |
| 3 | Crash durante el procesamiento | E (S14: `pg_terminate_backend` dentro del `update` final) | Rollback completo: 0 mensajes. El `fail` corrió por otra conexión y la dejó `failed`. El reproceso la recupera con 1 mensaje. |
| 4 | Error de base después de algunas escrituras | E (camino inicial, trigger real, sin mocks) + T (reproceso) | Base: `failed` → reproceso → 1 mensaje. **Con M04, `processed` y 0 mensajes, y la suite pasa** (§12). |
| 5 | Webhook duplicado | T + E (S5/S23: la primera copia `failed`, el reintento procesado) | 1 mensaje. |
| 6 | El mismo webhook en paralelo | E (S6: 10 POST en 5 pools) | 10 entregas, 1 mensaje, todas `processed`. |
| 7 | Varias `entry` o mensajes por entrega | E (S7) + T | Lo propio se guarda y lo de otro número se ignora. La entrega queda `processed` sin dejar rastro de lo ignorado. |
| 8 | Evento de otro número | T + E | Ignorado y sin persistir el contenido; el crudo queda 30 días. |
| 9 | Falta `WHATSAPP_PHONE_NUMBER_ID` | R (route) | 503 en GET y POST, y Meta reintenta. El reproceso responde 503. **Ningún test cubre la ruta** (M29 sobrevive). |
| 9b | **`WHATSAPP_PHONE_NUMBER_ID` equivocado** | **E (S9b)** | **Pérdida silenciosa:** 5/5 entregas `processed`, 0 mensajes, salud verde, el reproceso con el número corregido no ve nada, y la retención borra 5/5 a los 30 días. |
| 10 | Dos reprocesos simultáneos | E (S10: 4 pools, 60 filas) + T | 60 `processed` y 180 `skipped`: hubo superposición real. `reprocess_count = 1` en las 60. |
| 11 | Cron y reproceso manual a la vez | Igual que el 10: el endpoint es el mismo | Correcto. |
| 12 | La misma fila `failed` tomada en paralelo | E (S10) | Una sola vez. |
| 13 | Worker caído con el lock tomado | E (S13) | Lock liberado, intento sin contar, `failed`; la corrida siguiente la procesa. |
| 14 | Caído después de escribir dominio y antes de actualizar la entrega | E (S14) + R | Imposible a medias: es la misma transacción. |
| 15 | Falla determinista | E (S19) | `failed` en cada corrida, con `reprocess_count` creciente y sin tope; visible. |
| 16 | Falla una vez y después funciona | T (trigger y "arreglada la causa") | Se recupera entera. |
| 17 | `pending` vieja todavía en curso | E (S17: 20 rondas, camino inicial y reproceso en paralelo) | 1 mensaje, `processed`, en las 20. |
| 18 | Falla el `update` del contador de intentos | E (S18: trigger) | El claim falla y hace rollback; el `catch` externo la marca `failed` con `reprocess_count = 0`, así que sigue primera en la cola. Visible. |
| 19 | Entrega histórica malformada que se reintenta siempre | E (S19) | Se reintenta siempre y se conserva siempre (§7). |
| 20 | El mensaje ya existe pero la entrega dice `failed` | E (S20) + T | `processed`, 1 mensaje. |
| 21 | Estado repetido | T | Sin cambios. |
| 22 | Mensaje y estado desordenados | T + E (S22: 30 rondas de `sent`/`delivered`/`read` en paralelo para un `wamid` nuevo) | Siempre `read`. Con M25 (sin `for update`) el experimento falla 2 de 3 veces; la suite, nunca. |
| 23 | El mismo `wamid` por varios caminos de reintento | E (S5/S23, S17) | 1 mensaje. |
| 24 | La transacción se reintenta después de una falla transitoria | T + E (S13) | Idempotente. |
| 25 | Entrega vieja procesada | T | Borrada a los 30 días; el mensaje queda. |
| 26 | Entrega vieja fallida | T + E (S19) | Se conserva; `unprocessedKept`. |
| 27 | Entrega vieja pendiente | T | Se conserva. |
| 28 | Pasa a `processed` mientras la retención selecciona | E (S28) + R | El `delete` ve el estado confirmado (`failed`), no la toma ni espera, y no la borra (`deliveries: 0`, `unprocessedKept: 1`). El mensaje quedó; la entrega entra en la corrida siguiente. Una fila confirmada `processed` que el `delete` encuentra bloqueada se espera y se re-evalúa. |
| 29 | Retención y reproceso a la vez | E (S28) | Correcto. |
| 30 | Entrega `failed` durante meses | E (S19, 400 días) | Se conserva, se reintenta y la alerta queda encendida para siempre (§7, §10). |
| 31 | Recepción sana y procesamiento detenido | E (S31) | Sano durante 15 min; después `stalled = N`, con alerta. |
| 32 | Una entrega envenenada falla para siempre | E (S32) | `failed ≥ 1` permanente; la alerta pierde poder de discriminación. |
| 33 | Atraso grande | R | Lotes de 100 en serie; las nunca reprocesadas van primero. Sin cron, crece sin límite y queda visible. |
| 34 | La última recepción avanza y nada se procesa | E (S31, S9b) | Si nada se procesa, a los 15 min aparece la alerta. **Si se "procesa" ignorando todo (número mal), nunca aparece.** |

En total se analizaron los 34 escenarios más el 9b. Se ejecutaron **19 experimentos**, que
cubren 28 escenarios; el resto se resolvió con tests existentes o leyendo el código.

---

## 6. Hallazgos de concurrencia

1. **La corrección del claim bajo concurrencia real está verificada.** Se usaron pools
   independientes, 4 workers y 180 claims salteados, y M01 se detecta en 10 de 10
   corridas de la suite.
2. **Un lock retenido traba el lote** (S-HOL, §3). Es recuperable, pero repetible, y el
   rollback borra el rastro del intento. Arreglo mínimo: `set local lock_timeout = '5s'`
   (y un `statement_timeout` acotado) dentro de la transacción de `reprocessOne`. El
   error cae en el savepoint, la fila queda `failed` **con el intento contado** y el lote
   sigue.
3. **La suite no tiene un test de estados de salientes concurrentes.** Quitar el
   `for update` de `applyStatus` (`store.ts:46`, M25) deja la suite en verde, y en
   concurrencia real `read` retrocede a `delivered`. El código actual es correcto; falta
   el test.
4. **Excepción no capturada de `postgres.js` al cortarse la conexión** (§3). Conviene
   confirmarla contra el pooler antes de la prueba, o aceptarla por escrito.

---

## 7. Retención frente a D-0065

1. **¿Contradice D-0065?** **Sí, en la letra.** D-0065 dice: *"El payload crudo de cada
   webhook se conserva 30 días para reprocesar y después se borra."*
   - La rama conserva `pending` y `failed` **sin límite**.
   - La razón de la decisión ("para reprocesar") respalda conservar lo que todavía no se
     procesó, pero la decisión no prevé una excepción.
   - D-0065 es `ACCEPTED`, y su ADR dice que cambiarla exige un **ADR nuevo que la
     reemplace**. Hay que corregir la recomendación del informe de endurecimiento
     ("registrarla en D-0065"): editar una decisión aceptada en su lugar contradice el
     propio ADR. Ver también el CLAUDE.md, que pide plan mode para eso.
2. **¿Borrar a los 30 días perdería en silencio?**
   - Con reproceso programado, una falla transitoria se recupera en minutos u horas.
     Lo que llega a los 30 días sin procesar es casi siempre determinista:
     - un elemento descartado, cuyo resto ya está en `message`;
     - un cuerpo no JSON;
     - un `wamid` bloqueado.
   - Borrarlo a los 30 días pierde lo descartado, que sin un cambio de código tampoco se
     recupera.
   - **Sin reproceso programado, una falla transitoria también llega a los 30 días.** Era
     la pérdida silenciosa de antes del endurecimiento.
   - La diferencia que importa es si el borrado deja rastro o no.
3. **¿La retención indefinida crea otro problema?** Sí:
   - El crudo contiene teléfono, `wa_id`, nombre de perfil y texto, que son datos
     personales (R-19). Las envenenadas se acumulan sin tope: en S19 sobrevivió una de
     400 días.
   - No existe ninguna operación del owner para cerrar o descartar una entrega. Hoy solo
     se puede con SQL a mano en la base de producción.
   - La alerta de la UI queda encendida para siempre en cuanto aparece la primera
     envenenada (§10).
4. **Cambio mínimo de decisión que lo haría explícito** (propuesta; no se implementa
   acá):
   > El payload crudo de cada webhook se conserva 30 días **desde que se procesa**. Una
   > entrega no procesada (`pending` o `failed`) se conserva mientras sea recuperable,
   > con un tope de **N días** (a fijar por el owner; por ejemplo, 90). Al vencer el tope,
   > o antes por decisión del owner, se borra su `body_raw` y queda una marca sin
   > contenido (id, `received_at`, motivo, quién y cuándo) que la UI cuenta como pérdida
   > declarada.

   Esto mantiene el límite de datos personales de D-0065, cierra la pérdida silenciosa y
   convierte la pérdida en un hecho visible y decidido. Para CO01 (72 h, contenido
   inventado), cualquiera de las dos lecturas es segura. La decisión importa después de
   CO01.

---

## 8. Filtro por número de teléfono

| Camino | Comportamiento | Evaluación |
|---|---|---|
| Receptor (`route.ts:20`) | Sin variable responde 503 a todo, también al desafío GET. | Correcto: falla visiblemente al configurar Meta. **Sin test** (M29 sobrevive). |
| Receptor con valor equivocado | Todo se ignora, la entrega queda `processed` y la cantidad ignorada solo va al log. | **Defecto principal (S9b).** Ni salud, ni reproceso, ni retención lo distinguen. |
| Reproceso (`jobs.ts:47`) | Exige la variable y aplica el mismo filtro. | Correcto; probado (M09 se detecta). **El endpoint no tiene test** (M30 sobrevive). |
| `reprocessDeliveries` como biblioteca | Sin `phoneNumberId` **no filtra** (E: persiste otro número). | El valor por defecto es permisivo. Hoy solo lo llama el job, que exige la variable; conviene que la opción sea obligatoria. |
| Lote con varios números | Se filtra por cambio: lo propio entra y lo ajeno se ignora (S7). | Correcto. |
| Cambio sin `metadata.phone_number_id` | Se descarta y queda `failed`. | Correcto; pero el orden de los chequeos no tiene test con el filtro activo (M39 sobrevive). |
| Fuera de alcance del número propio | `unsupported_message`, sin contenido. | Correcto. |
| Campos que no son `messages` | Se saltean en silencio. | Conforme al contrato. |

**¿Ignorar sin guardar es lo correcto?** CO01 §3 fija un solo número, así que no
persistir **contenido** ajeno es correcto. El crudo igual se guarda antes de parsear y
vive 30 días.

Lo que se pierde es la **auditabilidad de la decisión de ignorar**: la fila dice
`processed` y no hay forma de distinguir "procesada sin nada que guardar" de "procesada y
todo ignorado".

Arreglo mínimo, sin requisito nuevo:

- validar el formato de la variable al arrancar (`^\d+$`, después de `trim`), y si no lo
  cumple, 503;
- registrar en la entrega cuántos elementos se ignoraron (una columna entera nueva, o un
  estado `processed` con nota);
- que la salud cuente las entregas recientes cuyo contenido se ignoró **entero**.

Con eso, un número mal configurado se ve en la UI en el primer mensaje, y esas entregas
se pueden reprocesar dentro de los 30 días.

---

## 9. Seguridad de los endpoints de tareas

- **Secreto.**
  - Viaja como `Authorization: Bearer`; se compara por SHA-256 con `timingSafeEqual`.
  - Exige un mínimo de 32 caracteres; sin secreto, la respuesta es 503.
  - Los tests de denegación cubren: sin header, otro secreto, sin `Bearer`, `Bearer`
    vacío, la cookie de la UI, sin configuración y secreto corto.
  - **Falta el negativo de prefijo:** una regresión a `secret.startsWith(given)` (M32)
    deja la suite en verde y aceptaría `Bearer a` con probabilidad 1/62 por intento. El
    código actual es correcto.
- **Logging.** El handler no loguea headers. Las líneas de log llevan solo ids y conteos.
  Vercel no registra el header `Authorization` en sus logs de requests.
- **Caché.**
  - `dynamic = 'force-dynamic'`, y toda respuesta lleva `cache-control: no-store`.
  - Un GET con `Authorization` no se sirve desde la caché de Vercel sin `s-maxage`.
- **¿GET con efectos?** Es lo que manda Vercel Cron (GET con `Authorization: Bearer
  $CRON_SECRET`), así que está justificado por el contrato de despliegue.
  - Crawlers, prefetch y vistas previas de links no agregan `Authorization`.
  - Next responde HEAD con el handler GET; un HEAD con el secreto también ejecuta la
    tarea, lo que es inocuo.
  - Las dos tareas son idempotentes. Repetir un request capturado solo cuesta cómputo y
    exige tener el secreto.
- **Defecto concreto demostrado:** ninguno en el código actual. **Faltan tests
  positivos:** que el job llame a `reprocessDeliveries` con el número (M30) y que la
  retención invoque `applyRetention`.

---

## 10. Salud en la UI

La UI distingue:

- la última recepción (`lastDeliveryAt`);
- el último procesamiento exitoso (`lastProcessedAt`, solo de las `processed`);
- `failed`;
- `stalled` (`pending` de 15 min o más);
- la más vieja sin procesar.

Muestra una alerta `role="alert"` si `failed + stalled > 0`. Ante un error de fetch,
muestra los datos anteriores junto con el error. Eso es mejor que lo que había.

**Estados que se ven sanos con el procesamiento roto:**

1. **Número mal configurado** (demostrado):

   ```text
   webhook_delivery: N filas processing='processed', processing_error=null,
                     received_at y processed_at recientes
   message:          sin filas nuevas
   ```

   Resultado: dos horas recientes, 0 con error, 0 atascadas y ninguna alerta. La lista
   de conversaciones está vacía, o deja de crecer.
2. **Los primeros 15 minutos** de cualquier detención total. Es por diseño y está
   acotado.
3. **Meta deja de entregar**: suscripción caída, App Secret rotado que da 401, o URL
   cambiada. No hay filas nuevas, así que no hay nada atascado.
   - La hora de la última recepción envejece, pero con dos participantes que escriben
     pocas veces por día, unas horas sin entregas son normales.
   - T-0026 deja el monitoreo fuera de alcance. Conviene que la revisión diaria del
     protocolo compare esa hora con el último mensaje enviado por un participante.
4. **Alarma permanente.** Con una sola envenenada, la alerta queda encendida para
   siempre. Solo el conteo cambia, y el operador deja de mirarla. Falta la operación del
   owner para cerrarla (§7).

La parte de cliente no tiene ningún test: M19 (la alerta ignora `stalled`) y M20
sobreviven. M18 (`failed` oculta las que ya se reintentaron una vez) sobrevive en el
servidor.

---

## 11. Campaña de mutaciones

Se aplicaron 39 mutaciones de a una: Communication OS completo (`contexts/**` y
`apps/communication/**`, 176 tests) con `--test-timeout=60000`, la base de test
recreada para las mutaciones de esquema y restauración con `git checkout` después de cada
una.

"Muerta" quiere decir al menos un `fail`. Los 4 `cancelled` de Node 22 son la línea de
base.

| Id | Bug representado | Resultado | Test que la detecta | Detección |
|---|---|---|---|---|
| M01 | Sin lock en el claim | muerta (10/10) | "dos reprocesos simultáneos…" | directa |
| M02 | `for update` bloqueante (control) | sobrevive | — | no es un bug |
| M03 | Claim por id sin re-chequear el estado | muerta | "dos reprocesos simultáneos…" | directa |
| **M04** | **Camino inicial: `processed` antes del contenido, fuera de la tx** | **sobrevive** | — | — |
| M05 | Reproceso: `processed` antes del savepoint | muerta | "un error de la base a mitad…" | directa |
| M06 | La retención borra `failed` | muerta | "no borra las failed ni las pending…" | directa |
| M07 | La retención borra todo (como antes del endurecimiento) | muerta | ídem y "una vez reprocesada…" | directa |
| M08 | Sin unicidad de `wamid` (esquema) | muerta | idempotencia, reproceso, saliente | directa |
| M09 | Reproceso sin filtro de número | muerta | "el reproceso aplica el mismo filtro" | directa |
| M10 | `markDeliveryFailed` sin guard (pasa de `processed` a `failed`) | sobrevive | — | no sustantiva: se reprocesa sin duplicar |
| M11 | Contador de intentos fuera de la tx | muerta | "dos reprocesos simultáneos…" (cuenta 2) | directa |
| M12 | Umbral de atasco en 0 | muerta | "si tampoco se puede marcar failed…" | directa |
| M13 | Umbral en 2 min | sobrevive | — | no sustantiva |
| **M14** | **Umbral en 7 días** | **sobrevive** | — | — (los tests derivan `LATER()` de la constante) |
| M15 | Borde `<` → `<=` en el atasco | sobrevive | — | no sustantiva |
| M16 | `lastProcessedAt` = la última recepción | muerta | "el proceso cae entre el 200…" | directa |
| M17 | `stalled` siempre 0 | muerta | reproceso y salud | directa |
| **M18** | **`failed` oculta las ya reintentadas** | **sobrevive** | — | — |
| **M19** | **La alerta de la UI ignora `stalled`** | **sobrevive** | — | — (no hay tests de cliente) |
| M20 | `lastProcessedAt` cuenta las `failed` | sobrevive | — | menor: la alerta sigue |
| M21 | Reproceso sin savepoint | muerta | "un error de la base…" (intento sin contar) | directa |
| M22 | Cola ordenada solo por id | muerta | "…no tapa a las demás" | directa |
| M23 | Reproceso solo de `failed` | muerta | 3 tests de atasco | directa |
| M24 | Descartes marcados `processed` | muerta | procesamiento parcial, reproceso | directa |
| **M25** | **`applyStatus` sin `for update`** | **sobrevive** | — (mi S22 la detecta 2/3) | — |
| M26 | Gana el último estado que llega | muerta | estados de salientes | directa |
| M27 | 200 antes del insert durable | muerta | `webhook.test` | directa |
| **M28** | **La ruta nunca agenda `after()`** | **sobrevive** | — | — |
| **M29** | **La ruta acepta todo sin la variable** | **sobrevive** | — | — |
| **M30** | **El job de reproceso sin filtro cuando falta el número** | **sobrevive** | — | — |
| M31 | Cualquier `Bearer` no vacío | muerta | "otro secreto" | directa |
| **M32** | **Secreto comparado por prefijo** | **sobrevive** | — | — |
| M33 | Borde de retención `<` → `<=` | muerta | "el corte es estricto…" | directa |
| M34 | La reversa de 0003 olvida el índice | muerta | migraciones (al volver a aplicar) | directa |
| M36 | El receptor no aplica el filtro | muerta | "el receptor con número configurado…" | directa |
| M38 | `unprocessedKept` siempre 0 | muerta | "no borra las failed…" | directa |
| **M39** | **El filtro antes del chequeo de metadata** | **sobrevive** | — | — |
| M40 | `store.fail` no hace nada | muerta | 8 tests de reproceso | accidental: lo detectan tests de reproceso, no uno del receptor |
| M41 | Sin largo mínimo de `CRON_SECRET` | muerta | "con un CRON_SECRET corto: 503" | directa |

**39 mutaciones; 24 muertas y 15 sobrevivientes, de las cuales 10 son sustantivas** (en
negrita). Una de las muertas, M40, se detectó de forma accidental.

---

## 12. Mutaciones serias que sobreviven a la suite

### M04 — pérdida silenciosa en el camino inicial (la más grave)

Cambio mínimo, en `processDelivery` (`store.ts:90`):

```ts
await sql`update communication.webhook_delivery set processing = 'processed',
          processed_at = now(), processing_error = null where id = ${delivery.id}`
await sql.begin((tx) => applyDelivery(tx, delivery, parsed))
```

Es un "marcar como tomada antes de trabajar", un patrón común.

**Qué pasa.** Ante cualquier falla real dentro de la transacción (conexión, deadlock,
timeout, una restricción):

1. la entrega queda `processed` con 0 mensajes;
2. `store.fail` no la toca, por su guard;
3. la salud da 0 `failed` y 0 atascadas;
4. el reproceso no la ve;
5. la retención la borra a los 30 días.

**Demostrado con un trigger real**, sin mocks. Línea base: `failed` → reproceso → 1
mensaje. Con M04: `processed` → `deliveries: []` → 0 mensajes.

**Por qué la suite sigue en verde.** Todas las fallas del camino inicial usan
`failingProcessStore` (`reprocess.integration.test.ts:37`) o un store simulado
(`webhook.test.ts`), que reemplazan `store.process` entero: **el límite de transacción
crítico nunca se ejerce**. El único test con una falla real de base (el trigger) pasa por
el reproceso.

**Invariante y test que faltan.** *"Una entrega nunca queda `processed` si su contenido
no se confirmó en la misma transacción."* Test: el receptor real contra un trigger que
rechaza el insert de `message` tiene que terminar `failed`, y después el reproceso tiene
que dejar 1 mensaje.

### Las otras nueve

| Mutación | Modo de falla | Invariante que falta |
|---|---|---|
| M14 | Una atascada no se ve ni se reintenta durante días. | Fijar el umbral: los tests usan `LATER()` derivado de `STALLED_PENDING_AFTER_MS`, así que se adaptan a cualquier valor (tautología). Un test de dominio con 15 min explícitos y uno con `now + 16 min`. |
| M18, M19 | La UI deja de alertar ante envenenadas reintentadas, o ante un procesamiento detenido. | Salud después de un reintento fallido (`failed` sigue en 1) y un test de la condición de la alerta en el cliente (extraerla a una función pura). |
| M25 | `read` retrocede a `delivered` con estados concurrentes. | Un test con dos o tres conexiones independientes, en varias rondas. |
| M28, M29 | La ruta deja de procesar, o acepta todos los números. | Test de la ruta `/webhook`, o extraer la lectura del entorno a una función probada (como `jobs.ts`). |
| M30 | El reproceso a pedido persiste tráfico de otro número. | Un test positivo del job con el secreto válido, con y sin `WHATSAPP_PHONE_NUMBER_ID`. |
| M32 | Bypass del secreto por prefijo. | Negativos: un prefijo del secreto y el secreto más un sufijo. |
| M39 | Con el filtro activo, un cambio sin metadata se ignora en vez de descartarse. | El test de "cambio sin `phone_number_id`" también con `{ phoneNumberId }`. |

---

## 13. Los tests más fuertes

1. **"un error de la base a mitad de la entrega…"** (reproceso). Usa un trigger real de
   Postgres, sin mocks. Comprueba el rollback del savepoint (0 mensajes, el bueno
   incluido), el estado, el error y el intento contado, y que la corrida siguiente
   recupere todo. Detecta M05 y M21.
2. **"dos reprocesos simultáneos…".** Con un solo pool de `max: 5`, igual hay
   superposición real: detecta M01, M03 y M11 en 10 de 10 corridas. Comprueba semántica
   (`processed:1` por fila), no solo conteos.
3. **Retención:** el corte estricto con fechas fijas, `failed` y `pending` vencidas
   conservadas, y "una vez reprocesada, entra en la retención". Detectan M06, M07, M33 y
   M38.
4. **Idempotencia por `wamid`** (receptor y reproceso repetido, sin retroceso de `read`).
   Detecta M08.
5. **Tests de estructura de `deny.test`:** todo handler de `api/jobs/` pasa por
   `withJobSecret`.

## 14. Los tests más débiles

- **Mockean el límite de transacción del camino inicial:** `failingProcessStore` y los
  stores de `webhook.test`. Por eso M04 sobrevive.
- **Tautológicos respecto del umbral:** `LATER()` se calcula desde la constante (M13,
  M14).
- **Prueban conteos y no semántica:** "el reproceso aplica el mismo filtro" comprueba
  `processed: 1` y 0 mensajes, pero ningún test pide que la salud o la entrega muestren
  lo ignorado. Es coherente con el diseño, pero ese diseño oculta S9b.
- **Faltan negativos:** prefijo del secreto (M32), job sin número (M30), metadata
  faltante con el filtro activo (M39).
- **Falta concurrencia donde importa:** estados concurrentes (M25) y la carrera entre el
  camino inicial y el reproceso (cubierta solo por S17 de esta revisión).
- **Sin cobertura:** las rutas de Next (`/webhook`, jobs con secreto válido) y el
  componente `Freshness`.
- **"si tampoco se puede marcar failed, queda pending…"** prueba bien el atasco, pero
  con stores simulados: no prueba que un crash real deje `pending`. S14 muestra que en
  la práctica suele quedar `failed`, porque el `fail` corre por otra conexión.
- **Ningún test de rollback de la migración 0003 con filas reprocesadas.** El existente
  usa una entrega sin reprocesar. Por lectura del SQL no es un riesgo: las columnas y su
  `check` se borran sin condición (no se ejecutó).

---

## 15. Comprobaciones que dependen de producción

| Ítem | Qué se pudo establecer en local | Qué no | Las comprobaciones propuestas |
|---|---|---|---|
| Data API / RLS | Las migraciones no hacen `grant` a `anon`/`authenticated`, no habilitan RLS y no usan `public`. | Qué esquemas expone el proyecto y sus privilegios por defecto. | Las tres consultas del informe de endurecimiento (§3, H6) son de solo lectura y sin contenido. El `curl` con `Accept-Profile: communication` es el header correcto para un GET de PostgREST; los resultados esperados (PGRST106 o 401/404, nunca filas) son precisos. **Agregar:** `select has_table_privilege('anon', 'communication.webhook_delivery', 'select')` sobre las 5 tablas, por si hubiera un `grant` a nivel de tabla sin `usage` de esquema todavía. |
| Rol de mínimo privilegio | **Verificado en local en esta revisión** con un rol nuevo en una base `_dev` descartable: con los grants propuestos funcionan receptor, procesamiento, reproceso con `skip locked`, lista y retención; se niegan `delete from message`, leer `schema_migrations` y `drop table`. Rol y base borrados después. | La sintaxis del usuario por el pooler (`communication_app.<project-ref>`) y el flujo de envío contra producción. | Seguras. El owner las aplica después de migrar. |
| Transaction pooler | `prepare: false` está puesto. No se usan `LISTEN`, locks de sesión ni `SET` de sesión. Las transacciones y los savepoints funcionan en modo transacción. | El comportamiento de Supavisor al cortar conexiones, la excepción de `postgres.js` (§3) e `idle_in_transaction_session_timeout`. | **Agregar a la checklist:** `show idle_in_transaction_session_timeout; show statement_timeout;` con el rol de la app (solo lectura). |
| Frecuencia de Vercel Cron | No hay `vercel.json` en `apps/communication`: **hoy no hay ninguna tarea programada.** | El plan. En Hobby, una vez por día y con hora imprecisa. | El ejemplo de `vercel.json` del informe es correcto. **Tiene que quedar en el repo** antes de la prueba, no solo en la checklist. |
| Límite de intentos de login | No hay límite, confirmado. scrypt + contraseña de 20 caracteres o más hacen improbable la fuerza bruta; el costo de cómputo es el riesgo real. | Qué ofrece el Firewall del plan. | Es una decisión del owner. La recomendación del informe es razonable. |
| Suscripciones de Meta | Nada. | Todo. | **Imprecisa:** el repo solo documenta los `POST` que crean las suscripciones (`ops/evidence/T-0020.md`). Para comprobar sin modificar: `GET /{waba-id}/subscribed_apps` (tiene que listar la app) y `GET /{app-id}/subscriptions` con el token de app (objeto `whatsapp_business_account` con el campo `messages`). Son de solo lectura; el resultado esperado tiene que quedar escrito. |

---

## 16. Bloqueantes antes de la corrida de 72 h de CO01

**Locales (código y repositorio), en orden:**

1. **Cerrar la pérdida silenciosa por número mal configurado** (§8):
   - validar el formato de `WHATSAPP_PHONE_NUMBER_ID` (`trim` y `^\d+$`; si no, 503);
   - dejar en la entrega cuántos elementos se ignoraron;
   - que la salud muestre "entregas recientes con todo ignorado";
   - test S9b.
2. **Versionar la programación**: `apps/communication/vercel.json` con el reproceso y la
   retención. Si el plan es Hobby, el owner decide por escrito la cadencia manual del
   reproceso durante las 72 h.
3. **`set local lock_timeout`** (y un `statement_timeout` acotado) en la transacción de
   `reprocessOne`, más un test con un lock retenido: la fila queda `failed` con el
   intento contado y el lote sigue (S-HOL).
4. **Tests que matan las mutaciones sustantivas:** falla real de base en el camino
   inicial (M04), umbral fijo (M14), salud después de un reintento (M18), condición de la
   alerta (M19), estados concurrentes (M25), lectura del entorno de la ruta (M28, M29),
   job positivo con número (M30), prefijo del secreto (M32), metadata faltante con
   filtro (M39).

**Del owner (gobierno y despliegue):**

5. **Decidir la retención de las no procesadas** con un ADR nuevo que reemplace la
   cláusula de D-0065, no editándola (§7). Incluir un tope y una operación del owner para
   descartar con rastro.
6. Lo pendiente de §15: Data API/RLS, rol, timeouts del pooler, cron, rate limit y las
   consultas de solo lectura de Meta en `docs/despliegue/vercel-communication.md`, que
   todavía no existe.
7. El ensayo de recuperación del informe de endurecimiento (§6) **agregando** un mensaje
   enviado con el número propio y uno con un número de prueba distinto, para comprobar el
   filtro y su visibilidad en producción.

---

## Verificación ejecutada y límites del entorno

- **Entorno:** Node 22.22.0 por defecto y Node 24.21.0 (obtenido con `npx node@24`);
  Postgres **16** local. El repo fija Postgres 17 (`.postgres-version`) y CI usa
  `postgres:17`.
  - `pnpm db:create` se niega a correr con 16. La base de Broker se creó con `createdb`
    y `pnpm db:migrate`.
  - `skip locked`, savepoints y la semántica de READ COMMITTED no cambian entre 16 y 17,
    pero **el veredicto de CI tiene que darlo Postgres 17**.
- **Suite de Communication OS** (176 tests), tres corridas seguidas: 172 pass, 0 fail y
  4 cancelled con Node 22. Son los de `cloud-api.contract.test.ts`; según el informe de
  endurecimiento pasa igual en `main` (no verificado acá). Con Node 24 desaparecen
  (verificado).
- **Suite completa** (`pnpm test`, 373 tests):
  - Node 22: 369 pass, 0 fail y los mismos 4 cancelled. `pnpm check` también pasa.
  - Node 24: 14 corridas completas, **0 cancelled**; 12 limpias y 2 con 1 fail.
  - La falla intermitente está en `packages/db/src/schema.integration.test.ts:998`
    ("sin el advisory lock, dos merges concurrentes…"), un test de reproducción de
    carrera de **Broker OS**: no es de Communication OS ni de esta rama.
- **Calidad:** `pnpm typecheck` ok, `pnpm lint` ok, y
  `pnpm --filter "./apps/communication" build` ok, con `/api/jobs/reprocess` y
  `/api/jobs/retention` como funciones dinámicas.
- **Migraciones:** "aplicar, revertir todas y volver a aplicar" y "la reversa de 0003"
  pasan. Las mutaciones de esquema (M08, M34) recrearon la base desde cero.
- **Experimentos:**
  - 19 experimentos de falla y concurrencia, algunos con varias rondas (S17 con 20, S22
    con 30), con pools independientes y `pg_terminate_backend`;
  - 39 mutaciones;
  - 10 corridas de M01 para comprobar que la detección es determinista.
- **Al terminar:** el árbol de trabajo queda limpio salvo este informe y la línea de
  `ops/runs/2026-10-07.jsonl` que agrega el hook de la sesión.

**Veredicto: B — READY WITH FIXES.**
