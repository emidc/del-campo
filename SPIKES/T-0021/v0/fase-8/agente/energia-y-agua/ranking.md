# Ranking D10 · familia Energía y agua · agente-8b-energia-y-agua

> Fase 8 · corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2 · actor ai · review_status pending.
> Orden por metodología §7.2 (banda vacía hasta la Fase 9, así que el paso 1 no decide; luego `C_raw`, I efectivo, I-personas, empate legítimo). Cada orden se fijó al terminar la empresa y no se ajustó después. Los valores de `C_raw` están en `fichas.csv` (campo interno, D12); acá sólo va la regla que decidió cada posición.

## S31 · Upstream no convencional

| Posición | risk_id | Regla que decidió la posición |
|---|---|---|
| 1 | S31-R04 | Paso 2: `C_raw` mayor que todos los demás. |
| 2 | S31-R06 | Paso 2 frente a los de abajo; empata en `C_raw` con S31-R02 y en I efectivo (3 y 3): decide el paso 4, I-personas 3 contra 1. |
| 3 | S31-R02 | Paso 4 (I-personas menor que S31-R06); paso 2 frente a los de abajo. |
| 4 | S31-R05 | Paso 2 (`C_raw` menor que S31-R02 y mayor que S31-R03). I efectivo `≥ 4` (I-personas unknown), sin efecto: no hay empate. |
| 5 | S31-R03 | Paso 2. |
| 6 | S31-R01 | Paso 2. |

No evaluables de S31: ninguno. Banderas: `safety_critical` en S31-R01 y S31-R03; ninguna `consecuencia_extrema`. Cola de validación: S31-R05 (I-personas unknown con máximo 4, entra primero por posible seguridad).

## S32 · Servicios a operadoras

| Posición | risk_id | Regla que decidió la posición |
|---|---|---|
| 1 | S32-R03 | Paso 2: `C_raw` mayor que todos los demás. |
| 2 | S32-R01 | Empata en `C_raw` con S32-R02; decide el paso 3, I efectivo 4 contra 3. |
| 3 | S32-R02 | Paso 3 (I efectivo menor que S32-R01); paso 2 frente a los de abajo. |
| 4 | S32-R05 | Paso 2. |
| 5 | S32-R04 | Paso 2. |

No evaluables de S32 (lista aparte, fuera del ranking): **S32-R06**: P unknown (rango 3–5), sin registro de robos ni estadística sectorial. Banderas: `safety_critical` en S32-R01; `consecuencia_extrema` en S32-R03 (Económico y Continuidad). Cola de validación: S32-R06.

## S33 · Parque fotovoltaico

| Posición | risk_id | Regla que decidió la posición |
|---|---|---|
| 1 | S33-R06 | Paso 2: `C_raw` mayor que todos los demás. |
| 2 | S33-R04 | Paso 2. |
| 3 | S33-R01 | Paso 2. |
| 4 | S33-R03 | Paso 2. |
| 5 | S33-R02 | Paso 2. |
| 6 | S33-R05 | Paso 2. |

No evaluables de S33: ninguno. Banderas: `consecuencia_extrema` en S33-R01 (Económico y Continuidad); ninguna `safety_critical`. Cola de validación: S33-R06 (`uncertainty = high`).

## S34 · Tratamiento de agua para minas y bodegas

| Posición | risk_id | Regla que decidió la posición |
|---|---|---|
| 1 | S34-R06 | Paso 2: `C_raw` mayor que todos los demás. |
| 2 | S34-R05 | Empata en `C_raw` con S34-R04; decide el paso 3, I efectivo 5 contra 3. |
| 3 | S34-R04 | Paso 3 (I efectivo menor que S34-R05); paso 2 frente a los de abajo. |
| 4 | S34-R03 | Paso 2. |
| 5 | S34-R02 | Paso 2. |

No evaluables de S34 (lista aparte, fuera del ranking): **S34-R01**: I-económico unknown (rango 2–5) por el contrato firmado con el cliente B no disponible; su cota por §9.3 supera el `C_raw` de las dimensiones conocidas. Banderas: `safety_critical` en S34-R06; `consecuencia_extrema` en S34-R05 (Económico y Continuidad). Cola de validación: S34-R01.

## Lista de no evaluables de la familia

| risk_id | Empresa | Factor | Motivo | Qué hay que averiguar |
|---|---|---|---|---|
| S32-R06 | S32 | P unknown (3–5) | Sin registro de robos ni estadística sectorial; el testimonio sin fechas no discrimina entre 3, 4 y 5 | Separar en el inventario los faltantes por robo; registro de intrusiones de la operadora A; frecuencia de recorridas de vigilancia |
| S34-R01 | S34 | I-económico unknown (2–5) | Contrato firmado con B no disponible (tope de responsabilidad y exclusión de producción perdida); la cota supera el `C_raw` conocido | Contrato firmado con el cliente B y sus anexos |

## Resumen de banderas y cola de validación

- `safety_critical`: S31-R01, S31-R03, S32-R01, S34-R06.
- `consecuencia_extrema`: S32-R03, S33-R01, S34-R05.
- Cola de validación (§9.5, orden calculado): 1) S31-R05 (I-personas unknown con máximo 4: posible `safety_critical`); 2) S34-R01 (cota de validación 80); 3) S33-R06 (`uncertainty = high`, cota 80); 4) S32-R06 (cota 40). Desempate entre S34-R01 y S33-R06 por I-personas máximo posible (4 contra 1).
