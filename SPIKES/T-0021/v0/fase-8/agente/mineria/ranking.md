# Ranking D10 por empresa · familia Minería · agente-8b-mineria

Corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2. Orden por D10 (metodología §7.2): banda (vacía hasta la Fase 9, no decide) → `C_raw` → I efectivo → I-personas → empate legítimo. Cada orden se fijó al terminar la empresa y no se ajustó después. Los escenarios por causa común no entran al ranking (§10.4). No se muestran `C_raw` ni niveles: sólo la regla que decidió cada posición.

## S07 · Cobre a cielo abierto y flotación

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S07-R04 | Falla del muro del depósito de relaves | queda arriba de S07-R06 por paso 4 (I-personas) |
| 2 | S07-R06 | Rotura de la corona dentada del molino SAG | queda debajo de S07-R04 por paso 4 (I-personas); queda arriba de S07-R02 por paso 3 (I efectivo) |
| 3 | S07-R02 | Proyección de material fuera del radio de exclusión en una voladura del rajo | queda debajo de S07-R06 por paso 3 (I efectivo); queda arriba de S07-R03 por paso 2 (`C_raw`) |
| 4 | S07-R03 | Colisión entre un camión de extracción y un vehículo liviano en el rajo | queda debajo de S07-R02 por paso 2 (`C_raw`); queda arriba de S07-R08 por paso 3 (I efectivo) |
| 5 | S07-R08 | Sanción de la autoridad ambiental por el exceso en el balance de agua del permiso | queda debajo de S07-R03 por paso 3 (I efectivo); queda arriba de S07-R01 por paso 2 (`C_raw`) |
| 6 | S07-R01 | Falla de un talud de la pared este del rajo | queda debajo de S07-R08 por paso 2 (`C_raw`); queda arriba de S07-R07 por paso 2 (`C_raw`) |
| 7 | S07-R07 | Incendio en un camión de extracción | queda debajo de S07-R01 por paso 2 (`C_raw`); queda arriba de S07-R05 por paso 3 (I efectivo) |
| 8 | S07-R05 | Interrupción del suministro de agua fresca a la planta concentradora | queda debajo de S07-R07 por paso 3 (I efectivo) |

**No evaluables (lista aparte, §9.4):** ninguno.

## S08 · Minería subterránea

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S08-R05 | Irrupción súbita de agua en una labor de desarrollo | queda arriba de S08-R01 por paso 2 (`C_raw`) |
| 2 | S08-R01 | Derrumbe en una labor de interior mina | queda debajo de S08-R05 por paso 2 (`C_raw`); empata con S08-R02 en todos los pasos (paso 5); comparten posición |
| 2 | S08-R02 | Caída de una roca suelta sobre un trabajador | Empate legítimo con S08-R01: mismo `C_raw`, I efectivo e I-personas (paso 5); el grupo queda arriba de S08-R04 por paso 2 (`C_raw`) |
| 4 | S08-R04 | Incendio de un equipo diésel en interior mina | queda debajo de S08-R02 por paso 2 (`C_raw`); queda arriba de S08-R03 por paso 2 (`C_raw`) |
| 5 | S08-R03 | Detención del ventilador principal de la mina | queda debajo de S08-R04 por paso 2 (`C_raw`); empata con S08-R06 en todos los pasos (paso 5); comparten posición |
| 5 | S08-R06 | Atropello de una persona por un equipo en la rampa | Empate legítimo con S08-R03: mismo `C_raw`, I efectivo e I-personas (paso 5) |
| 5 | S08-R07 | Intoxicación de trabajadores con gases de voladura | Empate legítimo con S08-R03: mismo `C_raw`, I efectivo e I-personas (paso 5) |

**No evaluables (lista aparte, §9.4):** ninguno.

## S09 · Litio en salmuera y evaporación

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S09-R06 | Accidente vial en el camino de acceso | queda arriba de S09-R05 por paso 2 (`C_raw`) |
| 2 | S09-R05 | Suspensión o reducción del permiso de uso de agua dulce | queda debajo de S09-R06 por paso 2 (`C_raw`); queda arriba de S09-R02 por paso 2 (`C_raw`) |
| 3 | S09-R02 | Afectación del acuífero de agua dulce de la cuenca por el bombeo | queda debajo de S09-R05 por paso 2 (`C_raw`); queda arriba de S09-R07 por paso 2 (`C_raw`) |
| 4 | S09-R07 | Lluvia o nevada intensa sobre el campo de piletas | queda debajo de S09-R02 por paso 2 (`C_raw`); queda arriba de S09-R01 por paso 2 (`C_raw`) |
| 5 | S09-R01 | Rotura de la geomembrana de una pileta de evaporación | queda debajo de S09-R07 por paso 2 (`C_raw`); queda arriba de S09-R04 por paso 2 (`C_raw`) |
| 6 | S09-R04 | Derrame de ácido clorhídrico en la planta de carbonato | queda debajo de S09-R01 por paso 2 (`C_raw`); queda arriba de S09-R03 por paso 4 (I-personas) |
| 7 | S09-R03 | Colapso del entubado de un pozo de bombeo de salmuera | queda debajo de S09-R04 por paso 4 (I-personas) |

