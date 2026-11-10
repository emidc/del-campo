# Del Campo — ENGINEERING_RULES.md

**Estado:** baseline v0.1 · **Actualizado:** 2026-11-09

Reglas de trabajo. **Un solo archivo para humanos y para agentes**: la distinción es real en muy pocas reglas, y esas están marcadas. Dos archivos paralelos derivan en duplicación y la duplicación derivó, en la revisión del Charter, en la mitad de las contradicciones encontradas.

Cada regla está marcada como:

- **ACTIVA** — rige desde hoy.
- **LATENTE** — está escrita, pero recién se aplica cuando exista el primer código de aplicación. No se puede cumplir todavía y no se debe fingir que sí.

---

## 1. Principios de decisión

### R-01 · La regla de dos — ACTIVA

No se introduce una abstracción, un adapter, un nivel de jerarquía ni una tabla de configuración hasta que existan **dos** casos concretos que la requieran. El primer caso se resuelve directo. El segundo justifica la abstracción. El tercero la valida.

### R-02 · Simplicidad reversible antes que complejidad prematura — ACTIVA

Ante dos opciones, se prefiere la que resuelve el problema actual, se comprueba rápido, tiene bajo costo de reversión, mantiene opciones abiertas y reduce lock-in.

### R-03 · Nunca convertir una suposición en decisión en silencio — ACTIVA

Toda decisión material se clasifica: `ACCEPTED`, `PROVISIONAL`, `OPEN`, `SUPERSEDED`, `REJECTED`. Vive en `decisions.yaml`, con ADR si es relevante. Si algo aparece decidido en el código pero no en `decisions.yaml`, el código está mal, no el índice.

### R-04 · Las decisiones se enuncian en un solo lugar — ACTIVA

`decisions.yaml` es la fuente canónica de **qué** se decidió y de su estado. Un ADR
referenciado explica **por qué**, con evidencia, alternativas y consecuencias, pero no
duplica el `statement`. Toda otra prosa referencia el id. El checker valida ambas
direcciones: Decision → ADR y ADR → Decision.

### R-05 · Disparadores obligatorios de ADR — ACTIVA

Requieren ADR: dependencia nueva; servicio externo nuevo; cambio de schema en un agregado central (`Party`, `Policy`); cambio en autenticación o autorización; cambio de política en `.claude/`; cambio de proveedor de infraestructura; promoción de un concepto de `NAMED` a `MODELED`.

---

## 2. Tareas y verificación

### R-06 · Toda tarea tiene criterios verificables — ACTIVA

Toda tarea declara evidencia capaz de demostrar su resultado. Cuando el outcome sea
mecánicamente verificable, `## Verification` contiene comandos ejecutables. Los
`SPIKE` y `REVIEW` pueden apoyarse en evidencia y comprobaciones humanas explícitas.
No se acepta un “Done” subjetivo.

### R-07 · La verificación es el Definition of Done — ACTIVA

El bloque `## Verification` contiene comandos ejecutables cuando corresponda y
afirmaciones concretas que un humano debe comprobar para outcomes no mecánicos. Los
comandos se corren igual desde una shell humana, desde CI y desde un agente.

### R-08 · `Non-scope` nunca vacío — ACTIVA

Una tarea sin alcance negativo explícito es el mejor predictor de scope creep en trabajo agéntico.

### R-09 · Definition of Done — ACTIVA, salvo lo marcado

Se considera terminada una tarea cuando:

- los comandos de `## Verification` pasan (**ACTIVA**);
- cero nuevos errores de tipo, cero nuevos errores de lint (**ACTIVA**: `pnpm check` y CI
  los hacen fallar);
- ningún test nuevo marcado como `skip`, y ningún test existente modificado sin justificación explícita en el PR (**LATENTE**);
- existe `ops/evidence/T-xxxx.md` conforme a R-09b (**ACTIVA**);
- ADR creado si aplica R-05 (**ACTIVA**);
- aprobación humana obtenida si aplica R-13 o R-14 (**ACTIVA**).

No se declara terminado nada cuya verificación no se haya ejecutado.

