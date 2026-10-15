---
id: T-0028
title: Crear el contexto risk con su esquema y las funciones de la metodología v1
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-14
blockedBy: []
contextRefs: [SLICES/RO01.md, SLICES/RO01-dossier.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0045-schema-en-migraciones-sql.md,
              DECISIONS/0051-schema-vs01-invariantes-como-constraints.md,
              SPIKES/T-0021-formatos-y-modelo-risk-os.md,
              SPIKES/T-0021/v1/metodologia-v1.md,
              SPIKES/T-0021/v0/fase-15/dossier-fase-15a.md,
              SPIKES/T-0021/v0/fase-15/decisiones-15a.md,
              SPIKES/T-0021/v0/fase-15/contrato/,
              SPIKES/T-0021/regresion-ejecutable/README.md,
              contexts/communication/README.md, ENGINEERING_RULES.md]
decisionRefs: [D-0045, D-0046, D-0051, D-0063, D-0067]
---

## Why

`SLICES/RO01.md` necesita, antes que la importación, las vistas y la actualización, que
Risk OS tenga dónde guardar riesgos, evaluaciones, acciones y transferencias, y que
calcule los derivados de la metodología v1 con funciones de producto y no con el arnés
del spike. T-0021 dejó el modelo (dossier 15a §4), los contratos y las funciones de
referencia en `SPIKES/T-0021/regresion-ejecutable/`, fuera del workspace. Esta tarea
crea el primer código real del contexto `risk` (D-0063) y habilita T-0029.

## Outcome

- **`contexts/risk` es un paquete del workspace** (`@del-campo/risk`) con
  `src/domain`, `src/persistence` y `src/application`, y exporta sólo
  `src/application`. `pnpm lint` falla si el contexto importa algo de `packages/*`,
  `apps/*` u otro contexto, si Broker o Communication OS lo importan, o si `src/domain`
  importa algo (R-25, D-0063).
- **El esquema `risk` vive en migraciones SQL con reversa** (D-0045), con un runner
  propio sobre `delcampo_risk_dev` y `delcampo_risk_test` que rechaza cualquier otra
  base, como el de `contexts/communication`. Tiene las entidades del dossier 15a §4
  (riesgo, evaluación con sus siete factores, acción, transferencia, evento de póliza,
  revisión pendiente) y el registro de novedades del hallazgo H2 si el owner lo aprueba.
  El reordenamiento profesional entra si RO01 lo incluye.
- **Las invariantes del contrato que son de una fila o de una relación están en la
  base** (D-0051): enums, rangos de 1 a 5, ids con su prefijo, padre sin evaluación,
  referencias al mismo riesgo y cadena lineal de evaluaciones (como mucho una inicial y
  ninguna evaluación con dos sucesoras). Una evaluación no se puede modificar después de
  escrita, y el historial es sólo de inserción (R-22, R-23): un `UPDATE` o `DELETE`
  sobre esas tablas falla.
- **Las funciones de la metodología v1 son funciones puras de `src/domain`**, portadas
  de `regresion-ejecutable/metodologia.ts` sin cambiar reglas: `I efectivo`, `V_d`,
  `C_d`, `C_raw`, dimensión determinante, banda, banderas, techo plausible, ranking D10,
  posición del padre y cola de validación. Cada resultado lleva la versión
  `metodologia v1`. Ninguna función agrega ni compara `C_raw` entre riesgos ni entre
  organizaciones (RO01 §3).
- **Tests (R-26):**
  - unit con oráculo externo: los derivados de las 8 sintéticas coinciden con
    `SPIKES/T-0021/v0/fase-11/regresion-emi41.csv` en los 59 objetos, con la
    excepción de posición de S15 de `verificacion-15b.md` §4;
  - las propiedades 1 a 7 de la metodología §14 y las reglas 3 y 5 de RO01 §3 (techo y
    banderas fuera del ranking) como tests;
  - integración contra el Postgres local: aplicar, revertir y volver a aplicar las
    migraciones; las restricciones rechazan una historia ramificada, un padre con
    evaluación y la modificación de una evaluación.

  `pnpm test` los incluye, y la guarda de `scripts/guard-db-tests.mjs` se aplica a la
  base del contexto.
- **El arnés del spike sigue en 211 pass**, sin cambios.
- **`contexts/risk/README.md`** explica cómo crear las bases, migrar, revertir y correr
  los tests.

## Non-scope

- Importador, lectura de CSV, UI, app, acceso, despliegue o base hosteada. Son de
  T-0029, T-0030 y T-0032.
- Datos reales o cualquier valor de las cinco históricas (R-19).
- Cambiar una regla de la metodología, los contratos de `v0/fase-15/contrato/` o algo
  congelado en `v1/`. Si portar una función muestra una diferencia, se reporta; no se
  corrige en el contexto.
- Borrar o modificar `SPIKES/T-0021/`.
- Integración con Broker OS: ni `Party`, ni `Policy`, ni `packages/db` (D-0063, D-0067).
- Cambios en `packages/*`, `apps/*` o `DOMAIN.md`, salvo lo mínimo de configuración del
  workspace, del lint, del typecheck y del script de tests para incluir `contexts/risk`.

## Verification

```bash
pnpm check
createdb delcampo_risk_test
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test
(cd SPIKES/T-0021/regresion-ejecutable && node --run test)
```

Comprobaciones humanas, registradas en `ops/evidence/T-0028.md`:

- [ ] Imports de prueba hacen fallar `pnpm lint`, y se revierten: desde `contexts/risk`
      hacia `@del-campo/db` y hacia `@del-campo/communication`; desde `apps/web` hacia
      `@del-campo/risk`; y desde `contexts/risk/src/domain` hacia `node:fs`.
- [ ] Aplicar todas las migraciones, revertirlas y volver a aplicarlas funciona sobre
      `delcampo_risk_test`.
- [ ] El test de oráculo compara los 59 objetos contra `regresion-emi41.csv` y falla si
      se altera un valor de esa tabla en una copia temporal.
- [ ] Un `UPDATE` sobre una evaluación escrita y una segunda sucesora de la misma
      evaluación fallan por restricción de la base.
- [ ] El arnés del spike da 211 pass, 0 fail y 2 todo.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0028-*.md`.

## Data effects

- **Bases de datos:** sólo `delcampo_risk_dev` y `delcampo_risk_test`, locales. Se
  revierte con `db:down` o `dropdb`.
- **Sistemas externos:** ninguno.

## Risks

- **Duplicar el runner de migraciones por tercera vez** (Broker y Communication ya
  tienen uno). D-0063 no crea un núcleo compartido en Q4; se acepta y se anota para el
  cierre de Q4 (R-01).
- **Sobremodelar.** Cada tabla nombra la superficie de RO01 §2 que la usa; lo que no
  tenga una, no entra.
- **Guardar derivados.** Si se guardan para auditoría, la fuente de verdad sigue siendo
  la función. Un derivado guardado que no coincide con el recalculado es un error, no un
  dato.

## Notes

Primera tarea de RO01 §10. Linear: no cierra ningún issue por sí sola; es la base de
EMI-23, EMI-24, EMI-25 y EMI-26.

Depende de puntos de "Para decidir" de `SLICES/RO01-dossier.md`: el registro de
novedades (punto 9, hallazgo H2) y el reordenamiento (punto 5). Está escrita con las
opciones recomendadas: los dos entran. Se ajusta antes de pasar a `READY` si el owner
decide otra cosa.
