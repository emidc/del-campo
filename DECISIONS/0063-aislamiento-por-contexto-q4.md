# ADR-0063 — Aislamiento por contexto dentro del monolito modular durante Q4 2026

- **Id en `decisions.yaml`:** D-0063
- **Fecha:** 2026-09-29
- **Supersede:** — (complementa D-0012; no la reemplaza)

## Contexto

El Q4 Operating Plan agrega dos laboratorios a Broker OS: Risk OS v1 y Communication OS.
El plan no exige integrar los tres sistemas durante Q4 y deja para el cierre del
trimestre la decisión de integrar, iterar, mantener separados o descartar componentes.
Surgió la pregunta de si la decisión de arquitectura original sigue sirviendo.

Hechos del repositorio al 2026-09-29 (`main` en `e3e66a4`):

1. **D-0012 no dice "monolito" a secas.** Dice monolito modular con workers separados,
   sin microservicios mientras no demuestren valor operativo u organizativo. La pregunta
   no es si abandonarla, sino qué significa "modular" cuando aparecen dominios nuevos.
2. **Hoy los módulos están separados por capa, no por contexto.** `packages/domain`,
   `packages/db`, `packages/api` y `apps/web`, con los límites de R-25 aplicados por lint.
   Esa separación sirve para un solo dominio. Si Risk y Communication entraran en esos
   mismos paquetes, compartirían `domain` y `db` con pólizas y documentos, y R-25 no
   podría distinguir un contexto de otro.
3. **Los dos laboratorios tocan conceptos que `DOMAIN.md` deja fuera del modelo a
   propósito.** `EnterpriseRisk` (§76) está como NAMED, NOT MODELED, y su estructura "la
   determina el POC". `WhatsApp Communication` (§52) también. D-0028 (persistencia
   de WhatsApp) está OPEN y D-0014 (hosting del worker) está PROVISIONAL.
4. **La autorización de datos reales vigente es acotada.** D-0062 enumera las tablas de
   VS01 que pueden estar en producción y excluye a los agentes. Matrices de riesgo de
   empresas reales y mensajes de WhatsApp son otra clase de datos y no están cubiertos.
5. **Capacidad.** 28 h semanales de programa técnico, un desarrollador, como máximo dos
   tareas activas y un spike (`PROJECT.md` §5). Cada proceso, pipeline o despliegue
   adicional sale de ese presupuesto.

Se contrastaron dos opiniones independientes. Coinciden en lo central: no pasar a
microservicios, agregar contextos explícitos, cada contexto dueño de sus datos, trabajo
largo fuera del request web y criterios observables para extraer un servicio. Difieren
en cuánta plataforma compartida construir ahora. Las diferencias se resuelven abajo.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0063. Acá está la evidencia y
la forma concreta de aplicarla.

## Cómo se aplica

**Principio.** Las fronteras de dominio son más estables que las fronteras de
despliegue. Hoy se fijan los contextos; cuántos procesos o despliegues hay se decide
caso por caso y puede cambiar sin tocar el dominio.

**Estructura.** Cada laboratorio es un paquete del workspace bajo `contexts/`:

```text
contexts/
  risk/            @del-campo/risk
    src/domain/          sin imports, igual que packages/domain
    src/persistence/     migraciones SQL propias y consultas
    src/application/     casos de uso; lo único que exporta el paquete
  communication/   @del-campo/communication
    (misma forma)
```

Broker OS conserva `packages/*` y `apps/web` tal como están. No se mueven ni se
renombran después de la aceptación de VS01. Si al cierre de Q4 se decide integrar, esa
reorganización es parte de la integración.

La carpeta de un contexto se crea con su primer código real, no antes (R-01). Los
límites de lint se escriben en la misma tarea:

- ningún contexto importa `@del-campo/domain`, `@del-campo/db`, `@del-campo/api` ni otro
  contexto;
- ni `packages/*` ni `apps/web` importan un contexto;
- `src/domain` de cada contexto no importa nada;
- quien consume un contexto (su app o su worker) importa solo lo que exporta
  `src/application`.

**Datos.**

- Cada contexto es dueño de un esquema de Postgres propio (`risk`, `communication`), con
  sus migraciones (D-0045) y, cuando haya despliegue, su propio rol de base de datos.
- Ninguno lee ni escribe tablas de otro esquema.
- En desarrollo y CI se usa el mismo Postgres local (D-0046), con datos sintéticos.
- Dónde viven los datos reales de cada laboratorio es una decisión y una autorización
  aparte (R-19). D-0062 no se extiende.

**Sin núcleo compartido en Q4.** No se crea un módulo `accounts`, `platform` ni
`identity`.

- Cada laboratorio representa sus empresas o participantes con lo mínimo que necesita.
- Si hace falta preparar una integración futura, un laboratorio puede guardar un
  identificador opaco de `Party`, sin clave foránea ni lectura del esquema de Broker.
  Agregarlo es una decisión del contrato del laboratorio, no de este ADR.

**Procesos.**

- El trabajo largo o continuo de un contexto corre en un worker propio, como ya prevé
  D-0012, y no dentro del ciclo de vida de un request web.
