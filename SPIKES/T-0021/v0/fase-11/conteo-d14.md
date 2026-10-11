# Conteo de D14 al cierre de la Fase 11a (propuesto)

> 2026-10-11 · metodologia v0.3, protocolo v0.3 · Fase 11a. Es una **propuesta**: el conteo lo decide Emiliano (protocolo §9, "Quién lo declara"). Hasta que decida, figura como "propuesto".

## Resultado

**Propuesto: 1 de 3. D14 no está falsada.** Con la lectura más adversa que el protocolo admite, 2 de 3. En ningún caso se llega a 3.

| # | Caso | Estado | Familia (regla) | Cuenta |
|---|---|---|---|---|
| 1 | CP-01 R4 y CP-12: recurrencia por encima de P = 5 | Decidido por Emiliano (2026-10-07 01:54 UTC) | G3, saturación de P | **1** |
| 2 | CP-01 R1 bajo R5 (remoto y grave bajo frecuente y moderado) | Dudoso (AN-0158) | G2 | 0, con posible corrección por ancla 1 de P |
| 3 | CP-16 | Dudoso (AN-0159) | factores en el borde | 0 |
| 4 | S27-R02 sobre S27-R06 | Sin adjudicación previa | G2 | 0 (propuesta) |
| 5 | S31-R02 sobre S31-R01 | Sin adjudicación previa | G2 | 0 (propuesta) |
| 6 | S22-R03 sobre S22-R02 | Sin adjudicación previa | factores (A1 de P) | 0 (propuesta) |

## Por qué los pares de EMI-41 no cuentan (propuesta)

La decisión sobre estos tres pares está pendiente desde la Fase 8c: el reporte no los contó y la aprobación de Emiliano no dijo nada sobre ellos. Va en el "Para decidir" del dictamen.

**1. Ninguno fue adjudicado antes de la corrida.** Protocolo §9: cuenta un par "cuyo orden esperado Emiliano haya adjudicado **antes** de que se corriera la versión que lo falla". El orden que se esperaba para estos pares está en la intención de diseño de EMI-41, que escribió el agente generador y no Emiliano. La intención no es una adjudicación suya. Para que cuenten, Emiliano tendría que decidir que la intención vale como adjudicación previa, y eso cambia la regla de §9 (no es una lectura).

**2. S22 no es un fallo de la combinación.** El orden se invierte por los factores, no por el producto:

| Riesgo | Evaluador | P | Econ | Pers | Cont | Legal | V cont | V rec | `C_raw` |
|---|---|---|---|---|---|---|---|---|---|
| S22-R02 | agente | 2 | 3 | 4 | 4 | 4 | 2 | 3 | 16 |
| S22-R03 | agente | 4 | | | | | | | 48 |
| S22-R02 | Emiliano | 4 | 4 | 5 | 4 | 4 | 3 | 3 | 60 |
| S22-R03 | Emiliano | 5 | | | | | | | 45 |

Con los factores de Emiliano, R02 (la liberación de cloro) queda **arriba** de R03. Lo que invierte el orden del agente es su P = 2, la única A1 de factor de la Fase 8 (AN-8C-0001, §3.2 jerarquía 1). Protocolo §9 cuenta "órdenes incorrectos" de la función, no desacuerdos de asignación. Si se corrige §3.2 (EV-04), el par se reevalúa en la 11b.

**3. S27 y S31 son la misma familia que CP-01 R1/R5, y no son independientes entre sí.**

| Riesgo | P | Econ | Pers | Cont | Legal | V cont | V rec | `C_raw` | Determina |
|---|---|---|---|---|---|---|---|---|---|
| S27-R02 | 5 | 1 | 1 | 3 | 4 | 3 | 2 | 60 | Legal |
| S27-R06 | 3 | 5 | 4 | 5 | 4 | 2 | 2 | 30 | — |
| S31-R02 | 5 | 1 | 1 | 1 | 3 | 3 | 2 | 45 | Legal |
| S31-R01 | 2 | 3 | 4 | 4 | 4 | 3 | 5 | 24 | — |

Los dos son "frecuente y moderado arriba de remoto y grave", el patrón G2 de CP-01 R1/R5. Protocolo §9, independencia, condición 2: "si una sola corrección simple arreglaría a ambos, cuentan como uno". Los dos dependen de Legal 3–4 con P 5. S31 depende además de una P 2 que sale de un dato de jerarquía 1 al 3,6% (el mismo choque de §3.2 que S22). Así que contarían **como uno**, y como el mismo que CP-01 R1/R5 si ese llegara a contar.

**4. Puede haber corrección simple.** Protocolo §9 llama simple a una corrección de "la redacción de los niveles de las anclas de un factor". Hay tres candidatas, ninguna probada:
- ancla 4 de Legal (§4.5, "responsabilidad penal posible"), que lleva S27-R02 a 60;
- ancla 1 de P (AN-0158), que en CP-01 daría R1 40 > R5 30;
- §3.2, cuándo un dato de jerarquía 1 es comparable (EV-04), que mueve la P de S31-R01 y S22-R02.

§3.2 no es redacción de un nivel de ancla sino de la jerarquía de evidencia. Si Emiliano lee §9 en sentido estricto, esa corrección **no** es simple. Por eso el máximo adverso es 2: G3 más un G2 (CP-01 R1/R5 junto con S27 y S31), y sólo si se aceptara la intención como adjudicación previa y ninguna de las correcciones de anclas funcionara en la regresión.

## Qué haría falta para cambiar el conteo

- **Para contar G2 como el segundo caso:** que Emiliano adjudique ahora el orden de S27 y S31. Esa adjudicación valdría para la **próxima** corrida (protocolo §9), no para la de la Fase 8. Además, que las correcciones de anclas (§4.5 ancla 4, P ancla 1) fallen en la regresión de la 11b o rompan un caso que pasaba.
- **Para un tercer caso:** un fallo de una regla distinta de G2 y G3, adjudicado antes de la corrida. Hoy no existe ninguno. CP-16 necesita resolver primero sus factores de borde (AN-0159).
- **Evidencia nueva:** la Fase 12 es la primera fuente fuera de la muestra. Todo lo que hay hoy (casos de propiedad, EMI-41 y sus anomalías) se usó para diseñar o corregir la regla.

## Qué no hace este documento

No cuenta ningún caso hacia la falsación. No adjudica el orden de ningún par. No corre ninguna regresión con reglas nuevas.
