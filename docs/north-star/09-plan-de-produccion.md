# Plan de paso a producción · de la north star v25 al Broker OS real

Transcripción del plan del 02/11/2026, aprobado por Emiliano junto con la creación del
backlog (PR #94: `T-0033` a `T-0037`; Linear EMI-46 a EMI-61, relacionadas con EMI-45).
Las fechas posteriores a Q4 son **estimadas** con un solo desarrollador y el límite de dos
tareas activas de `PROJECT.md` §5; se ajustan al cerrar cada etapa. Las recomendaciones
de la sección de decisiones son propuestas, no decisiones tomadas.

## Principio

El plan lleva la v25 a producción en **cinco etapas y trece cortes verticales**, sin
reutilizar el código del prototipo: el prototipo es la especificación de experiencia y
reglas, y sus aserciones de Playwright son los criterios de aceptación de alto nivel
([10](10-pruebas-como-criterios.md)). Cada corte es un slice con contrato propio en
`SLICES/` (como VS01, CO01 y RO01), deja algo usable por el equipo, se acepta con casos
reales medidos y se ejecuta con el método de Project OS (tarea con Why, Outcome,
Non-scope y Verification, revisión ciega, evidencia en `ops/evidence/`).

Las decisiones DA-1 a DA-9 ([01](01-arquitectura-funcional.md#1-decisiones-arquitectónicas-definitivas))
pasan sin cambios al sistema real, y cada corte las verifica con una prueba propia, no
solo con revisión. Se suma una regla propia del paso a producción: **el código del
prototipo no se porta**; se portan sus pantallas, textos, estados y pruebas, reescritas
contra el sistema real.

## Etapas

| Etapa | Cuándo | Qué incluye | Compuerta de salida |
|---|---|---|---|
| 0 · Cerrar y decidir | Noviembre 2026 | Sin cortes nuevos. Terminar `T-0032` y aceptar RO01 (prevista el 25/11); registrar las decisiones bloqueantes (`T-0034`); sincronizar Linear con el repo; versionar esta north star (`T-0033`) | RO01 aceptada y decisiones bloqueantes registradas |
| 1 · Fundación | Diciembre 2026, cierre de Q4 | C1, C2, C3 | Una persona del equipo entra a los tres contextos con la misma identidad y cada acción queda auditada en el servidor |
| 2 · Trabajo diario | Estimado Q1 2027 | C4, C5, C6 | El equipo trabaja una semana en Broker OS sin abrir Zoho CRM para consultar |
| 3 · Riesgos completos | Estimado Q2 2027 | C7, C8, C9, C10 | Un ciclo completo con una empresa real, del relevamiento al informe anual aprobado |
| 4 · Hacia afuera | Estimado desde Q3 2027 | C11, C12, C13 | Una empresa real usa el portal y el equipo usa MCP desde un LLM sin copiar y pegar |

Cada etapa se abre solo cuando la anterior pasó su compuerta. Todos los cortes
posteriores dependen de C1.

## Cortes

| Corte | Etapa | Qué queda funcionando | Depende de | Aceptación (pruebas del prototipo a reescribir) | Seguimiento |
|---|---|---|---|---|---|
| C1 Identidad, permisos y auditoría | 1 | Login único (Google corporativo) en los tres contextos; permisos por rol en el servidor; registro de eventos con actor, origen, entrada, salida y efecto | `T-0002` → D-0022; revisar D-0066 y D-0069 | `permisos.js`, `aislamiento.js`, `bancarios.js` | `T-0035`, EMI-49 |
| C2 Empresa ↔ organización evaluada | 1 | Risk OS tiene organización con sector, tamaño y zonas; correspondencia explícita con la empresa de Broker OS | Decisión de cierre de Q4 sobre D-0063 y D-0067 | Riesgos solo en empresas; zonas para el layout | `T-0036`, EMI-50 |
| C3 Datos vivos | 1 | Refresco de clientes y pólizas desde Zoho (o su reemplazo) con fecha de corte visible; planes pagos | EMI-34; revisar D-0062 | Medir cobertura de documentos (U8) | `T-0037`, EMI-51 |
| C4 Shell unificado y fichas | 2 | Navegación y sistema visual del prototipo; fichas de persona, empresa y póliza con notas internas; Riesgos dentro de la empresa como proyección de Risk OS | C1, C2 | `fichas-v9.js`, `rutas.js`, `visual-a11y.js` | EMI-52 |
| C5 Importación A1 | 2 | CSV de evaluaciones con vista previa, errores, conflictos, reimportación y escritura atómica; evaluaciones pendientes que acepta otra persona | C1, AD-11, AD-16 | `r-imp.js`, `importar-v19.js`, V25-6 | EMI-53 |
| C6 Gestiones e Inicio por rol | 2 | Tareas, siniestros por etapas, cotizaciones, renovaciones y gestiones manuales; Inicio por rol con KPIs definidos y sin ranking | C1, C4, AD-12 | `inicio-v24.js`, `kpis.js`, `gestiones-v17.js`, R1 a R6 | EMI-54 |
| C7 Relevamiento y cuestionario | 3 | Seis pasos con candidatos, inspección, cuestionario y validación; el equipo carga las respuestas de la empresa | C2, C5, R-19 | V25-1 a V25-7 | EMI-55 |
| C8 Brechas de cobertura (A2) | 3 | Importador A2 y revisión humana (confirmar, descartar, pedir información, riesgo aceptado) | C7 | V25-8 | EMI-56 |
| C9 Verificación de pólizas (A3) | 3 | Comparación pedido / propuesta / emitida; reclamo a la compañía; «verificada» solo sin diferencias abiertas | D-0025, C6 | V25-9 | EMI-57 |
| C10 Informe anual (A4) | 3 | Texto del LLM + ocho secciones calculadas; aprobación por otra persona; congelamiento; PDF | C8, C9, plantilla de marca | V25-11 | EMI-58 |
| C11 Comunicación vinculada | 4 | Conversación ↔ persona por `contact_point`; correo; prompt contextual copiable | C1, decisión U1, decisión de correo | `r7-r8-am32.js`, `delegar-v15.js` | EMI-59 |
| C12 Portal de empresas | 4 | Cuentas por contacto; aislamiento en el servidor; resumen, riesgos, preguntas, solicitudes e informe compartido | D-0022, C1, C10 | `aislamiento.js`, V25-4.aisl, V25-12.aisl | EMI-60 |
| C13 Servidor MCP | 4 | Primero herramientas de lectura, después las de borrador; sin herramientas de decisión | C1, R-19, C5 a C10 | Contrato B de [05](05-contratos-de-integracion.md#b--mcp--skills-preferido-a-futuro-demostración-en-el-prototipo) | EMI-61 |

`T-0002` (spike de autorización, EMI-48) es el primer trabajo de la etapa 1 y bloquea C1,
C12 y C13. Las etapas 2 a 4 viven como issues de Linear en Backlog y pasan a tareas del
repo cuando se escriba el slice de su etapa.

## Decisiones del owner

Catorce decisiones abiertas condicionan el plan; cuatro bloquean la etapa 1. Ninguna
queda tomada por este documento: las registra `T-0034` en `decisions.yaml`.

| Decisión | Qué hay que decidir | Recomendación del plan | Bloquea |
|---|---|---|---|
| Cierre de Q4: D-0063 y D-0067 | Si los contextos siguen aislados y cómo se corresponden empresa y organización | Mantener contextos separados con proyecciones de solo lectura y un mapa explícito empresa ↔ organización | C2, C4 |
| D-0022 (spike `T-0002`) | Dónde se hace cumplir la autorización: RLS, aplicación o híbrido | Ejecutar el spike en diciembre; es el primer trabajo de la etapa 1 | C1, C12, C13 |
| D-0066 y D-0069 | Tres esquemas de acceso | Reemplazarlos por la identidad Google de VS01 (D-0059) con roles por persona | C1, C11 |
| U1: clientes en CO01 | Autorizar formalmente que el número atienda clientes, o volver al alcance aceptado | Autorizar con datos mínimos, acceso individual y retención revisada | C11 |
| R-19 para LLM externos | Qué proveedores, modelos y datos se pueden enviar en los pasos 1 y 3 y por MCP | Extender D-0070 con una lista cerrada de proveedores y datos | C7, C13 |
| D-0062 | Planes gratuitos con datos reales | Pasar a planes pagos antes de sumar usuarios (EMI-34) | C3 |
| D-0025 | Cómo se representa la cobertura | Modelar conceptos de cobertura por versión de póliza; sin eso no hay «verificada» | C9 |
| AD-11 | Reimportación con IDs reusados | IDs estables por empresa y append-only, como en el contrato A1 | C5 |
| AD-16 | Quién reordena y si quien escribe una reevaluación puede aceptarla | Nunca la misma persona (DA-8) | C5 |
| AD-12 | Umbrales de alertas del Inicio | Empezar con los del prototipo y medirlos un mes | C6 |
| AD-13, AD-14 | Presentación de la lista de riesgos y bloqueo del orden previo | Tomar la del prototipo; mantener el orden previo ciego solo en empresas históricas | C4 |
| AD-15, AD-17 | Autor externo en novedades; sin sub-riesgos | Autor externo solo con el portal; sin sub-riesgos | C7, C12 |
| Puntaje del panel | Confirmarlo con la metodología de Risk OS | Decidirlo junto con EMI-43 (v1.1) y EMI-44 (validación independiente) | C4 |
| Correo y `PROJECT.md` §4 | Zoho Mail o Gmail; levantar las exclusiones de portal y agentes después de Q4 | Decidir al cerrar la etapa 2, con el reemplazo de Zoho | C11, C12, C13 |

## Riesgos del plan

| Riesgo | Señal | Mitigación |
|---|---|---|
| Capacidad y meta-trabajo desplazan al producto | Más de dos tareas ACTIVE o un corte sin aceptar más de 6 semanas | Límite de WIP de `PROJECT.md` §5; recortar el corte antes que extender el plazo |
| Portar el prototipo como código | Copias de `fuente/src` o de `docs/north-star/prototipo/` en `apps/` | Regla explícita en cada tarea: se portan pantallas, estados y pruebas, no código |
| Datos de clientes en LLM externos sin autorización | Pegado de PII en ChatGPT o Gemini | Decisión R-19 antes de C7; CSV y MCP con datos mínimos; auditoría de cada llamada MCP |
| CO01 opera con clientes sobre credencial compartida | Mensajes de clientes sin decisión registrada | Decisión U1 en la etapa 0; credencial por persona en C1 |
| Falsa precisión del método de riesgos | Kappa 0,20 y 69,6 % de acuerdo de banda en la fase 12 | Sin índice frente a la empresa; EMI-43 y EMI-44 antes del informe anual con clientes |
| Datos viejos erosionan la confianza | VS01 sigue con la foto del 16/09 | C3 en la etapa 1, con fecha de corte visible en pantalla |
| Planes gratuitos con datos reales | Límites de Supabase o Vercel | D-0062 revisada antes de sumar usuarios |
| El equipo no adopta | Uso semanal bajo después de cada corte | Aceptación con casos reales y tiempos medidos, como VS01; sesión con el equipo al cerrar cada etapa |
