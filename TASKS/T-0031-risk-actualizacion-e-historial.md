---
id: T-0031
title: Actualizar riesgos, acciones y transferencias en Risk OS con revisión pendiente e historial
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: L
created: 2026-10-14
blockedBy: [T-0029]
contextRefs: [SLICES/RO01.md, SLICES/RO01-dossier.md, SLICES/RO01-decisiones.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              SPIKES/T-0021/v1/metodologia-v1.md,
              SPIKES/T-0021/v0/fase-15/dossier-fase-15a.md,
              SPIKES/T-0021/v0/fase-15/decisiones-15a.md,
              SPIKES/T-0021/v0/fase-15/sinteticos/ciclo.ts,
              SPIKES/T-0021/v0/fase-13/dossier-cierre-emi15.md,
              contexts/risk/README.md, ENGINEERING_RULES.md]
decisionRefs: [D-0063, D-0067]
---

## Why

La aceptación de Risk OS v1 pide ciclos posteriores a la importación (hito "v1
accepted"). EMI-25 pide introducir información nueva, revisar riesgos, acciones y
transferencia, registrar comentarios, progreso, evidencia y estados, conocer autor,
fecha y estado anterior, y que un cambio de actividad abra una revisión pendiente, sin
sobrescrituras silenciosas. EMI-26 pide que una actualización interrumpida no deje
estado intermedio. La 15b lo probó en memoria con `ciclo.ts`; esta tarea lo hace
persistente y habilita A5, A7, A8 y A12 de `SLICES/RO01.md`.

## Outcome

- **Reevaluación:** desde la UI se crea una evaluación nueva de un riesgo, con su
  motivo (metodología §11.1), que apunta a la anterior. Nunca se edita una evaluación,
  y la cadena sigue lineal: una segunda sucesora de la misma evaluación se rechaza
  (decisión 8a).
- **Revisión humana:** evaluaciones, acciones y coberturas pasan de `pending` a
  `accepted`, `needs_revision` o `rejected` por una persona, con fecha y autor. Sólo
  una persona deja algo en `accepted` (decisión 4a). La evaluación vigente sigue RO01
  §3, regla 6.
- **Acciones:** alta de acciones y de decisiones de tratamiento con las reglas del
  contrato; cambios de estado; evidencia de ejecución; eficacia, sólo en una acción
  cumplida y con la reevaluación que la midió. El cambio esperado nunca escribe un
  factor (D16).
- **Transferencia:** alta y revisión de coberturas; alta de eventos de póliza como
  observaciones locales con procedencia (D-0067). Un evento no abre revisión ni cambia
  derivados (D17).
- **Novedades** (H2): registro append-only de `comentario`, `informacion_nueva` o
  `cambio_contexto` sobre un riesgo, una acción o una transferencia, con texto,
  evidencia, autor y fecha. Las dos últimas abren revisión pendiente; `comentario` no.
- **Revisión pendiente** (dossier 15a §5, decisión 9a): la abren solas una acción que
  pasa a `cumplida`, una novedad de información nueva y una de cambio de contexto. No
  la abren una acción planificada, en curso o cancelada, un evento de póliza, un
  comentario ni un reordenamiento. La cierra una persona con una reevaluación aceptada
  o con un "sin cambio" fundamentado; una reevaluación rechazada o `needs_revision` la
  deja abierta. Nada recalcula ni escribe un factor por su cuenta.
- **Reordenamiento profesional** (decisión 5 del owner): un registro propio de Risk
  OS, hecho por una persona, que conserva el orden calculado, las evaluaciones
  vigentes, autor, fecha, causa, fundamento y los campos de los disparadores de
  reapertura (dossier de la Fase 13, §5). La lista muestra el orden profesional al lado
  del calculado; factores, `C_raw` y banda no cambian.
- **Orden previo del revisor** (decisión 6 del owner): por cada empresa, el revisor
  registra su orden profesional y sus bandas desde una pantalla que no muestra
  ranking, bandas ni `C_raw`. El registro es append-only, con autor de la sesión y
  fecha.
- **Historial:** cada cambio es un registro nuevo con autor, fecha, estado anterior y
  estado nuevo. Para un riesgo se reconstruye todo lo que cambió desde la importación,
  en el detalle de T-0030. Ningún cambio en el esquema queda sin su registro.
- **Cada operación compuesta es una transacción:** cerrar una revisión con su
  reevaluación aceptada, cumplir una acción y abrir su revisión, registrar una novedad
  que abre una revisión. Una falla a mitad de camino deja el estado anterior y ningún
  registro de historial huérfano.
- **Script de ciclos** del contexto: cuenta las revisiones cerradas después de la
  importación, con disparador, apertura, cierre, quién, resultado y evaluación, por
  empresa y por tipo de disparador, y dice si se cumple A7 (al menos 10, al menos una
  por empresa histórica, al menos tres tipos entre `accion_ejecutada`,
  `informacion_nueva` y `cambio_contexto`; decisión 7). Las revisiones abiertas y los
  ciclos que vienen en los CSV no cuentan. Su salida tiene sólo códigos de empresa,
  conteos y fechas.
- **Tests (R-26):**
  - unit: qué abre y qué no abre una revisión, qué la cierra, vigente después de cada
    revisión;
  - integración con las sintéticas: el ciclo de S07-R06 (15B-A01 y 15B-R01) recorrido
    desde la app produce lo mismo que `ciclo.ts`; la acción planificada 15B-A05 y la
    cancelada 15B-A10 no abren nada; el evento 15B-E01 no abre nada;
  - falla inyectada en cada operación compuesta (RO01 A5);
  - el historial reconstruye cada cambio de un recorrido completo, y no hay `UPDATE`
    ni `DELETE` sobre tablas de historia o evaluaciones (R-22, R-23);
  - el script de ciclos cuenta bien un recorrido sintético de diez ciclos, y da A7 no
    cumplido si falta una empresa, si hay sólo dos tipos de disparador o si se cuenta
    una revisión abierta o un ciclo de los CSV;
  - el orden previo del revisor no se puede registrar desde una sesión que ya accedió a
    resultados de esa empresa, o queda marcado como posterior.

## Non-scope

- Recalcular factores, sugerir valores o proponer reevaluaciones automáticas.
- IA, notificaciones, recordatorios y tareas programadas.
- Cambio de versión de la metodología: en v1 no ocurre. El disparador queda en el
  modelo, sin flujo de UI.
- Base hosteada, despliegue y datos reales (T-0032, R-19).
- Roles y permisos distintos por persona.
- Cambiar los contratos, los CSV aprobados o la metodología.
- Integración con Broker OS (D-0063, D-0067).

## Verification

```bash
pnpm check
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test
pnpm --filter "./apps/risk" run build
```

Comprobaciones humanas, registradas en `ops/evidence/T-0031.md`:

- [ ] En local con las sintéticas, el owner cierra una revisión con una reevaluación
      aceptada y otra con "sin cambio", y en el detalle ve quién, cuándo y el estado
      anterior de cada cambio.
- [ ] Una acción que pasa a `cumplida` abre una revisión; una planificada, un evento de
      póliza y un comentario no.
- [ ] Una falla inyectada a mitad de cerrar una revisión deja la revisión abierta y sin
      evaluación nueva.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0031-*.md`.

## Data effects

- **Bases de datos:** sólo `delcampo_risk_dev` y `delcampo_risk_test`, locales. Si hace
  falta una migración nueva, va con su reversa.
- **Sistemas externos:** ninguno.

## Risks

- **Es la tarea más grande de RO01** (`size: L`). Si el calendario aprieta, se avisa
  al owner; el alcance no se recorta en silencio.
- **Un ciclo de las sintéticas que ya viene cerrado** no cuenta para A7. El script lo
  distingue por su origen.

## Notes

RO01 §10. Linear: EMI-25 completo y lo que queda de EMI-26 (actualización
interrumpida y qué historia se conserva).

Puede empezar en paralelo con T-0030 por dominio y aplicación; su UI espera las
pantallas de T-0030. Ajustada a las decisiones del owner del 2026-10-15
(`SLICES/RO01-decisiones.md`): autor desde la sesión (2), reordenamiento (5), orden
previo del revisor (6), conteo de A7 (7) y novedades (H2).
