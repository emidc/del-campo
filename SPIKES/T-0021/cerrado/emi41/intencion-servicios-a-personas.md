# Intención de diseño · EMI-41 · familia Servicios a personas

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: servicios-a-personas. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda servicios-a-personas -->

# Intención de diseño · Fase 7 · tanda servicios-a-personas (familia Servicios a personas: S14, S26, S35, S36)

No abrir antes de la comparación de la Fase 8.

> Escrito 2026-10-06 por el agente constructor de la tanda. Niveles pretendidos **según metodología v0.1**. Fichas en `v0/emi41/fichas/<Sxx>/`. Incluye los datos agregados por `v0/fase-5/avisos-fase-7.md` (5 avisos), que no cambian ningún nivel pretendido.
> Notación: P, Iecon, Ipers, Icont, Ilegal, Vcont, Vrec. "a–b" = rango pretendido; el primer número es el valor plausible que pretendo.

---

## S14 · Hotel 4★ con restaurante, eventos y spa (nombre de trabajo: Cordillera Hospitality Group S.A.)

**Contrastes:** C03 (huéspedes de noche, piscina con menores), C13 (proveedor del sistema de gestión con acceso de soporte; agencia de eventuales; servicio de emergencias), C19, C23 (eventos concentrados en oct–dic; piscina con guardavidas sólo en temporada; huéspedes por noche según mes), C28 (huéspedes dormidos, menores, mayores); de costado C04 (R05, R07), C10 (transferencia con sublímite, exclusiones e infraseguro), C22 (R06; R02 parcial).
**Magnitud económica:** RO 2025 USD 2,5 M, positivo y sin extraordinarias → fallback 1. MC conocido (45%; eventos 30%; habitaciones 75%).

### S14-R01 · Intoxicación alimentaria de comensales en un evento
- Contrastes/reglas: C23 (§4.1.4: ¿el escenario plausible es la boda de diciembre o el evento medio?), C09 frente a S35-R01, C19; §3.4 ajuste −1 por control nuevo verificado (huevo pasteurizado) que actúa sólo sobre una causa.
- P 4 (3–4): antecedente propio 2023-11 dentro de 3 años; el −1 es discutible.
- Iecon 2 (2–3): evento medio de junio ≈ USD 60–75 mil / 2,5 M ≈ 3% → 2; boda de 400 en diciembre ≈ USD 200–280 mil / 2,5 M = 8–11% → 2–3. Ipers 3 (3–4). Icont 3 (2–3): cocina de banquetes 6–10 días, función de eventos sin capacidad. Ilegal 4 (3–4): clausura preventiva de un sector.
- Vcont 4 (3–4): muestras testigo actuaron en 2023 pero no limitan a quienes ya comieron; protocolo nunca aplicado. Vrec 2 (2–3): cocina del restaurante, actuación real 2023-11 (9 de 11 eventos).
- Anomalías esperadas: A1 en Iecon y Ilegal; A6 (qué escenario estacional).
- Faltantes: % de eventuales con carnet; capacidad de la cocina alternativa → **dejan evaluable** (no cambian niveles fuera de rango).

### S14-R02 · Ahogamiento de un huésped en la piscina
- Contrastes/reglas: C03, C28, C23 (guardavidas estacional), C22 de costado (Vrec); §8.2 safety_critical.
- P 3 (3–4): inmersión propia 2022-01 (>3 años), 2 muertes en comparables de la región en 5 años, precursores; +1 por condición discutible.
- Iecon 3 (2–3): USD 214–494 mil / 2,5 M = 9–20%. Ipers 4 (máx 5 no). Icont 1. Ilegal 4.
- Vcont 4 (3–4): guardavidas sólo 22% de las horas; encargado sin línea de vista ni simulacro; DEA probado. Vrec no_aplica (no_aplica–5).
- Anomalías: A1 en Vrec (no_aplica vs 5, por el cierre de la piscina, no función crítica); A11.
- Faltantes: simulacro de rescate; tiempo de llegada al agua → dejan evaluable.

