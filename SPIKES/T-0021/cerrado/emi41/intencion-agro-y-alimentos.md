# Intención de diseño · EMI-41 · familia Agro y alimentos

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: agro-a, agro-b. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda agro-a -->

# Intención de diseño · Fase 7 · tanda agro-a (Agro y alimentos: S01, S06, S15, S16, S17)

No abrir antes de la comparación de la Fase 8.

> Archivo cerrado parcial de la tanda agro-a. Niveles pretendidos **según metodología v0.1**. Fecha de construcción: 2026-10-06. Corte de la información de las fichas: 2026-09-30. Fichas en `v0/emi41/fichas/<Sxx>/`. Ninguna ficha de esta tanda lleva C25 (granularidad ambigua): lo hacen otras tandas.

Convenciones: `valor (min–max)`. "Rec" = recuperación; "Cont." = contención. Ratios económicos sobre la magnitud de referencia de §4.2 que corresponde a cada empresa.

---

## S01 · Bodega Andina S.A. (bodega mediana integrada)

**Magnitud de referencia:** RO 2025 = USD 3,0 M (positivo, sin partidas extraordinarias). MC 2025 = USD 10,6 M (42%); líneas de crianza: MC 55%.

**Contrastes y cómo:** C06 (nave de barricas, tanques y embotellado en un solo predio; una sola línea) · C13 (contratista de limpieza en espacio confinado, productores de uva sin cuaderno, importadores) · C18 (daño material con stock a costo, sublímites por rubro con infraseguro —barricas 2,5 M frente a 4,4 M; stock 10 M frente a 14,2 M— regla proporcional, sin pérdida de beneficio, exclusión de pérdida de contenido de tanques) · C19 (R02, R03, R04) · C23 (granizo cerca de cosecha frente a primavera; espacio confinado en vendimia) · C26 (R02 retiro posible; R05 rechazo en destino) · C31 (R01: vino criado que no vuelve hasta 2028-06) · de costado C03 (R01 visitantes y operarios; R07), C10 (transferencia separada), C22 (R07).

### S01-R01 · Incendio en la nave de barricas
- **Contrastes / reglas:** C31, C06, C18, C03 de costado; §4.4 y §2.4 (reposición normal más allá del horizonte: el vino criado vuelve en 2028-06), §2.1 (evento = ignición), §2.2.4 (detección y muro a V), §5.2 (falla parcial de 4 de 22 detectores: se evalúa por lo que hace), §11.3 (póliza a costo y sin PB queda fuera de I).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 5 · I-pers 3 (3–4) · I-cont 5 (4–5) · I-legal 2 (2–3) · Cont. 3 (3–4) · Rec 4 (4–5).
- **Cálculo:** nave 2,6 + racks 0,35 + barricas 4,4 = USD 7,35 M sólo en reposición / RO 3,0 M = 245% → 5, sin contar vino ni margen perdido (MC crianza 5,3 M/año durante 12–18 meses sin cubrir).
- **P:** ignición propia en 2019 (más de 3 años) y comparables cercanos 2021 y 2023 → 3; TS-2 a 78 °C sin corregir es condición nueva respecto del período de antecedentes → +1 posible (§3.4.2) → rango 3–4.
- **Anomalías esperadas:** A6 posible por el horizonte (la interrupción de crianza dura hasta 2028); A11 en el muro cortafuego (¿I o V?) y en las visitas (test de la barrera: la visita de 16:30 está fuera del turno); A1 en I-pers y contención.
- **Faltante deliberado:** valor actual del vino en barrica (pedido de la cobertura) → **deja evaluable** (I-econ = 5 con sólo edificio y barricas). Inventario físico, carga de fuego y resistencia del muro: dejan evaluable.

### S01-R02 · Contaminación de un lote de vino durante la elaboración
- **Contrastes / reglas:** C19, C26; §2.1 (evento = ingreso del contaminante, no la venta), §4.1.4 (escenario bruto sin el análisis pre-embotellado: el lote llega al mercado), §5.2 (contención probada por actuación real 2023 y 2025).
- **Niveles pretendidos:** P 5 (4–5) · I-econ 3 (2–3) · I-pers 1 (1–2) · I-cont 1 · I-legal 3 (2–3) · Cont. 2 · Rec 2 (2–3).
- **Cálculo:** retiro 180–260 mil + reemplazo de producto ~USD 80–100 mil ≈ USD 0,3 M / 3,0 M = 10% → 3; si el evaluador toma el lote detectado en planta (40–140 mil = 1–5%) → 1–2: divergencia esperada sobre qué es "bruto".
- **Anomalías:** A11/A6 (si el análisis pre-embotellado es contención o el escenario bruto incluye la venta), A1 en I-econ.
- **Faltante:** capacitación del personal nuevo de la contratista → deja evaluable.

### S01-R03 · Rotura de un tanque de acero con pérdida de vino
- **Contrastes / reglas:** C19, C18 (exclusión de pérdida de contenido); §3.3 (dos antecedentes en 4 años), §5.2 (trasvase de 2022 fuera de la ventana de 3 años: presente sin prueba).
- **Niveles pretendidos:** P 4 · I-econ 3 (2–3) · I-pers 2 (1–3) · I-cont 1 · I-legal 2 · Cont. 3 · Rec 2.
- **Cálculo:** vino 165–420 mil + tanque 95 mil + limpieza 20–60 mil ≈ USD 0,28–0,58 M / 3,0 M = 9–19% → 3 (2 si toma valor a costo y reparación).
- **Anomalías:** A1 en I-econ por la valuación del vino (costo frente a granel); el sismo como causa podría llevar a pensar en un escenario por causa común (no está en la lista).
- **Faltantes:** ensayo de soldaduras, cálculo sísmico → dejan evaluable.

### S01-R04 · Falla de la línea de embotellado
- **Contrastes / reglas:** C19, C06; §2.4 (sin PLC de repuesto: va a V, no a I), §5.4 (embotelladora móvil probada en 2024-11 al 60%).
- **Niveles pretendidos:** P 5 · I-econ 2 (2–4) · I-pers 1 · I-cont 2 (2–4) · I-legal 1 · Cont. 2 (2–3) · Rec 3.
- **Cálculo:** escenario plausible = falla mecánica de 1–4 días: margen perdido ~USD 43 mil/día pero cubierto por stock de 3 semanas → penalidades y horas extra ≈ USD 10–60 mil → <2% a 2%. Escenario PLC discontinuado (6–8 semanas): ~3–5 semanas sin cubrir × ~USD 0,3 M/semana de MC ≈ USD 0,9–1,5 M → 30–50% → 4 (techo).
- **Anomalías:** A1 en el escenario plausible (falla típica o PLC), A11 (¿el stock de producto terminado es exposición o recuperación?).

### S01-R05 · Rechazo de un embarque de exportación por un residuo fuera de norma
- **Contrastes / reglas:** C26, C13 (productores sin cuaderno), C23 de costado (primavera lluviosa); §2.1 (evento = despacho con residuo), §2.2 (análisis previo al embarque = P; redirección después = V), §3.4.1 (control preventivo nuevo desde 2025-04 que no existía en el antecedente → −1 posible).
- **Niveles pretendidos:** P 4 (3–4) · I-econ 3 (2–3) · I-pers 1 · I-cont 1 · I-legal 2 · Cont. 3 (2–3) · Rec 3.
- **Cálculo:** contenedor 78 mil + multa 7,8 mil + suspensión de un año del importador (1,6 M × 44% = 0,70 M) ≈ USD 0,79 M / 3,0 M = 26% → 3; sin suspensión ≈ 3% → 2.
- **Anomalías:** A11 en el análisis previo (P o V), A10 si se descuenta en los dos.
- **Faltante:** análisis de uva de los 12 productores sin cuaderno → deja evaluable.

### S01-R06 · Granizo sobre los viñedos propios
- **Contrastes / reglas:** C23 (momento del año), C09 (par de escala con S15 y S21: la bodega integrada reemplaza la uva comprando), C18 (cultivos excluidos); §4.1.4 (escenario plausible por estacionalidad), §2.2.4 (malla = pasiva después del evento → V), §5.2 (actuación real de la malla en 2023-02, más de 3 años: presente sin prueba).
- **Niveles pretendidos:** P 4 (3–4) · I-econ 3 (2–3) · I-pers 1 · I-cont 1 · I-legal 1 · Cont. 3 · Rec 3 (2–3).
- **Cálculo:** granizo de febrero sobre 130 ha sin malla, 45% → USD 175 mil más daño a bloques de crianza si se toma la malla como V (900 t × 45% ≈ 400 t × 0,75 = USD 0,3 M) → USD 0,2–0,5 M / 3,0 M = 6–16% → 2–3.
- **P:** granizos propios 2023-02 y 2025-12 (últimos 3 años) → 4; registro propio 6/18 temporadas (33%) → 3.
- **Anomalías:** A6/A1 por estacionalidad (C23); A11 malla (I por exposición o V).

