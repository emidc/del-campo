# Intención de diseño · EMI-41 · familia Energía y agua

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: energia-y-agua. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda energia-y-agua -->

# Intención de diseño · EMI-41 · tanda energía y agua (S31–S34)

**No abrir antes de la comparación de la Fase 8.**

> Fase 7 · tanda energia-y-agua · construida 2026-10-06 · niveles pretendidos **según metodología v0.1**. Fichas en `v0/emi41/fichas/S31` a `S34`; lista parcial `lista-energia-y-agua.csv` (24 fichas, todas `riesgo`; sin padre ni escenario; sin casos C25 en esta tanda, por encargo).
> Notación: P · I-econ · I-pers · I-cont · I-legal · V-cont · V-rec. Valor plausible y, entre paréntesis, rango `min–max` cuando corresponde. `C_d = P × I_d × V_d` con V_d según §5.5 (pers y legal: contención; econ y cont: peor de contención y recuperación).

---

## S31 · Petrolera Neuquén S.A. (upstream no convencional) · RO 2025 = USD 252 M

**Contrastes de la empresa y cómo los cubre.** C01 en R01 (descontrol con muertes múltiples posibles y P baja por estadística de jerarquía 1). C05 en R02, R04 y R05 (notificación, plan de remediación bajo inspección, suspensión de permisos, advertencia de sumario). C13 en R03 (trabajadores de contratistas: a qué organización se atribuyen P, I y V) y R05 (terceros que usan el acuífero). C27 en R03 (la locación de fractura se muda cada 18–35 días; personas expuestas cambian por etapa). C19 en R02 y R06. De costado: C03 (R01, R03, R06), C10 y C18 (transferencia: límite de control de pozo menor que el peor caso, equipo de perforación de USD 28 M frente a sublímite de USD 10 M, exclusión de contaminación gradual que deja fuera R05, ninguna póliza de pérdida de beneficio para R04).

### S31-R01 · Pérdida del control de un pozo durante la perforación o la fractura
- **Contrastes / reglas:** C01, C03, C27, C05; D14 y §8 (bandera sin piso), §3.2 (jerarquía 1 frente a precursores propios), §3.4 (+1 por condiciones nuevas: rotación del personal, más pozos en sobrepresión), §2.2 (¿el cierre de preventores es preventivo de "pérdida de control"? se escribió como P).
- **Niveles pretendidos:** P 2 (1–3): tasa internacional y regional dan < 5% anual con la exposición (≈ 46/2.500 + 160/8.000 ≈ 3,8%) → 1; +1 por condiciones causales nuevas; influjos propios son precursores (ancla 3 si se los toma como dominantes). I-econ 3 (3–4): con ignición USD 8 + 11 + 28 + 8 + 2 + 7 ≈ 64 M / 252 M = 25%; sin ignición ≈ 40 M = 16%; peor con pozo de alivio ≈ 100 M = 40%. I-pers 4 (3–5): 30 personas a < 50 m en fractura; el caso regional tuvo 2 heridos internados; más de una muerte es el máximo. I-cont 4 (3–5): desarrollo suspendido 45–120 días; producción degradada 9%. I-legal 4. V-cont 4 (3–4): especialista a 36–48 h nunca activado, sólo ejercicio de escritorio; evacuación ensayada con recuento incompleto. V-rec 4 (4–5): pozo de alivio nunca hecho, sin plan para reanudar desarrollo.
- C_pers = 2×4×4 = 32; C_legal = 32; C_cont = 32; C_econ = 2×3×4 = 24. Bandera `safety_critical`.
- **Anomalías esperadas:** A3 (riesgo con muertes posibles en la mitad baja del ranking de la empresa); A1 en P (jerarquía 1 contra precursores) y en I-pers (4 o 5); A6 sobre si "desarrollo" es función crítica.
- **Faltantes:** tiempos reales de la empresa de control de pozos y ejercicio de campo: alcance pretendido **deja evaluable** (acotan V-cont a 3–4).