### S14-R03 · Incendio en el hotel con huéspedes alojados
- Contrastes/reglas: C03, C28, C10/C18 de costado (infraseguro USD 28 M vs 34 M; pérdida de beneficio 6 meses, franquicia 7 días: fuera de I y V); §2.2.4 (rociadores y detección a V); §3.1 antecedente: ¿cuenta la campana de cocina 2024-06 como ignición "en el hotel" si el evento redactado es en pisos de alojamiento?
- P 3 (3–4): 2021-08 en habitación (>3 años) → 3; si se cuenta 2024-06 → 4.
- Iecon 5: daño USD 1,5–3 M + MC perdido USD 1,28 M ≥ 2,5 M. Ipers 4 (4–5). Icont 4 (4–5). Ilegal 4.
- Vcont 3 (3–4): detección probada 2026-05; sin rociadores en pisos 3–7; escalera B sin puertas; simulacro sólo diurno de personal. Vrec 4 (3–4): sin plan; acuerdo verbal usado sólo para sobreventa.
- Anomalías: A1 en P; A3 posible (Iecon 5 y consecuencia_extrema).
- Faltantes: simulacro nocturno; estudio de humo → dejan evaluable.

### S14-R04 · Contaminación bacteriana del agua del spa
- Contrastes/reglas: C19, C13 (laboratorio), §2.1 (evento = superar el umbral, no el brote), §3.3 anclas 4 vs 5.
- P 4 (4–5): positivos 2024-01 y 2025-12; +1 por caldera con falla (condición nueva) puede llevar a 5.
- Iecon 2 (2–3): USD 60–250 mil según casos / 2,5 M. Ipers 3 (3–4). Icont 1. Ilegal 3 (3–4).
- Vcont 3 (2–3): protocolo probado (2 actuaciones) pero detección con hasta 40 días de retraso. Vrec 5 (4–5).
- Anomalías: A1 en P y Vcont; A11 (análisis mensual: ¿detección a V o control a P?).
- Faltantes: temperatura en puntos de uso; aviso a usuarios → dejan evaluable.

### S14-R05 · Ransomware sobre el sistema de reservas y gestión hotelera
- Contrastes/reglas: C04 de costado, §2.1 (iniciador = ejecución del cifrado; el robo de credencial 2025-04 fue en otro sistema), §3.2 (encuesta sectorial 9% → 2 vs comparables → 3).
- P 3 (2–4). Iecon 2: ≈ USD 75–110 mil / 2,5 M = 3–4%. Ipers 1. Icont 2 (1–2): degradación < mitad. Ilegal 2 (2–3).
- Vcont 4 (4–5). Vrec 3 (3–4): restauración probada 2025-02 (>12 meses) y procedimiento manual con uso real.
- Anomalías: A1 en P.
- Faltantes: alcance de la copia en la nube; consumos no cobrados → dejan evaluable.

### S14-R06 · Caída de un huésped en el hotel (C19 corriente)
- Contrastes/reglas: C02-like en una empresa C19, C22 de costado (Vrec no_aplica), C28 (mayores).
- P 5 (frecuencia anual 11–13). Iecon 1: USD 18 mil / 2,5 M = 0,7%. Ipers 3 (3–4). Icont 1. Ilegal 2.
- Vcont 3 (2–3). Vrec no_aplica.
- **Faltante deliberado:** registro de 2023 y anteriores no conservado → **deja evaluable** (P 5 con 2024–2026).

### S14-R07 · Robo de datos de tarjetas de huéspedes
- Contrastes/reglas: C13 (credencial de soporte del proveedor), C04 de costado, §2.1 (credencial válida como iniciador), §2.2.4 (permisos por rol a V).
- P 3 (3–4). Iecon 3 (2–3): USD 84–425 mil / 2,5 M = 3–17%. Ipers 1. Icont 1 (1–2). Ilegal 3.
- Vcont 4. Vrec 3 (3–4).
- Faltantes: registro de accesos; fraude imputado → dejan evaluable (el segundo acota Iecon a 2–3).

---

## S26 · Clínica privada (nombre de trabajo: Centro Médico Cuyo S.A., ex E5)

