# Plan hacia la north star (v4)

Registro de `T-0038`. Versión revisada por el owner el 07/11/2026. Las decisiones que lo sostienen están en `decisions.yaml` (D-0080 a D-0084); este documento no decide nada nuevo. La north star es una dirección y el plan admite cambios: **las fechas son objetivos, no compromisos**. La tabla completa, con referencias, está en [`12-plan-hacia-la-north-star.csv`](12-plan-hacia-la-north-star.csv).

## 1. Supuestos del calendario

- Emiliano dedica 8 h los días hábiles y 4 h los fines de semana y feriados nacionales; el cálculo usa 6 h y 3 h efectivas.
- Tres agentes (Claude Code, Codex, Gemini, D-0082), con un implementador por tarea. Codex y Gemini trabajan sólo con datos sintéticos hasta `T-0039`.
- Cinco frentes activos como máximo, sin sublímites (D-0080). Una espera pasiva (factura, Meta, las 24 h, observación de OIDC) declara `waiting` y no cuenta; vuelve a contar cuando exige trabajo.
- Todo el trabajo humano, la revisión y la aprobación recaen en Emiliano. Para uso interno rige la aprobación por operador único (D-0083); las entregas al cliente siguen necesitando otra persona humana (PER-01).
- Escenarios: optimista ×1, probable ×1,5 y pesimista ×2 sobre el esfuerzo. Las esperas fijas (14 días de observación de OIDC, 7 días de uso) no se escalan.
- Presupuesto de infraestructura: objetivo USD 55, techo USD 66 por mes con impuestos (D-0081). Las suscripciones de IA no cuentan.

## 2. Hitos

| Hito | Qué significa | Optimista | Probable | Pesimista |
|---|---|---|---|---|
| M-RO | RO01 aceptado para uso interno | 2026-12-10 | **2026-12-23** | 2027-01-11 |
| M1 | Fundación lista | 2026-12-22 | **2027-01-06** | 2027-01-30 |
| M2 | Una semana de trabajo diario sin abrir Zoho CRM | 2027-01-25 | **2027-02-27** | 2027-04-04 |
| M3 | Riesgos y relación con el cliente | 2027-03-11 | **2027-05-09** | 2027-07-08 |
| M4 | Broker OS completo (north star) | 2027-04-13 | **2027-06-26** | 2027-09-11 |

Los hitos de Linear usan la fecha probable. Antes de mover un hito se recalcula el plan.

## 3. Camino crítico

Camino estructural (el más largo por dependencias, con el esfuerzo probable):

`INF-03` → `RO-02a` → `RO-02b` → `C1-11` → `C1-12a` → `C1-16` → `C2-04` → `M1` → `E2-01` → `C4-01a` → `C4-01b` → `C4-01c` → `C6-01` → `C6-02a` → `C6-02b` → `C6-02c` → `C6-03a` → `C6-03b` → `E2-02` → `E2-03` → `M2` → `E3-01` → `C7-01` → `C7-03` → `C8-01` → `C10-01` → `C10-02` → `E3-02` → `M3` → `E4-01` → `INF-05` → `C12-01` → `C12-03` → `E4-02` → `M4`

Lo que no está en el camino crítico se puede adelantar o atrasar sin mover M4, mientras haya frentes libres. Desde el 10/11 la consolidación de Broker OS y Risk OS en un proyecto Supabase queda postergada (INF-00a a INF-00c, `T-0040`): INF-03 prepara el proyecto Free dedicado de Risk OS (D-0068) y ya no espera el ADR. También desde el 10/11 el owner sigue en Free y posterga el paso a Pro (INF-CHK, INF-01, INF-02 e INF-04): D-0079 sigue aceptada, pero hasta que se retome rigen la alternancia y las copias de D-0087, y C3-06 e INF-05 ya no esperan a Pro. Las fechas no se recalcularon con estos cambios.

## 4. Reglas de ejecución