### S31-R02 · Rotura de una línea de conducción con derrame
- **Contrastes / reglas:** C19, C05, C02 de costado; §4.5 (notificación y plan bajo inspección → Legal 3), separación multa (econ) / sanción (legal).
- **Niveles:** P 5 (11–16 por año). I-econ 1 (USD 85 mil promedio; máx. 410 mil = 0,16%). I-pers 1. I-cont 1. I-legal 3 (2–4; la nota de 2025-04 abre suspensión de líneas del sector norte). V-cont 3 (2–3): detección automática probada sólo en troncal y 40% de líneas de agua; el resto, recorrida de 24 h. V-rec 2 (reparación en horas probada; remediación 6–10 meses).
- C_legal = 5×3×3 = 45; C_econ = 5×1×3 = 15.
- **Anomalías:** A8 posible (un riesgo corriente queda arriba del descontrol). Faltante "derrames < 1 m³": **deja evaluable** (P ya es 5).

### S31-R03 · Rotura de una línea de alta presión durante una fractura
- **Contrastes / reglas:** C13 (trabajadores de 6 contratistas; responsabilidad solidaria; cobertura del empleador), C27, C03; test de la barrera §2.3 (zona de exclusión: ¿exposición o barrera?), §2.2.4 (sistema de retención = control pasivo posterior → V).
- **Redacción:** el título de la cobertura ("accidente de un trabajador de contratista") se reescribió con el evento iniciador (rotura de la línea), §8.4; el evento de la cobertura es posterior al iniciador.
- **Niveles:** P 4 (rotura 2025-07 en la empresa; ingresos a la zona y piezas vencidas). I-pers 4 (3–4): un fallecido en 2 de 9 casos regionales; 10–18 personas a 15–40 m. I-econ 1: ≈ USD 0,6 + 1 + 1,2 M ≈ 2,8 M / 252 M = 1,1%. I-cont 2 (1–3): fractura suspendida 2–10 días (21 días en el caso de 2024). I-legal 4 (3–4): imputación penal y suspensión en el caso regional. V-cont 3: retención en 100% sin actuación real (presente sin prueba); parada de emergencia probada; traslado 2 h 40 min. V-rec 2.
- C_pers = 4×4×3 = 48 (determinante). Bandera `safety_critical`.
- **Anomalías:** A6 (organización de referencia: personas del contratista), A11 (zona de exclusión entre I y V), A1 en V-cont.

### S31-R04 · Ignición de vapores en el sector de tanques de una batería
- **Contrastes / reglas:** C19 de costado, C06 de costado (B3 concentra 26%), §2.4 (interrupción bruta sin derivación; la interconexión es V-rec), §5.2 (medida que falla en parte: 3 de 4 cámaras de espuma), §3.4 (+1 por recuperación de vapores fuera de servicio).
- **Niveles:** P 3 (3–4): incendio propio hace 4 años; comparables 2021 y 2024; +1 posible por la condición nueva. I-econ 3 (3–4): 16 + 45,5 + 6,9 + 1 + 0,5 ≈ 70 M / 252 M = 28%. I-cont 4: degradación del 26% durante 18 semanas (> 3 meses → 5, menos uno). I-pers 3 (2–4). I-legal 3 (3–4; clausura de B3 hasta aprobar la reconstrucción puede leerse como clausura temporal). V-cont 3. V-rec 2 (2–3): interconexión usada 2025-11, 60% en 2 días.
- C_cont = 3×4×3 = 36; C_econ = 27.
- **Anomalías:** A1 en I-econ (cerca del corte de 30%) y en V-rec.