**Contrastes:** C01 (R01, R04: bruto con varias muertes y P alta), C03, C04 (R05), C05 (R07; notificaciones), C11 (R05 no evaluable; R01 faltante de prueba), C12 (dos grupos, colector, convenios), C15 (RO negativo en los tres ejercicios, también normalizado → fallback 3 de §4.2 con A6), C19 (R02, R03), C20 (R02: red nacional 18% vs registro propio; R03: estudio multicéntrico vs notificación voluntaria; R06 también diverge), C22 (R03), C24 (R01 y R04: test de la barrera con grupos y colector como controles pasivos posteriores al evento; R06 falta de continuidad a V), C28; de costado C07, C09, C13, C18 (sublímite por brote, exclusión de suministros de terceros).
**Magnitud económica:** RO −0,2 / −0,6 (−0,35 normalizado) / −0,3 M → fallbacks 1 y 2 no existen. Pretendo que cada evaluador elija una "otra medida" y registre A6. Mi referencia: EBITDA 2025 USD 2,4 M; también disponibles MC USD 19,1 M e ingresos USD 50,3 M. Se busca A1 en Iecon en casi todos los riesgos.

### S26-R01 · Corte del suministro eléctrico externo
- Reglas: §2.3 test de la barrera, §2.2.4, §4.1.4 (bruto sin grupos), §3.3 P5 por frecuencia propia y del regulador.
- P 5. Ipers 5 (4–5): 9 ventilados sin energía. Iecon 4 (3–5): indemnizaciones de varias muertes USD 0,4–1,8 M / EBITDA 2,4 M = 17–75%; con MC → 2. Icont 1. Ilegal 4.
- Vcont 3 (2–3). Vrec 3 (3–5).
- **Faltante deliberado (estado de prueba de la medida de respaldo):** sin ensayo con carga ni de transferencia desde 2022-11 y sin actas de actuación en los cortes → **deja evaluable** (Vcont acotado a 2–3; "presente sin prueba" → 3).
- Anomalías: A11/A10 (grupos como contención y como recuperación); A3 (Ipers 5 con P 5).

### S26-R02 · Brote por bacteria multirresistente en terapia intensiva
- Reglas: **C20** §3.2: fuente jerarquía 1 (18% → P3) frente a historia propia jerarquía 2 (brote 2024-08 → P4) → rango 3–4 y uncertainty ≥ medium; §3.4 +1 por adherencia en baja.
- P 3 (3–4). Ipers 4. Iecon 3 (2–3): ≈ USD 170 mil sin juicio / EBITDA = 7%; con juicio 520 mil = 22%; con MC → 1. Icont 3 (3–4): degradación < mitad 19 días. Ilegal 3.
- Vcont 2 (actuación real 2024-08). Vrec 2 (2–3).
- Faltante: criterio de brote de la red → deja evaluable.

### S26-R03 · Error de medicación con daño a un paciente internado
- Reglas: C20 (estudio multicéntrico 1,4% → ~95/año → P5, jerarquía 1; notificación voluntaria 4 en 5,5 años → P4); C22 (Vrec no_aplica); §4.1.4 plausible (daño transitorio) vs máx (muerte).
- P 5 (4–5). Ipers 3 (3–4). Iecon 1 (1–3). Icont 1. Ilegal 3 (2–4).
- Vcont 2 (2–3). Vrec no_aplica.
- **Faltante pedido por la cobertura:** no hay registro sistemático de eventos adversos → **deja evaluable** (P la fija la fuente de jerarquía 1).

### S26-R04 · Interrupción del suministro de oxígeno medicinal
- Reglas: C01/C24, §2.3 (colector como barrera), C13 (proveedor único).
- P 4. Ipers 5 (4–5). Iecon 4 (3–5) con EBITDA. Icont 1 (1–2). Ilegal 4.
- Vcont 2 (1–2): colector probado en actuación real 2025-08, autonomía 2–3 h. Vrec 3: reposición de emergencia 4 h, única actuación (2021) >3 años y en 7 h.

### S26-R05 · Ransomware sobre la historia clínica electrónica y los turnos
- Reglas: C04, C11, §9.2–§9.3, §2.1 (¿el cifrado de 2 puestos en 2024-11 es antecedente del iniciador sobre servidores?).
- P 4 (3–4; la encuesta 14% → 2 diverge). Iecon 3 (2–3): ≈ USD 420–700 mil / EBITDA = 17–29%; con MC 2–4% → 2. Ipers 2 (2–3). Icont 2 (2–3). Ilegal 3.
- Vcont 4 (3–4). **Vrec unknown (2–5)**.
- **Faltante deliberado que no deja evaluable:** no se sabe si las cintas posteriores a 2025-11 contienen la base de la historia clínica ni si se pueden restaurar → Vrec unknown sin acotar a tres niveles; cota Iecon 4×3×5 = 60 > C_raw conocido (Ilegal 4×3×4 = 48) → **no evaluable** por §9.3.