### S01-R07 · Accidente de un operario dentro de un tanque (espacio confinado)
- **Contrastes / reglas:** C03 de costado, C13 (trabajador de contratista: ¿a quién se atribuyen P y V?), C22 de costado; §8.2 (`safety_critical`), §5.5.2 (rec no aplica salvo clausura), §5.3 (vigía y trípode: presente sin prueba —simulacro de 2025-02 fuera de los 12 meses— y faltas en la auditoría).
- **Niveles pretendidos:** P 4 (3–4) · I-econ 3 (2–3) · I-pers 4 (4–5) · I-cont 3 (2–3) · I-legal 4 · Cont. 4 (3–4) · Rec `no_aplica` (o 5 si el evaluador toma la clausura como interrupción).
- **Cálculo:** indemnizaciones 150–400 mil + multa hasta 80 mil + clausura 2–10 días × 25 mil ≈ USD 0,25–0,73 M / 3,0 M = 8–24% → 3.
- **P:** exposición de 2024-03 (oxígeno al 16% con mareos) y 2021-04 = eventos iniciadores contenidos → 4; precursores de la auditoría 2026-04.
- **Anomalías:** A11 en v_rec (clausura como interrupción frente a lesión pura), A6 por atribución a la contratista (C13), A3 si `safety_critical` queda abajo en el ranking.
- **Faltante:** capacitación de la contratista → deja evaluable.

---

## S06 · Frío Mendoza S.R.L. (cámara frigorífica PyME)

**Magnitud de referencia:** RO 2025 = USD 118 mil. **Margen de contribución desconocido** (C21 de costado): margen operativo 2025 = 118 / 1.810 = 6,5%.

**Contrastes y cómo:** C06 (un compresor, un edificio de paneles) · C08 (casi sin V probada en R03, R04, R05) · C09 (par con S21 en cámara de frío) · C13 (fruta de terceros, contrato tipo con responsabilidad, inspectores de clientes en cámaras, vecinos a 180 m) · C19 (R02, R06) · C23 (ocupación 85–95% de febrero a agosto y 15–35% el resto; el corte 2026-09-30 cae en baja) · de costado C11 (MC desconocido; caso no evaluable en R05), C18 (incendio sólo edificio con infraseguro 2,0 frente a 2,9 M y regla proporcional; fruta sin asegurar), C21.

### S06-R01 · Falla del compresor central
- **Contrastes / reglas:** C06, C23, C13, C08; §3.4.2 (análisis de aceite en alarma = condición nueva → +1), §2.4 (sin compresor de repuesto: va a V), §5.2 (compresor móvil conseguido por teléfono en 2024-02: actuación real con resultado parcial).
- **Niveles pretendidos:** P 5 (4–5) · I-econ 5 · I-pers 1 · I-cont 3 (3–4) · I-legal 2 · Cont. 4 (3–4) · Rec 4.
- **Cálculo:** con cualquier MC: reparación 15–35 mil (13–30%) + reclamos por fruta (2024: 38 mil = 32%; escenario de temporada con 4 cámaras: hasta USD 2,1 M) → ≥100% → 5. El MC desconocido no cambia el nivel.
- **Anomalías:** A6/A1 por estacionalidad (en el corte hay 1.350 t; en temporada 5.150 t): ¿escenario plausible en temporada?
- **Faltante:** inspección de rodamientos → deja evaluable.

### S06-R02 · Corte del suministro eléctrico de la red
- **Contrastes / reglas:** C19, C02-like (frecuente con consecuencia chica), C13 (distribuidora); §4.1.4 (escenario plausible = cortes de hasta 19 h; el de más de 72 h va a `_max`).
- **Niveles pretendidos:** P 5 · I-econ 1 (1–2; max 5) · I-pers 1 · I-cont 1 (1–2) · I-legal 1 · Cont. 2 (1–2) · Rec 3.
- **Cálculo:** rearranque 1–3 mil / 118 mil = 1–2,5% → 1–2.
- **Anomalías:** A11 (¿la inercia térmica de 48–72 h es exposición o V?); A8 si queda arriba de R04 por P alta. Posible A7 con R01 (misma consecuencia "sin frío"; eventos distintos): no es C25 deliberado.

### S06-R03 · Fuga de refrigerante
- **Contrastes / reglas:** C13 (vecinos, personal de clientes), C08; §8.2, §5.3 (detector sólo en sala, ERA con control de 2023, sin plan escrito), §4.5 (falta de plan de emergencia = requisito de registro).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 5 (3–5) · I-pers 4 (4–5) · I-cont 2 (2–3) · I-legal 4 (3–4) · Cont. 4 · Rec 2 (2–3).
- **Cálculo:** fruta de una cámara expuesta USD 770 mil / 118 mil = 650% → 5; si sólo reparación y multa: 3–25 mil + 2–60 mil → 4–70% → 2–4.
- **P:** fuga de 2025-05 (últimos 3 años) → 4; corrosión y válvulas de seguridad vencidas → +1 posible.
- **Anomalías:** A1 en I-econ (si la fruta se daña en el escenario plausible), A11 en el plan de emergencia (¿Legal o V?).

### S06-R04 · Incendio en los paneles aislantes
- **Contrastes / reglas:** C08 (sin detección, rociadores, hidrantes ni plan), C06, C09, C18 (infraseguro); §3.2 (sin historia propia, comparables provinciales sin fecha exacta, precursor de 2025-09), §5.3–5.4 niveles 5.
- **Niveles pretendidos:** P 3 (2–3) · I-econ 5 · I-pers 4 (3–5) · I-cont 5 · I-legal 4 · Cont. 5 (4–5) · Rec 5.
- **Cálculo:** edificio e instalaciones USD 3,7 M / 118 mil = 3.100% → 5.
- **Anomalías:** A3 (consecuencia extrema con P 3), A9 si alguien baja P por falta de historia.

### S06-R05 · Pérdida del principal cliente
- **Contrastes / reglas:** C21 (y C11): §4.2 "Monto" punto 3 y §9.3; C13.
- **Niveles pretendidos:** P 3 (3–4) · I-econ `unknown` (4–5) · I-pers 1 · I-cont 1 · I-legal 1 · Cont. 5 · Rec 3 (3–4) → **no evaluable**.
- **Cálculo:** facturación del cliente USD 706 mil. Mínimo con margen operativo: 706 × 6,5% = USD 46 mil / 118 mil = 39% → 4. Máximo con facturación entera: 706 / 118 = 598% → 5. Cruza un corte → `unknown` (4–5). C_raw de dimensiones conocidas = 3 × 1 × 5 = 15; cota econ = 3 × 5 × 5 = 75 > 15 → no evaluable.
- **Redacción:** se sacó a propósito el RO de 2021–2022 para que el antecedente de 2022 no permita inferir el margen.
- **Anomalías:** A2/A1 si un evaluador infiere el MC de la estructura de costos o del antecedente; A6 por horizonte (aviso hasta 2026-11-30, efecto en 2027).
- **Faltante deliberado:** margen de contribución desconocido (pedido de la cobertura) → **no deja evaluable**. Decisión de renovación pendiente → deja evaluable (P acotada).

### S06-R06 · Accidente con autoelevador dentro de una cámara
- **Contrastes / reglas:** C19, C09 (un reclamo civil de un tercero pesa 17–68% del RO de una PyME), C13 (personal de clientes); §5.5.2 (rec no aplica).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 2 (2–4) · I-pers 3 (3–4) · I-cont 1 · I-legal 2 · Cont. 4 (3–4) · Rec `no_aplica`.
- **Cálculo:** empleado propio: bins 2 mil + multa ≈ 2–4% → 2; tercero de un cliente: reclamo 20–80 mil / 118 mil = 17–68% → 3–4.
- **Anomalías:** A1 en I-econ según quién es la víctima (C13).

---

## S15 · Viñedos del Valle S.A. (producción primaria de uva)

**Magnitud de referencia:** RO 2025 = USD 310 mil. MC 2025 = USD 1,33 M (44%).

**Contrastes y cómo:** C09 (par de escala del granizo con S01 y S21) · C10 y C18 (granizo con franquicia de 10%, deducible de 8 puntos, ajuste por estado del cultivo, 40 ha con malla sin asegurar, helada excluida, período de espera) · C19 (R03, R05) · C20 (R01: base de la aseguradora, jerarquía 1, 9% por finca, frente a historia propia, jerarquía 2, con evento en los últimos 3 años) · C23 (granizo de febrero frente a diciembre; helada en la ventana de octubre–noviembre dentro del horizonte) · de costado C03 (R04) y C02 (R05).

### S15-R01 · Granizo sobre las fincas
- **Contrastes / reglas:** C20 (§3.2: dos fuentes de jerarquía 1 y 2 que divergen → rango obligatorio), C23, C10/C18 (§11.3: la indemnización no baja I), C09.
- **Niveles pretendidos:** P 3 (2–4) · I-econ 5 (4–5) · I-pers 1 · I-cont 1 (1–2) · I-legal 1 · Cont. 4 (4–5) · Rec 5.
- **P:** aseguradora 9% por finca → 2; para alguna de las dos fincas ≈17% → 3; historia propia: 2025-12 en los últimos 3 años → 4. Rango 2–4, `uncertainty` medium.
- **Cálculo:** febrero sobre finca A sin malla: USD 446 mil / 310 mil = 144% → 5; diciembre (la mitad): 72% → 4.
- **Anomalías:** A1 en P (rango y valor), A6/A1 por estacionalidad, A9 si alguien usa la póliza.