- **Cada parte tiene su aceptación.** "Listo cuando…" es la evidencia mínima; la `## Verification` de la tarea del repo la concreta.
- **Los agentes trabajan fuera de producción.** Preparar datos e importar son tareas separadas; el paso a producción lo corre o aprueba Emiliano (R-13, R-14).
- **Ciclos de Linear sólo para lo cercano.** Se comprometen los ciclos 4 y 5; lo demás queda en el backlog con su hito.
- **Consolidación postergada, con revisión obligatoria:** Risk OS sigue en su proyecto Free dedicado (D-0068). La consolidación con Broker OS se vuelve a evaluar antes de cargar las históricas de Risk, antes del uso habitual del equipo o cuando hagan falta las tres apps activas a la vez; si se decide consolidar, INF-00a a INF-00c vuelven antes de la carga. En cualquier destino, backup probado antes de cargar datos reales.
- **Pro postergado, con revisión obligatoria:** mientras los proyectos sigan en Free, las copias son las de D-0087. El paso a Pro (INF-CHK, INF-01, INF-02, INF-04) se vuelve a evaluar antes del refresco de producción (C3-06), antes del uso habitual del equipo y antes del primer acceso externo (INF-05).
- **La observación de OIDC dura 14 días** con evidencia del período completo; un fallo la reinicia. No hereda excepciones de otros contextos.
- **Estados de tareas:** aprobar este plan no cambia T-0032 (sigue `BLOCKED`) ni T-0036 (sigue `DRAFT`).

## 5. Tareas por etapa

Fechas en el escenario probable (día/mes). Tipo: `tarea` (agente con revisión), `humana`, `decision`, `espera`, `hito`. Q: quién ejecuta (A agente, E Emiliano).

### Etapa 0 · Decidir y preparar

| Id | Tarea | Tipo | P | Fechas | Depende de | Listo cuando | Repo |
|---|---|---|---|---|---|---|---|
| GOV-01a | Registrar el WIP de cinco frentes activos, con las esperas pasivas fuera, y ajustar el validador | decision | P0 | 09/11–11/11 | — | PROJECT.md §5 y check-docs aceptan cinco frentes activos y una espera pasiva no cuenta. | `T-0038` |
| **GOV-01b** | Registrar el tope de USD 55 más 20 % (techo USD 66) y corregir los textos que citan USD 45 | decision | P0 | 09/11–11/11 | — | una decisión reemplaza en parte a D-0079 y ningún documento vigente cita USD 45 como tope. | `T-0038` |
| GOV-01c | Registrar Claude Code, Codex y Gemini como agentes del repo, con D-0043 abierta | decision | P0 | 09/11–11/11 | — | una decisión reemplaza en parte a D-0016 y dice qué datos puede ver cada proveedor. | `T-0038` |
| GOV-02a | Registrar la aprobación interna por operador único (excepción a DA-8) | decision | P0 | 09/11–11/11 | — | la decisión fija revisión de IA registrada, 24 h desde el último cambio material y que no habilita entregar al cliente. | `T-0038` |
| GOV-02b | Registrar la aceptación reducida de RO01 sin segunda persona (A8 no verificado) | decision | P0 | 12/11–15/11 | GOV-02a | T-0032 dice qué criterios mide, que A8 queda no verificado y qué uso interno habilita. | `T-0038` |
| GOV-04a | Proteger las rutas sensibles en local también para Codex y Gemini | tarea | P1 | 16/11–24/11 | GOV-01c | una prueba por proveedor muestra que no puede escribir una ruta protegida, sin duplicar lo que ya cubre CI. | `T-0039` |
| GOV-04b | Capturar AgentRun en las corridas de Codex y Gemini (hecho en T-0039; la captura se retiró por D-0085) | tarea | P1 | 19/11–24/11 | GOV-01c | una corrida de cada proveedor deja su AgentRun con el formato de T-0006. | `T-0039` |
| IA-01 | Registrar las cuentas de IA: proveedor, plan, condiciones, modelos y datos permitidos | humana | P0 | 12/11–16/11 | GOV-01c | cada cuenta usada con nivel 2 tiene modelo y condiciones registrados; una cuenta sin registro queda excluida. | — |

### Etapa 1 · Fundación

