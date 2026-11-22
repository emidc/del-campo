# Del Campo — PROJECT.md

**Actualizado:** 2026-11-13 · Rumbo vigente: `D-0090`

## 1. Qué estamos construyendo

**Broker OS**: el sistema de trabajo de Del Campo Broker para su equipo de ocho personas
y sus clientes empresa. Clientes, pólizas, gestiones, siniestros, riesgos y comunicación en
un solo lugar. Reemplaza progresivamente a Zoho CRM.

Tiene que ser simple, intuitivo y lindo a la vista. La referencia de experiencia es el
prototipo (`docs/north-star/prototipo`).

La prioridad única es que el equipo tenga cuanto antes una versión útil. La primera persona
que lo usa es Manuel, y el primer trabajo real es el análisis de riesgos de una empresa.
Emiliano decide cuándo está lista para usarse.

## 2. Cómo está armado

**Un solo sistema.** Una aplicación (`apps/web`), una base de datos en Supabase y un
proyecto de Vercel. Riesgos y Comunicación son secciones de Broker OS.

**Dos tipos de usuario.** El equipo Del Campo entra con Google y ve y edita todo. El
cliente entra al portal y ve sólo su empresa. No hay más roles.

**Broker OS por un lado, agentes por el otro.**

- Broker OS guarda y muestra los datos. No contiene el método de trabajo.
- Un **agente** es un conjunto de instrucciones versionadas (`agentes/<nombre>/`) que corre
  en una interfaz como Claude y lee, modifica y guarda datos en Broker OS a través de un
  servidor MCP propio. Trabaja junto a una persona del equipo y con su usuario.
- Los agentes mejoran por versiones, a partir de lo que se detecta al usarlos.
- El primero es el **agente de riesgos**. Los demás se definen cuando ése esté en uso.

**Riesgos.** El agente y el equipo trabajan y refinan los riesgos de una empresa. El
resultado se ve en la sección Riesgos de esa empresa: lista de riesgos, plan de acción y
transferencia. La empresa accede a su panel por el portal, y cada ítem se puede comentar
entre la empresa y el equipo.

## 3. Dónde estamos

Ya funciona en `apps/web`: login con Google, clientes y pólizas importados de Zoho,
búsqueda, fichas editables, prospectos, gestiones, renovaciones, siniestros, cotizaciones, tareas con tablero semanal, inicio con
indicadores, la sección Comunicación, que recibe y responde WhatsApp desde el 16/11/2026,
la sección Riesgos en la ficha de empresa y el servidor MCP con las herramientas del agente
de riesgos.

Queda del rumbo anterior y se va a retirar: Risk OS como aplicación separada (`apps/risk`,
`contexts/risk`), con su base y su login, y los roles por función. Mientras tanto no se
invierte más en ella. Communication OS ya se retiró (`T-0066`).

Postergado al 01/01/2027 por Emiliano: el refresco de datos de Zoho (`T-0037`) y la semana
de prueba sin Zoho (`T-0055`).

## 4. Plan

En este orden. El detalle de cada una está en `TASKS/` y en Linear.

| # | Tarea | Estado | Qué habilita |
|---|---|---|---|
| 1 | `T-0061` Sección Riesgos de cada empresa | Hecha | Ver y editar riesgos, acciones y transferencia en Broker OS |
| 2 | `T-0062` Servidor MCP de Broker OS | Hecha | Que un agente lea y guarde datos |
| 3 | `T-0063` Agente de riesgos v1 | En curso | Manuel hace un análisis con el agente y queda guardado |
| 4 | `T-0071` Riesgos de las empresas piloto | En curso | Primeros análisis reales; Antucura ya está cargada |
| 5 | `T-0060` Usuarios: equipo y cliente | En curso | Base para el portal y menos complejidad |
| 6 | `T-0064` Portal de empresa con su panel de riesgos | Pendiente | La empresa ve y comenta sus riesgos |
| 7 | `T-0065` Retirar Risk OS separado | Pendiente | Menos código y costo |
| 8 | `T-0072` Avisos de mensajes al responsable del cliente | En curso | Cada mensaje de WhatsApp le avisa a quien le toca |

Hechas: `T-0066` Comunicación como sección, `T-0068` teléfono y mail en la ficha,
`T-0069` datos editables y prospectos, `T-0070` Tareas y Equipo.

`T-0067` (acercar la interfaz al prototipo) avanza en paralelo, pantalla por pantalla, a
medida que se toca cada sección.

## 5. Qué no estamos haciendo

- Tres sistemas que se hablan por API, bases separadas o esquemas aislados.
- Roles internos, permisos por función o flujos de aprobación dentro del sistema.
- Método de riesgos programado dentro de Broker OS.
- Un catálogo de agentes antes de tener uno en uso.
- Auditorías, carpetas de evidencia, informes de revisión o límites de frentes.
- Cotización automática, emisión, correo, WhatsApp nuevo.

## 6. Documentos

| Documento | Para qué |
|---|---|
| `PROJECT.md` | Este archivo: rumbo, arquitectura y plan |
| `ENGINEERING_RULES.md` | Las reglas de trabajo vigentes |
| `AGENTS.md`, `CLAUDE.md` | Lo que lee cualquier agente de desarrollo al empezar |
| `TASKS/` | Las tareas; las vigentes son de `T-0059` en adelante |
| `decisions.yaml` | Decisiones que cambian el rumbo; `pnpm decisions` las lista |
| `DOMAIN.md` | Vocabulario del negocio, de consulta |
| `docs/north-star/prototipo` | La referencia visual y de experiencia |
| `docs/despliegue/`, `docs/desarrollo/` | Cómo desplegar y cómo levantar el entorno local |

Histórico, sólo de consulta: `DECISIONS/`, `REVIEWS/`, `SLICES/`, `SPIKES/`, `ops/`,
`docs/north-star/01` a `12` y `docs/history/`.