### S15-R02 · Helada tardía
- **Contrastes / reglas:** C23 (ventana de riesgo abierta al corte: 30% de brotación en finca B), C18 (helada excluida); §5.2 (molinos con actuación real parcial 9/10 en una helada menor).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 5 (4–5) · I-pers 1 · I-cont 1 · I-legal 1 · Cont. 4 (3–4) · Rec 5 (4–5).
- **Cálculo:** helada como la de 2022: facturación −USD 1,1 M × 44% ≈ USD 0,5 M / 310 mil = 156% → 5.
- **Anomalías:** A11 (yemas secundarias: ¿I o V?).

### S15-R03 · Reducción del turno de riego
- **Contrastes / reglas:** C19, C13 (autoridad del agua); §1.1.2 (dotación se fija en octubre, dentro del horizonte), §3.3 ancla 5 (condiciones presentes: nieve al 62%).
- **Niveles pretendidos:** P 5 (4–5) · I-econ 4 (3–4) · I-pers 1 · I-cont 1 · I-legal 1 · Cont. 3 (2–3) · Rec 4 (4–5).
- **Cálculo:** pérdida de facturación USD 185–400 mil × (44% + ahorro de cosecha) ≈ USD 0,1–0,2 M / 310 mil = 32–64% → 4.
- **Faltante deliberado:** pronóstico de caudal y dotación 2026-27 → **deja evaluable** (4 de 7 temporadas con reducción y nieve al 62%: P 4–5 igual).

### S15-R04 · Vuelco de un tractor
- **Contrastes / reglas:** C03 de costado, C09 (juicio civil frente a RO chico); §8.2.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 4 (2–4) · I-pers 4 · I-cont 1 · I-legal 4 (3–4) · Cont. 4 · Rec 3 (o `no_aplica`).
- **Cálculo:** tractor 10–30 mil + juicio 60–250 mil ≈ USD 70–280 mil / 310 mil = 23–90% → 3–4.
- **Anomalías:** A11 en rec (lesión con un tractor que reponer), A1 en I-econ.

### S15-R05 · Lesiones con herramientas en poda y cosecha
- **Contrastes / reglas:** C02 de costado, C19, C22; A8 (frecuente y menor).
- **Niveles pretendidos:** P 5 · I-econ 1 · I-pers 2 (2–3) · I-cont 1 · I-legal 1 · Cont. 3 (2–4) · Rec `no_aplica`.
- **Cálculo:** costo propio despreciable (<1% del RO).
- **Anomalías:** A8 si queda arriba de R04; A1 en I-pers (tendón con cirugía: ¿plausible o máximo?).

### S15-R06 · Ingreso de una plaga a las fincas
- **Contrastes / reglas:** C19-like, C13 (fincas vecinas, bins de bodegas); §3.3 ancla 3 (comparables cercanos en los últimos 5 años), §4.5 ancla 3 (control obligatorio bajo inspección).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 (3–4) · I-pers 1 · I-cont 1 · I-legal 3 (2–3) · Cont. 3 · Rec 5 (4–5).
- **Cálculo:** tratamientos 31 mil + 5–15% de pérdida × 44% (66–200 mil) ≈ USD 97–231 mil / 310 mil = 31–75% → 4; sólo tratamientos y 5%: ~31% → 4; si toma el control a tiempo (sin pérdida): 10% → 3. Rango 3–4.

**Riesgos de S15 sin faltante que no deje evaluable.** Todos dejan evaluable.

---

## S16 · Cooperativa Vitivinícola Regional (cooperativa de pequeños productores)

**Magnitud de referencia:** RO 2023 = −14 mil, 2024 = −3 mil, 2025 = −21 mil: ningún ejercicio positivo → **fallback 3 de §4.2** (otra medida nombrada, con A6). Medidas disponibles en la ficha: fondo de reserva USD 1,35 M, patrimonio neto USD 10,8 M, liquidación de uva USD 9,7 M, MC después de liquidar USD 3,12 M, MC antes de liquidar USD 12,82 M. La divergencia entre evaluadores es un resultado buscado. En la cobertura el RO era "cercano a cero"; lo dejé en los tres ejercicios apenas negativo para que el fallback 2 (promedio de ejercicios positivos) no aplique con un RO positivo diminuto.

**Contrastes y cómo:** C06 (planta común única) · C13 (socios, choferes en la playa, compradores a granel, supermercados) · C15 (fallback 3 en todos los riesgos) · C19 (R03, R04) · C26 (R01: vino fraccionado en góndola) · C30 (R01: 300 socios con cuadernos de calidad desigual; R05: socios y choferes sobre los que la cooperativa no tiene autoridad laboral) · de costado C11 (calidad de datos de socios), C23 (R03 y R05 en vendimia).

Para los ratios: "fondo" = fondo de reserva 1,35 M; "patr." = patrimonio 10,8 M.

### S16-R01 · Entrega de uva de un socio con residuos fuera de norma
- **Contrastes / reglas:** C30 (§2.2: controles preventivos que dependen de 300 socios), C26, C15, C11 de costado; §2.1 (evento = ingreso a la planta, no la venta).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 3 (2–4; A6) · I-pers 1 (1–2) · I-cont 1 · I-legal 3 (3–4) · Cont. 3 · Rec 2.
- **Cálculo:** escenario bruto en góndola: retiro 250–400 mil + multa hasta 150 mil ≈ USD 0,3–0,55 M: / fondo = 22–41% → 3–4; / patr. = 3–5% → 2; / liquidación 9,7 M = 3–6% → 2.
- **Faltante deliberado:** cuadernos ausentes o incompletos de 59% de los socios (pedido de la cobertura) → **deja evaluable**: P queda acotada por la pileta de 2025 (4) y precursores (5); sube la `uncertainty`.
- **Anomalías:** A6 (magnitud), A1 en I-econ, A6 de atribución (¿P de la cooperativa o del socio?).

### S16-R02 · Incendio en la planta común
- **Contrastes / reglas:** C06, C15; §2.2.4 (pared con portones abiertos, bomba eléctrica sin respaldo: falla parcial).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 5 (4–5; A6) · I-pers 3 (3–4) · I-cont 5 (4–5) · I-legal 2 (2–3) · Cont. 3 · Rec 3.
- **Cálculo:** daño directo USD 5,6 M: / fondo = 415% → 5; / patr. = 52% → 4; / MC antes de liquidar 12,82 M = 44% → 4.

### S16-R03 · Falla de la planta durante la vendimia
- **Contrastes / reglas:** C19, C23 (sólo pesa en las 9 semanas de vendimia), C15.
- **Niveles pretendidos:** P 4 (4–5) · I-econ 2 (1–2; A6) · I-pers 1 · I-cont 2 (2–3) · I-legal 1 · Cont. 2 · Rec 2 (2–3).
- **Cálculo:** reparación 12–30 mil + vino genérico 30–45 mil + flete 22 mil ≈ USD 64–97 mil: / fondo = 5–7% → 2; / patr. <1% → 1.
- **I-cont:** recepción a 60% (degradación menor a la mitad) de 3 a 10 días → un nivel debajo de 3 → 2.

### S16-R04 · Error en la liquidación a los socios
- **Contrastes / reglas:** C19, C30, C15; §5.3 nivel 4 (detección por terceros: los socios).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 1 (1–2; A6) · I-pers 1 · I-cont 1 · I-legal 2 (2–3) · Cont. 4 (3–4) · Rec 2.
- **Cálculo:** reliquidación y auditoría 15–25 mil + no recuperado ~5 mil ≈ USD 20–30 mil: / fondo = 1,5–2,2% → 1–2. La diferencia entre socios (30–100 mil) se compensa entre ellos: si un evaluador la cuenta como pérdida → 2–3.
- **Anomalías:** A6 (¿la pérdida es de la cooperativa o de los socios?), A1.

### S16-R05 · Accidente en la descarga de uva
- **Contrastes / reglas:** C30 y C13 (socios y choferes que no son empleados), C23 (vendimia); §8.2; §5.5.2.
- **Niveles pretendidos:** P 4 (4–5) · I-econ 3 (2–4; A6) · I-pers 4 · I-cont 2 (2–3) · I-legal 4 · Cont. 4 · Rec `no_aplica`.
- **Cálculo:** reclamo 100–400 mil + multa hasta 60 mil: / fondo = 7–34% → 2–4; / patr. = 1–4% → 1–2.

### S16-R06 · Pérdida de un comprador a granel principal
- **Contrastes / reglas:** C13, C15; §1.1.2 (el evento —no renovación— cae en 2027-06, dentro del horizonte).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 (2–4; A6) · I-pers 1 · I-cont 1 · I-legal 1 · Cont. 5 · Rec 3.
- **Cálculo:** 6,5 M litros × USD 0,06 de baja de precio ≈ USD 0,39 M + stock ≈ USD 0,45 M: / fondo = 33% → 4; / liquidación 9,7 M = 5% → 2; / MC antes de liquidar = 3,5% → 2.

