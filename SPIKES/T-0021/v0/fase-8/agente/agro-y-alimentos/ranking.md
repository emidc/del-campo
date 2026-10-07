# Ranking D10 · familia Agro y alimentos · Fase 8 (corrida F8-AG-01)

> Evaluador: agente-8b-agro-y-alimentos (actor ai) · metodologia v0.2 · protocolo v0.2 · 2026-10-07.
> Un ranking por empresa (metodología §7.1.4): no hay orden entre empresas. Pasos de D10 (§7.2): 1 banda (vacía hasta la Fase 9, no decide), 2 `C_raw`, 3 I efectivo, 4 I-personas, 5 empate legítimo. Cada orden se fijó al terminar la empresa y no se ajustó después. No se muestran `C_raw` ni niveles: la regla dice qué paso separó cada posición de las vecinas con las que comparte el paso anterior. Los empatados se listan por `risk_id`, sin que eso sea prioridad.

## S01 · Bodega mediana integrada

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S01-R01 | Incendio en la nave de barricas | paso 3 (I efectivo) frente a S01-R07 |
| 2 | S01-R07 | Accidente de un operario dentro de un tanque (espacio confinado) | paso 3 (I efectivo) frente a S01-R01 |
| 3 | S01-R02 | Contaminación de un lote de vino durante la elaboración | paso 3 (I efectivo) frente a S01-R04 |
| 4 | S01-R04 | Falla de la línea de embotellado | paso 3 (I efectivo) frente a S01-R02 |
| 5 | S01-R06 | Granizo sobre los viñedos propios | paso 2 (C_raw) |
| 6 | S01-R05 | Rechazo de un embarque de exportación por un residuo fuera de norma | paso 2 (C_raw) |
| 7 | S01-R03 | Rotura de un tanque de acero con pérdida de vino | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S01-R01, S01-R07.

**Filtro `consecuencia_extrema`:** S01-R01.


## S06 · Cámara frigorífica PyME

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S06-R03 | Fuga de refrigerante | paso 2 (C_raw) |
| 2 | S06-R05 | Pérdida del principal cliente | paso 2 (C_raw) |
| 3 | S06-R01 | Falla del compresor central | paso 2 (C_raw) |
| 4 | S06-R04 | Incendio en los paneles aislantes | paso 2 (C_raw) |
| 5 | S06-R06 | Accidente con autoelevador dentro de una cámara | paso 2 (C_raw) |
| 6 | S06-R02 | Corte del suministro eléctrico de la red | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S06-R03, S06-R04.

**Filtro `consecuencia_extrema`:** S06-R01, S06-R03, S06-R04, S06-R05.


## S15 · Producción primaria de uva

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S15-R04 | Vuelco de un tractor | paso 2 (C_raw) |
| 2 | S15-R03 | Reducción del turno de riego | paso 2 (C_raw) |
| 3 | S15-R01 | Granizo sobre las fincas | paso 2 (C_raw) |
| 4 | S15-R02 | Helada tardía | paso 2 (C_raw) |
| 5 | S15-R06 | Ingreso de una plaga a las fincas | paso 2 (C_raw) |
| 6 | S15-R05 | Lesiones con herramientas en poda y cosecha | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S15-R04.

**Filtro `consecuencia_extrema`:** S15-R02.


## S16 · Cooperativa de pequeños productores

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S16-R05 | Accidente en la descarga de uva | paso 2 (C_raw) |
| 2 | S16-R02 | Incendio en la planta común | paso 2 (C_raw) |
| 3 | S16-R06 | Pérdida de un comprador a granel principal | paso 2 (C_raw) |
| 4 | S16-R01 | Entrega de uva de un socio con residuos fuera de norma | paso 2 (C_raw) |
| 5 | S16-R04 | Error en la liquidación a los socios | paso 2 (C_raw) |
| 6 | S16-R03 | Falla de la planta durante la vendimia | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S16-R02, S16-R05.

**Filtro `consecuencia_extrema`:** S16-R02.


## S17 · Procesamiento industrial vitícola

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S17-R01 | Falla de una caldera con liberación de vapor | paso 2 (C_raw) |
| 2 | S17-R06 | Rotura del evaporador principal | paso 2 (C_raw) |
| 3 | S17-R04 | Vertido de efluentes fuera de norma | paso 2 (C_raw) |
| 4 | S17-R05 | Quemadura de un operario con vapor | paso 2 (C_raw) |
| 5 | S17-R02 | Corte del suministro de gas | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** S17-R03 (Contaminación de un lote de mosto concentrado exportado): i_econ unknown (cláusula de indemnización del contrato vigente con el mayor cliente no relevada): su cota P × I_econ_max × V_econ = 4 × 5 × 2 = 40 supera el C_raw de las dimensiones conocidas (§9.3.2).