- El hosting de ese worker sigue en D-0014.
- La forma concreta de ingesta de WhatsApp (webhook de la API oficial o sesión
  persistente de un dispositivo vinculado) la decide el spike de integración, no este
  ADR.

**Despliegue.**

- La unidad de despliegue de cada laboratorio la fija su contrato: una app propia, un
  worker, o ambos.
- Ningún laboratorio se despliega en el entorno de producción de VS01 ni usa sus
  credenciales sin una autorización propia.

**Lo que espera al segundo caso (R-01).** Estas piezas se incorporan cuando haya dos
consumidores concretos, no antes:

- una cola de trabajos genérica;
- una tabla de eventos o outbox;
- un bus de eventos entre contextos;
- una interfaz genérica de adapters de integración;
- eventos de dominio publicados entre contextos.

El primer caso se resuelve directo, dentro del contexto que lo necesita. Por ejemplo, el
código que habla con WhatsApp vive en `contexts/communication/src/persistence` o en una
carpeta de integración del mismo contexto, sin una capa abstracta encima.

**Criterios para extraer un contexto a un servicio independiente.** Cualquiera de estos,
con evidencia observable:

- necesita escalar, desplegarse o recuperarse de forma independiente;
- una falla suya compromete la disponibilidad de otro contexto;
- necesita un runtime o infraestructura persistentemente distinta;
- sus ciclos de release interfieren de forma sostenida con otro;
- hay equipos distintos responsables de cada contexto;
- seguridad, clasificación de datos o compliance exigen una frontera de infraestructura.

La clasificación de los mensajes de WhatsApp (D-0028) es el candidato más probable del
último criterio.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Poner Risk y Communication en `packages/domain`, `db` y `api` | Mezcla dominios en paquetes separados por capa, R-25 no los puede aislar y lleva conceptos sin modelar (§52, §76) al dominio canónico. Descartar un laboratorio implicaría deshacer migraciones y cambios en `DOMAIN.md`. |
| Un repositorio por laboratorio | Aísla al máximo, pero duplica el arnés: CI, lint, congelamiento del contrato de tarea, registro de AgentRuns y revisión ciega. Con un solo desarrollador, ese costo lo paga el producto. Además, una integración posterior sería más cara. |
| Microservicios (Broker, Risk y Communication con API, despliegue, autenticación y observabilidad propios) | Paga costos de sistema distribuido antes de saber si las fronteras son correctas, que es justamente lo que Q4 tiene que descubrir. No se cumple ninguno de los criterios de extracción. |
| Núcleo `accounts`/`platform` compartido (identidad, auditoría, jobs, eventos, observabilidad) desde ahora | Adelanta la integración que el plan de Q4 deja para el cierre del trimestre. Haría depender a los laboratorios del modelo de `Party` de Broker (merge, identidad fiscal, D-0035), obligaría a reorganizar el schema de VS01 y construiría plataforma sin un segundo consumidor (R-01). |
| Diseñar Risk OS alrededor de trabajos asíncronos con LLM | El plan de Q4 dice que la IA no es condición de aceptación de Risk OS. Si aparece, se evalúa con su propio caso. |
| Reformar el schema de Broker a esquemas de Postgres (`broker.*`) ya | Movería tablas de un sistema recién aceptado con datos reales en producción, sin beneficio en Q4. Broker se queda en el esquema actual y los contextos nuevos nacen con el suyo. |

## Consecuencias

**Más fácil.**

- Descartar un laboratorio: se borra su carpeta y su esquema.
- Integrarlo más adelante: ya tiene frontera, API interna y datos propios.
- Separarlo en un servicio si aparece evidencia: el trabajo difícil, que es desenredar
  dependencias, no existe.
- Mantener fuera de VS01 los datos de otra clase.
- Aprovechar el arnés existente sin duplicarlo.

**Más difícil.**

- Algunos conceptos se duplican a propósito. Por ejemplo, "empresa" existe en Broker y en
  Risk. Si se decide integrar, habrá que reconciliarlos, y ese costo se acepta a cambio
  de no adelantar la integración.
- Aparecen dos convenciones: Broker está separado por capa y los contextos nuevos por
  dominio. Es una asimetría consciente y se resuelve al cierre de Q4.
- R-25 crece con más reglas de lint.

**Costo de revertir:** bajo. Si se decidiera meter un laboratorio dentro de Broker, se
mueve un paquete y un esquema. En la dirección contraria, sacar dominios mezclados de
`packages/*`, sería alto; ese es el costo que esta decisión evita.

## Criterio de falsación

Esta decisión se revisa si pasa alguna de estas cosas:

- Un laboratorio no puede cumplir su aceptación de Q4 sin leer o escribir datos de
  Broker. Eso indica que la frontera está mal o que la integración debe adelantarse, y la
  decisión vuelve a la sesión estratégica.
- El costo de mantener los límites (reglas de lint, esquemas propios, duplicación)
  genera retrabajo medible mayor que el que evita.
- Aparece alguno de los criterios de extracción listados arriba.
- En todos los casos, se revisa en la decisión de cierre de Q4.
