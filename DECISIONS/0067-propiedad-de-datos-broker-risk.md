# ADR-0067 — Propiedad de datos entre Broker OS y Risk OS

- **Id en `decisions.yaml`:** D-0067
- **Fecha:** 2026-10-14
- **Supersede:** — (complementa D-0063; no la reemplaza)

## Contexto

D-0063 fija cómo se separan los contextos durante Q4: cada uno con su esquema de
Postgres, sin leer ni escribir el esquema de otro, sin núcleo compartido y, si hace
falta, con referencias opacas sin clave foránea. No dice qué dato es de quién. EMI-18
(Linear, proyecto Risk OS, hito "v1 accepted") lo pide con un criterio: no duplicar
dominio ni acoplar los sistemas antes de tiempo.

Hechos del repositorio al 2026-10-14 (`main` en `691636e`):

1. **T-0021 cerró los formatos de Risk OS.** Los contratos de `risks.csv`,
   `action-plan.csv` y `risk-transfer.csv` están en `SPIKES/T-0021/v0/fase-15/contrato/`,
   aprobados por el owner (`SPIKES/T-0021/v0/fase-15/decisiones-15a.md` y
   `decisiones-15b.md`). La decisión 1a ya dejó `organizacion_id` opaco, y el contrato
   de `risk-transfer.csv` declara `poliza_ref` como referencia opaca sin clave foránea
   a `Policy`.
2. **`DOMAIN.md` §46 (`RiskAssessment`) y §76 (`EnterpriseRisk`)** dicen que su
   estructura "la determina el POC". El POC existe y su modelo no es de Broker OS.
3. **Hay un solo solapamiento real.** `risk-transfer.csv` estructura, por riesgo,
   límite, sublímite, deducible, vigencia y exclusiones, y registra eventos de póliza
   (`firma`, `ampliacion`, `renovacion`, `consumo_limite`, `vencimiento`,
   `cancelacion`). En Broker OS, la cobertura de una `PolicyVersion` es un bloque opaco
   a propósito (D-0050) porque D-0025 no está resuelta, y la vigencia, la renovación,
   el `Endorsement` y la cancelación son de `Policy` (`DOMAIN.md` §25-37).
4. **Fuera de ese punto, los conceptos no se cruzan.** "Empresa" existe en los dos
   contextos, como D-0063 ya acepta, pero Risk OS sólo necesita sector, tamaño y
   unidades para evaluar, no la identidad de `Party`.

La propuesta se presentó en el hilo de EMI-18 con cuatro puntos. El owner decidió los cuatro el 2026-10-14 en
el hilo de EMI-18, con precisiones propias en B, C y en la regla general que este ADR
recoge.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0067. Acá están el
inventario, la forma de aplicarla y la evidencia.

## Cómo se aplica

### Inventario de propiedad

| Concepto | Contexto autoritativo | Qué puede conservar el otro contexto |
|---|---|---|
| `Party`, `OrganizationProfile`, `PersonProfile`, `PartyRole`, `ContactPoint` | Broker OS | Risk OS: su propia organización evaluada (sector, tamaño, unidades), con `organizacion_id` propio |
| `Policy`, `PolicyVersion`, vigencia, cadena de renovación, `Endorsement`, cancelación | Broker OS | Risk OS: `poliza_ref` y observaciones locales de hechos de póliza (punto B) |
| Contenido contractual de la cobertura (`coverageData`) | Broker OS | Risk OS: su evaluación de transferencia por riesgo (punto B) |
| `Insurer`, `InsuranceProduct` | Broker OS | Risk OS: nada estructurado; el texto de la cobertura puede nombrarlos |
| `DocumentLink` y autoridad documental | Broker OS | Risk OS: `evidencia` como referencias de texto, sin vínculo a `DocumentLink` |
| `User`, roles internos, `BusinessAuditEvent` | Broker OS | Risk OS: `evaluador` y `revisado_por` como texto |
| `RiskObject` | Broker OS (sin modelar) | Risk OS: `unidad_id` y `tipo_objeto` son su propia descripción, no `RiskObject` |
| `EnterpriseRisk`: riesgo, padre, sub-riesgo, escenario | Risk OS | Broker OS: nada |
| `RiskAssessment`: evaluación, factores, procedencia, incertidumbre, revisión | Risk OS | Broker OS: nada |
| Plan de acción, ciclo, revisión pendiente, reordenamiento profesional | Risk OS | Broker OS: nada |
| Evaluación de transferencia: cobertura considerada, límite y sublímite aplicables al riesgo, exposición retenida, suficiencia | Risk OS | Broker OS: nada |
| Metodología versionada y sus funciones de cálculo (`C_raw`, banda, ranking) | Risk OS | Broker OS: nada |

### Regla general: autoridad única y proyecciones locales

Cada concepto tiene un único contexto autoritativo. Otro contexto conserva sólo las
referencias, proyecciones, snapshots o datos derivados que necesita para sus propias
responsabilidades. Esos datos:

- conservan procedencia cuando corresponde (en Risk OS, `actor`, `base` y `evidencia`
  de EMI-17);
- no implican sincronización con la fuente autoritativa;
- no se presentan como el registro canónico del contexto dueño;
- no habilitan escritura de regreso al contexto dueño;
- no transfieren la propiedad conceptual del dato.

La duplicación deliberada que acepta D-0063 es, por lo tanto, una proyección local y no
un dominio compartido.

### A. `DOMAIN.md` §46 y §76

`EnterpriseRisk` y `RiskAssessment` dejan de estar "a la espera del POC" y quedan
identificados como propiedad del contexto Risk OS, con un nuevo estado de modelado en
`DOMAIN.md` §3 para conceptos cuyo modelo pertenece a otro contexto. Los contratos de
T-0021 son la referencia de su forma. `DOMAIN.md` sigue siendo el documento canónico del
dominio de Broker OS y no incorpora el modelo interno de Risk OS.