Una tarea pasa a `DONE` en su propio PR cuando su outcome está verificado y sus
aprobaciones obtenidas: el merge incorpora ese estado y las casillas se marcan ahí mismo.
Si falta una aceptación posterior (producción, uso real, una aprobación que llega
después), sigue `ACTIVE` mientras haya trabajo, con `waiting` sólo si la espera es pasiva,
o `BLOCKED` si necesita una intervención. → `D-0086`

AgentRun ya no es parte del Definition of Done. → `D-0085`

---

### R-09b · La evidencia de ejecución es un artefacto versionado — ACTIVA

Toda tarea que pase a `status: DONE` tiene un archivo `ops/evidence/T-xxxx.md`. El
checker lo exige y falla sin él, nombrando el archivo que falta. El archivo contiene:

- un **encabezado de procedencia** que declara el SHA de `main` y el SHA de la rama
  sobre los que se ejecutó la verificación, y qué agentes trabajaron en la tarea;
- `## Comandos y salida literal` — cada comando de `## Verification` con su salida
  **textual**. Una descripción de la salida no es la salida: lo que se resume deja de
  ser comprobable por un tercero;
- `## Observación externa` — al menos una comprobación hecha en el borde del sistema,
  por fuera del artefacto que se verifica. Un check verde prueba que el código hace lo
  que el test dice, no que el test diga lo correcto;
- `## Qué NO se verificó` — los límites conocidos de la evidencia. Una tarea que no
  declara ninguno es una tarea cuya evidencia no se leyó.

Un archivo escrito después del hecho lo declara en su encabezado y distingue qué parte
de su contenido se produjo durante la ejecución original y cuál no. Lo que no quedó
registrado se declara faltante; **no se reconstruye**. Un retrofit que no diga que lo es
sería peor que su ausencia.

La regla no alcanza a `DROPPED` ni a ningún otro estado: una tarea que no se ejecutó no
tiene nada que demostrar.

El checker valida estructura, no veracidad. Que las cuatro partes existan no prueba que
digan la verdad; esa lectura es del revisor humano. → `R-30`

---

## 3. Contexto y reproducibilidad

### R-10 · `~/.claude/` no contiene nada semántico del proyecto — ACTIVA

Solo preferencias y credenciales personales. Configuración del proyecto en el repositorio, versionada y revisada como código. Un proyecto cuya conducta depende de configuración no versionada deja de ser reproducible, y con eso se cae la premisa entera de medir proveedores.

### R-11 · Los runs de benchmark se ejecutan sin configuración de usuario — LATENTE

Todo run destinado a comparación se corre con `--bare` o con `--setting-sources` acotado, y esa condición queda registrada en el campo `settingSources` del AgentRun. Sin esto se está midiendo una variable no controlada.

LATENTE desde `D-0085`: no hay ningún experimento de comparación en curso. Se activa con el primero que se autorice, por ejemplo para `D-0043`, que registra sus runs a propósito.

### R-12 · La versión de contexto es el SHA del repo — ACTIVA

No se construye ningún sistema de versionado de contexto. El contexto que vio un
trabajo es el del SHA de la base de su PR, junto a los `contextRefs` declarados por la
tarea. “¿Qué contexto vio esta tarea?” se responde con `git show <sha>:DOMAIN.md`.

### R-12b · Referenciar documentos por path, no importarlos — ACTIVA

En `CLAUDE.md` y `AGENTS.md`, los documentos canónicos se nombran entre backticks (`` `DOMAIN.md` ``), **nunca** con `@DOMAIN.md`. La sintaxis `@path` los carga completos al inicio de cada sesión; el backtick los deja como texto y el agente los lee cuando los necesita. El único `@` permitido es `@AGENTS.md` en `CLAUDE.md`, que es intencional.

---

## 4. Permisos, aprobación y seguridad

### R-13 · Acciones de ingeniería — ACTIVA

