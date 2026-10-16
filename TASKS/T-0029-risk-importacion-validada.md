---
id: T-0029
title: Importar los tres CSV de Risk OS en una transacción, con validación completa
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-14
blockedBy: [T-0028]
contextRefs: [SLICES/RO01.md, SLICES/RO01-dossier.md, SLICES/RO01-decisiones.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              SPIKES/T-0021-formatos-y-modelo-risk-os.md,
              SPIKES/T-0021/v0/fase-15/dossier-fase-15a.md,
              SPIKES/T-0021/v0/fase-15/dossier-fase-15b.md,
              SPIKES/T-0021/v0/fase-15/contrato/,
              SPIKES/T-0021/v0/fase-15/validador/,
              SPIKES/T-0021/v0/fase-15/invalidos/,
              SPIKES/T-0021/v0/fase-15/sinteticos/,
              contexts/risk/README.md, ENGINEERING_RULES.md]
decisionRefs: [D-0063, D-0067]
---

## Why

Risk OS v1 empieza con una importación inicial de `risks.csv`, `action-plan.csv` y
`risk-transfer.csv` (EMI-23), y EMI-26 pide demostrar qué pasa con una importación
inválida, relaciones rotas y escrituras incompletas. La 15b dejó un validador de spike
que no escribe nada; T-0028 deja el esquema. Esta tarea une las dos cosas en un
importador de producto, todo o nada, que es lo que el owner va a usar para cargar las
cinco históricas sin que un agente vea sus valores. Habilita T-0030 y T-0031, que
necesitan datos importados.

## Outcome

- **Un lote son los tres CSV.** El importador los valida completos con las 71 reglas
  de `SPIKES/T-0021/v0/fase-15/contrato/`, leídas de ahí (columnas, enums, severidad y
  texto de error), y los escribe en una sola transacción. Con un rechazo no se escribe
  ninguna fila. Las dos etapas y las precedencias del validador de la 15b
  (`dossier-fase-15b.md` §3) se conservan.
- **Lee los CSV con el lector portado de `validador/csv.ts`** al contexto, con su
  comportamiento y su regresión (H7): sus errores de estructura son parte del contrato
  (RV-ARCH-01 con número de línea), y sus tests del spike se portan con él. No agrega
  dependencias.
- **Informe por fila:** `regla_id`, archivo, línea, id, origen y mensaje, para cada
  rechazo y cada aviso. Los avisos no bloquean.
- **Modo sin valores**, para los datos reales: el mismo informe con conteos por archivo
  y por `regla_id`, líneas e ids, sin mensajes ni celdas. Es el que el owner pega en la
  evidencia (R-19).
- **Lotes posteriores.** Un lote puede referenciar riesgos y evaluaciones que ya existen
  en Risk OS (el `existentes` del validador). Un id de evaluación, acción,
  transferencia o evento que ya existe es RV-ID-02.
- **Reimportación (H3).** Un lote cuya huella de los tres archivos es idéntica a la de
  uno ya importado se reconoce antes de validar y responde `ya importado`, sin escribir
  ni ejecutar una segunda importación. Un lote distinto que reutiliza ids sigue
  fallando por RV-ID-02.
- **Lo importado queda como está en el archivo:** nada se acepta, se calcula ni se
  completa al importar. `review_status`, `actor` y procedencia se conservan; los
  derivados se calculan después con las funciones de T-0028 (decisión 6a).
- **Línea de comandos del contexto** para importar un lote contra la base que diga
  `RISK_DATABASE_URL`, con el modo sin valores como opción. Un lote se identifica en la
  base con su huella, su fecha y sus conteos.
- **Tests (R-26):**
  - las 8 sintéticas se importan con 0 rechazos, 84, 10 y 33 filas y los mismos 103
    avisos que el validador de la 15b; los derivados calculados desde la base coinciden
    con `regresion-emi41.csv` en los 59 objetos (RO01 A1);
  - cada uno de los 55 casos de `invalidos/` produce exactamente su error de
    `errores-esperados.csv` y deja cero filas en el esquema `risk` (A2);
  - importar dos veces el mismo lote responde `ya importado` la segunda vez y deja el
    mismo estado (A3); un lote distinto con un id ya importado es RV-ID-02;
  - una falla inyectada a mitad de la escritura no deja ninguna fila (A4);
  - un lote posterior que agrega una reevaluación a un riesgo ya importado entra, y uno
    que repite un id existente es RV-ID-02;
  - el modo sin valores no contiene ninguna celda del lote (se prueba con un lote
    sintético cuyos textos son marcadores).

## Non-scope

- UI, vistas, actualización desde la app y revisión pendiente. Son de T-0030 y T-0031.
- Base hosteada, despliegue o carga de datos reales. La carga de las históricas es de
  T-0032 y la ejecuta el owner.
- Cambiar los contratos, los CSV sintéticos aprobados, los casos inválidos o una regla.
  Si una regla no se puede implementar como dice, se reporta.
- Un cuarto CSV de reordenamiento.
- `csv-parse` u otra dependencia nueva (D-0055 está acotada a `packages/db`).
- Integración con Broker OS (D-0063, D-0067).

## Verification

```bash
pnpm check
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev pnpm --filter @del-campo/risk run import SPIKES/T-0021/v0/fase-15/sinteticos
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev pnpm --filter @del-campo/risk run import SPIKES/T-0021/v0/fase-15/sinteticos
```

Comprobaciones humanas, registradas en `ops/evidence/T-0029.md`:

- [ ] La primera importación de las sintéticas en `delcampo_risk_dev` da 0 rechazos y
      103 avisos; la segunda responde "ya importado" y los conteos por tabla no cambian.
- [ ] Un caso inválido elegido a mano (por ejemplo RV-EVA-07, historia ramificada),
      importado sobre una base vacía, devuelve su error y la base sigue vacía.
- [ ] El informe en modo sin valores de las sintéticas no contiene ningún título,
      observación ni monto.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0029-*.md`.

## Data effects

- **Bases de datos:** sólo `delcampo_risk_dev` y `delcampo_risk_test`, locales, con
  datos sintéticos. Se revierte con `dropdb`.
- **Sistemas externos:** ninguno.

## Risks

- **El validador de la 15b es de spike.** Portarlo puede mostrar reglas implementadas
  de forma distinta a su descripción. El contrato manda; cualquier diferencia se
  reporta al owner y no se resuelve en silencio.
- **Mensajes de error con valores.** Varios textos de error del contrato interpolan la
  celda (`«{valor}»`). Por eso existe el modo sin valores, y es el único que sale del
  equipo del owner con datos reales.

## Notes

RO01 §10. Linear: EMI-23 completo y la parte de importación de EMI-26 (importación
inválida, relaciones rotas, escrituras incompletas).

Ajustada a las decisiones del owner del 2026-10-15 (`SLICES/RO01-decisiones.md`,
punto 9: H3 y H7).
