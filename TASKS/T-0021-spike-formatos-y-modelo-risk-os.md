---
id: T-0021
title: Definir formatos de importación, modelo mínimo y datos sintéticos de Risk OS
kind: SPIKE
status: DRAFT
workstream: BOS
riskClass: LOW
size: M
created: 2026-09-29
blockedBy: []
contextRefs: [DOMAIN.md, decisions.yaml, ENGINEERING_RULES.md, DECISIONS/0063-aislamiento-por-contexto-q4.md]
decisionRefs: [D-0029, D-0045, D-0063]
---

## Why

Risk OS v1 empieza con una importación inicial de `risks.csv`, `action-plan.csv` y
`risk-transfer.csv`. Después, las actualizaciones ocurren dentro de Risk OS.

Los formatos de esos archivos no existen todavía. `DOMAIN.md` deja
`EnterpriseRisk` (§76) y `RiskAssessment` (§46) como NAMED, NOT MODELED, y dice que su
estructura la determina este trabajo. Tampoco está definido cuántas empresas
sintéticas hacen falta para validar el sistema. El owner decidió el 2026-09-29 que ese
número lo fija este spike y no el plan. Sin eso no se puede escribir el contrato de
Risk OS ni su aceptación.

## Outcome

`SPIKES/T-0021-formatos-y-modelo-risk-os.md` define lo siguiente:

- **Los tres formatos CSV:** columnas, tipos, obligatoriedad, identificadores,
  relaciones entre archivos y reglas de validación, incluidos los rechazos.
- **El modelo mínimo del contexto `risk`:**
  - riesgo, acción y transferencia o actividad;
  - historial;
  - revisión pendiente al cambiar una actividad, sin recálculo automático de
    consecuencias.

  Cada elemento explica qué parte de los seis conceptos mezclados de §46 queda con
  estructura y cuál no.
- **Qué es un ciclo de actualización,** para que "al menos diez ciclos" sea medible.
- **El conjunto de empresas sintéticas:** cuántas son y por qué ese número alcanza, con
  los criterios de cobertura (rubros, tamaños, casos límite y errores de importación
  esperados). Los CSV sintéticos quedan en el repositorio y validan contra los
  formatos.

Los formatos también tienen que poder representar los cinco casos históricos reales.
El owner lo comprueba con la estructura de esos casos (encabezados y forma, sin
valores), sin que un agente lea datos reales.

## Non-scope

- Crear `contexts/risk`, migraciones, importador, UI o worker. Eso es del contrato y de
  la primera tarea de implementación.
- Leer, copiar o procesar datos reales de las empresas históricas (R-19). Ese acceso
  necesita su propia excepción registrada.
- IA, que no es condición de aceptación de Risk OS v1.
- Integración con Broker OS: nada de referencias con clave foránea a `Party` ni lectura
  de su esquema (D-0063). Si conviene guardar un identificador opaco, se deja como
  propuesta.
- Cambiar `DOMAIN.md`. El modelo vive en el contexto `risk` hasta la decisión de cierre
  de Q4.
- Resolver D-0029. `RiskObject` es un concepto distinto de `EnterpriseRisk`.
- Conclusiones profesionales de cobertura sobre cualquier empresa.

## Verification

```bash
pnpm check
```

Comprobaciones humanas. El spike no está terminado hasta que estén respondidas por
escrito en `SPIKES/T-0021-formatos-y-modelo-risk-os.md`:

- [ ] Cada columna de los tres formatos tiene tipo, obligatoriedad y regla de
      validación, y cada relación entre archivos tiene su identificador.
- [ ] Los CSV sintéticos cumplen los formatos, e incluyen al menos un caso inválido por
      regla de rechazo, con el error esperado escrito.
- [ ] El número de empresas sintéticas está justificado por criterios de cobertura
      explícitos, no elegido de antemano.
- [ ] El owner confirmó por escrito que los cinco casos históricos se pueden expresar en
      los formatos, o qué ajuste necesitan, sin exponer sus valores.
- [ ] Está definido qué es un ciclo de actualización y qué evidencia deja cada ciclo en
      el historial.
- [ ] Está escrito qué cambio de actividad abre una revisión pendiente y qué la cierra.

## Decision unlocked

- La redacción del contrato de Risk OS, análogo a `SLICES/VS01.md`, con su aceptación
  de Q4: empresas sintéticas en el número que fije este spike, cinco empresas
  históricas reales, al menos diez ciclos y revisión profesional de los casos reales.
- La primera tarea de implementación, que crea `contexts/risk` bajo D-0063.

## Data effects

Ninguno sobre bases de datos ni sistemas externos. Agrega al repositorio documentación
y CSV sintéticos.

## Risks

- **Timebox:** una semana de trabajo técnico.
- **Riesgo de sobremodelar.** Por eso cada elemento del modelo tiene que justificarse
  con una pantalla o una operación de Risk OS v1, y no con que pueda ser útil más
  adelante.

## Notes

Se inicia cuando `T-0020` cierre o quede `BLOCKED`. `PROJECT.md` §5 admite un solo
spike en curso.