### S26-R06 · Incendio en el área de quirófanos
- Reglas: C28 (pacientes anestesiados), C20 de costado (estadística internacional 8–16% → P2–3 vs ignición propia 2023-04 → P4), §2.4 (sin plan de continuidad a Vrec).
- P 3 (2–4). Ipers 4 (3–4). Iecon 4 (3–4): USD 0,6–2,15 M / EBITDA = 25–90%. Icont 4. Ilegal 4.
- Vcont 3. Vrec 3 (3–4): convenio de derivación nunca usado.
- Faltantes: compuertas de conductos; capacidad de la clínica del convenio → dejan evaluable.

### S26-R07 · Suspensión de la habilitación de terapia intensiva tras una inspección
- Reglas: C05 (Ilegal 4 por suspensión; multa a Iecon), C15, D3 (reinspección dentro del horizonte), §3.2 (3 de 38 en 5 años: comparables → 3, como frecuencia 1,6%/año → 1).
- P 3 (1–3). Iecon 4 (3–4): MC perdido USD 0,63–1,69 M / EBITDA. Ipers 2 (2–3). Icont 4 (4–5). Ilegal 4.
- Vcont 3. Vrec 4 (3–4).
- Faltante: criterio de la autoridad en la reinspección → deja evaluable.

---

## S35 · Catering y eventos temporales (nombre de trabajo: Eventos & Catering Mendoza S.R.L.)

**Contrastes:** C02 (R06; también R03), C19, C23 (oct–dic y feb–mar; zonda ago–nov), C27 (exposición distinta en cada predio y evento: R02, R04, R05), C28 (multitudes, invitados), de costado C09 (R01 frente a S14-R01), C13 (organizador principal y dueños de predios), C18 (límite fijado por predio; exclusiones de estructuras >500 m² sin certificado, viento >80 km/h, factor de ocupación no declarado).
**Magnitud económica:** RO 2025 USD 255 mil → fallback 1. MC 38%.

### S35-R01 · Intoxicación alimentaria de invitados en un evento
- C09 (mismo evento que en el hotel con otra escala), C23.
- P 4 (4–5). Iecon 3 (3–4): USD 32–224 mil / 255 mil = 13–88%. Ipers 3 (3–4). Icont 3. Ilegal 4 (3–4).
- Vcont 4. Vrec 4 (4–5).
- Faltantes: temperaturas; capacidad de otra cocina → dejan evaluable.

### S35-R02 · Colapso de una carpa o estructura por viento
- C27, C23, C28; §2.2.3 (evacuación preventiva por anemómetro: actúa antes del colapso → ¿P o V?) → A11 esperada; C18 (exclusión de carpas >500 m² sin certificado profesional).
- P 3 (3–4). Ipers 3 (3–4; sector sin muertos en 51 heridos). Iecon 5 (4–5). Icont 3 (2–3). Ilegal 4 (3–4).
- Vcont 4 (2–4). Vrec 3 (2–3).
- Faltantes: verificación de suelo; tiempo de ambulancia → dejan evaluable.

### S35-R03 · Caída de un trabajador durante el montaje (C19 corriente)
- C02, C27, C22 (Vrec no_aplica), §8.2 (¿Ipers 3 o 4?).
- P 5 (3 por año). Ipers 3 (3–4). Iecon 2 (2–3): USD 9–29 mil / 255 mil. Icont 1. Ilegal 2 (2–4).
- Vcont 4. Vrec no_aplica.
- Faltante: dictamen de incapacidad → deja evaluable.

### S35-R04 · Incendio en una cocina móvil durante un evento
- C27.
- P 4. Iecon 4 (3–4): USD 107–167 mil / 255 mil = 42–65%. Ipers 3 (2–4). Icont 3 (2–3). Ilegal 2.
- Vcont 2 (2–3): extintor y manta con actuaciones reales. Vrec 2.