- **Autónomo:** leer el repo; correr checks y tests; editar en una rama de feature; crear rama; crear PR; migraciones contra base local.
- **Autónomo con auditoría:** agregar dependencias; escribir migraciones de schema; **modificar tests existentes** — permitido, pero dispara revisión humana obligatoria y queda marcado en el PR.
- **Aprobación humana:** merge a `main`; deploy y migración en producción; rotación de secretos; **cambios a los guardrails de los agentes (`.claude/`, `.codex/`, `.gemini/`, `.agents/`), a los hooks, a los workflows de CI o a los validadores de `scripts/`**; alta de una integración externa. Una aprobación puede cubrir el trabajo previsto completo de una tarea; no hace falta repetirla por cada edición. El agente prepara el cambio en su rama y lo presenta como diff en un PR; cuando la protección local le impide escribirlo, el owner aplica el parche o habilita un entorno acotado para ese cambio.
- **Prohibido:** tocar datos de producción; deshabilitar hooks o checks; `push --force` a `main`; commitear secretos; usar credenciales productivas desde una sesión de desarrollo.

### R-14 · Acciones de negocio — ACTIVA

Requieren **siempre** aprobación humana en la primera versión: toda comunicación externa a un cliente, aseguradora o tercero; todo pedido de cotización; toda emisión, endoso o cancelación; todo otorgamiento de acceso externo; toda **creación, movimiento, renombrado, modificación o eliminación** de un archivo o carpeta en Drive. → `D-0040`

**Toda acción de negocio no listada tiene default `PROHIBIDA`, no autónoma.** Un default indefinido es, en la práctica, "lo que haga el código".

Los agentes no entregan a un cliente contenido que constituya asesoramiento sin revisión de un matriculado.

### R-15 · Los guardrails no se autoeditan — ACTIVA

Un agente que puede modificar sus propios límites no tiene límites. Las rutas protegidas son las mismas para los tres proveedores: `.claude/`, `.codex/`, `.gemini/`, `.agents/`, `.github/workflows/` y los validadores (`scripts/check-*.mjs`, `scripts/guard-db-tests.mjs`). Las protegen `permissions.deny` y el hook de Bash de Claude Code, y `.agents/hooks/protect-paths.mjs` para Codex y Gemini. Ejecutar un validador está permitido; escribirlo, moverlo o borrarlo, no. CI exige revisión ciega para todo cambio en esas rutas (R-33) y corre los controles también en su versión de la base; el YAML del workflow sigue siendo el de la rama, así que un cambio al workflow lo frena la revisión del owner. → `D-0086`

Los hooks locales cubren las rutas conocidas y los comandos que las nombran, no un comando opaco que las alcance por otro camino. Lo que no se puede omitir es CI y la revisión del owner (R-17).

### R-16 · Los agentes reciben autorización, no credenciales — ACTIVA

Un agente que necesita operar contra un sistema externo llama a un endpoint que posee la credencial. Nunca recibe la credencial. Esta es la diferencia entre un agente que puede cotizar y un agente que puede vaciar la cuenta del broker en una compañía.

### R-17 · Hooks son locales; CI es autoritativo — ACTIVA

Los hooks protegen la máquina donde están configurados. Todo lo que realmente deba cumplirse tiene que estar enforced también del lado del servidor. Esto además resuelve el problema cross-provider sin ninguna abstracción: a CI no le importa quién escribió el código.

### R-18 · Sin secretos en Git, prompts, logs, tareas ni documentación — ACTIVA

`.env` solo local y gitignored. Producción en almacenamiento seguro. Least privilege. Credenciales separadas por entorno.

---

## 5. Datos

### R-19 · Datos de clientes según la clase de agente — ACTIVA

Hay tres clases conceptuales de agente, según su función autorizada, no según la herramienta que use. La distinción original de `D-0039` se refina para Risk OS en `D-0070`. Un agente de desarrollo no adquiere permisos de preparación por trabajar en este repositorio.

**Agentes de desarrollo** — los que trabajan sobre este repositorio. No reciben PII real de clientes salvo excepción explícita y justificada. Una excepción se registra en `decisions.yaml` antes de ejercerse, y nombra la tarea, el proveedor, el modelo, qué puede leer y escribir, y qué no. Una excepción sin alcance escrito deja de ser una excepción y pasa a ser la regla nueva. Un agente que pega un DNI en el contexto de un proveedor de IA es una divulgación. Se usan identificadores internos, datos sintéticos o anonimizados; para lo demás, redacción. Tampoco hay PII en logs de aplicación ni en el texto de las tareas.

