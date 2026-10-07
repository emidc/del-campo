# Ranking D10 · Tecnología y pagos (Fase 8, agente)

> Evaluador: agente-8b-tecnologia-y-pagos · corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2 · 2026-10-07.
> Orden dentro de cada empresa con D10 (metodología §7.2): paso 1 banda (vacía hasta la Fase 9, no decide) → paso 2 `C_raw` → paso 3 I efectivo → paso 4 I-personas → paso 5 empate legítimo. Cada orden se fijó al terminar la empresa y no se ajustó después. No se comparan posiciones entre empresas (§7.1.4). Los valores de `C_raw` están en `fichas.csv` (campo interno).

## S04 · SaaS B2B

| Posición | Objeto | Regla que decidió la posición |
|---|---|---|
| 1 | S04-R03 Exposición de datos por error de configuración del almacenamiento | Paso 2: mayor `C_raw` de la empresa |
| 2 | S04-R05 Salida simultánea de las dos personas clave | Paso 3: empata en `C_raw` con R04 y R06; I efectivo 4 contra 3 |
| 3 (empate) | S04-R04 Uso indebido de una credencial de soporte | Paso 5: empate legítimo con R06 (mismo `C_raw`, I efectivo 3, I-personas 1) |
| 3 (empate) | S04-R06 Explotación de una vulnerabilidad en una dependencia | Paso 5: empate legítimo con R04 |
| 5 | S04-R02 Ransomware sobre la infraestructura de producción | Paso 3: empata en `C_raw` con R01; I efectivo 4 contra 2 |
| 6 | S04-R01 Falla regional del proveedor de nube | Paso 3: I efectivo 2, por debajo de R02 |
| 7 | S04-R07 Incumplimiento del SLA con el cliente principal | Paso 2: menor `C_raw` |

No evaluables de S04: ninguno.

## S29 · Fintech de pagos

Orden de los hijos de S29-P01 (D10, §1.4.2): 1 S29-P01-S01 (paso 2, mayor `C_raw`), 2 S29-P01-S03 (paso 2), 3 S29-P01-S02 (paso 2). Hijo prioritario: S29-P01-S01. `prioridad_provisional` = false.

| Posición | Objeto | Regla que decidió la posición |
|---|---|---|
| 1 | S29-R06 Incumplimiento de un requisito regulatorio de reporte | Paso 2: mayor `C_raw` de la empresa |
| 2 | S29-R07 Filtración de datos en el proveedor de verificación de identidad | Paso 2 |
| 3 | S29-R05 Fraude interno en las liquidaciones | Paso 2 |
| 4 | S29-P01 Indisponibilidad de la autorización de pagos (padre, mostrado con S29-P01-S01) | Paso 2, con los factores del hijo prioritario (§1.4.3) |
| 5 | S29-R04 Uso indebido de una credencial privilegiada sobre la bóveda | Paso 2: menor `C_raw` |

No evaluables de S29: ninguno.

## S30 · Centro de datos regional

Orden de los hijos de S30-P01 (D10, §1.4.2): 1 S30-P01-S01 (paso 2, mayor `C_raw`), 2 S30-P01-S02 (paso 2), 3 S30-P01-S03 (paso 2). Hijo prioritario: S30-P01-S01. `prioridad_provisional` = false.

| Posición | Objeto | Regla que decidió la posición |
|---|---|---|
| 1 | S30-R07 Corte simultáneo de los dos proveedores de fibra | Paso 2: mayor `C_raw` de la empresa |
| 2 | S30-R08 Inundación de una sala por rotura de una cañería | Paso 3: empata en `C_raw` con R04; I efectivo 3 contra 2 |
| 3 | S30-R04 Falla de la refrigeración de una sala | Paso 3: I efectivo 2, por debajo de R08 |
| 4 | S30-R05 Incendio en una sala de datos | Paso 2 (`consecuencia_extrema` visible; no mueve el orden, §8.1) |
| 5 (empate) | S30-P01 Pérdida de energía en las salas (padre, mostrado con S30-P01-S01) | Paso 5: empate legítimo con R06 (mismo `C_raw`, I efectivo 2, I-personas 1) |
| 5 (empate) | S30-R06 Acceso físico no autorizado a las salas | Paso 5: empate legítimo con S30-P01 |

No evaluables de S30: ninguno.

## Lista de no evaluables (toda la familia)

Ninguna ficha quedó no evaluable: ningún factor se registró `unknown` (P conocido en todas; las dimensiones con datos auxiliares desconocidos se acotaron a tres niveles con valor más plausible, §9.2 [F5-1], con anomalía donde la elección es discutible). Entran a la cola de validación (§9.5) por `uncertainty = high`: S04-R03 y S29-R07.