### S31-R05 · Pérdida de integridad del entubamiento con migración a un acuífero
- **Contrastes / reglas:** C05, C13 (puestos y localidad), C35 de costado (detección semestral, evento sin instante claro), §9.3 (dimensión `unknown` cuya cota no supera C_raw).
- **Niveles:** P 3 (precursores propios 2024 y 2026; comparables 2021 y 2023). I-econ 2 (2–3): ≈ 1,2 + 3 + 15 + 0,1 + 1,5 ≈ 20 M / 252 M = 8%; máx. ≈ 38 M = 15%. I-pers `unknown` con máx. 4 (o 2 con rango 1–3): depende de la conexión con las perforaciones de la localidad. I-cont 3 (2–4): 2 de 8 pads del plan suspendidos 4 meses (degradación). I-legal 4. V-cont 4: monitoreo semestral, sin plan de respuesta. V-rec 4 (4–5).
- C_legal = 3×4×4 = 48; cota de I-pers = 3×4×4 = 48 ≤ 48 → evaluable.
- **Faltante deliberado:** estudio hidrogeológico de conexión con la localidad: **deja evaluable** (pretendido), porque la cota de Personas no supera a Legal. Advertencia: si un evaluador pone I-legal 3, la cota de Personas (48) supera su C_raw (36) y queda no evaluable; esa divergencia es parte de lo que se mide. Faltante "88 pozos sin registro de cementación": deja evaluable (P sigue en 3).
- **Anomalías:** A2 (plausible frente a `unknown` en Personas), A6 (cuándo ocurre el evento).

### S31-R06 · Colisión o vuelco de un vehículo en los caminos del yacimiento
- **Contrastes / reglas:** C19, C27, C03 de costado, C13 (contratistas en el registro).
- **Niveles:** P 5. I-pers 3 (3–4; máx. 5 con un colectivo de 40, que requiere un escenario no observado). I-econ 1. I-cont 1. I-legal 2. V-cont 3 (2–4): alerta automática probada en un evento real; ambulancia 38 min medio. V-rec 1 (2) para vehículos; las lesiones no tienen recuperación.
- C_pers = 5×3×3 = 45.
- **Faltante deliberado:** kilómetros de 2023 (y de contratistas): **deja evaluable** (P 5 por historia anual).

---

## S32 · Servicios Petroleros Patagonia S.A. (servicios a operadoras) · RO 2025 = USD 5,2 M

**Contrastes de la empresa.** C03 en R01, R02, R04, R05. C13 en R01 (anclajes preparados por la operadora; suspensión por la operadora), R03 (cliente que concentra 55%) y R02 (terceros en ruta). C27: los equipos se mudan 148 veces por año; las personas expuestas dependen de la etapa (izado, operación, mudanza). C19 en R04 y R05. De costado: C06 (un cliente con 55%) y C09 (rescisión de contrato con par en una PyME de la misma familia; incendio de equipo).

### S32-R01 · Caída del mástil durante el armado o desarmado
- **Contrastes / reglas:** C03, C13, C27; §2.3 (la zona de exclusión es barrera porque dos personas siempre están dentro), §4.1.5 (¿la suspensión por la operadora es parte de la consecuencia completa?).
- **Niveles:** P 3 (3–4): evento propio 2021 (> 3 años), comparables 2020 y 2023, precursores (anclajes, inspecciones vencidas). I-pers 4 (4–5): 2 personas en la zona durante el izado; 6 con el mástil arriba; caso sectorial con 2 muertos. I-econ 4: 1,1 + 0,53 + 0,1 + 0,5 + 0,47–1,0 ≈ 2,7–3,2 M / 5,2 M = 52–62% (sin suspensión de A ≈ 2,2 M = 42%). I-cont 2 (1–4): un equipo de 12 por 4 meses es degradación; con la suspensión de A (58% de la capacidad, 19–40 días) es 4. I-legal 4. V-cont 4 (3–4): zona de exclusión con incumplimientos observados, sin rescate en locación. V-rec 5 (4–5): sin equipo de reserva; mástil usado cotizado y no probado.
- C_econ = 3×4×5 = 60; C_pers = 3×4×4 = 48. Bandera `safety_critical`.
- **Anomalías:** A6 (consecuencia que decide un tercero), A1 en I-cont.

### S32-R02 · Vuelco de un camión de mudanza
- **Contrastes / reglas:** C27, C13 (terceros en ruta), C03.
- **Niveles:** P 4 (vuelco 2024-11; tasa sectorial ≈ 0,62 por año → ≈ 46%). I-pers 3 (2–4). I-econ 3 (2–3): 0,38 + 0,15 ≈ 0,53 M / 5,2 M = 10%. I-cont 1. I-legal 2. V-cont 3. V-rec 4 (3–4): taller propio, sin reserva.
- C_econ = 4×3×4 = 48; C_pers = 36.

