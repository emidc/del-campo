# Conciliación de auditorías después de los merges de octubre

**Fecha:** 2026-10-08. **Base comprobada:** `main` en
`1af4e3c` (PR #65), que incluye el PR #64 y la corrección del test de sesión
`b4bde08`. **Alcance:** conciliación documental de BOS y POS, separados en las
matrices siguientes. No implementa recomendaciones ni completa T-0026.

Las auditorías originales describen `4a33102`, no el estado actual:
[Broker OS](broker-os-technical-audit-2026-10.md) y
[Project OS](project-os-audit-2026-10.md). Se conservan como evidencia histórica.
Este documento es el punto de entrada para decidir qué queda por hacer.

## Cómo leer los estados

- **Resuelto en código:** la implementación y los tests pertinentes están presentes
  en la base comprobada. No significa validado en producción.
- **Parcial:** una parte se corrigió; se identifica el resto y su criterio de cierre.
- **Pendiente:** el problema o la recomendación siguen vigentes en el repositorio.
- **Por verificar en producción:** no hay evidencia actual suficiente para afirmar
  exposición, configuración correcta ni corrección desplegada.
- **Diferido:** recomendación de no actuar ahora, con un disparador explícito;
  no equivale a una decisión nueva aceptada.

La inspección de esta conciliación es estática. Los resultados de pruebas de los
informes originales siguen siendo históricos, no se presentan como ejecuciones
nuevas. No se consultaron credenciales, bases alojadas ni datos de clientes.

## BOS — defectos y riesgos de la auditoría

| ID | Estado al corte | Evidencia actual | Qué falta / criterio de cierre |
| --- | --- | --- | --- |
| D1 · reproceso, borrado y salud | **Parcial** | `contexts/communication/src/application/reprocess.ts` recupera `failed`, `pending` atascadas e `ignored` con filtro cambiado. `persistence/store.ts` conserva pendientes/fallidas; `apps/communication/src/lib/delivery-alerts.ts` muestra backlog. Hay tests de reproceso y retención. | El defecto de recuperación está corregido en código. Falta comprobar jobs desplegados y resolver la política de retención (RET-1). No reimplementar el reproceso. |
| D2 · prepared statements | **Resuelto en código** | `contexts/communication/src/persistence/database.ts` usa `prepare: false`; `database.test.ts` comprueba la opción. | Comprobar conexión con el pooler y rol reales durante el despliegue; un test de opciones no demuestra compatibilidad operativa. |
| D3 · catálogo `search_path` | **Pendiente, diferido hasta la primera función SQL del contexto** | `packages/db/src/function-search-path.integration.test.ts` usa la base de Broker. No se encontró consulta equivalente de `pg_proc`/`proconfig` en `contexts/communication`; sus migraciones actuales no crean funciones. | Agregar cobertura del catálogo en la base separada cuando se incorpore una función. Los cambios al test de migraciones de Communication no cierran D3. |
| A1 · posible exposición Data API | **Por verificar en producción** | El informe original y H6 del informe de endurecimiento proponen verificaciones; no aportan resultados de producción. | Owner: comprobar configuración Data API, esquemas expuestos, privilegios y RLS de Broker y Communication. Prioridad inicial por los datos reales de Broker. Un privilegio aislado no prueba por sí solo exposición efectiva; tampoco una sola consulta negativa descarta todas las tablas/rutas. |
| A2 · rol dueño de la base | **Por verificar en producción; preparación parcial** | H5 de `../communication-os/t-0026-hardening-report.md` propone permisos. No es evidencia de un rol aplicado ni de la identidad efectiva de la app. | Communication: rol acotado a su esquema. Broker: rol de lectura para VS01 separado del de migraciones. Verificar operaciones permitidas y denegadas usando el rol real. |
| A3 · aislamiento de nuevos contextos | **Pendiente** | `eslint.config.js` conserva `CONTEXTOS = ['communication']` y reglas específicas. | Antes de crear `contexts/risk`: cubrir todos los contextos y probar imports prohibidos. No bloquea por sí solo el código actual de Communication. |
| A4 · filtro por número | **Resuelto en código, con límites explícitos** | `domain/payload.ts` normaliza/filtra por número; receptor y reproceso lo exigen; migración `0004_delivery_phone_filter.sql` agrega resultado `ignored`, conteos y filtro. La UI alerta por ignoradas recientes. | Comprobar el número real y suscripciones. Se conserva el cuerpo crudo de la entrega ignorada: filtrar mensajes no significa evitar toda persistencia de datos de otros números. Revisar alcance de WABA y RET-1. |
| A5 · orden de migración y despliegue | **Pendiente** | Existen migraciones Communication 0003 y 0004; `docs/despliegue/vercel-communication.md` todavía no existe. | Documentar y comprobar migración compatible antes del código que la requiere, reversión y dos ledgers separados. |
| A6 · build ausente de CI | **Pendiente** | `.github/workflows/project-os-check.yml` ejecuta `pnpm check`, no `next build`. | Incorporar builds de ambas apps en un cambio específico a CI, con la aprobación que exige R-13. Un build local exitoso no cierra esta brecha. |
| A7 · límite de intentos de login | **Pendiente / configuración externa no verificada** | H7 documenta que no se implementó; `apps/communication/src/lib/auth.ts` mantiene el costo de scrypt por intento. | Definir y probar protección de `/api/login`, incluida su respuesta bajo exceso de intentos; no asumir que existe una regla de plataforma. |
| Adicional §6 · Framework Preset | **Resuelto en configuración versionada** | `apps/communication/vercel.json` declara `framework: nextjs`. | Comprobar el proyecto real al desplegar. El mismo archivo declara ambos cron diarios; su existencia no demuestra ejecución. |

### RET-1 — la retención no está cerrada

La frase histórica de la auditoría de Broker «No code contradicts an ACCEPTED
decision» **no describe el corte actual**. `decisions.yaml`, D-0065, conserva la
regla de borrar el payload crudo a los 30 días, sin excepción. El código actual:

- Borra `processed` e `ignored` vencidas y cuenta las ignoradas por separado.
- Conserva `pending` y `failed` sin límite y cuenta las vencidas conservadas.
- Reevalúa ignoradas si cambia el número configurado, siempre que su crudo siga
  disponible; después del borrado por retención ya no puede recuperarlo.

Esto evita perder la única copia de mensajes no procesados, pero deja pendiente una
política compatible con la decisión canónica. Cierre: decisión documentada sobre
plazo máximo, disposición explícita y tratamiento de `ignored`, seguida de código y
pruebas acordes. La propuesta de ADR de
[remediación §10](../communication-os/T-0026-REMEDIATION.md#10-retención-la-decisión-sigue-abierta)
no es una decisión adoptada. La prueba sintética de 72 horas no alcanza el umbral de
30 días; eso no resuelve el conflicto ni permite cerrar CO01 como si no existiera.

## BOS — deuda técnica y documentación

| ID | Estado | Evidencia / siguiente paso |
| --- | --- | --- |
| TD1 · dos runners de migración | **Diferido** | Siguen `packages/db/src/cli.ts` y `contexts/communication/src/persistence/migrations.ts`. D-0063 acepta separación; no unificar por esta auditoría. |
| TD2 · sin checksum de migraciones | **Pendiente, prioridad baja** | Ambos ledgers identifican archivos por nombre. Una futura tarea debe detectar cambios a migraciones aplicadas, sin reescribirlas. |
| TD3 · sin lock global de migración | **Diferido** | El runner del contexto sigue sin exclusión global. Los locks del reproceso son otra cosa. Revisar antes de automatizar ejecuciones concurrentes. |
| TD4 · paquete domain vacío | **Diferido** | `packages/domain/src/index.ts` sigue exportando `{}`. No poblarlo sin necesidad de dominio. |
| TD5 · tipos SQL manuales | **Diferido** | Se mantienen tipos junto a las consultas; no se detectó un cambio que justifique generación u ORM. Reconsiderar ante evidencia de divergencia. |
| TD6 · comodines y búsqueda sin tope | **Diferido** | Hallazgo original sobre `packages/db/src/policy-query.ts`; no hubo cambio a esa consulta en los PR conciliados. Reabrir al crecer volumen o aparecer un problema medido. |
| TD7 · detalles implícitos de helpers/secuencia | **Diferido** | `persistence/testing.ts` enumera tablas; migración 0002 usa la secuencia de message. Revisar al modificar esas estructuras, no editar una migración aplicada. |
| TD8 · acciones CI por tag | **Pendiente, opcional** | El workflow mantiene tags de checkout/setup. Evaluar junto con A6; no se cambió CI. |
| TD9 · validación manual en bordes | **Diferido** | Continúa el enfoque actual; introducir una dependencia requiere justificación y ADR, no una conversión automática de recomendaciones. |
| DD1 · estado falso en instrucciones/PROJECT | **Pendiente** | `AGENTS.md` y `PROJECT.md` aún dicen que no hay importación/UI/endpoints/autorización. Unificar fuente de estado (POS-1). |
| DD2 · comandos desactualizados en CLAUDE | **Pendiente** | `CLAUDE.md` aún afirma que check no incluye tipos/lint/tests y que no hay dev; `package.json` lo contradice. |
| DD3 · README de migraciones | **Pendiente** | `packages/db/migrations/README.md` aún dice que el directorio está vacío; existen 0001–0006. |
| DD4 · reglas activas/latentes | **Pendiente** | R-24/R-25 tienen premisas antiguas; R-28 sigue LATENTE. Actualizar hechos y revisar estados expresamente; no activarlos mediante esta tabla. |
| DD5 · guía VS01 histórica | **Pendiente de actualización documental** | Conserva fecha de septiembre y 0006 como pendiente, mientras PROJECT registra su aplicación. Distinguir historia de instrucciones vigentes; no se comprobó producción hoy. |
| DD6 · estado de T-0021 | **Pendiente** | Sigue DRAFT aunque existe trabajo integrado, incluida regresión/remediación. Actualizar según outcome y evidencia, sin asumir DONE por el merge. |
| DD7 · comentario de domain | **Pendiente** | Aún atribuye a T-0012 crear entidades allí; su resultado vive en SQL. Corregir comentario en tarea documental posterior. |

Las hipótesis rechazadas en §5 de la auditoría original permanecen como conclusiones
históricas. No se repitió esa auditoría de seguridad completa ni se garantiza su
vigencia solo porque sus archivos estén en main. El fallo intermitente del test de
cookie sí fue corregido en `b4bde08`: ahora cambia un bit de ciphertext, en vez de
caracteres base64url que podían representar los mismos bytes.

## POS — recomendaciones de simplificación

Los IDs POS-1 a POS-8 de esta tabla son etiquetas de seguimiento de las ocho
recomendaciones de §12, no nuevas decisiones ni tareas aprobadas. Los PR #64/#65 no
modificaron el arnés de Project OS; fusionar el informe no implementó sus propuestas.

| ID | Estado | Evidencia actual / criterio para actuar |
| --- | --- | --- |
| POS-1 · una fuente de estado | **Pendiente** | Coincide con DD1/DD2. Sustituir duplicaciones por referencias a una fuente actualizada, en trabajo posterior. |
| POS-2 · D-0016 y varios agentes | **Pendiente de aclaración** | D-0016 sigue limitado al arnés de Claude Code; AGENTS es neutral y el historial incluye otros agentes. Distinguir soporte técnico del arnés de uso de herramientas: la auditoría propone revisar la decisión, no demuestra por sí sola que todo uso de Codex la viole. |
| POS-3 · función del ledger | **Pendiente de decisión** | D-0015 sigue usando 30 AgentRuns y un tercer script como disparador. La autorización del owner para descartar `ops/runs/` durante esta integración no cambió D-0015 ni eliminó requisitos/checkers. No dedicar trabajo a reconstruir registros como parte de esta conciliación. |
| POS-4 · procedencia R-09b | **Pendiente** | Mantener separadas exigencia escrita y validación estructural del checker; decidir si reforzar o simplificar. No inventar evidencia retrospectiva. |
| POS-5 · evidencia proporcional | **Diferido como propuesta** | No se aprobó una excepción nueva para LOW; las reglas actuales siguen vigentes. Reconsiderar con un problema concreto de costo de proceso. |
| POS-6 · lecturas en hook Bash | **Pendiente, prioridad de proceso** | `.claude/hooks/protect-paths.mjs` conserva una lista acotada de lectores que no incluye git/diff. Las modificaciones de hooks quedan para una tarea explícita. |
| POS-7 · WIP real | **Pendiente** | T-0021 sigue DRAFT y T-0026 READY pese a implementaciones integradas. Conciliar estados con outcomes antes de imponer un check nuevo. T-0026 no está aceptada por el mero merge. |
| POS-8 · archivos propuestos/skills | **Pendiente de comparación** | Persisten tres `REVIEWS/**/*.proposed.*`. No se asumió equivalencia con lo aplicado ni se eliminó evidencia. Verificar antes de decidir su retiro. |

**Mantener:** contrato, decisiones, revisión independiente, evidencia verificable,
protección de base de tests y aislamiento. **Diferir:** aplicación Project OS,
plantilla distribuida, núcleo compartido y adapters multi-proveedor. La propuesta
«Project OS Lite» es para un segundo repositorio concreto, no un entregable faltante
de este merge. Los conteos y porcentajes del informe original no se recalcularon y
siguen referidos a su fecha/base. Las preguntas de §15 sobre producción, protección
de main, costos y uso efectivo siguen sin respuesta nueva en esta conciliación.

## Communication — pendientes adicionales de la revisión y remediación

Esta tabla evita perder asuntos que no estaban en la primera auditoría de Broker.
Fuente: [remediación §13](../communication-os/T-0026-REMEDIATION.md#13-bloqueantes-antes-de-la-corrida-de-72-h-de-co01).

| Pendiente | Estado / evidencia de cierre necesaria |
| --- | --- |
| Cadencia de recuperación | Hay cron diario versionado. Falta elegir y probar la cadencia operativa durante CO01; el archivo no acredita la ejecución del servicio. |
| Guía de despliegue | `docs/despliegue/vercel-communication.md` no existe; pendiente del contrato T-0026. |
| Fixtures reales de envío y script de aceptación | Declarados pendientes en la remediación; las capturas sintéticas/documentadas y los tests locales no sustituyen la captura redactada y la medición CO01. |
| Revisión independiente del resultado final | Existe revisión fría y remediación. Falta el cierre independiente de la entrega final exigida por T-0026; no confundir tener un informe con haber cerrado todo su alcance. |
| M14, M18, M25, M28/M29, M39 | Brechas de pruebas declaradas por la remediación: umbral, salud tras fallo, estados concurrentes, ruta webhook y metadata ausente. No se corrigieron en los merges posteriores revisados; priorizarlas por riesgo antes de la prueba. M19 sí tiene test de alerta. |
| Corte de conexión postgres.js | Pendiente de reproducción contra el pooler o aceptación explícita del riesgo; no se ejecutó esa comprobación. |
| Payload no reconocido sin alerta | Persiste el límite declarado: `processed` con cero aplicados y cero ignorados puede no distinguir un cambio de forma del proveedor de un evento legítimamente sin mensajes. Definir tratamiento antes de declarar cobertura completa. |
| Número, suscripciones, permisos y cron efectivos | Por verificar en producción con evidencia sin secretos ni PII; ver §12 de remediación. |
| Aceptación de 72 horas | No acreditada en esta conciliación. Requiere participantes autorizados, contenido inventado, métricas y recuperación ante caída conforme a CO01. |

## Cola depurada para la siguiente sesión

1. **Verificación externa prioritaria:** A1 en Broker (datos reales) y en la base de
   Communication antes de usarla. Sigue siendo una hipótesis, no una filtración
   confirmada. Esta sesión no ejecuta acciones sobre producción.
2. **Decisiones y preparación de T-0026:** RET-1, A2, A7 y cadencia; después guía,
   migraciones/despliegue, fixtures, medición y cierre de revisión. Se trabajará en la
   siguiente sesión solicitada por el owner, no se implementa aquí.
3. **Comprobaciones de despliegue y CO01:** usar la evidencia operativa para cerrar
   las filas correspondientes, no un check local como sustituto.
4. **Antes de implementar Risk:** A3. Las ambigüedades metodológicas y el hueco del
   hijo no evaluable siguen documentados en `SPIKES/T-0021/regresion-ejecutable/REMEDIATION.md`
   §§8–10; el merge de ese arnés no los convirtió en decisiones resueltas.
5. **Higiene posterior de POS/BOS:** DD1–DD7, POS-1/POS-7 y decisión sobre POS-3;
   agrupar duplicados en vez de crear una tarea por mención. Deuda diferida no implica
   un compromiso de implementarla ahora.

## Verificación de esta conciliación

Se contrastaron código/configuración versionados, decisiones, estados de tareas y
los informes citados contra la base indicada. Se revisó la existencia de las rutas
citadas y el diff para limitarlo a documentación. Resultados de esta sesión:

```text
node scripts/check-docs.mjs
✓ 66 decisiones, 29 ADRs, 26 tareas, 0 aviso(s)
node scripts/check-agent-run.mjs
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
CHECK_BRANCH_NAME=docs/audit-reconciliation-2026-10 CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs
✓ contrato de tarea intacto
git diff --check
(sin salida; código 0)
```

 No se repiten pruebas de aplicación por este cambio de
Markdown y no se declara un nuevo resultado funcional ni una aceptación de CO01.