### B. Cobertura y hechos de póliza

- **Broker OS es autoridad** sobre `Policy`, sus versiones, la vigencia, la renovación,
  los `Endorsement`, la cancelación y el contenido contractual de la cobertura.
- **Risk OS es dueño de su evaluación de transferencia aplicada a cada riesgo:** la
  cobertura considerada, el límite y el sublímite aplicables al riesgo, la exposición
  retenida, la suficiencia y las demás interpretaciones que necesita.
- **Durante Q4, Risk OS puede registrar localmente hechos observados sobre una póliza**
  (firma, renovación, vencimiento, ampliación, consumo o cancelación), con su
  procedencia, cuando los necesita para interpretar la exposición. Son snapshots u
  observaciones locales, no hechos autoritativos de `Policy`: no reemplazan a Broker OS,
  no resuelven D-0025 y no implican sincronización.
- **En una integración posterior**, los hechos propios de `Policy` vienen de Broker OS.
  Risk OS conserva como propios la evaluación de transferencia, la exposición retenida y
  la relación entre la cobertura y el `EnterpriseRisk`.

En `risk-transfer.csv`, las filas con `tipo_registro = evento` son esas observaciones
locales, y las filas `cobertura` son la evaluación de transferencia de Risk OS. El
contrato no cambia.

### C. `organizacion_id` y `poliza_ref`

- `organizacion_id` es una identidad propia de Risk OS con formato `ORG-<ULID>`. No
  contiene ni requiere el id de `Party`.
- `poliza_ref` es una referencia documental y local de Risk OS. No es `Policy.id`, no es
  una clave foránea y no es la identidad canónica de una póliza. Se interpreta dentro de
  la organización a la que pertenece el riesgo.
- En Q4 no se copian identificadores internos desde la base de Broker OS.
- Si los contextos se integran al cierre de Q4, la correspondencia entre las identidades
  de Risk OS y `Party` o `Policy` se establece explícitamente, sin reemplazar las
  identidades locales ya creadas.

### Lo que este ADR no autoriza

- **Datos reales.** No autoriza usar ni almacenar datos reales en Risk OS. Esa
  autorización y sus condiciones se resuelven por separado bajo R-19. D-0062 no se
  extiende (D-0063).
- **Flujos entre contextos.** Durante Q4 no hay flujos automáticos entre Broker OS y
  Risk OS: ni lecturas, ni eventos, ni exportaciones. La integración, la reconciliación
  de identidades y los contratos entre contextos se deciden al cierre de Q4.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Modelar `EnterpriseRisk` y `RiskAssessment` en `DOMAIN.md` | Lleva el modelo de un laboratorio al documento canónico de Broker OS antes del cierre de Q4, que es lo que D-0063 evita. Descartar Risk OS obligaría a deshacer cambios de dominio. |
| Dejar §46 y §76 como estaban | El texto afirmaría que el POC todavía no decidió, cuando T-0021 ya fijó la forma con aprobación del owner. |
| Que Risk OS lea la cobertura y la vigencia desde Broker OS | Lectura del esquema de Broker, prohibida por D-0063, y dependencia de un `coverageData` sin estructura. |
| Estructurar la cobertura en Broker OS para que Risk OS la use | Resuelve D-0025 de hecho, sin la evidencia de pólizas de al menos dos compañías que la decisión exige. |
| Guardar desde ya los UUID de `Party` y `Policy` como texto opaco | Alguien tiene que extraerlos de la base de Broker, con datos reales (R-19), y los datos sintéticos no los tienen. Adelanta la reconciliación que Q4 deja para el cierre. |
| Escribirlo como sección de ADR-0063 | Mezcla una decisión de arquitectura de todo Q4 con una de datos de un solo laboratorio. Communication OS tendría que escribir la suya en el mismo archivo. |

## Consecuencias

**Más fácil.**

- El importador de los tres CSV (EMI-23) sabe qué valores aceptan las tres columnas que
  tocan a Broker OS, sin cambiar los contratos de T-0021.
- Descartar Risk OS no toca `DOMAIN.md` más allá de §3, §46 y §76.
- Integrar al cierre de Q4 parte de una lista explícita de qué datos de Risk OS son
  proyecciones de Broker OS y cuáles son propios.

**Más difícil.**

- La vigencia y los eventos de una misma póliza pueden diferir entre Broker OS y la
  observación local de Risk OS. Mientras no haya integración, esa diferencia no se
  detecta sola. Se acepta porque Risk OS sólo usa esos datos para interpretar la
  exposición y los guarda con procedencia.
- Una misma organización tiene dos identidades, `Party` y `ORG-<ULID>`, hasta que
  alguien decida reconciliarlas.

**Costo de revertir:** bajo. Es una regla de propiedad sobre contratos que todavía no
tienen esquema ni datos persistidos. Revertirla cambia `DOMAIN.md` §3, §46 y §76 y,
como mucho, el significado de dos columnas.

## Criterio de falsación

Esta decisión se revisa si pasa alguna de estas cosas:

- Risk OS no puede cumplir su aceptación de Q4 sin la vigencia o la cobertura
  autoritativas de Broker OS. Eso indica que la observación local no alcanza, y la
  pregunta vuelve a D-0063.
- Las observaciones locales de hechos de póliza divergen de Broker OS de una forma que
  cambia una evaluación de transferencia aceptada.
- Aparece un tercer contexto que necesita la misma proyección, lo que pediría un
  contrato entre contextos en lugar de copias (R-01).
- En todos los casos, se revisa en la decisión de cierre de Q4.