### S35-R05 · Aglomeración de público en un festival coorganizado
- C28, C13 (reparto con el organizador sin definir), C27, §3.4 +1 por cambio de exposición (15.000 en el mismo predio, dentro de los 12 meses).
- P 4 (4–5). Ipers 4 (3–5). Iecon 5 (4–5): USD 170–750 mil / 255 mil. Icont 1 (1–2). Ilegal 4 (4–5).
- Vcont 3. Vrec 5 (4–5).
- Faltantes: plan y factor de ocupación de 2027-03 (deja evaluable); reparto contractual de reclamos (deja evaluable: Iecon queda en 4–5).

### S35-R06 · Cancelación de un evento por clima (C19 corriente)
- C02 (5 por año, pérdida chica), C23.
- P 5. Iecon 2 (1–3): evento social USD 2–9 mil / 255 mil = 1–3,5%; jornada de festival USD 38 mil = 15%. Ipers 1. Icont 1. Ilegal 1 (1–2).
- Vcont 2 (2–3). Vrec 2.
- **Faltante deliberado:** montos de pérdidas de 2023 → **deja evaluable**.
- Anomalías: A8 (riesgo frecuente y menor que puede quedar arriba de otros); A6 por estacionalidad.

---

## S36 · Educación K–12 (nombre de trabajo: Colegio Privado Andino)

**Contrastes:** C03, C13 (transportistas y concesionario del comedor: atribución de P y V), C15 (RO negativo en los tres ejercicios; sin MC → fallback 3 con A6: ingresos USD 6,0 M, fondo de reserva USD 350 mil, masa salarial mensual, presupuesto de mantenimiento), C19, C28 (menores de 3 a 18 años); de costado C04 (R05), C22 (R02, R04, R05), C17 (un sismo puede producir a la vez R07 y la ignición de R03 en la cocina a gas; no hay escenario en la lista fija: se espera que el evaluador lo note y registre A7 o nada).
**Magnitud económica:** Se busca divergencia: con ingresos como medida, casi todo Iecon cae en 1–2; con el fondo de reserva, en 4–5.

### S36-R01 · Accidente del transporte escolar contratado
- C13, C28, C22 de costado.
- P 4 (3–4). Ipers 3 (3–5). Iecon 2 con ingresos (USD 120–450 mil / 6,0 M = 2–7,5%); 4–5 con fondo de reserva. Icont 1. Ilegal 3 (3–4).
- Vcont 4 (3–4). Vrec no_aplica (no_aplica–2).
- Faltantes: datos de conductores; registro de subida en combis → dejan evaluable.

### S36-R02 · Lesión de un alumno en el recreo o en educación física (C19 corriente)
- P 5 (fracturas 6–8 por año; tasa igual a la de la aseguradora). Ipers 3 (3–4). Iecon 1. Icont 1. Ilegal 2.
- Vcont 2 (2–3). Vrec no_aplica.

### S36-R03 · Incendio en el edificio con alumnos
- C28, §2.1 (¿el cortocircuito con humo de 2023-08 es ignición?), V por dimensión: contención buena para personas (simulacros probados) y mala para el edificio (sin detección) con un solo Vcont → A11/A5.
- P 4 (3–4). Ipers 4 (4–5). Iecon 3 con ingresos (USD 0,6–1,9 M / 6,0 M = 10–32%); 5 con fondo. Icont 4 (3–5). Ilegal 4.
- Vcont 3 (2–4). Vrec 4 (3–4).
- Faltante: simulacro 2026 y en cambio de turno → deja evaluable.

### S36-R04 · Maltrato de un alumno por parte de personal
- C28, C22 (Vrec no_aplica), C13 de costado (personal del concesionario).
- P 4 (antecedente 2024-09; tasa sectorial ≈ 49%/año para 1.200 alumnos). Ipers 3 (3–4). Iecon 1–2 con ingresos; 3–4 con fondo. Icont 1. Ilegal 3 (3–4).
- Vcont 2. Vrec no_aplica.
- Faltante: antecedentes de 54 empleados → deja evaluable.

### S36-R05 · Filtración de datos personales de alumnos (C19 corriente)
- C04 de costado, C22 (datos expuestos: nada que reponer).
- P 4 (4–5). Ipers 1 (1–2). Iecon 1 con ingresos (1–3 con fondo). Icont 1. Ilegal 3.
- Vcont 4. Vrec no_aplica.

### S36-R06 · Intoxicación alimentaria de alumnos en el comedor (C19 corriente)
- C13 (concesionario: controles preventivos de un tercero; multa y costo del cierre al concesionario).
- P 4. Ipers 3 (2–3). Iecon 1. Icont 1. Ilegal 2 (2–3).
- Vcont 3 (2–3). Vrec 2.

