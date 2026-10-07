# Ranking D10 · Servicios a personas

> agente-8b-servicios-a-personas · corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2. Orden dentro de cada empresa (§7.1.4); se fijó al terminar cada empresa y no se ajustó después. Banda vacía hasta la Fase 9, así que el paso 1 no decide nada. Ninguna posición se compara entre empresas.

## S14 · Hotel 4★ con restaurante, eventos y spa

| Posición | risk_id | Riesgo | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S14-R04 | Contaminación bacteriana del agua del spa | Paso 2: mayor `C_raw` de la empresa | — |
| 2 | S14-R02 | Ahogamiento de un huésped en la piscina | Paso 2 frente a R04; frente a R01 (mismo `C_raw`, mismo I efectivo 4) decide el paso 4: I-personas 4 > 3 | safety_critical |
| 3 | S14-R01 | Intoxicación alimentaria de comensales en un evento | Paso 4 (I-personas menor que R02, mismo `C_raw` e I efectivo) | — |
| 4 | S14-R03 | Incendio en el hotel con huéspedes alojados | Paso 2 frente a R01; frente a R05 (mismo `C_raw`) decide el paso 3: I efectivo 5 > 3 | safety_critical; consecuencia_extrema (econ, pers) |
| 5 | S14-R05 | Ransomware sobre el sistema de reservas y gestión hotelera | Paso 3 (I efectivo menor que R03, mismo `C_raw`) | — |
| 6 | S14-R07 | Robo de datos de tarjetas de huéspedes | Paso 2 | — |
| 7 | S14-R06 | Caída de un huésped en el hotel | Paso 2 | — |

No evaluables S14: ninguno.

## S26 · Clínica privada

| Posición | risk_id | Riesgo | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S26-R01 | Corte del suministro eléctrico externo | Paso 2: mayor `C_raw` de la empresa | safety_critical; consecuencia_extrema (econ, pers) |
| 2 | S26-R07 | Suspensión de la habilitación de terapia intensiva tras una inspección | Paso 2 | — |
| 3 | S26-R03 | Error de medicación con daño a un paciente internado | Paso 2 | — |
| 4 | S26-R05 | Ransomware sobre la historia clínica electrónica y los sistemas de turnos | Paso 2 | — |
| 5 | S26-R02 | Brote de infección por bacteria multirresistente en terapia intensiva | Paso 2 | safety_critical |
| 6 | S26-R04 | Interrupción del suministro de oxígeno medicinal a la red | Paso 2 | safety_critical; consecuencia_extrema (pers) |
| 7 | S26-R06 | Incendio en el área de quirófanos | Paso 2 | safety_critical |

No evaluables S26: ninguno.

## S35 · Catering y eventos temporales

| Posición | risk_id | Riesgo | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S35-R01 | Intoxicación alimentaria de invitados en un evento | Paso 2: mayor `C_raw` de la empresa | — |
| 2 | S35-R05 | Aglomeración de público en un festival coorganizado | Paso 2 frente a R01; frente a R02 (mismo `C_raw`, mismo I efectivo 5) decide el paso 4: I-personas 4 > 3 | safety_critical; consecuencia_extrema (econ) |
| 3 | S35-R02 | Colapso de una carpa o estructura por viento durante un evento | Paso 4 (I-personas menor que R05, mismo `C_raw` e I efectivo) | consecuencia_extrema (econ) |
| 4 | S35-R03 | Caída de un trabajador durante el montaje | Paso 2 | — |
| 5 | S35-R04 | Incendio en una cocina móvil durante un evento | Paso 2 | — |
| 6 | S35-R06 | Cancelación de un evento por clima | Paso 2 | — |

No evaluables S35: ninguno.

## S36 · Educación K–12

| Posición | risk_id | Riesgo | Regla que decidió la posición | Banderas |
|---|---|---|---|---|
| 1 | S36-R06 | Intoxicación alimentaria de alumnos en el comedor | Paso 2: mayor `C_raw` de la empresa | — |
| 2 (provisional) | S36-R03 | Incendio en el edificio con alumnos | Paso 2 frente a R06. Con R07: mismo `C_raw`; paso 3 empata (I efectivo 5 y ≥ 5); paso 4 **indeterminado** porque I-personas de R07 es `unknown` (§7.2 F5-6): comparten posición, provisional | safety_critical; consecuencia_extrema (econ, pers) |
| 2 (provisional) | S36-R07 | Daño estructural del edificio por un sismo | Comparte posición con R03 (paso 4 indeterminado). Evaluable con I-personas `unknown` por §9.3 | consecuencia_extrema (econ, cont); safety_critical = false por lectura literal (AN) |
| 4 | S36-R01 | Accidente de tránsito del transporte escolar contratado | Paso 2 frente a R03/R07; frente a R05 (mismo `C_raw`, mismo I efectivo 3) decide el paso 4: I-personas 3 > 1 | — |
| 5 | S36-R05 | Filtración de datos personales de alumnos | Paso 4 (I-personas menor que R01, mismo `C_raw` e I efectivo) | — |
| 6 | S36-R04 | Maltrato de un alumno por parte de personal del colegio | Paso 2 | — |
| 7 | S36-R02 | Lesión de un alumno en el recreo o en educación física | Paso 2 | — |

No evaluables S36: ninguno.

## Lista de no evaluables (todas las empresas)

Ninguno. Único riesgo con un factor `unknown`: S36-R07 (I-personas, rango registrado 2–5); queda evaluable porque la cota de esa dimensión con su máximo no supera el `C_raw` de las dimensiones conocidas (§9.3). Entra en la cola de validación (§9.5) junto con S26-R05 (uncertainty high).