**Agentes de preparación/análisis de datos** — preparan datasets de Risk OS bajo `D-0070`, con función explícitamente autorizada y mínimo necesario. Pueden tratar información empresarial de riesgo y seguros dentro de ese alcance, conservar procedencia y hacer visibles inferencias y faltantes. La PII personal innecesaria y los datos personales especialmente sensibles siguen excluidos por defecto; nunca secretos. Sus resultados requieren revisión y aprobación humana antes de adquirir autoridad. No reciben acceso a Production.

**Agentes de producto** — los que Broker OS ejecuta para un usuario. Pueden procesar datos reales cuando sean necesarios para una función explícita y autorizada, enviando **únicamente los datos mínimos necesarios** para esa finalidad.

Límites comunes y alcance de la clasificación:

- Las categorías especialmente sensibles que clasifica `DOMAIN.md` —salud, accidentes, vida, información financiera— siguen prohibidas para modelos externos en v1 fuera del refinamiento empresarial acotado de `D-0070`. Este distingue economía/seguros e incidentes operacionales de empresas de datos sensibles de individuos; no habilita datos médicos o bancarios personales. El contenido excluido se rechaza, se redacta o se deriva a revisión humana antes de enviarlo.
- **Ningún proveedor ni modelo queda autorizado por esta regla.** Cada uno requiere aprobación explícita previa antes de procesar datos reales.
- El uso de interfaces externas de IA por el equipo en la gestión de riesgos se rige por `D-0074`: datos empresariales generales y conocimiento sectorial permitidos; información confidencial de clientes sólo por cuentas registradas antes en `decisions.yaml`; datos personales innecesarios, salud, datos bancarios y secretos, excluidos.
- Nunca se envían credenciales, secretos ni tokens. → `R-16`, `R-18`
- Toda operación sobre datos reales queda auditable por función, usuario, recurso, proveedor y modelo, categoría de datos y timestamp, sin duplicar PII innecesariamente ni guardar prompts completos en logs.

### R-20 · Toda llamada externa con efecto secundario es idempotente — ACTIVA

Clave de idempotencia generada por Broker OS y persistida **antes** del intento. Para operaciones que la contraparte no soporte de forma idempotente, el reintento exige reconciliación previa: verificar si ya se aplicó antes de repetir. Sin esto, un reintento sobre una emisión emite dos pólizas.

### R-21 · La política de reintentos es por integración — ACTIVA

No global. Y la escalación produce un ítem **durable, visible y asignado a una persona**, nunca solamente una línea de log. Un agente que falla en silencio es peor que no tener agente: crea confianza injustificada.

### R-22 · La auditoría de negocio es append-only — ACTIVA

`BusinessAuditEvent` no se modifica ni se elimina mediante operaciones normales. El rol de aplicación no tiene `UPDATE` ni `DELETE` sobre la tabla. No contiene tokens ni costos: eso es `AgentRun`, que pertenece a Project OS.

### R-23 · No se borra historia — ACTIVA

Especialmente antes del cutover de Zoho. No migrar y no preservar son decisiones distintas; solo la primera está tomada.

---

## 6. Código

La sección entera estuvo LATENTE hasta T-0010, que levantó el workspace, el type check, el lint y el runner de tests. Ya no se marca por sección: cada regla declara su propio estado, porque ahora difieren.

### R-24 · Contratos en todos los bordes — LATENTE

Todo borde (HTTP, mensaje de cola, task spec, payload de integración) tiene un schema validado y se **valida en runtime**, no solo en tipos. Es lo que permite que un agente compruebe su propio trabajo.

Sigue LATENTE y conviene decir por qué: los bordes ya existen (los endpoints de las tres apps y el webhook de WhatsApp) y validan su entrada a mano, sin una biblioteca de schema. La biblioteca de validación en runtime es una dependencia nueva y la elige una tarea con su ADR por R-05. Hasta entonces la regla no tiene herramienta que la haga cumplir de forma uniforme, que es lo que la distinción ACTIVA/LATENTE existe para no disimular.

### R-25 · Los límites de módulo se hacen cumplir por herramienta — ACTIVA