---

## S17 · Mostos y Concentrados Cuyo S.A. (procesamiento industrial vitícola)

**Magnitud de referencia:** RO 2025 = USD 5,9 M. MC 2025 = USD 14,8 M (25%). Facturación diaria promedio USD 178 mil; MC diario ≈ USD 44,5 mil.

**Contrastes y cómo:** C05 (recipientes a presión con prueba vencida; permiso de vuelco con reincidencia; autoridad sanitaria y alertas en destino) · C06 (un evaporador con 70% de la capacidad; una sala de calderas) · C13 (60 bodegas proveedoras, mayor cliente con cláusula de indemnización, distribuidora de gas) · C19 (R02, R05) · C26 (R03) · de costado C03 (R01, R05), C23 (campaña frente a invierno en R01, R02, R06), C10 (todo riesgo con PB, sublímites, deducibles, franquicia temporal de 21 días; RC producto con límite y exclusión de retiro).

### S17-R01 · Falla de una caldera con liberación de vapor
- **Contrastes / reglas:** C03, C05, C23; §8.2; §3.4.2 (dureza fuera de límite, incrustaciones, caldera 3 con prueba vencida).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 2 (2–3) · I-pers 4 (4–5) · I-cont 3 (1–3) · I-legal 4 · Cont. 2 (2–3) · Rec 2.
- **Cálculo:** reparación 60–250 mil + producción perdida en campaña (16% × 178 mil × 25% × 14–28 días ≈ 0,1–0,2 M) + indemnizaciones 0,2–0,6 M por persona ≈ USD 0,4–1,1 M / 5,9 M = 7–19% → 2–3.
- **Anomalías:** A1 en I-pers (2 operadores en la sala: ¿una o más muertes plausibles?), A6/A1 por estacionalidad en I-cont (fuera de campaña no hay reducción).

### S17-R02 · Corte del suministro de gas
- **Contrastes / reglas:** C19, C13, C23 (invierno, fuera de campaña), C10 (excluido).
- **Niveles pretendidos:** P 5 · I-econ 1 (1–2) · I-pers 1 · I-cont 2 (2–3) · I-legal 1 · Cont. 2 · Rec 2.
- **Cálculo:** fuel oil 9 mil × 14 días + penalidades 18 mil ≈ USD 144 mil / 5,9 M = 2,4% → 2; con producción postergada y recuperada, margen perdido ≈ 0 → 1–2.
- **I-cont:** evaporación a ~45% (interrupción) en cortes de 6 días seguidos → 3; total 14 días repartidos → 2–3.

### S17-R03 · Contaminación de un lote de mosto concentrado exportado
- **Contrastes / reglas:** C26 (§4.1.3: daño en productos del cliente y consumidores, reparto entre dimensiones; §2.1: evento = ingreso del contaminante), C05, C13, C10 (RC producto sin retiro).
- **Niveles pretendidos:** P 4 (4–5) · I-econ `unknown` (1–5) · I-pers 2 (1–2) · I-cont 1 · I-legal 3 (3–4) · Cont. 3 (3–4) · Rec 2 → **no evaluable**.
- **Cálculo:** mínimo = valor del lote USD 31 mil / 5,9 M = 0,5% → 1; máximo = retiro del cliente USD 6–9 M / 5,9 M = 100–150% → 5. No se acota a tres niveles → `unknown`. C_raw conocido = máx(4 × 2 × 3, 4 × 3 × 3) = 36 (48 con legal 4); cota econ = 4 × 5 × 3 = 60 > 48 → no evaluable.
- **Faltante deliberado:** texto de la cláusula de indemnización vigente → **no deja evaluable**. Estado de la alarma de pH en línea → deja evaluable (contención 3–4 con el laboratorio probado).
- **Anomalías:** A2/A1 si un evaluador toma la cláusula anterior sin tope como valor plausible (5) y lo deja evaluable; A6 sobre qué daño del cliente es de la organización.

### S17-R04 · Vertido de efluentes fuera de norma
- **Contrastes / reglas:** C05 (reincidencia, suspensión de permiso), C23 (campaña); §4.2 (multa a Económico) frente a §4.5 (suspensión a Legal).
- **Niveles pretendidos:** P 5 · I-econ 3 (2–3) · I-pers 1 · I-cont 3 (1–4) · I-legal 4 (3–4) · Cont. 3 (3–4) · Rec 3.
- **Cálculo:** multa 90–180 mil + suspensión 5–30 días × 44,5 mil ≈ USD 0,3–1,5 M / 5,9 M = 5–25% → 2–3.
- **Faltante:** caracterización posterior a 2026-07 → deja evaluable.
- **Anomalías:** A1 en I-cont (¿la suspensión es plausible o máximo?).

### S17-R05 · Quemadura de un operario con vapor
- **Contrastes / reglas:** C19, C03 de costado, C22.
- **Niveles pretendidos:** P 5 · I-econ 1 · I-pers 3 (2–3) · I-cont 1 · I-legal 2 · Cont. 3 (2–3) · Rec `no_aplica`.
- **Cálculo:** 3–8 mil + multa hasta 100 mil → <2% → 1.

### S17-R06 · Rotura del evaporador principal
- **Contrastes / reglas:** C06, C23 (campaña: materia prima perdida), C10 (PB después de 21 días, sublímite de rotura de maquinaria 8 M, exclusión de deterioro gradual); §2.4.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 4 (4–5) · I-pers 1 · I-cont 4 (4–5) · I-legal 1 · Cont. 2 · Rec 3.
- **Cálculo:** reentubado 1,4 M + 70–98 días × 31 mil = 2,2–3,0 M → USD 3,6–4,4 M / 5,9 M = 61–75% → 4; calandria nueva (6–8 meses): 2,8 M + 5,6–7,4 M → 145–170% → 5.
- **P:** sin roturas propias en 18 años; 2 en comparables de la región en 2019–2025 → 3; 12,5% de tubos con pérdida de espesor > 40% → +1 posible.

---

## Faltantes deliberados de la tanda, por alcance

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S01-R01 | Valor actual del vino en barrica (stock en crianza) | Deja evaluable |
| S06-R05 | Margen de contribución desconocido | **No deja evaluable** |
| S15-R03 | Pronóstico de caudal y dotación 2026-27 | Deja evaluable |
| S16-R01 | Cuadernos de campo de los socios (calidad desigual) | Deja evaluable |
| S17-R03 | Cláusula de indemnización vigente con el mayor cliente | **No deja evaluable** |
| S17-R03 | Estado de la alarma de pH en línea | Deja evaluable |
| S06-R01 | Inspección de rodamientos | Deja evaluable |

## Riesgos corrientes (C19) de cada empresa

- **S01:** S01-R02, S01-R03, S01-R04.
- **S06:** S06-R02, S06-R06.
- **S15:** S15-R03, S15-R05.
- **S16:** S16-R03, S16-R04.
- **S17:** S17-R02, S17-R05.

## Ajustes de escala respecto de la cobertura

- S01: RO 2,7 / 3,2 (2,9 normalizado) / 3,0 M sobre facturación 23,9–25,3 M; stock de vino ≈ 18 meses de ventas.
- S06: facturación 1,62–1,81 M; RO 92 / 131 / 118 mil.
- S15: facturación 2,15–3,28 M; RO 40 / 470 / 310 mil (variable por la helada de 2022).
- S16: facturación 13,8–15,4 M; RO −14 / −3 / −21 mil (los tres apenas negativos para forzar el fallback 3).
- S17: facturación 54,2–61,0 M; RO 5,1 / 6,5 (6,1 normalizado) / 5,9 M.

## Riesgos del diseño que no se sostienen

- Ninguno de los 31 se cae. Observaciones para Emiliano, sin cambiar el conjunto:
  - **S06-R01 y S06-R02** comparten la consecuencia ("cámaras sin frío") con eventos distintos; un evaluador puede leerlos como sub-riesgos de un padre y registrar A7. No es un C25 deliberado.
  - **S01-R06** (granizo en la bodega integrada) queda con I-econ chico porque la bodega reemplaza la uva comprándola; si la intención de la cobertura era un granizo de alto impacto en S01, el par de escala con S15 lo da S15.
  - **S16:** "RO cercano a cero" se construyó como tres ejercicios apenas negativos; con un ejercicio apenas positivo el fallback 2 daría ratios absurdos en vez del fallback 3.

## Avisos de la Fase 5 aplicados (2026-10-06)

- Se agregaron a las fichas, como hechos: margen o costos que dejan de pagarse donde hay ventas perdidas; si los montos de antecedentes son brutos o con la respuesta actuando; verificación de barreras pasivas en 12 meses (muros, malla, rejillas, portones); comparación de controles o condiciones con comparables o sector (o que no se sabe); frecuencia anual observada en eventos de más de una vez por año.
- **S06:** el aviso 1 choca con el faltante pedido por la cobertura (el dueño no conoce el margen). Las fichas de S06 dicen que no se sabe qué costos dejan de pagarse; se mantiene S06-R05 como faltante que no deja evaluable.
- Ningún nivel pretendido cambia. Refuerzos: S01-R02 (2 eventos en 2025) sostiene P 5; S06-R01, S06-R03 y S17-R06 quedan por debajo de comparables en controles, lo que apoya el +1 de §3.4.2 ya previsto en sus rangos.