### S32-R03 · Rescisión del contrato por la operadora principal
- **Contrastes / reglas:** C13 (cliente), C06 de costado (concentración de ventas), C09 (par de escala con S34-R05); §4.4 (¿pérdida de cliente es interrupción de función crítica?), §4.1.5 (hasta cuándo se cuenta el margen perdido).
- **Niveles:** P 3 (3–4): carta formal 2026-04, TRIR 2026-T3 sobre el umbral, rescisión de A a otro contratista en 2025, anuncio de −20% en 2027. I-econ 5 (4–5): margen USD 7,94 M por año; aun 6–9 meses hasta el vencimiento ≈ 4–6 M ≥ 77–115% del RO. I-cont 5 (4–5) si se toma 58% de capacidad sin cliente 6–12 meses como interrupción; puede leerse como no aplicable a Continuidad. I-pers 1. I-legal 1. V-cont 4. V-rec 3 (3–4): pedido de B (2 equipos), licitación de D, antecedente de 2019 fuera de los 3 años.
- C_econ = 3×5×4 = 60; C_cont = 60. Bandera `consecuencia_extrema`.
- **Anomalías:** A6 (consecuencia completa con contrato que vence en 2027-06), A11 (Continuidad frente a Económico).

### S32-R04 · Ignición en un equipo de reparación o de pulling
- **Contrastes / reglas:** C19, C09 de costado; §5.2 (supresión automática probada en 5 de 12 equipos: falla parcial de cobertura).
- **Niveles:** P 4 (incendios propios 2023-06 y 2025-02). I-econ 3 (3–4): 0,6–1,9 M / 5,2 M = 12–37%; pérdida total ≈ 2,9–7,95 M (máx. 5). I-pers 3 (2–4). I-cont 1. I-legal 2. V-cont 3. V-rec 4 (4–5).
- C_econ = 4×3×4 = 48.

### S32-R05 · Golpe o atrapamiento en una maniobra con tubería
- **Contrastes / reglas:** C19, C03, C22 de costado (recuperación sin nada que reponer).
- **Niveles:** P 5. I-pers 3 (máx. 4 por amputación parcial = incapacidad permanente leve; fallecido sectorial 2022). I-econ 1. I-cont 1. I-legal 2. V-cont 3. V-rec `no_aplica` (o 1 si se cuenta el relevo).
- C_pers = 5×3×3 = 45.
- **Faltante:** horas por equipo antes de 2024: **deja evaluable**.

### S32-R06 · Sustracción de equipos o herramientas de una locación
- **Contrastes / reglas:** C13 (vigilancia y registros de las operadoras), C11 (§9.2 y §9.3: P `unknown` → no evaluable; cola de validación).
- **Niveles:** P `unknown` (2–5 sin fuente que acote a tres niveles; diferencias de inventario no separan robo). I-econ 1–2 (USD 45–250 mil / 5,2 M = 0,9–4,8%). I-pers 1. I-cont 1 (1–2). I-legal 1. V-cont 5 (4–5). V-rec 2 (2–3).
- **Faltante deliberado:** registro de robos y estadística sectorial: **no deja evaluable** (P `unknown`).
- **Anomalías:** A2 si un evaluador inventa P a partir de las diferencias de inventario; A9 si baja P por falta de evidencia.

---

## S33 · Energía Solar Cuyo S.A. (parque fotovoltaico) · RO 2025 = USD 7,2 M

**Contrastes de la empresa.** C06 y C34 en R01 (único transformador, nadie expuesto, Económico y Continuidad en 5). C13 en R03 (operador de la red y transportista) y R04 (viñedo lindero). C35 en R06 (degradación gradual, sin instante: dónde está el evento y qué es P en 12 meses). C19 en R02 y R05. De costado: C10 y C18 (exclusión de avería de maquinaria que deja fuera el transformador; deducible de granizo por bloque; robo sólo con violencia; pérdida de beneficio sólo con daño cubierto y espera de 30 días; nada cubre R03 ni R06).