`packages/domain` no importa nada. `packages/db` no importa `api`. `apps/web` no importa `db` directamente. Regla de lint, no convención: un agente que no ve el límite lo cruza.

Los tres límites están escritos en `eslint.config.js` y hacen fallar `pnpm lint`.

### R-26 · Capas de test — ACTIVA en la capa unit; las demás entran con su primer caso

Unit sobre lógica de dominio pura; integration contra un Postgres real; contract contra payloads reales capturados; E2E pocos y sobre caminos críticos.

`pnpm test` corre la capa unit con el runner nativo de Node. La capa de integración necesita el Postgres local que fija `D-0046`, y su primer caso es T-0012. Contract y E2E entran con la primera integración y la primera UI: una capa de test sin sujeto no se puede hacer cumplir, sólo prometer.

### R-27 · Ningún mock sin una respuesta real detrás — LATENTE, pero la captura es ACTIVA

Durante cada spike de integración se capturan y guardan las respuestas reales como fixtures. Cuestan cero en ese momento —las llamadas ya se están haciendo— y son la única forma de tener tests de contrato que signifiquen algo.

### R-28 · Deny-by-default probado — ACTIVA

Todo endpoint expuesto al exterior tiene un test explícito de denegación. El portal no se lanza sobre "chequeamos el rol en el handler". Hoy lo cumplen `apps/communication/src/lib/deny.test.ts`, `apps/risk/src/lib/deny.test.ts` y `packages/api/src/http.test.ts`.

---

## 7. Git

### R-29 · Rama por tarea, con el id en el nombre — ACTIVA

`task/T-0042-descripcion-corta`. CI lee de ahí el `taskId` para congelar el contrato y para buscar el reporte de revisión. Sin tarea se admiten `docs/` y `chore/`; una enmienda de contrato va en `amend/T-xxxx-…` y sólo toca esa tarea. Ningún prefijo exime del congelamiento. → `D-0086`

### R-30 · `main` protegida, ramas cortas — ACTIVA

`main` protegida → rama corta → implementación → verificación → PR → revisión independiente → CI verde → aprobación humana cuando corresponde → merge.

Qué cuenta como "revisión independiente" para un PR concreto lo define `R-33`. R-30
fija la posición del paso en el flujo; R-33 fija el procedimiento cuando esa revisión
se hace mediante un subagente aislado del mismo proveedor de modelo. No son
redundantes: un PR puede tener revisión independiente humana sin pasar por R-33, y R-33
no vuelve obligatorio el paso donde R-30 lo menciona — eso lo decide T-0009 en su
`## Non-scope`.

---

## 8. Higiene periódica

### R-31 · Revisión mensual de contexto — RETIRADA

Se retiró el 09/11/2026 en `T-0043`: en dos meses no hubo una sola ejecución registrada. Lo que protegía (que `CLAUDE.md` y `AGENTS.md` no crezcan ni envejezcan) se sostiene con una sola fuente de estado en `PROJECT.md`.

### R-32 · El dominio crece por evidencia — ACTIVA

No crece porque una biblioteca ofrezca una feature, porque un modelo recomiende una entidad, porque Zoho tenga un módulo con ese nombre, porque una UI necesite temporalmente un campo, ni porque pueda ser útil algún día.

---

## 9. Revisión

### R-33 · Revisión ciega por subagente aislado — ACTIVA; obligatoria en `FEATURE` y `MIGRATION`

Un check en verde prueba que el código hace lo que el test dice, no que el test diga lo
correcto. La independencia que hace falta para notar la diferencia viene de **no
compartir contexto**, no de no compartir proveedor de modelo ni modelo: un subagente que
arranca sin ver el historial de conversación, los skills invocados ni los archivos que
leyó quien implementó ya aporta esa independencia hoy, sin depender de que exista un
segundo execution provider: esta regla no resuelve `D-0016`, cuyo estado se consulta en
`decisions.yaml`.

Cuando un PR se somete a esta revisión, el procedimiento es:

1. El reviewer recibe el contrato de la tarea leído **desde `main`**, nunca desde la
   rama que se revisa — leerlo desde la rama filtra exactamente la narrativa que la
   revisión existe para no compartir.