| Id | Tarea | Tipo | P | Fechas | Depende de | Listo cuando | Repo |
|---|---|---|---|---|---|---|---|
| INF-CHK | Verificar en el checkout el precio total con impuestos y qué cubren los límites de gasto (postergada) | humana | P0 | — | GOV-01b | el checkout y los límites sostienen un total de USD 66 o menos, con USD 55 como objetivo. | `T-0037` |
| INF-01 | Respaldar VS01 y transferir sólo su proyecto a la organización Pro (postergada) | humana | P0 | — | INF-CHK | una restauración de prueba recupera VS01 y, después de la transferencia, la app responde. | `T-0037` |
| INF-02 | Pasar Vercel a Pro con un asiento y límites compatibles con el techo (postergada) | humana | P0 | — | INF-CHK | el asiento y la pausa están configurados y las tres apps responden. | `T-0037` |
| INF-00a | Probar en sintético un proyecto compartido: roles, RLS y denegaciones cruzadas entre Broker y Risk (postergada) | tarea | P0 | — | GOV-01b | las pruebas negativas entre esquemas, pool y roles sin BYPASSRLS pasan o muestran por qué no conviene. | `T-0040` |
| INF-00b | Probar en sintético la restauración completa, la selectiva y la salida a un proyecto separado (postergada) | tarea | P0 | — | INF-00a | una restauración de un contexto no pisa al otro y la salida queda medida en pasos y tiempo. | `T-0040` |
| INF-00c | Decidir compartir el proyecto o mantener Risk OS separado (ADR) (postergada) | decision | P0 | — | INF-00b | un ADR elige con costo, aislamiento y restauración medidos; separar es un resultado válido. | `T-0040` |
| **INF-03** | Preparar el proyecto Free dedicado de Risk OS con backup probado (consolidación postergada) | humana | P1 | 23/11–24/11 | — | el proyecto está activo y un backup de prueba se restauró antes de cargar datos reales. | `T-0032` |
| INF-04 | Esperar la primera factura y conciliar el costo recurrente completo (postergada) | espera | P1 | — | INF-01, INF-02 | la factura concilia el total; sobre USD 55 se revisa y sobre USD 66 se reduce. | `T-0037` |
| DAT-01 | Exportar Zoho de nuevo (cuatro módulos) con su manifiesto | humana | P0 | 09/11–11/11 | — | los cuatro módulos tienen fecha, hash y conteos locales, y el lote anterior sigue disponible. | `T-0037` |
| C3-01a | I1a: lote declarado por manifiesto y staging que conserva cada lote | tarea | P0 | 12/11–19/11 | — | dos lotes sintéticos conviven en staging sin pisarse y ninguno exige editar código. | `T-0037` |
| C3-01b | I1b: fecha de export por módulo y comparación entre lotes que sólo cuenta | tarea | P0 | 20/11–24/11 | C3-01a | la comparación distingue nuevos, iguales, cambiados y ausentes por campo, sin escribir en el dominio. | `T-0037` |
| C3-01c | I1c: consulta U8 de cobertura documental | tarea | P1 | 20/11–27/11 | C3-01a | U8 cuenta cada póliza una sola vez en cuatro niveles, sin datos de clientes en la salida. | `T-0037` |
| C3-02 | Correr I1 con el lote real y decidir versión o corrección para las pólizas cambiadas | decision | P0 | 28/11–30/11 | C3-01b, C3-01c, DAT-01 | los conteos por campo sostienen la elección, con fecha contractual y número cambiado resueltos. | `T-0037` |
| C3-04 | I2: aplicar cambios en el dominio, idempotentes y con historia | tarea | P1 | 01/12–10/12 | C3-02 | repetir un lote no duplica y los cambios respetan la elección y conservan historia. | `T-0037` |
| C3-05a | I3a: refresco de producción en el lugar, transaccional | tarea | P1 | 11/12–16/12 | C3-04 | un fallo deja intactos datos, usuarios, asignaciones y auditoría. | `T-0037` |
| C3-05b | I3b: fecha de corte del export en la cabecera | tarea | P1 | 25/11–27/11 | C3-01b | la cabecera muestra la fecha más antigua del export, también para un lote viejo importado hoy. | `T-0037` |
| C3-06 | I4: refrescar producción, conciliar 20 pólizas y registrar U8 | tarea | P1 | 17/12–19/12 | C3-05a, C3-05b | 20 pólizas, con cambios y ausencias, concilian con Zoho y U8 suma el total. | `T-0037` |
| C1-14 | Comprobar y, si falta, aplicar la migración de jti de Communication OS | humana | P1 | 25/11–27/11 | — | producción registra jti y un segundo uso del mismo token se rechaza. | `T-0035` |
| SOU-01a | Operador único en la base de Risk OS: aprobar lo propio con revisión registrada y 24 h | tarea | P1 | 25/11–04/12 | GOV-02a | la base rechaza aprobar lo propio antes de 24 h o sin revisión registrada, y lo acepta después. | `T-0041` |
| SOU-01b | Operador único en la app de Risk OS: rótulo interno y bloqueo de exportar o entregar | tarea | P1 | 05/12–09/12 | SOU-01a | la aprobación queda rotulada como interna y exportar o compartir con un cliente se rechaza en el servidor. | `T-0041` |
| **RO-02a** | Desplegar Risk OS en el destino elegido: migraciones, roles y variables | humana | P1 | 25/11–04/12 | INF-03 | Risk OS responde en producción con las migraciones aplicadas y la guía corregida. | `T-0032` |
| **RO-02b** | Pasar Risk OS a Google con la invitación del owner | humana | P1 | 05/12–10/12 | RO-02a | el owner entra con Google, ve como propias sus acciones anteriores y la app usa risk_oidc. | `T-0035` |
| RO-02c | Verificar Risk OS sin sesión, sin asignación, con token revocado y en previews | tarea | P1 | 11/12–13/12 | RO-02b | ninguno de esos casos entrega datos y las previews usan sólo datos sintéticos. | `T-0032` |
| **C1-11** | Observar Risk OS en Google durante 14 días | espera | P1 | 11/12–24/12 | RO-02b | los logs del período completo muestran estabilidad; si falla, el plazo vuelve a empezar. | `T-0035` |
| RO-04a | Preparar el material ciego de H1 a H5 fuera del repo | humana | P1 | 14/12–16/12 | RO-02c, IA-01 | el material no revela ranking ni bandas y queda en la máquina del owner. | `T-0032` |
| RO-04b | Importar H1 a H5 con su informe sin valores | tarea | P1 | 17/12–19/12 | RO-04a | las cinco históricas están importadas y cada intento tiene su informe sin valores. | `T-0032` |
| RO-06a | Ejecutar los ciclos de actualización con aprobación interna por operador único | tarea | P1 | 20/12–22/12 | RO-04b, SOU-01b, GOV-02b | los diez ciclos tienen apertura, disparador, cierre y reevaluación en el historial. | `T-0032` |
| RO-06b | Medir los 13 criterios de RO01 y cerrar T-0032 con revisión ciega | tarea | P1 | 23/12 | RO-06a | el acta tiene cada criterio medido, A8 como no verificado y el uso interno que habilita. | `T-0032` |
| M-RO | RO01 aceptada para uso interno | hito | P1 | 23/12 | RO-06b | Emiliano firma el acta con sus fallos y su alcance. | — |
| **C1-12a** | Fase 5 de Risk OS: baja de contraseñas, etapa B y retiro de legacy del código | tarea | P1 | 25/12–28/12 | C1-11 | la app ya no alcanza risk_app ni contraseñas heredadas. | `T-0035` |
| C1-12b | Decidir el rol de la CLI del owner y si se retira la política de legado | decision | P2 | 29/12–31/12 | C1-12a | la decisión deja comprobados los comandos de la CLI con el mínimo privilegio. | `T-0035` |
| **C1-16** | Aceptar C1 en los tres contextos y cerrar T-0035 | tarea | P1 | 29/12–31/12 | C1-12a, C1-14 | la misma identidad funciona en los tres, y denegaciones, revocación y auditoría se observan. | `T-0035` |
| C2-01 | Decidir si una empresa admite varias organizaciones evaluadas y desde qué pantalla se vincula | decision | P1 | 28/11–04/12 | — | Emiliano registra la cardinalidad y la pantalla de vinculación. | `T-0036` |
| C2-02a | Organización evaluada (sector, tamaño y zonas) con RLS y auditoría | tarea | P1 | 24/12–31/12 | C2-01, M-RO | la entidad existe con migración aditiva y RLS niega los accesos indebidos. | `T-0036` |
| C2-02b | Correspondencia manual empresa ↔ organización con su pantalla | tarea | P1 | 01/01–04/01 | C2-02a | una organización se vincula como máximo a una empresa, con id opaco y sin FK entre contextos. | `T-0036` |
| **C2-04** | Aceptar C2 con una empresa histórica y casos negativos | tarea | P1 | 05/01–06/01 | C2-02b, C1-16 | el vínculo real concilia y un vínculo ajeno o pendiente se rechaza o se muestra como pendiente. | `T-0036` |
| **M1** | Fundación: identidad común, vínculo y datos vivos comprobados | hito | P1 | 06/01 | C1-16, C2-04, C3-06, M-RO | Emiliano recorre los tres contextos con la misma identidad y la fecha de corte es la real. | — |
| IA-02 | Validar la skill 1 en un caso frente al método manual | tarea | P1 | 28/11–13/12 | IA-01 | el mismo caso permite comparar omisiones, evidencia y tiempo, y la skill se corrige o se descarta. | — |
| RET-01 | Verificar la retención de Communication OS y registrar la política | tarea | P1 | 05/12–14/12 | GOV-01a | la retención observada y la política coinciden y la eliminación se probó con datos sintéticos. | — |
| COM-01a | Iniciar el trámite de Meta: número dedicado y verificación del negocio | humana | P2 | 01/01–04/01 | RET-01, C1-16 | la solicitud está presentada con sus datos y consentimientos. | — |
| COM-01b | Esperar la respuesta de Meta | espera | P2 | 05/01–18/02 | COM-01a | hay número y verificación, o un rechazo con su alternativa sin clientes nuevos. | — |