---

<!-- tanda agro-b -->

# Intención de diseño · Fase 7 · tanda agro-b (Agro y alimentos: S18, S19, S20, S21)

**No abrir antes de la comparación de la Fase 8.**

> Tanda agro-b de la Fase 7 (EMI-41). Escrito 2026-10-06. Niveles pretendidos **según metodología v0.1**. RO de referencia = RO del último ejercicio cerrado (2025), salvo que se diga otra cosa. Los cortes de I-econ se calculan sobre ese RO.
> Formato de niveles: `P · I-econ · I-pers · I-cont · I-legal · contención · recuperación`; `x (a–b)` = valor plausible y rango.

---

## S18 · Frigorífico Pampeano S.A. (faena y procesamiento cárnico)

RO 2025 = USD 25,6 M (2% = 0,51 M; 10% = 2,56 M; 30% = 7,68 M). Margen de contribución conocido (15%).

**Contrastes:** C02 (S18-R02, S18-R07), C03 (R02, R03), C05 (R04, R07, R01), C19 (R02, R07), C26 (R01); de costado C13 (R01 consumidores, R03 vecinos, R07 regantes), C14 (R04: próxima auditoría a 14 meses; R06: fin de vacunación a 18 meses), C22 (R02). **C25 de la tanda: S18-R05.**

### S18-R01 · Contaminación de carne con un patógeno y retiro del producto
- **Contrastes y reglas:** C26 (§4.1.3 consumidores fuera de la organización; §2.1 evento = ingreso del contaminante, no la venta), C05 (Legal: clausura de línea), C03 por consumidores. Test-and-hold actúa después del ingreso del contaminante: va a V-contención (§2.2.3), no a P.
- **Niveles pretendidos:** P 4 (4–5) · I-econ 2 (2–3) · I-pers 4 (3–4) · I-cont 1 (1–2) · I-legal 4 (3–4) · contención 2 (2–3) · recuperación 5 (4–5).
- **Cálculo:** retiro 0,2–0,3 M + línea detenida 3 semanas 0,36 M + multa 0,04–0,5 M + demandas hasta 2,4 M → 0,6–3,5 M / 25,6 M = 2,3%–13,7%; plausible ~1,5 M = 6%.
- **P:** las detecciones de 2023-09 y 2025-06 son ocurrencias del evento iniciador (ingreso del contaminante) contenidas: cuentan para P (§3.1) → 4. Si el evaluador toma como evento "la venta" o "el retiro", baja a 3 (2021): A6/A1 esperada.
- **Anomalías esperadas:** A6 (evento iniciador: contaminación vs. venta), A11 (test-and-hold: ¿P o V?), A5 (Personas 4 frente a Económico 2). `safety_critical` = true.
- **Faltantes:** lotes de cortes de mercado interno sin análisis; tiempo producción–consumo (los dos dejan evaluable).

### S18-R02 · Lesión de un operario con cuchillo o sierra
- **Contrastes y reglas:** C02 (P en 5 con consecuencia menor, A8), C03, C22 de costado (recuperación `no_aplica`, §5.5.2), C19.
- **Niveles pretendidos:** P 5 · I-econ 1 · I-pers 2 (2–3; techo 3) · I-cont 1 · I-legal 2 (1–2) · contención 3 (3–4) · recuperación no_aplica.
- **Cálculo:** USD 48 mil por año para 44 casos; un caso ≈ USD 1–15 mil (multa incluida) / 25,6 M < 0,1%.
- **Anomalías esperadas:** A8 si queda por encima de riesgos con Personas 4; A1 en I-pers (2 vs 3: mediana 9 días de baja = ¿incapacidad temporal?); A1 en recuperación (`no_aplica` vs 1).
- **Faltante deliberado que DEJA EVALUABLE:** días de baja por caso de 2023 (sólo el total). No cambia P ni I.

### S18-R03 · Escape de amoníaco de la sala de máquinas
- **Contrastes y reglas:** C03 (Personas 5, §4.3 número plausible de víctimas), C13 (barrio), §2.2.4 (detectores y válvula de bloqueo a V), §5.2 (medidas que fallan en parte: 3 detectores fuera de rango, sirena sin ensayo, brigada incompleta en turno C).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 · I-pers 5 (4–5) · I-cont 3 (2–3) · I-legal 4 · contención 3 (3–4) · recuperación 4 (3–5).
- **Cálculo:** 600 t decomisadas USD 2,9 M + faena 6 días USD 1,5 M + reparación 0,3–1,2 M + multas 0,02–0,3 M ≈ 4,7–5,9 M / 25,6 M = 18–23% → 3.
- **P:** el escape de 2022-11 tiene más de 3 años (→ 3); la pérdida menor de 2026-06 (<1 kg) puede leerse como ocurrencia del evento (→ 4) o precursor; comparable de 2023 (→ 3). A1 esperada en P.
- **Anomalías esperadas:** A1 (P), A11 (evacuación: ¿contención o exposición?), A3 (consecuencia_extrema con P 3). `safety_critical` y `consecuencia_extrema` = true.

### S18-R04 · Suspensión de la habilitación sanitaria para exportar
- **Contrastes y reglas:** C05 (Legal 4 por suspensión; separación multa/sanción), C14 de costado (la auditoría presencial de 2027-11 cae fuera del horizonte; el disparador dentro del horizonte es el segundo rechazo), §2.1 (¿el evento es el rechazo, la no conformidad o el acto de suspensión?).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 4 (3–4) · I-pers 1 · I-cont 4 (4–5) · I-legal 4 · contención 3 · recuperación 4 (4–5).
- **Cálculo:** 3 meses: 7,9 M + tránsito 2,3 M = 10,2 M / 25,6 M = 40% → 4; 2 meses: 7,6 M = 29,7% → 3; 7 meses: 20,8 M = 81% → 4.
- **I-cont:** mercado A = 55% de la función de exportación → interrupción (≥ mitad) 2–7 meses → 4.
- **Anomalías esperadas:** A6 (evento regulatorio y horizonte), A1 en P (sector 6/35 en 5 años ≈ 3,4% anual → 1–2 por jerarquía 1 vs condiciones presentes → 3–4).

### S18-R05 · Falla del sistema de frío — **caso C25**
- **Redacción que busca probar algo (C25):** el riesgo planeado se redactó mezclando dos causas con P y V distintas que producen el mismo evento (pérdida de capacidad de frío): (a) rotura de compresores, con P alimentada por 2023-08 y 2025-01, contención por redundancia N+1 probada en 2023 y fallida en parte en 2025, e I acotado (capacidad del 83%, pérdida USD 0,15 M); (b) corte de red de más de 4 horas, con P de 2021-12 y 2024-02, contención por grupos electrógenos que cubren el 40% (actuación real 2024-02 con un grupo que no arrancó; sin ensayo con carga) e I mayor (24 h sin frío: USD 2,75 M). Por §1.3.3–4 debería ser un padre con dos sub-riesgos; en la lista fija va como riesgo simple. **Se espera que el evaluador lo evalúe tal como está y registre A7** (protocolo §3; metodología §1.3.4).
- **Niveles pretendidos (evaluado como está, escenario de corte de red como plausible):** P 4 · I-econ 3 (1–3) · I-pers 1 · I-cont 2 (1–3) · I-legal 2 (1–2) · contención 3 (2–4) · recuperación 4 (3–5).
- **Cálculo:** red 24 h: 2,5 M + 0,25 M = 2,75 M / 25,6 M = 10,7% → 3; compresor: 0,15–0,5 M < 2% → 1.
- **Anomalías esperadas:** A7 (principal), A1 en I-econ, I-cont y contención (según qué causa tome cada evaluador).
- **Faltante:** grupos sin ensayo con carga desde 2018 (deja evaluable).

### S18-R06 · Brote de una enfermedad animal que cierra mercados de exportación
- **Contrastes y reglas:** C14 de costado (fin de vacunación anunciado para 2028-04: cambio de exposición fuera del horizonte; no debe subir P actual), C13 de costado (causa en terceros/autoridad), §3.2 sin historia propia (decide sector), §4.1.4 escenario plausible (regionalización o no).
- **Niveles pretendidos:** P 2 (1–3) · I-econ 4 (3–5) · I-pers 1 · I-cont 4 (3–5) · I-legal 1 (1–2) · contención 4 · recuperación 5.
- **Cálculo:** sólo cierra B: 1,3 M/mes × 4–12 meses = 5,2–15,6 M = 20–61% → 3–4; cierran los tres: 4–6 M/mes × 4+ meses ≥ 16 M = 62% a >100% → 4–5.
- **Faltante deliberado que DEJA EVALUABLE:** no hay análisis de qué mercados regionalizarían ni por cuánto tiempo; acota I-econ a 3–5 (tres niveles, valor plausible 4).
- **Anomalías esperadas:** A6 (horizonte por el anuncio de 2028; causa fuera de la organización), A1 en I-econ e I-cont.