### S36-R07 · Daño estructural del edificio por un sismo
- C11, C15, C28, C17 de costado; §9.2–§9.4 (P unknown → no evaluable; banderas aplican por máximos).
- **P unknown (1–4, sin acotar a tres niveles):** el peligro sísmico es conocido (4 sismos ≥ VI en 50 años) pero la fragilidad del edificio no.
- Ipers 4 (3–5). Iecon 5 (USD 9 M de edificio frente a cualquier medida). Icont 5. Ilegal 4 (4–5).
- Vcont 3 (simulacro de sismo probado sólo en la mañana; sin rescate). Vrec 4.
- **Faltante deliberado pedido por la cobertura (estado estructural):** sin estudio de vulnerabilidad ni planos → **no deja evaluable** (P unknown). Los otros dos faltantes (fisuras, costo de reparación) acompañan.
- Anomalías: A2/A6; cola de validación con safety_critical posible por Ipers máx.

---

## Faltantes deliberados por alcance (resumen)

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S14-R06 | Registro de caídas anterior a 2024 | Deja evaluable |
| S26-R01 | Estado de prueba de los grupos electrógenos (carga, transferencia, actas) | Deja evaluable (Vcont 2–3) |
| S26-R03 | Sin registro sistemático de eventos adversos | Deja evaluable |
| S35-R06 | Pérdidas de 2023 sin detalle | Deja evaluable |
| S26-R05 | Contenido y restaurabilidad de las copias de la historia clínica | No deja evaluable (cota §9.3) |
| S36-R07 | Estado estructural del edificio | No deja evaluable (P unknown) |

## Redacciones que buscan probar algo
- S14-R03: el antecedente de 2024-06 (campana de cocina) está fuera del lugar del evento redactado (pisos de alojamiento).
- S26-R05: el antecedente de 2024-11 es un cifrado de puestos, no de servidores.
- S36-R03: el antecedente de 2023-08 es un cortocircuito con humo, sin llama descripta.
- S35-R02: la evacuación preventiva por viento actúa antes del colapso (evento) pero después de la causa: control que parece de V y es de P.
- S26-R01 y S26-R04: el evento es la pérdida del suministro; grupos y colector son controles pasivos instalados de antemano que actúan después (§2.2.4).
- No hay casos C25 en esta tanda.

## Riesgos corrientes (C19) de cada empresa
- S14: S14-R06 (caída de huésped), S14-R04 (agua del spa), S14-R05 (ransomware).
- S26: S26-R03 (error de medicación), S26-R02 (brote en terapia intensiva).
- S35: S35-R03 (caída en montaje), S35-R06 (cancelación por clima), S35-R01 (intoxicación).
- S36: S36-R02 (lesión en recreo), S36-R06 (comedor), S36-R05 (datos).

## Ajustes de escala respecto de la cobertura
- S14: facturación 2025 USD 22,1 M con RO 2,5 M; para que 150 habitaciones cierren, eventos y banquetes son la línea mayor (USD 8,4 M).
- S26: ingresos USD 50,3 M; RO −0,2 / −0,6 / −0,3 M (negativos también normalizados), para que no exista promedio de ejercicios positivos.
- S35, S36: sin cambios de fondo (S36 RO −40 / −160 / −20 mil).

## Riesgos del diseño que no se sostienen (no se cambió el conjunto)
- S26-R06: la cobertura dice "incendio en el área de quirófanos"; para no abrir granularidad (C25) se redactó con una sola familia de causas (fuego quirúrgico en atmósfera enriquecida). Un incendio eléctrico del bloque sería otro sub-riesgo.
- S14-R07: el robo de tarjetas tiene dos vías con P y V distintas (base del sistema de gestión y correos del área de ventas); se acotó a la base. Los correos quedan como exposición.
- S36: la cobertura pide C17 de costado sin escenario en la lista; un sismo que produzca a la vez R07 y R03 sería plausible y material, pero no hay ficha de escenario.
- S26-R07: P depende de una decisión discrecional de la autoridad; la frecuencia de los comparables con denominador (1,6%/año) y la lectura como comparables (P3) quedan a dos niveles de distancia, y puede salir divergencia en P que no sea de las buscadas.