### Etapa 2 · Trabajo diario sin Zoho

| Id | Tarea | Tipo | P | Fechas | Depende de | Listo cuando | Repo |
|---|---|---|---|---|---|---|---|
| **E2-01** | Escribir los contratos de C4, C5 y C6 y registrar AD-11 a AD-16 | decision | P1 | 07/01–12/01 | M1 | C4 a C6 tienen contrato chico y cada AD separa lo decidido de lo pendiente. | — |
| **C4-01a** | Shell: navegación y sistema visual con accesibilidad | tarea | P1 | 13/01–18/01 | E2-01 | las rutas del prototipo existen en Broker OS y axe no reporta violaciones serias. | — |
| **C4-01b** | Ficha de persona con notas internas | tarea | P1 | 19/01–21/01 | C4-01a | Emiliano responde una consulta de persona sin abrir Zoho. | — |
| **C4-01c** | Ficha de empresa con notas internas | tarea | P1 | 19/01–21/01 | C4-01a | Emiliano responde una consulta de empresa sin abrir Zoho. | — |
| C4-01d | Ficha de póliza | tarea | P1 | 19/01–21/01 | C4-01a | la ficha muestra versión vigente, documento y fecha de corte. | — |
| C4-03a | Proyección de riesgos de Risk OS por API, con token entre contextos | tarea | P1 | 13/01–15/01 | E2-01, C2-04, C1-14 | la API entrega sólo lo asignado y un token repetido o una empresa ajena se rechazan. | — |
| C4-03b | Riesgos dentro de la ficha de empresa y aceptación de las fichas | tarea | P1 | 22/01–25/01 | C4-03a, C4-01c | la ficha concilia con Risk OS y, si Risk OS cae, no aparenta datos actuales. | — |
| C5-01 | Importación A1: vista previa y errores sin escribir | tarea | P1 | 13/01–21/01 | E2-01 | un CSV válido y uno inválido muestran cambios y conflictos, y cancelar no escribe nada. | — |
| C5-02a | Reimportación con IDs estables | tarea | P1 | 22/01–29/01 | C5-01 | reimportar el mismo CSV no duplica evaluaciones. | — |
| C5-02b | Escritura atómica del lote | tarea | P1 | 30/01–01/02 | C5-02a | un error a mitad del lote no deja escrituras parciales. | — |
| C5-02c | Aceptación de evaluaciones importadas: otra persona u operador único interno | tarea | P1 | 02/02–05/02 | C5-02b, SOU-01b | el autor no acepta lo suyo salvo por aprobación interna registrada, y un CSV real se importa. | — |
| **C6-01** | Gestiones manuales y su recorrido de cierre | tarea | P1 | 22/01–01/02 | C4-01b, C4-01c, E2-01 | Emiliano crea, consulta y cierra una gestión real con estado coherente y auditoría. | — |
| **C6-02a** | Siniestros por etapas | tarea | P1 | 02/02–09/02 | C6-01 | un siniestro recorre sus etapas con trazas y las acciones externas piden confirmación. | — |
| **C6-02b** | Renovaciones | tarea | P1 | 02/02–10/02 | C6-01 | las renovaciones próximas salen de las pólizas vigentes sin cargarlas a mano. | — |
| **C6-02c** | Cotizaciones | tarea | P1 | 06/02–11/02 | C6-01 | una cotización se registra y se sigue hasta su resultado. | — |
| **C6-03a** | Inicio por rol con KPIs y sin ranking | tarea | P1 | 10/02–15/02 | C6-01 | cada KPI concilia su denominador y cada alerta tiene un caso válido. | — |
| **C6-03b** | Aceptar C6 con los recorridos R1 a R6 | tarea | P1 | 16/02–18/02 | C6-02a, C6-02b, C6-02c, C6-03a | los seis recorridos pasan contra el servidor. | — |
| **E2-02** | Refrescar los datos y fijar las consultas de la semana de prueba | tarea | P1 | 19/02–20/02 | C6-03b, C5-02c, C4-03b | los datos tienen corte conocido y la lista de consultas habituales queda fijada antes de observar. | — |
| **E2-03** | Trabajar siete días con Broker OS sin abrir Zoho CRM para consultar | tarea | P1 | 21/02–27/02 | E2-02 | en cinco jornadas con casos reales las consultas previstas se resuelven sin Zoho. | — |
| **M2** | Trabajo diario: una semana representativa sin Zoho CRM | hito | P1 | 27/02 | E2-03 | Emiliano acepta la evidencia de consultas y fallos. | — |
| C13-00 | Probar MCP de lectura temprano, en sintético | tarea | P2 | 26/01–12/02 | C4-03b, IA-01 | una consulta de lectura reduce pasos medidos y deja auditoría sin datos prohibidos. | — |