### S18-R07 · Vertido de efluentes fuera de norma
- **Contrastes y reglas:** C05 (multa a Económico, intimación/clausura a Legal), C19, C02 (P 5 con consecuencia acotada).
- **Niveles pretendidos:** P 5 · I-econ 2 (1–3) · I-pers 1 · I-cont 1 (1–3) · I-legal 3 (2–4) · contención 3 · recuperación 3 (3–4).
- **Cálculo:** multa por reincidencia ≥ 0,09 M (0,35%); si hay clausura (tercera infracción): 6 días × 0,251 M = 1,5 M + multa = 1,6 M = 6,3% → 2.
- **Anomalías esperadas:** A1 en I-cont y I-legal (¿el escenario plausible incluye la clausura?), A8 posible.
- **Faltante:** reclamo de regantes no cuantificado (deja evaluable).

---

## S19 · Lácteos del Sur S.A. (planta láctea)

RO 2025 = USD 15,3 M (2% = 0,31 M; 10% = 1,53 M; 30% = 4,59 M). Margen de contribución conocido (USD 0,096 por litro).

**Contrastes:** C06 (una planta, un depósito, una línea eléctrica: R03, R05), C13 (400 tambos, transportistas, cadenas: R04, E01), C17 (S19-E01), C19 (R02, R03, R06), C26 (R01); de costado C05 (R01), C30 (400 tambos con controles desiguales: R04, E01).

### S19-R01 · Contaminación de un lote y retiro del producto del mercado
- **Contrastes y reglas:** C26 (consumidores vulnerables fuera de la organización; §4.1.3), §2.1 (ingreso del contaminante después de pasteurizar), C05 de costado.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 2 (2–3) · I-pers 4 (3–4) · I-cont 1 (1–2) · I-legal 4 (3–4) · contención 3 (3–4) · recuperación 3.
- **Cálculo:** retiro 0,21–0,34 M + línea 2–4 semanas 0,19–0,38 M + multa 0,035–0,4 M + demandas hasta 1,2 M → 0,5–2,3 M = 3–15%; plausible ~0,9 M = 6% → 2.
- **P:** retiro de 2022 (>3 años) → 3; *L. monocytogenes* en desagüe en 2026-04 (precursor) → 3; condiciones nuevas (producción +18%) → posible +1.
- **Anomalías esperadas:** A1 en P y en I-pers; A6 (consumidores). `safety_critical` = true.

### S19-R02 · Falla del pasteurizador
- **Contrastes y reglas:** C19; §2.4 (I-cont bruta a reposición normal 3–5 semanas aunque haya repuesto en stock: el repuesto va a V-recuperación); jerarquía §3.2 (historia propia vs. tasa del proveedor).
- **Niveles pretendidos:** P 4 (3–4) · I-econ 3 (2–3) · I-pers 1 · I-cont 4 (3–4) · I-legal 1 · contención 4 (4–5) · recuperación 3 (2–3).
- **Cálculo:** reposición normal 3–5 semanas en primavera: 1,1–1,9 M + placas 0,18 M = 1,3–2,1 M = 8,5–13,7% → 2–3.
- **Anomalías esperadas:** A11 (repuesto en stock: I o V), A1 en P (2 eventos en 3 años vs. tasa 0,15/equipo/año ≈ 28% para dos equipos → 3), C23 implícita (primavera vs. otoño).

### S19-R03 · Corte del suministro eléctrico de la red en la planta
- **Contrastes y reglas:** C06, C19; miembro de S19-E01; §5.2 (grupos probados con actuación real 2026-02).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 3 (3–4) · I-pers 1 · I-cont 2 · I-legal 1 · contención 2 · recuperación 3.
- **Cálculo (bruto, aviso 2 de la Fase 5):** sin grupos se pierden depósito y silos: 24 h: 4,3 M = 28% → 3; 48 h: 4,6 M = 30,1% → 4. Con los grupos actuando: 0,3–0,6 M (2–4%). Prueba §2.2.4/§2.3: los grupos son V (contención probada), no reducen I; A11 si un evaluador calcula I neto.

### S19-R04 · Interrupción de la recolección de leche en los tambos
- **Contrastes y reglas:** C13, C30 de costado (controles en 400 tambos que la empresa no maneja; a quién se atribuye el control preventivo), miembro de S19-E01. **Decisión de redacción:** la causa del riesgo es el corte de energía rural en los tambos (no un paro de transportistas), para que el escenario E01 sea plausible con una sola causa y el riesgo no mezcle causas (no es C25).
- **Niveles pretendidos:** P 4 (4–5) · I-econ 1 (1–2) · I-pers 1 · I-cont 1 · I-legal 1 · contención 4 (3–4) · recuperación 3 (2–3).
- **Cálculo:** 0,23 M / 15,3 M = 1,5% → 1; si ningún tambo no relevado tiene generador, 0,32 M = 2,1% → 2.
- **Faltante deliberado que DEJA EVALUABLE:** generadores en 240 de 400 tambos sin relevar; acota I-econ a 1–2.
- **Anomalías esperadas:** A6 (P en una red de terceros), A1 en I-econ.

### S19-R05 · Incendio en el depósito de producto terminado
- **Contrastes y reglas:** C06 (un solo depósito; I-cont 5 bruto), §2.2.4 (detección por aspiración e hidrantes a V), §5.2.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 5 · I-pers 3 (2–4) · I-cont 5 · I-legal 4 (3–4) · contención 4 (3–4) · recuperación 4.
- **Cálculo:** daño directo 18,9 M = 124% → 5 (sin contar interrupción).
- **P:** ignición contenida de 2021-11 (>3 años) y cortocircuito con humo de 2024-09 (¿ignición?) → 3–4; tasa sectorial 0,12% anual es de incendios con pérdida > USD 1 M, no de igniciones (A1 si se usa como jerarquía 1).
- **Anomalías esperadas:** A1 en P; A3. `consecuencia_extrema` = true.
- **Faltante:** capacidad de cámaras de terceros en primavera (deja evaluable: recuperación queda en 4).

### S19-R06 · Lesión de un operario con químicos de limpieza
- **Contrastes y reglas:** C19, C22 implícito (recuperación `no_aplica`).
- **Niveles pretendidos:** P 5 (4–5) · I-econ 1 · I-pers 2 (2–3; techo 4 por pérdida parcial de visión) · I-cont 1 · I-legal 1 (1–2) · contención 3 (2–3) · recuperación no_aplica.
- **Anomalías esperadas:** A1 en I-pers (escenario plausible vs. peor creíble), A8.

### S19-E01 · Corte eléctrico regional en la planta y en las cuencas lecheras
- **Contrastes y reglas:** C17 (§10.2: plausible y material; §10.3: I conjunta sin doble conteo; la leche no procesada en la planta no se suma al excedente a granel porque los tambos tampoco remiten). Miembros S19-R03;S19-R04.
- **Plausible:** sí; una falla de la estación regional produce los dos eventos iniciadores (2020-08 los produjo; 2026-02 produjo el corte de planta y el de la cuenca sur).
- **Material (pretendido):** sí, por Económico (bruto 5,2–5,4 M = 34–35% → 4, frente a 3 de R03 y 1 de R04) y por Continuidad (3 a 4 días con ≥ 50% de pérdida de capacidad: I-cont 3 frente a 2 de R03 y 1 de R04).
- **Niveles pretendidos:** P 3 (2–4) · I-econ 4 (3–4) · I-pers 1 · I-cont 3 (2–3) · I-legal 1 · contención 4 (3–4) · recuperación 4 (4–5).
- **Cálculo:** bruto 5,2–5,4 M / 15,3 M = 34–35% → 4; con los grupos actuando 1,15–1,33 M = 7,5–8,7% (eso es V, no I).
- **P:** dos episodios conjuntos en 10 años (2020-08, 2026-02) → historia propia 4 (2026-02 dentro de 3 años) vs. distribuidora (1 falla mayor de la estación en 10 años ≈ 10% → 2): rango obligatorio por fuentes de jerarquía 1–2 que divergen (§3.2).
- **Anomalías esperadas:** A1 en la decisión de materialidad (borde: I-cont 2 vs 3) y en P; A7 si un evaluador no sostiene la materialidad.

---

## S20 · AgroSilos Centro S.A. (acopio de cereales)

RO 2025 = USD 3,0 M (2% = 0,06 M; 10% = 0,3 M; 30% = 0,9 M; 100% = 3,0 M). Margen de contribución conocido (USD 32/t).

**Contrastes:** C01 (R01, R05), C03 (R01, R03, R05), C06 (una planta, un elevador, una galería: R01, R05), C19 (R04, R06), C23 (cosecha vs. fuera de cosecha: R01, R04; maíz húmedo en R02); de costado C35 (R02, R04: eventos graduales), C13 (choferes en la cola, pueblo, depositantes, transportistas en R06).