### S33-R01 · Falla interna del transformador principal
- **Contrastes / reglas:** C06, C34; §2.4 (12–14 meses bruto; transformador móvil sólo cotizado = V-rec), §5.5 (V por dimensión con Personas y Legal en 1), §3.4 (+1 por tendencia de gases).
- **Niveles:** P 2 (1–3): jerarquía 1 0,5–0,8% → 1; +1 por precursor nuevo (acetileno de 1 a 5 ppm). I-econ 5: 3,8 + 14,6 + 2,6 + 0,3–1,5 ≈ 21–22,5 M / 7,2 M ≈ 300%. I-cont 5 (generación cero 12–14 meses). I-pers 1. I-legal 1 (1–2; la rescisión del comprador es contractual). V-cont 3 (2–4): protecciones probadas 2025-11 (limitan a reparación en lugar de reemplazo); sin extinción fija. V-rec 4 (3–5): transformador móvil cotizado, no contratado.
- C_econ = 2×5×4 = 40; C_cont = 40. Bandera `consecuencia_extrema`.
- **Anomalías:** A3/A8 (consecuencia extrema en la mitad del ranking por P 2), A1 en P (ajuste +1).

### S33-R02 · Granizada sobre el campo de módulos
- **Contrastes / reglas:** C19, C23 de costado (temporada de mayor generación), C18 (deducible por bloque), §4.4 (degradación < 50% un nivel abajo), §5.2 (posición de defensa con 8% sin comunicación).
- **Niveles:** P 4 (4–5): eventos 2022-12 y 2024-11; estación: 0,6 días por año con ≥ 25 mm. I-econ 2 (2–3): 0,9% de módulos ≈ 0,36 M / 7,2 M = 5%; 6% ≈ 1,48 + 0,56 ≈ 2,0 M = 28%. I-cont 3 (2–3): degradación 3–18% durante 19 días a 14 semanas. I-pers 1. I-legal 1. V-cont 2 (2–3): probada en real (86%) y simulacro (92%). V-rec 2 (2–3): stock probado, cubre 0,9%.
- C_cont = 4×3×2 = 24; C_econ = 16.
- **Faltante deliberado:** certificado de granizo del lote B: **deja evaluable** (I-econ se mantiene en 2–3).
- **Anomalías:** A8 (degradación chica con I-cont 3).

### S33-R03 · Restricción de la inyección ordenada por el operador de la red
- **Contrastes / reglas:** C13 (consecuencia decidida por un tercero), C19; §2.1 (¿evento = cada orden o el año de restricciones?), §5 (nada contiene ni recupera: V 5 multiplica una consecuencia chica).
- **Niveles:** P 5. I-econ 1 (1–2): por orden USD 16–60 mil (< 1%); en el año 2026, USD 0,4 M (5,5%); 2027 según el estudio 0,54–0,94 M (7,5–13%). I-cont 1. I-pers 1. I-legal 1. V-cont 5. V-rec 5.
- C_econ = 5×1×5 = 25 (o 50 con I-econ 2).
- **Anomalías:** A6 (unidad del evento), A8 (V 5 sobre algo que no se puede contener).

### S33-R04 · Ignición en una estación de inversión
- **Contrastes / reglas:** C34 de costado, C13 (viñedo lindero), §3.2 (base del fabricante, jerarquía 1, ≈ 8% anual para 25 unidades → 2; historia propia de 6,5 años con un evento → 3: rango obligatorio), §4.4 (4% de la potencia 6–8 meses: degradación → 4).
- **Niveles:** P 2 (2–3). I-econ 3 (3–4): 0,38 + 0,12 + 0,045 + 0,31 ≈ 0,86 M / 7,2 M = 12%; con el viñedo (máx. 40 ha × 35 mil = 1,4 M) ≈ 2,26 M = 31%. I-cont 4 (degradación > 3 meses). I-pers 1. I-legal 1 (1–2). V-cont 4 (3–4): detección probada, sin extinción; en 2023 el inversor se perdió igual. V-rec 5 (4–5).
- C_cont = 2×4×5 = 40; C_econ = 2×3×5 = 30.
- **Faltante deliberado:** daños posibles al viñedo: **deja evaluable** (I-econ acotado a 3–4).
- **Anomalías:** A8 (un bloque de 25 con I-cont 4), A1 en P.