### Etapa 3 · Riesgos y relación

| Id | Tarea | Tipo | P | Fechas | Depende de | Listo cuando | Repo |
|---|---|---|---|---|---|---|---|
| MET-01 | Metodología v1.1: cada cambio ligado a una discrepancia, con prueba adversarial | tarea | P2 | 24/12–07/01 | M-RO, IA-02 | v1.1 relaciona cada cambio con una discrepancia y declara sus límites sin afirmar validación independiente. | — |
| IA-03 | Skills 2 y 3 (brechas e informe) probadas en un caso adicional | tarea | P2 | 08/01–13/02 | IA-02, MET-01 | una comparación manual detecta alucinaciones y omisiones con fuentes trazables. | — |
| **E3-01** | Escribir los contratos de C7 a C10 y confirmar una empresa disponible | decision | P2 | 28/02–03/03 | M2, MET-01 | hay empresa con consentimiento y C7 a C10 tienen contrato. | — |
| PER-01 | Elegir a la persona habilitada para aprobar entregas al cliente | decision | P2 | 04/03 | E3-01 | una persona humana distinta del autor está invitada con ese permiso. | — |
| DEC-05 | Decidir D-0025: cobertura por versión de póliza | decision | P2 | 04/03–09/03 | E3-01, C3-02 | una póliza con cambios se reconstruye sin inventar fechas. | — |
| **C7-01** | C7: cuestionario e inspección mínimos con trazabilidad | tarea | P2 | 04/03–17/03 | E3-01, IA-02, C5-02c | candidatos y respuestas conservan origen y evidencia por zona. | — |
| **C7-03** | Aceptar el relevamiento con una empresa real | tarea | P2 | 18/03–25/03 | C7-01 | Emiliano completa el caso y registra tiempo, preguntas inútiles y ajustes. | — |
| **C8-01** | C8: importador A2 de brechas con las cuatro salidas humanas | tarea | P2 | 26/03–07/04 | C7-03, IA-03 | confirmar, descartar, pedir información y riesgo aceptado conservan evidencia. | — |
| C9-01 | C9: verificación de pólizas A3 con reclamo a la compañía | tarea | P2 | 10/03–25/03 | DEC-05, C6-02c, IA-01 | una diferencia abierta impide «verificada» y su reclamo queda trazado. | — |
| **C10-01** | C10: informe anual mínimo con datos conciliados y PDF | tarea | P2 | 08/04–21/04 | C8-01, C9-01, IA-03 | las ocho secciones concilian y el PDF no expone el puntaje interno. | — |
| **C10-02** | Aprobación, congelamiento y entrega permitida del informe | tarea | P2 | 22/04–28/04 | C10-01, PER-01 | una persona distinta del autor congela el informe real y el PDF conserva esa versión. | — |
| **E3-02** | Recorrer el ciclo real con la empresa y registrar su devolución | tarea | P2 | 29/04–09/05 | C10-02, C7-03, C8-01, C9-01, MET-01 | el caso enlaza relevamiento, decisiones y versión aprobada, con al menos una acción útil. | — |
| **M3** | Ciclo de riesgos real con informe entregado | hito | P2 | 09/05 | E3-02 | el ciclo y el informe cumplen los controles y Emiliano acepta el aprendizaje. | — |