**Vista de seguridad (`safety_critical`):** S17-R01.

**Filtro `consecuencia_extrema`:** ninguno.


## S18 · Faena y procesamiento cárnico

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S18-R03 | Escape de amoníaco de la sala de máquinas | paso 2 (C_raw) |
| 2 | S18-R07 | Vertido de efluentes fuera de norma | paso 2 (C_raw) |
| 3 | S18-R01 | Contaminación de carne con un patógeno y retiro del producto | paso 2 (C_raw) |
| 4 | S18-R05 | Falla del sistema de frío | paso 2 (C_raw) |
| 5 | S18-R04 | Suspensión de la habilitación sanitaria para exportar | paso 5 (empate legítimo con S18-R06) |
| 5 | S18-R06 | Brote de una enfermedad animal que cierra mercados de exportación | paso 5 (empate legítimo con S18-R04) |
| 7 | S18-R02 | Lesión de un operario con cuchillo o sierra | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S18-R01, S18-R03.

**Filtro `consecuencia_extrema`:** ninguno.


## S19 · Planta láctea

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S19-R05 | Incendio en el depósito de producto terminado | paso 2 (C_raw) |
| 2 | S19-R01 | Contaminación de un lote y retiro del producto del mercado | paso 2 (C_raw) |
| 3 | S19-R06 | Lesión de un operario con químicos de limpieza | paso 4 (I-personas) frente a S19-R02 |
| 4 | S19-R02 | Falla del pasteurizador | paso 4 (I-personas) frente a S19-R06 |
| 5 | S19-R03 | Corte del suministro eléctrico de la red en la planta | paso 3 (I efectivo) frente a S19-R04 |
| 6 | S19-R04 | Interrupción de la recolección de leche en los tambos | paso 3 (I efectivo) frente a S19-R03 |

**No evaluables (lista aparte, §9.4):** ninguno.

**Fuera del ranking por tipo de objeto (§7.1.2):** S19-E01 (Corte eléctrico regional en la planta y en las cuencas lecheras), escenario por causa común, miembros S19-R03;S19-R04, evaluable=sí

**Vista de seguridad (`safety_critical`):** S19-R01, S19-R05.

**Filtro `consecuencia_extrema`:** S19-R05.


## S20 · Acopio de cereales

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S20-R01 | Explosión de polvo en el elevador | paso 2 (C_raw) |
| 2 | S20-R02 | Incendio por autocalentamiento del grano almacenado | paso 2 (C_raw) |
| 3 | S20-R05 | Colapso estructural de un silo | paso 2 (C_raw) |
| 4 | S20-R03 | Atrapamiento de un trabajador dentro de un silo | paso 2 (C_raw) |
| 5 | S20-R04 | Deterioro del grano por humedad | paso 2 (C_raw) |
| 6 | S20-R06 | Fraude en la balanza de recepción | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S20-R01, S20-R03, S20-R05.

**Filtro `consecuencia_extrema`:** S20-R01.


## S21 · Fruta fresca, empaque y frío

Orden D10 (metodología §7.2), fijado al terminar la empresa.

| Posición | risk_id | Riesgo | Regla que decidió la posición |
|---|---|---|---|
| 1 | S21-R05 | Accidente vial del transporte contratado de trabajadores de cosecha | paso 2 (C_raw) |
| 2 | S21-R08 | Nueva exigencia fitosanitaria del mercado principal | paso 2 (C_raw) |
| 3 | S21-R01 | Granizo sobre las fincas | paso 5 (empate legítimo con S21-R02) |
| 3 | S21-R02 | Helada tardía en floración | paso 5 (empate legítimo con S21-R01) |
| 5 | S21-R07 | Incendio en la planta de empaque | paso 2 (C_raw) |
| 6 | S21-R04 | Rechazo de embarques en destino por detección de una plaga cuarentenaria | paso 2 (C_raw) |
| 7 | S21-R03 | Falla del sistema de frío del frigorífico | paso 2 (C_raw) |
| 8 | S21-R06 | Paro en el puerto de embarque | paso 2 (C_raw) |

**No evaluables (lista aparte, §9.4):** ninguno.

**Vista de seguridad (`safety_critical`):** S21-R05, S21-R07.

**Filtro `consecuencia_extrema`:** S21-R04, S21-R07, S21-R08.