2. Recibe el diff completo, tests incluidos: un test existente modificado es la señal
   de mayor valor de cualquier diff agéntico, y omitirlo del paquete de revisión sería
   ocultar la parte más informativa.
3. Busca `DOMAIN.md` y `decisions.yaml` por su cuenta. No recibe un extracto curado de
   decisiones: un extracto es el criterio de quien lo arma, y pasarlo convierte la
   revisión ciega en una revisión guiada.
4. No recibe el transcript de la sesión de implementación ni su justificación
   narrativa.
5. **Corre los comandos de `## Verification` antes de leer cualquier archivo de
   evidencia** (`ops/evidence/T-xxxx.md` u otro). El orden es el contrato, no un
   detalle de estilo: la evidencia es lo que se revisa, no aquello con lo que se
   revisa, y leerla primero contamina el resto de la revisión con lo que el
   implementador dice que pasó en vez de con lo que efectivamente pasa.
6. Produce salida categorizada `Act on` / `Consider` / `Noted` / `Dismissed`. Todo
   `Dismissed` lleva justificación escrita; sin ella, no es una categoría, es un
   silencio con etiqueta.

Un reporte sin ningún `Act on` es un resultado legítimo, pero entonces lo dice así, con
el argumento por el cual no encontró nada que ameritara cambio, en vez de inflar
`Noted` para simular actividad.

**Cuándo es obligatoria.** Todo PR de una tarea `FEATURE` o `MIGRATION`, y todo PR cuyo
diff toque una ruta sensible —migraciones, identidad y autorización, controles de acceso
de las apps, endpoints y webhook, operaciones y persistencia de los contextos,
integraciones externas, guardrails de los agentes, workflows y validadores— pasa por este
procedimiento antes del merge, y su reporte queda versionado en `REVIEWS/` con el id de la
tarea en el path. La lista vive en `scripts/check-review-required.mjs`, que CI corre en la
versión de la rama y en la de la base. La etiqueta no exime: un CHORE/LOW que toca una
migración la necesita igual. La lista tampoco exime: el revisor o el owner pueden escalar
un cambio sensible que no figure. El PR que sólo planifica una tarea FEATURE o MIGRATION
—la agrega y no toca más que documentación— no la exige: la exige el PR que la implementa,
cuando el kind ya está en `main`. En los demás casos es opcional. CI comprueba que el
reporte exista, no lo que dice ni si cubre la versión final: es un control de presencia, y
el reporte lo lee el owner. → `D-0052`, `D-0086`

**Proveedor.** El revisor puede ser un subagente del mismo proveedor que implementó: la
independencia viene de no compartir contexto.

**Prototipo y Gauntlet.** El prototipo de `docs/north-star/prototipo` trabaja con una
tarea por versión y sólo con datos sintéticos. Su revisión de Gauntlet vale como esta
revisión si cumple sus propiedades: revisor aislado del implementador, contrato leído
desde `main`, diff completo, comprobaciones propias y reporte ligado a la versión
revisada. Es una equivalencia, no una exención. Si el prototipo incorpora datos reales,
efectos externos o publicación para clientes, se reevalúa el alcance antes de hacerlo.

El alcance no se eligió por principio sino por el contraste entre las dos primeras
revisiones reales. Sobre T-0010 —`CHORE`, `riskClass: LOW`, sin lógica de dominio— el
subagente aislado no encontró ningún `Act on`, y eso era coherente con la tarea. Sobre
T-0012 —`FEATURE`, `riskClass: MEDIUM`, el primer schema— devolvió STOP con tres
BLOCKER y ocho MAJOR sobre un diff cuyo `pnpm check` local estaba en verde, incluidas
cuatro invariantes que el ADR y la evidencia declaraban cubiertas sin estarlo. El
rendimiento del procedimiento sigue al riesgo del diff, así que su obligatoriedad
también.

CI comprueba que el reporte exista, no que el reviewer haya estado efectivamente
aislado: esa es la propiedad que da valor al procedimiento y la única que un check no
puede observar desde afuera. Sigue siendo responsabilidad de quien dispara la revisión.