### S33-R05 · Sustracción de cable de cobre
- **Contrastes / reglas:** C19, C02 de costado.
- **Niveles:** P 5. I-econ 1 (1–2): 80–130 mil / 7,2 M = 1,1–1,8%. I-cont 2 (1–2): degradación 4–8% de 2 a 14 días. I-pers 1 (1–2). I-legal 1. V-cont 3: cámaras probadas en real 2026-08 en 60% del perímetro. V-rec 2.
- C_cont = 5×2×3 = 30.

### S33-R06 · Pérdida de potencia del lote B por encima de la garantía
- **Contrastes / reglas:** C35 (evento gradual: ¿cuál es el iniciador y su P en 12 meses?), §2.1.3 (el título describe un estado, no un instante), §4.4 (degradación de 1–6% de larga duración).
- **Redacción:** el evento se escribió a propósito como un proceso ya en curso ("pierden potencia a una tasa mayor"), sin instante identificable.
- **Niveles:** P 5 (condición presente y activa, medida en 2024 y 2026) o A6 si el evaluador no identifica iniciador. I-econ 2 (2–4): 0,17 M = 2,4%; con avance de PID 0,8 M por año = 11%; reemplazo 4,8 M = 67%. I-cont: por la letra de §4.4, 4 (degradación > 3 meses); se espera que varios evaluadores pongan 1 (A8/A1). I-pers 1. I-legal 1. V-cont 4 (3–4): piloto sin resultados. V-rec 4 (4–5): reclamo de garantía sin respuesta.
- C_cont = 5×4×4 = 80 (por la letra) o 5×1×4 = 20; C_econ = 5×2×4 = 40.
- **Faltante deliberado:** situación del fabricante: **deja evaluable** (V-rec 4–5).
- **Anomalías:** A6 (evento y horizonte), A8, A1 en I-cont.

---

## S34 · Aguas Industriales Cuyo S.A. (tratamiento de agua para minas y bodegas, PyME) · RO 2025 = USD 0,52 M

**Contrastes de la empresa.** C09 (RO de USD 0,52 M: montos chicos en dólares dan niveles altos; par con S32-R03 en pérdida de contrato). C32 en R01 y R03 (servicio del que dependen el campamento y el proceso de la mina: qué parte del daño del cliente es de la empresa; en A el contrato lo limita, en B no se sabe). C13 en R01, R04 (permiso de vertido del cliente, multas trasladadas) y R06 (campamento a 350 m). C19 en R02 y R03. De costado: C05 (registro de operadores de agua potable, permiso de vertido), C03 (R06, R01) y C22 (R06).

### S34-R01 · Falla de la dosificación de cloro en la potabilizadora del campamento
- **Contrastes / reglas:** C32, C13, C03 de costado, C11 (§9.3 con I-econ `unknown` cuya cota supera C_raw).
- **Niveles:** P 4 (desvío 2025-01; alarmas 2024). I-pers 3 (3–4): 45–180 afectados en brotes sectoriales (lesiones leves a muchas personas). I-econ `unknown` (2–5): costos propios + multa = 16–118 mil (3–23%); reclamo del cliente sin tope conocido (caso sectorial USD 2,3 M = 440%). I-cont 2 (1–2). I-legal 4 (3–4): suspensión del registro de operadores 30–180 días. V-cont 4 (3–4): el analizador no detectó el desvío de 2025-01; aviso nunca ensayado. V-rec 2 (2–3).
- C_legal = 4×4×4 = 64; C_pers = 48; cota econ = 4×5×4 = 80 > 64 → **no evaluable**.
- **Faltante deliberado:** contrato firmado con B: **no deja evaluable** (la cota de Económico supera el C_raw de las dimensiones conocidas con cualquier V-cont 3–4 y Legal 3–4).
- **Anomalías:** A2, A6 (qué parte del daño del cliente es de la empresa).

### S34-R02 · Derrame de un químico durante la descarga o el trasvase
- **Contrastes / reglas:** C19, C05 de costado.
- **Niveles:** P 5. I-pers 2 (2–3). I-econ 1 (1–2): 2–25 mil / 520 mil = 0,4–4,8%. I-cont 1. I-legal 2 (1–2). V-cont 3 (bateas probadas en A; C y D sin batea). V-rec 2.
- C_pers = 5×2×3 = 30.