### Etapa 4 · Broker OS completo

| Id | Tarea | Tipo | P | Fechas | Depende de | Listo cuando | Repo |
|---|---|---|---|---|---|---|---|
| DEC-04 | Decidir correo, unicidad de ContactPoint y alcance externo | decision | P2 | 28/02–03/03 | M2 | correo, ContactPoint y exclusiones levantadas quedan registrados con su costo. | — |
| **E4-01** | Escribir los contratos de C11 a C13 y elegir la prueba externa más chica | decision | P2 | 10/05–11/05 | M3, DEC-04 | C11 a C13 tienen contrato y el piloto apunta a una pregunta de valor. | — |
| **INF-05** | Verificar backups, identidad y costo para el primer acceso externo | tarea | P2 | 12/05–17/05 | E4-01 | backup restaurado, OIDC, correo y costo recurrente caben en USD 66. | — |
| C13-01 | C13: MCP de lectura con permisos y auditoría | tarea | P2 | 18/05–28/05 | E4-01, INF-05, C13-00 | cada herramienta lee sólo lo asignado y revocar corta el request siguiente. | — |
| C13-02 | C13: borradores por MCP, sin herramientas de decisión | tarea | P2 | 29/05–04/06 | C13-01, C5-02c, C10-02 | crear un borrador pide confirmación y ninguna herramienta aprueba ni comparte. | — |
| E4-03 | Resolver una tarea real por MCP sin copiar y pegar | tarea | P2 | 05/06–07/06 | C13-02 | Emiliano resuelve una tarea con datos autorizados y contrasta el resultado con la fuente. | — |
| **C12-01** | C12: invitación externa y aislamiento de una vista mínima | tarea | P2 | 18/05–03/06 | E4-01, INF-05 | dos contactos de empresas distintas no ven datos ajenos alterando IDs, sesión o descargas. | — |
| **C12-03** | C12: resumen, preguntas e informe compartido | tarea | P2 | 04/06–15/06 | C12-01, C10-02 | el portal muestra sólo la versión compartida de su empresa y retirar el acceso corta todo. | — |
| **E4-02** | Observar el uso del portal por la empresa | tarea | P2 | 16/06–26/06 | C12-03 | un contacto completa una tarea útil sin que alguien la haga por él. | — |
| C11-01 | C11: conversación y correo vinculados a la persona por API | tarea | P2 | 12/05–08/06 | E4-01, DEC-04, C1-14, RET-01 | una correspondencia ambigua pide resolución humana y se respeta la retención. | — |
| C11-03 | C11: contexto, delegación y arranque del piloto | tarea | P2 | 09/06–16/06 | C11-01, COM-01b | una conversación autorizada permite preparar contexto y delegar, y un envío sin confirmación se rechaza. | — |
| **M4** | Señal North Star: portal, MCP y comunicación útiles | hito | P2 | 26/06 | M3, E4-02, E4-03, C11-03 | una empresa y Emiliano completan tareas útiles por portal y MCP y se decide el siguiente paso. | — |

En negrita, las tareas del camino crítico.

## 6. Cómo se regenera

El calendario sale de un planificador por recursos (capacidad diaria de Emiliano, tres agentes, cinco frentes, feriados de Argentina) corrido sobre la tabla del CSV. Si cambia una estimación o una dependencia, se recalcula y se actualiza este documento en el mismo PR.