**No evaluables (lista aparte, §9.4):** ninguno.

## S10 · Cantera de caliza y áridos a cielo abierto

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S10-R01 | Contacto de un equipo móvil con una persona o un vehículo liviano en el frente | empata con S10-R02 en todos los pasos (paso 5); comparten posición |
| 1 | S10-R02 | Caída de un trabajador desde la cresta de un banco | Empate legítimo con S10-R01: mismo `C_raw`, I efectivo e I-personas (paso 5) |
| 1 | S10-R03 | Proyección de roca fuera de la zona de exclusión de una voladura | Empate legítimo con S10-R01: mismo `C_raw`, I efectivo e I-personas (paso 5) |
| 1 | S10-R07 | Vuelco de un camión propio de despacho en el camino o la ruta | Empate legítimo con S10-R01: mismo `C_raw`, I efectivo e I-personas (paso 5); el grupo queda arriba de S10-R04 por paso 4 (I-personas) |
| 5 | S10-R04 | Rotura de la trituradora primaria | queda debajo de S10-R07 por paso 4 (I-personas); queda arriba de S10-R06 por paso 2 (`C_raw`) |
| 6 | S10-R06 | Reclamo de vecinos por vibraciones y polvo | queda debajo de S10-R04 por paso 2 (`C_raw`) |

**No evaluables (lista aparte, §9.4):** S10-R05 (i_pers e i_econ unknown sin rango acotable: la cota de Personas (P 5 × 5 × V 5 = 125) y la de Económico superan el C_raw de las dimensiones conocidas (Legal), §9.3.)

## S11 · Mina de oro a cielo abierto con lixiviación en pilas

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S11-R04 | Colisión entre equipos de extracción o con un vehículo liviano en la mina | queda arriba de S11-R02 por paso 2 (`C_raw`) |
| 2 | S11-R02 | Falla de estabilidad de la pila de lixiviación | queda debajo de S11-R04 por paso 2 (`C_raw`); queda arriba de S11-R05 por paso 2 (`C_raw`) |
| 3 | S11-R05 | Desborde de la pileta de eventos durante una tormenta | queda debajo de S11-R02 por paso 2 (`C_raw`); queda arriba de S11-R01 por paso 2 (`C_raw`) |
| 4 | S11-R01 | Derrame de solución cianurada rica fuera del sistema de contención | queda debajo de S11-R05 por paso 2 (`C_raw`); queda arriba de S11-R06 por paso 3 (I efectivo) |
| 5 | S11-R06 | Robo de oro en la planta de recuperación | queda debajo de S11-R01 por paso 3 (I efectivo); queda arriba de S11-R07 por paso 2 (`C_raw`) |
| 6 | S11-R07 | Sanción ambiental por un desvío del monitoreo de aguas | queda debajo de S11-R06 por paso 2 (`C_raw`); queda arriba de S11-R03 por paso 2 (`C_raw`) |
| 7 | S11-R03 | Intoxicación de un operario con cianuro | queda debajo de S11-R07 por paso 2 (`C_raw`) |

**No evaluables (lista aparte, §9.4):** ninguno.

## S12 · Planta de extracción directa de litio

| Posición | risk_id | Título | Regla que decidió la posición |
|---|---|---|---|
| 1 | S12-R03 | Incendio en la planta de proceso | queda arriba de S12-R05 por paso 2 (`C_raw`) |
| 2 | S12-R05 | Reinyección de salmuera fuera de especificación al salar | queda debajo de S12-R03 por paso 2 (`C_raw`); queda arriba de S12-R04 por paso 2 (`C_raw`) |
| 3 | S12-R04 | Pérdida del licenciante de la tecnología | queda debajo de S12-R05 por paso 2 (`C_raw`); empata con S12-R06 en todos los pasos (paso 5); comparten posición |
| 3 | S12-R06 | Rotura del compresor importado del evaporador | Empate legítimo con S12-R04: mismo `C_raw`, I efectivo e I-personas (paso 5); el grupo queda arriba de S12-R01 por paso 2 (`C_raw`) |
| 5 | S12-R01 | Pérdida de capacidad del material de absorción al operar a escala industrial | queda debajo de S12-R06 por paso 2 (`C_raw`); queda arriba de S12-R02 por paso 3 (I efectivo) |
| 6 | S12-R02 | Derrame de ácido clorhídrico de proceso | queda debajo de S12-R01 por paso 3 (I efectivo) |

**No evaluables (lista aparte, §9.4):** ninguno.