### S34-R03 · Falla de la bomba de alta presión de un tren (mina A)
- **Contrastes / reglas:** C32, C19, C09; §5.2 (bomba de reserva probada en banco en 2023: presente sin prueba), §4.4 (50% = interrupción).
- **Niveles:** P 4 (4–5): fallas 2023 y 2025; vibración en aumento (+1 posible). I-econ 3 (2–4): 77 + 15 = 92 mil / 520 mil = 18%; con bomba destruida ≈ 0,39 M = 75%. I-cont 3 (2–4): 50% durante 3–6 días. I-pers 1. I-legal 1. V-cont 2. V-rec 3.
- C_econ = 4×3×3 = 36; C_cont = 36.
- **Faltante deliberado:** horas de los rodamientos del tren 1: **deja evaluable** (P ya fijado por la historia).

### S34-R04 · Vertido de efluente de la bodega C fuera del permiso
- **Contrastes / reglas:** C13 (titular del permiso es el cliente; atribución contractual discutida), C05 de costado, C23 de costado (vendimia), §4.5 (¿Legal de la empresa sin permiso propio?).
- **Niveles:** P 5 (excesos de autocontrol en 2024, 2025 y 2026). I-econ 3 (2–5): multa duplicada 10–160 mil (2–31%); suspensión de 20 días atribuida a la empresa ≈ 420 mil (81%); tope 525 mil + multa (> 100%). I-cont 1 (1–2). I-pers 1. I-legal 2 (1–3). V-cont 2 (2–3): pileta probada en real 2026-03. V-rec 3 (3–4).
- C_econ = 5×3×3 = 45.
- **Anomalías:** A6 (organización de referencia y atribución), A1 en I-econ y I-legal.

### S34-R05 · Rescisión del contrato por el cliente minero A
- **Contrastes / reglas:** C09 (par de escala con S32-R03), C13; §4.2 (pérdida > RO), §4.4.
- **Redacción:** la cobertura decía "pérdida de un contrato"; se fijó en el cliente A para no generar un caso de granularidad ambigua (C25 está fuera de esta tanda).
- **Niveles:** P 3 (2–4): licitación del cliente con adjudicación 2026-12; nunca hubo rescisión anticipada. I-econ 5 (4–5): margen 0,56 M + indemnizaciones 0,08 M ≈ 0,64 M / 0,52 M = 123%; por incumplimiento suma 0,37–0,67 M. I-cont 4 (3–5): 36% del servicio perdido de forma definitiva (degradación). I-pers 1. I-legal 1. V-cont 4 (preaviso nunca invocado). V-rec 4 (propuestas con tasa de cierre de 1 en 4).
- C_econ = 3×5×4 = 60. Bandera `consecuencia_extrema`.
- **Anomalías:** A11 (Continuidad frente a Económico), A8 posible.

### S34-R06 · Escape de cloro gas en la sala de cloración
- **Contrastes / reglas:** C03 de costado, C22 de costado (`v_rec = no_aplica` frente a la bomba de respaldo), C13 (personas del campamento del cliente).
- **Niveles:** P 4 (escape 2025-05). I-pers 3 (3–4): internación del operador o irritación de 120 personas; un fallecido sectorial con operador solo de noche (7 de 48 cambios hechos por una persona). I-econ 1. I-cont 1. I-legal 2 (2–3). V-cont 3 (3–4): detector con pruebas atrasadas; un solo equipo autónomo; brigada probada 2025-09. V-rec `no_aplica` (1 si el evaluador cuenta la bomba de respaldo como recuperación de la cloración).
- C_pers = 4×3×3 = 36.
- **Anomalías:** A11 o A1 en V-rec.

---