### S20-R01 · Explosión de polvo en el elevador
- **Contrastes y reglas:** C01 (P baja, I extrema; producto P×I×V), C03 (Personas 5), C23 (escenario plausible de I: ¿cosecha con choferes y 90.000 t por recibir, o promedio?), §2.2.4 (venteos/supresión inexistentes → V), §2.3 (choferes: exposición, no barrera).
- **Niveles pretendidos:** P 3 (2–3) · I-econ 5 · I-pers 5 (4–5) · I-cont 5 · I-legal 4 · contención 5 (4–5) · recuperación 3 (3–4).
- **Cálculo:** elevador 3,8 M = 127% → 5 sólo con el daño directo.
- **P:** sin explosiones en 28 años (no indica 4–5); precursores observados (2025-04, 2026-03, polvo acumulado) → 3; sector 6 en 10 años → 2; condiciones nuevas (filtro roto, noria 2 sin sensores) → posible +1 sobre 2.
- **Anomalías esperadas:** A3, A1 en P, A6 (estacionalidad del escenario de I). `safety_critical` y `consecuencia_extrema` = true.
- **Faltante:** sin estudio de alcance de una explosión (deja evaluable: I ya está en 5).

### S20-R02 · Incendio por autocalentamiento del grano almacenado
- **Contrastes y reglas:** C35 de costado (evento gradual: el evento iniciador es la combustión; la termometría que detecta el calentamiento **antes** de la combustión es control preventivo de P, y después es V: §2.1, §2.2.3), C18 indirecto (exclusión de combustión sin llama).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 (3–4) · I-pers 3 (2–4) · I-cont 1 · I-legal 2 (1–2) · contención 4 (3–4) · recuperación 3.
- **Cálculo:** silo de maíz 5.000 t al 50%: 0,44 M + silo 0,3 M = 0,74 M = 25% → 3; soja 100%: 1,16 + 0,6 = 1,76 M = 59% → 4.
- **Anomalías esperadas:** A6 (dónde está el evento en un proceso gradual), A11/A10 (termometría en P y en V sin nombrar dos mecanismos), A1.

### S20-R03 · Atrapamiento de un trabajador dentro de un silo
- **Contrastes y reglas:** C03 (Personas 4, `safety_critical`), C22 implícito (recuperación `no_aplica`), §5.2 (rescate sin ensayo en 12 meses; actuación real de 2021 fuera de los 3 años).
- **Niveles pretendidos:** P 3 · I-econ 2 (1–2) · I-pers 4 · I-cont 1 · I-legal 4 (3–4) · contención 4 · recuperación no_aplica.
- **Cálculo:** indemnización 0,05–0,3 M + multa → 2–10% → plausible 0,15 M = 5% → 2.
- **Anomalías esperadas:** A1 en recuperación (`no_aplica` vs nivel), A1 en contención.

### S20-R04 · Deterioro del grano por humedad
- **Contrastes y reglas:** C19 (riesgo corriente), C23 (lluvias en cosecha), C35 de costado (deterioro gradual: ¿qué es "un evento" y qué es P en 12 meses?), C02 suave.
- **Niveles pretendidos:** P 5 · I-econ 2 (2–3) · I-pers 1 · I-cont 1 · I-legal 1 · contención 3 · recuperación 3.
- **Cálculo:** 0,095–0,29 M por campaña = 3,2–9,7% → 2.
- **Anomalías esperadas:** A6 (evento agregado por campaña vs. por bolsa o silo), A7 posible (podría leerse como varios eventos).

### S20-R05 · Colapso estructural de un silo
- **Contrastes y reglas:** C01 (sin historia propia en 28 años; comparables de 2021 y 2024), C03, C06 (la galería superior carga los 12 silos), C18 indirecto (exclusión de colapso).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 4 (4–5) · I-pers 4 · I-cont 4 (1–4) · I-legal 4 · contención 5 · recuperación 3 (3–4).
- **Cálculo:** silo 0,6 + galería 0,3–0,6 + grano 0,25–0,46 + limpieza 0,1–0,2 = 1,25–1,86 M = 42–62% → 4; con interrupción en cosecha → 5.
- **Faltante deliberado que DEJA EVALUABLE:** no hay cálculo de hacia dónde cae cada silo (I-cont 1 si cae sólo el silo, 4 si alcanza la galería) ni inspección de los silos 9–12. Con I-pers 4 conocido y contención 5, la cota de I-cont no supera el `C_raw` de Personas (§9.3).
- **Anomalías esperadas:** A2 / A1 en I-cont. `safety_critical` = true.

### S20-R06 · Fraude en la balanza de recepción
- **Contrastes y reglas:** C13 (colusión con transportistas: a quién se atribuye el control), C19.
- **Niveles pretendidos:** P 4 (3–4) · I-econ 2 (1–2) · I-pers 1 · I-cont 1 · I-legal 2 (1–2) · contención 3 · recuperación 4 (4–5).
- **Cálculo:** 0,05–0,125 M = 1,7–4,2% → 1–2.
- **P:** evento de 2024-11 (dentro de 3 años) → 4; ajuste −1 posible por controles verificados nuevos (software y cámaras desde 2025-03, conciliación desde 2025-06) → 3.
- **Faltante deliberado que DEJA EVALUABLE:** qué parte del faltante de 380 t fue fraude; acota I-econ a 1–2.

---

## S21 · Empaque Andino S.A. (fruta fresca, empaque y frío; ex E4)

RO 2025 = USD 3,9 M (2% = 0,078 M; 10% = 0,39 M; 30% = 1,17 M; 100% = 3,9 M). **Margen de contribución conocido sólo en forma aproximada (C21):** la gerencia lo estima en 25–35% sin respaldo. Pretensión según v0.1 §4.2.3: no se conoce → rango entre margen operativo (RO/facturación 2025 = 9,7%) y facturación perdida; si cruza un corte, `i_econ = unknown`. Es esperable que un evaluador use el 25–35% como conocido: A1 buscada.

**Contrastes:** C03 (R05, R07), C06 (un empaque, un frigorífico, un puerto: R03, R06, R07), C10 y C18 (transferencia: granizo con deducible por finca y suma asegurada de USD 12.000/ha frente a ~USD 48.000/ha de facturación; exclusión de helada; transporte con exclusión de rechazo sanitario, huelga y demora), C13 (productores terceros en R04 y R08; contratista de transporte en R05; puerto en R06), C14 (R08), C19 (R03, R06), C21 (R01, R02, R08, R04), C23 (R01 noviembre vs enero; R07 en temporada vs fuera; R02 floración en curso a la fecha de corte); de costado C01 (R07), C05 (R04, R08).

### S21-R01 · Granizo sobre las fincas
- **Contrastes y reglas:** C21 (§4.2.3), C23 (§4.1.4), C10/C18 (seguro fuera de I y V; deducible por finca), §2.2.4 (redes antigranizo: control pasivo posterior al evento → V).
- **Niveles pretendidos:** P 5 (4–5) · I-econ unknown (3–5) · I-pers 1 · I-cont 1 · I-legal 1 · contención 4 (4–5) · recuperación 4 (3–4).
- **Cálculo:** facturación perdida 4,6 M; con margen operativo 0,45 M = 11,5% → 3; con facturación 4,6 M = 118% → 5 → unknown (3–5). Con el margen aproximado 1,15–1,6 M = 29–41% → 3–4.
- **Consecuencia buscada:** con I-econ unknown y las otras dimensiones en 1, la cota de Económico supera el `C_raw` conocido → **no evaluable por §9.3** (efecto del faltante de margen exigido por la cobertura: alcance pretendido **no deja evaluable**).
- **Anomalías esperadas:** A1 (margen aproximado usado o no), A2, A6/A1 por estacionalidad, A8.

### S21-R02 · Helada tardía en floración
- **Contrastes y reglas:** C21, C23 (floración en curso a la fecha de corte), C18 (helada excluida del seguro).
- **Niveles pretendidos:** P 4 (4–5) · I-econ unknown (2–4) · I-pers 1 · I-cont 1 · I-legal 1 · contención 4 · recuperación 3.
- **Cálculo:** 3,6 M de facturación perdida; margen operativo 0,35 M = 9% → 2; facturación 3,6 M = 92% → 4 → unknown (2–4) por §4.2.3, aunque el rango es de tres niveles (§9.2 permitiría un valor): **posible A12** entre §4.2.3 y §9.2.
- **P:** historia propia 3 eventos en 10 años, el último en 2023-10 → 4; estación agrometeorológica 7/15 temporadas (47%) → 4; precursor de 2026-09-14 y floración en curso → posible +1.
- **Anomalías esperadas:** A12, A1 en I-econ y P.

### S21-R03 · Falla del sistema de frío del frigorífico
- **Contrastes y reglas:** C06, C19; pérdida de stock (daño directo, no margen) → no depende de C21.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 4 (3–4) · I-pers 1 · I-cont 1 · I-legal 1 · contención 2 (2–3) · recuperación 3.
- **Cálculo:** 4 cámaras 72 h: 1,9 M = 49% → 4; 2 cámaras de atmósfera 3 días: 0,6 M = 15% → 3.
- **P:** 2021-03 (>3 años) → 3; la falla de compresor de 2024-04 no produjo pérdida de frío (compresor de reserva): ¿ocurrencia del evento contenida (→ 4) o precursor? A11 esperada.

