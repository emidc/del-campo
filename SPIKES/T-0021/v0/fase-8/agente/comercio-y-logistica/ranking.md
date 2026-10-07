# Ranking D10 · familia Comercio y logística

> Evaluador: agente-8b-comercio-y-logistica · corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2 · 2026-10-07.
> Orden dentro de cada empresa con D10 (metodología §7.2): banda (vacía hasta la Fase 9, no decide) → `C_raw` → I efectivo → I-personas → empate legítimo. Cada orden se fijó al terminar su empresa y no se ajustó después. No se muestran `C_raw` ni niveles. Las banderas no mueven el orden.

## S03 · Transporte y depósito

| Posición | risk_id | Título | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S03-R05 | Incendio en el depósito con mercadería de clientes | Paso 2 (`C_raw` mayor que el resto) | consecuencia_extrema; safety_critical |
| 2 | S03-R01 | Siniestro vial de un camión propio | Paso 3: empata en `C_raw` con S03-R06 y tiene I efectivo mayor | safety_critical |
| 3 | S03-R06 | Lesiones en la carga y descarga | Paso 3: queda detrás de S03-R01 por I efectivo menor | — |
| 4 | S03-R02 | Robo de carga en ruta | Paso 2 | — |
| 5 | S03-R03 | Robo en el depósito | Paso 2 | — |
| 6 | S03-R04 | Caída del sistema de gestión del depósito, sin soporte del fabricante | Paso 2 | — |
| 7 | S03-R07 | Daño a mercadería de clientes por manipulación | Paso 2 | — |

No evaluables de S03: ninguno.

## S13 · Distribución de insumos enológicos y mineros

| Posición | risk_id | Título | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S13-R01 | Incendio en el depósito con productos incompatibles | Paso 3: empata en `C_raw` con S13-R05 y tiene I efectivo mayor | consecuencia_extrema; safety_critical |
| 2 | S13-R05 | Derrame durante el transporte a un cliente | Paso 3: queda detrás de S13-R01 por I efectivo menor | — |
| 3 (empate) | S13-R02 | Venta de un lote contaminado o mal rotulado a un cliente | Paso 5: empate legítimo con S13-R04 (mismo `C_raw`, mismo I efectivo, mismo I-personas) | — |
| 3 (empate) | S13-R04 | Quiebra del proveedor extranjero único de un reactivo homologado | Paso 5: empate legítimo con S13-R02 | — |
| 5 | S13-R06 | Robo de mercadería | Paso 2 | — |
| 6 | S13-R03 | Retención en aduana de una importación sin la que no se abastece a los clientes | Paso 2 | — |

No evaluables de S13: ninguno. (Empatados listados por `risk_id`, sin que eso represente prioridad.)

## S27 · Cadena de farmacias

| Posición | risk_id | Título | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S27-R02 | Faltante de medicamentos de stock regulado | Paso 2 | — |
| 2 | S27-R04 | Ransomware sobre el sistema de ventas y recetas | Paso 2 | — |
| 3 (empate) | S27-R01 | Robo a mano armada en una sucursal | Paso 5: empate legítimo con S27-R05 (mismo `C_raw`, mismo I efectivo, mismo I-personas) | — |
| 3 (empate) | S27-R05 | Error de dispensa a un paciente | Paso 5: empate legítimo con S27-R01 | — |
| 5 | S27-R06 | Incendio en el centro de distribución | Paso 2 | consecuencia_extrema; safety_critical |
| 6 | S27-R03 | Falla del frío en una sucursal | Paso 2 | — |

No evaluables de S27: ninguno. (Empatados listados por `risk_id`, sin que eso represente prioridad.)

## S28 · Cadena de supermercados: 15 locales y un centro de distribución

| Posición | risk_id | Título | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S28-R04 | Venta de un alimento contaminado | Paso 2 | safety_critical |
| 2 | S28-R02 | Incendio en un local | Paso 3: empata en `C_raw` con S28-R03 y tiene I efectivo mayor | consecuencia_extrema; safety_critical |
| 3 | S28-R03 | Caída de un cliente en un local | Paso 3: queda detrás de S28-R02 por I efectivo menor | — |
| 4 | S28-R01 | Incendio en el centro de distribución | Paso 2 | consecuencia_extrema; safety_critical |
| 5 | S28-R07 | Caída del sistema de cobro en todos los locales | Paso 2 | — |
| 6 | S28-R05 | Hurto en los locales | Paso 2 | — |
| 7 | S28-R06 | Falla del frío en un local | Paso 2 | — |

No evaluables de S28: ninguno.

## Lista de no evaluables (toda la familia)

Ninguno. Los 26 objetos de la lista son riesgos simples (`tipo_objeto = riesgo`); ninguno tiene P `unknown` ni dimensiones o aspectos de V `unknown`, así que no hay lista no evaluable ni padres con `prioridad_provisional`. La lista fija no trae padres, sub-riesgos ni escenarios por causa común, y no creé ninguno (protocolo §3 y §10: la lista es fija).

## Cola de validación (§9.5, calculada; no es criticidad)

Entran los evaluables con `uncertainty = high` (no hay `unknown`): S03-R04, S13-R04, S28-R07. Ninguno podría ser `safety_critical`; el orden por cota de validación queda en las fichas (`techo_plausible`).