## Faltantes deliberados por alcance (resumen)

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S32-R06 | Registro de robos, estadística sectorial, registros de la operadora | **No deja evaluable** (P `unknown`) |
| S34-R01 | Contrato firmado con el cliente B (tope de responsabilidad) | **No deja evaluable** (cota de I-econ > C_raw) |
| S31-R05 | Estudio hidrogeológico (conexión con la localidad) | Deja evaluable (cota de I-pers ≤ C_raw de Legal; frágil si Legal baja a 3) |
| S31-R06 | Kilómetros 2023 y de contratistas | Deja evaluable |
| S33-R02 | Certificado de granizo del lote B | Deja evaluable |
| S33-R04 | Daños posibles al viñedo lindero | Deja evaluable (I-econ 3–4) |
| S33-R06 | Situación del fabricante del lote B | Deja evaluable (V-rec 4–5) |
| S34-R03 | Horas de los rodamientos del tren 1 | Deja evaluable |

Otros faltantes escritos en las fichas (S31-R01, R02, R03; S32-R01 a R05; S33-R03; S34-R01 segundo punto) son incidentales y no cambian niveles.

## Riesgos corrientes (C19) de cada empresa
- **S31:** S31-R02 (derrames de líneas) y S31-R06 (incidentes viales).
- **S32:** S32-R04 (incendio de equipo) y S32-R05 (lesiones en maniobras); también S32-R02.
- **S33:** S33-R02 (granizo) y S33-R05 (robo de cable).
- **S34:** S34-R02 (derrame de químicos) y S34-R03 (falla de bomba).

## Ajustes de escala respecto de la cobertura
- S31: facturación USD 903 M (diseño 900), RO USD 252 M (≈ 250), 1.800 personas (620 propias, 1.180 de contratistas).
- S32: facturación USD 61,0 M (60), RO USD 5,2 M (≈ 5), 400 personas.
- S33: facturación USD 14,1 M (14), RO USD 7,2 M (≈ 7), 25 personas; 100 MW con 117,7 MWp.
- S34: facturación USD 5,1 M (5), RO USD 0,52 M (≈ 0,5), 35 personas, 4 clientes.

## Riesgos del diseño que no se sostienen (para que decida Emiliano; no se cambió el conjunto)
- **S33-R03 (restricción de despacho):** es una sucesión de órdenes chicas; la unidad del evento (cada orden o el año) decide I-econ, y nada de la empresa actúa después del evento. Se sostiene como prueba de A6/A8, pero su consecuencia por orden es menor que la de un riesgo corriente.
- **Regla de degradación de §4.4 en S33 (R02, R04, R06):** con la letra de v0.1, perder 4% de la potencia más de 3 meses da I-cont 4, igual que perder la mitad de la planta; es un problema de metodología, no del diseño, pero va a dominar el ranking de S33.
- **S32-R03 y S34-R05 (pérdida de contrato):** Continuidad no tiene una lectura clara cuando la capacidad sigue disponible y falta el cliente; se mantienen porque prueban C09/C13, pero se esperan divergencias que no dicen nada del dato.
- Títulos reescritos con el evento iniciador (§8.4): S31-R03 (de "accidente de un trabajador de contratista" a rotura de línea), S32-R01 (de "accidente con un equipo móvil" a caída del mástil), S34-R05 (de "pérdida de un contrato" a rescisión del cliente A).

## Avisos de la Fase 5 aplicados (2026-10-06)
Se agregaron a las 24 fichas: una línea de comparación con comparables o el sector (o que no se sabe) en controles preventivos; en las que citan costos de eventos pasados, si son brutos o con la respuesta actuando; verificación en los últimos 12 meses de barreras pasivas (muro cortafuego de S33-R01, retención de líneas de S31-R03, bateas de S34-R02). Cambios de hechos que tocan la intención:
- S31-R02: se agregó el volumen bruto sin detección (hasta 600 m³ en el troncal); aun a USD 2–3 M, I-econ sigue en 1. Sin cambio de niveles.
- S31-R01: la certificación del personal (81%) queda debajo del promedio informado por la cámara (92%): refuerza el +1 de P; P sigue en 2 (1–3).
- S32-R03: TRIR promedio de los contratistas de A en 2025 (1,2) frente al de la empresa: refuerza P 3 (3–4).
- S33-R01: 9 de 14 parques comparables tienen monitor de gases en línea; esta empresa no: refuerza el +1 de P; P sigue en 2 (1–3).
Ningún nivel pretendido cambia.