### S21-R04 · Rechazo de embarques en destino por detección de una plaga cuarentenaria
- **Contrastes y reglas:** C13 (fruta de productores terceros; atribución de controles), C18 (exclusión de rechazo sanitario), C05 de costado (suspensión del empaque para el mercado), §4.1.4 (escenario plausible: un contenedor rechazado vs. suspensión al tercer rechazo).
- **Niveles pretendidos:** P 4 · I-econ 1 (techo 4) · I-pers 1 · I-cont 1 (techo 4) · I-legal 1 (techo 4) · contención 3 · recuperación 3.
- **Cálculo:** un contenedor 0,035–0,039 M = 1% → 1; suspensión en marzo: 3,5 M de facturación perdida, margen operativo 0,34 M = 8,7% → 2 vs facturación 90% → 4 (C21).
- **Anomalías esperadas:** A6 (escenario plausible con la regla de 3 intercepciones), A2 (techo a más de tres niveles del plausible), A1.
- **Faltante:** sin auditoría en campo de los terceros (deja evaluable).

### S21-R05 · Accidente vial del transporte contratado de trabajadores de cosecha
- **Contrastes y reglas:** C03 (Personas 5: 45 trabajadores por ómnibus), C13 (contratista; a quién se atribuyen P y V, A6), §9.2–9.4 (P sin fuentes), §8.2 (banderas en no evaluable con `i_pers_max`), §9.5 (cola de validación: primero por posible `safety_critical`).
- **Niveles pretendidos:** P **unknown** (sin rango defendible: 2–5) · I-econ 3 (2–4) · I-pers 5 (4–5) · I-cont 1 · I-legal 4 · contención 5 · recuperación 4.
- **Cálculo:** 0,08–0,4 M por fallecido × 1–3 + multas = 0,1–1,3 M = 2,6–33% → plausible 0,6 M = 15% → 3.
- **Faltante deliberado que NO DEJA EVALUABLE (pedido por la cobertura: sobre el contratista):** sin historial de siniestros del contratista actual ni del anterior, sin datos de flota ni choferes, sin estadística sectorial ni comparables. P `unknown` → **no evaluable** (§9.3.1); `safety_critical` y `consecuencia_extrema` por `i_pers` 5. Si un evaluador usa juicio experto propio (`assumed`) y asigna P, A1/A9 esperada.

### S21-R06 · Paro en el puerto de embarque
- **Contrastes y reglas:** C06 (puerto único), C13, C18 (huelga y demora excluidas), C19.
- **Niveles pretendidos:** P 4 (4–5) · I-econ 3 (2–3) · I-pers 1 · I-cont 3 (2–3) · I-legal 1 · contención 3 · recuperación 3.
- **Cálculo:** 0,62 M (costo, no margen) = 16% → 3.

### S21-R07 · Incendio en la planta de empaque
- **Contrastes y reglas:** C01 de costado, C03 (148 personas), C06, C23 (temporada vs fuera de temporada: escenario plausible de I, A6), §2.2.4 (muro cortafuego y detección a V; bomba sin respaldo = medida que falla en parte).
- **Niveles pretendidos:** P 3 · I-econ 5 · I-pers 3 (3–4) · I-cont 5 · I-legal 4 · contención 4 · recuperación 4 (3–4).
- **Cálculo:** daño directo 12 M = 308% → 5.
- **Anomalías esperadas:** A6 por estacionalidad, A3. `consecuencia_extrema` = true.
- **Faltante:** capacidad de empaques de terceros en enero–abril (deja evaluable).

### S21-R08 · Nueva exigencia fitosanitaria del mercado principal
- **Contrastes y reglas:** C14 (D3, §1.1.2, §3.1: entrada en vigor a 18 meses de la fecha de corte, fuera del horizonte de 12 meses); se mantiene en la lista por decisión de la cobertura (Para aprobar, punto 14).
- **Niveles pretendidos:** P 1 (1–5; el valor depende de qué se tome como evento: la entrada en vigor, fuera del horizonte → 1; el anuncio, ya ocurrido → 5; el incumplimiento constatado en la auditoría de 2027-11, dentro del horizonte → 3–4) · I-econ 4 (3–5) · I-pers 1 · I-cont 4 (3–5) · I-legal 4 (3–4) · contención 3 · recuperación 5 (4–5).
- **Cálculo:** pérdida total del mercado P: 7 M/año de menor precio sobre el mismo volumen (pérdida directa de resultado) = 179% → 5; cumplimiento parcial (14 terceros): 3.200 t × USD 1.273 = 4,1 M de facturación, con margen operativo 0,4 M = 10% → 3, con facturación → 5 → unknown por C21.
- **Anomalías esperadas:** A6 (principal), A1 en P (divergencia amplia buscada), A12 posible.
- **Faltante:** fecha de la auditoría del empaque (deja evaluable).

---

## Faltantes deliberados de la tanda, por alcance pretendido

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S21-R05 | Datos del contratista de transporte (historial, flota, choferes) y ausencia de fuentes sectoriales | **No deja evaluable** (P unknown) |
| S21-R01 | Margen de contribución sólo aproximado (C21) | **No deja evaluable** (I-econ unknown 3–5 supera el `C_raw` conocido) |
| S21-R02 | Margen de contribución sólo aproximado (C21) | No deja evaluable por §4.2.3 (o evaluable si se aplica §9.2: A12) |
| S18-R02 | Días de baja por caso de 2023 | Deja evaluable |
| S18-R06 | Análisis de regionalización por mercado | Deja evaluable (I-econ 3–5) |
| S19-R04 | Generadores en 240 tambos | Deja evaluable (I-econ 1–2) |
| S20-R05 | Dirección de caída de cada silo; inspección de silos 9–12 | Deja evaluable (cota de I-cont ≤ `C_raw` de Personas) |
| S20-R06 | Parte fraude / merma del faltante de 2024 | Deja evaluable (I-econ 1–2) |

Los demás faltantes escritos en las fichas son de contexto y no buscan cambiar ningún nivel.

## Riesgos corrientes (C19) de cada empresa

- **S18:** S18-R02 (cortes con cuchillo o sierra), S18-R07 (efluentes fuera de norma).
- **S19:** S19-R03 (corte de red), S19-R06 (químicos de limpieza); también S19-R02.
- **S20:** S20-R04 (deterioro por humedad), S20-R06 (fraude en balanza).
- **S21:** S21-R03 (falla de frío), S21-R06 (paro portuario).

## Avisos de la Fase 5 aplicados (2026-10-06)

Se agregaron a las fichas: estructura de costos de S21 sin montos (para conservar C21: el margen sigue siendo sólo aproximado); montos brutos vs. con respuesta en cada ficha; verificación de barreras pasivas (muro cortafuego de S21 sin verificación en 12 meses; redes antigranizo inspeccionadas en 2025-10; sectorización de S18-R03 sin verificación); comparación con comparables o sector, o que no se sabe; frecuencias anuales observadas. Cambios de intención: S19-R03 (I-econ 2 → 3) y S19-E01 (I-econ 2 → 4; materialidad más clara). En S18-R01 los positivos de PCR quedaron como presuntivos no confirmados (P sin cambio).

## Ajustes de escala respecto de la cobertura

- S18: facturación 410,2 M y RO 25,6 M en 2025 (cobertura: 400 M y ~25 M).
- S19: facturación 252,3 M y RO 15,3 M en 2025 (cobertura: 250 M y ~15 M).
- S20: 58 permanentes + 12 temporarios = 70 en el pico; facturación 45,1 M y RO 3,0 M.
- S21: RO 3,1 / 5,2 / 3,9 M (variable, alrededor de 4 M); facturación 2025 40,1 M.

## Riesgos del diseño que no se sostienen (o quedan en el borde)

1. **S19-E01, materialidad.** Después de aplicar el aviso 2 de la Fase 5 (montos brutos), la consecuencia conjunta supera a los miembros por un nivel en Económico (4 vs 3) y en Continuidad (3 vs 2). Si un evaluador calcula I con los grupos electrógenos actuando (neto), la materialidad económica desaparece (7,5–8,7%) y queda sólo la de Continuidad, en el borde: A11/A1 esperada.
2. **S19-R04, causa acotada.** "Interrupción de la recolección" admite varias causas (paro de transportistas, caminos anegados, corte de energía). Para que E01 sea plausible y R04 no sea un segundo caso C25, la causa quedó fijada en el corte de energía rural. Emiliano puede preferir otra redacción.
3. **C21 en S21 deja varios riesgos no evaluables por construcción.** Con §4.2.3, cualquier riesgo de S21 cuya pérdida sea margen perdido (R01, R02, la parte parcial de R08 y el máximo de R04) da I-econ unknown, y en R01 y R02 eso vuelve el riesgo no evaluable porque las otras dimensiones están en 1. Es coherente con lo que C21 busca probar, pero concentra no evaluables en una sola empresa.
4. **S21-R08:** la P depende por completo de qué se tome como evento (anuncio, auditoría o entrada en vigor). Es lo que busca probar; el rango esperado entre evaluadores puede ser de 1 a 5.
