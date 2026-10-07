# Intención de diseño · EMI-41 · familia Industria y construcción

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: industria-a, industria-b. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda industria-a -->

# Intención de diseño · Industria y construcción, tanda A (S02, S05, S22)

**No abrir antes de la comparación de la Fase 8.**

> Tanda industria-a · Fase 7 de EMI-41 · 2026-10-06 · niveles pretendidos **según metodologia v0.1**. Fichas en `v0/emi41/fichas/S02`, `S05`, `S22` (26 fichas: S02 7, S05 9 más el padre, S22 10). Fecha de corte de los hechos: 2026-09-30.

Convenciones: P, Ie (económico), Ip (personas), Ic (continuidad), Il (legal), Vc (contención), Vr (recuperación). `a–b` = rango pretendido con el primer valor como plausible cuando se indica "(plausible x)". "techo" = `<f>_max` pretendido.

Avisos de la Fase 5 (`v0/fase-5/avisos-fase-7.md`) aplicados a todas las fichas: margen por línea o por obra, montos de antecedentes marcados como brutos o con respuesta, verificación de barreras pasivas en 12 meses, comparación con comparables (o "no hay datos"), frecuencia anual observada. No cambian ningún nivel pretendido.

---

## S02 · Industria metalmecánica

**Magnitud de referencia:** RO 2025 = USD 1,52 M (positivo, sin partidas extraordinarias). Cortes: 2% = 30 mil; 10% = 152 mil; 30% = 456 mil; 100% = 1,52 M. Margen de contribución conocido (32,2%; piezas de la PH-800 34%).

**Contrastes y cómo los cubre.**
- C03: R01, R02, R03 (operarios en zona de prensa, bajo cargas, nave con 65 personas).
- C06: una sola nave y una sola prensa de 800 t (R03, R05).
- C19: R04, R06, R07.
- C22: R01 y R04 (lesión sin interrupción: `v_rec = no_aplica`).
- C24: R01 (barrera fotoeléctrica y mando bimanual son preventivos → P; parada de emergencia → V), R02 (test de la barrera: "no pasar bajo la carga" es barrera → V, no exposición → I), R03 (rociadores, detección, separación → V; permiso de trabajo en caliente → P), R05 (parada automática por sobrepresión → V).
- De costado: C02 (R04, R06), C13 (R07 cliente y acería; R06 distribuidora), C10 (transferencia con regla proporcional, exclusión de pérdida de beneficio por rotura de maquinaria y por corte externo).
- **C25 en esta empresa: R07** (ver su entrada).

### S02-R01 · Atrapamiento de un operario en una prensa
- **Tensiona:** C03, C22, C24 (corte P/V entre mando bimanual/barrera y parada de emergencia); umbral de Ip para `safety_critical`.
- **Pretendido:** P 3 (3–4; jerarquía 1: 0,9/100 × 26 operadores ≈ 23% → 3; propio 2021 > 3 años → 3; +1 posible por condición nueva: cuña en el bimanual 2026-06 y pedal habilitado). Ie 2 (1–2; reclamo civil USD 85 mil + multa 14 mil + internos 6 mil ≈ USD 105 mil / 1,52 M = 6,9%; el seguro no resta). Ip 4 (amputación = daño irreversible; techo 4–5 por cambio de matriz en la PH-800, una persona → 4). Ic 1. Il 3 (3–4; acta, multa, clausura de máquina; causa penal posible empuja a 4). Vc 4 (3–4; paradas probadas pero no evitan la amputación; sin rescate ensayado ni conservación del miembro). Vr no_aplica.
- **Anomalías esperadas:** A11 si un evaluador carga la barrera fotoeléctrica en V; A1 en Il (3 frente a 4).
- **Faltantes:** uso del pedal; simulacro de rescate → ambos dejan evaluable.

### S02-R02 · Caída de una carga desde el puente grúa
- **Tensiona:** C24 (test de la barrera, §2.3): personas bajo la carga. La regla de no pasar es una medida que, si falla, deja la consecuencia → barrera → V; I-pers bruto con persona debajo.
- **Pretendido:** P 4 (propio 2023-05 dentro de 3 años; precursores crecientes). Ie 2 (2–3; celda robotizada USD 60–120 mil + multa → 5–10%). Ip 4. Ic 3 (2–3; celda 3–6 semanas pero sólo 35% de la soldadura de chasis → degradación, un nivel abajo). Il 3 (3–4). Vc 4. Vr 3.
- **Anomalías esperadas:** A11 (exposición frente a barrera); A1 en Ip si alguien baja Ip por "nadie debajo" en la mayoría de izajes.
- **Faltante:** izajes con personas debajo salvo auditoría de un día → deja evaluable.

### S02-R03 · Incendio en la nave iniciado en el sector de soldadura
- **Tensiona:** C06, C24 (rociadores sólo en cabina, detección sólo en oficinas → V), concentración de activos en una nave; C10 de costado (regla proporcional, sublímite de pérdida de beneficio).
- **Pretendido:** P 4 (igniciones 2019 y 2023; la de 2023 dentro de 3 años; hallazgos de combustibles en aumento). Ie 5 (bruto: nave y equipos USD 13,65 M + margen 14–18 meses ≫ RO). Ip 3 (3–4; 65 personas despiertas, 4 salidas). Ic 5 (> 3 meses). Il 3 (2–4; suspensión de habilitación de la nave es consecuencia física, no sanción). Vc 4 (3–4; extintores probados en actuación real 2023, pero red a 2,1 bar y sin detección ni rociadores en la nave). Vr 4 (4–5; sólo conversación no escrita).
- **Anomalías esperadas:** A1 en Ip, Il y Vr; A3 si queda por debajo de riesgos frecuentes.
- **Faltantes:** daño de 2019; estudio de carga de fuego → dejan evaluable.

### S02-R04 · Proyección de partículas a los ojos en el amolado
- **Tensiona:** C19, C02, C22.
- **Pretendido:** P 5 (7 a 11 por año). Ie 1. Ip 2 (techo 3: córnea 2022, 21 días). Ic 1. Il 1. Vc 3 (lavaojos con una estación con caudal bajo; enfermería sólo turno mañana). Vr no_aplica.
- **Anomalías esperadas:** A8 si queda por encima de R03 o R05.
- **Faltante deliberado:** días de baja de 2023 → **deja evaluable** (no cambia P ni Ip).

### S02-R05 · Rotura de la prensa hidráulica principal
- **Tensiona:** C06, escenario plausible frente a peor creíble por modo de falla; C24 (parada automática y stock → V); exclusión de pérdida de beneficio por rotura de maquinaria (C10 de costado).
- **Pretendido:** P 4 (4–5; 2025-02 dentro de 3 años; +1 posible por aceite contaminado, vibración y mantenimiento atrasado). Plausible = falla hidráulica (bomba o válvula, 1–3 semanas): Ic 4 (3–5; techo 5 con cilindro 14–18 semanas). Ie 3 (3–4; 2 semanas: margen USD 89 mil + reparación 15–60 mil + penalidades ≈ USD 150–180 mil = 10–12%; cilindro: 715 + 310 + 224 ≈ 1,25 M = 82% → techo 4). Ip 1. Il 1 (1–2). Vc 3. Vr 3 (3–4; estampado tercerizado usado en 2022-05, > 3 años → presente sin prueba; 40% del volumen).
- **Anomalías esperadas:** A1 en Ie e Ic por el modo plausible.

### S02-R06 · Corte del suministro eléctrico de la red
- **Tensiona:** C19, C02 de costado, C13 de costado (tercero que la empresa no controla: P sin controles preventivos propios).
- **Pretendido:** P 5 (4 a 7 por año). Ie 1 (1–2; corte de 19 h: USD 16,2 mil con recuperación, 18,9 mil + lote sin ella → 1,1–1,5%). Ic 1 (cortes < 1 día; el de 19 h → 1). Ip 1. Il 1. Vc 4 (grupo sólo para servidores). Vr 2 (2–3; sábados de horas extra probados en 2024-12 y 2025-01).
- **Faltante deliberado:** cortes anteriores a 2023 y costo de los de 2023 y 2025 → **deja evaluable** (3,75 años de registro ya muestran frecuencia anual).

### S02-R07 · Incumplimiento de una entrega al cliente principal (**C25**)
- **Tensiona:** **C25, granularidad ambigua en lista fija.** La redacción mezcla, de forma deliberada y creíble (así lo escribiría una empresa), dos causas con P y V distintas: (a) falta de chapa de la acería única (6 de 10 atrasos; P 5; recuperación por importador alternativo a 6–8 semanas, probado 2025-11) y (b) atraso de producción propia por capacidad de soldadura o paradas de la PH-800 (4 de 10; P 4–5; recuperación por horas extra con tope de convenio, falló en 2026-08, o por estampado tercerizado sin prueba). Por metodología §1.3.3–1.3.4 debería ser un padre con sub-riesgos; la lista fija lo trae simple. También se solapa con S02-R05 (las penalidades por parada de la PH-800 aparecen en ambos). C19, C13 de costado.
- **Pretendido:** P 5. Ie 2 (penalidad tope USD 28 mil + horas extra, flete y sobreprecio ≈ USD 50 mil = 3,3%; techo 5 por rescisión del cliente A: margen ≈ USD 2,4 M/año = 158%, ya hay 2 de 3 atrasos > 10 días en 12 meses). Ip 1. Ic 1. Il 2. Vc 3. Vr 3 (3–4; según la causa).
- **Anomalías esperadas:** **A7** (mezcla de causas y solapamiento con R05) en ambos evaluadores; A1 en Vr y en Ie (si toman la rescisión como plausible); posible A6 (rescisión como decisión de un tercero).
- **Faltante:** atrasos anteriores a 2024 → deja evaluable.

---

## S05 · Obras múltiples

**Magnitud de referencia:** RO 2025 = USD 5,0 M (positivo, sin partidas extraordinarias; 2024 tiene USD 0,6 M extraordinario). Cortes: 2% = 100 mil; 10% = 500 mil; 30% = 1,5 M. Margen de contribución conocido (14,1%).

**Ajuste de escala:** los montos de contrato de las cuatro obras (USD 34 M, 11 M, 48 M y 9 M) y dos obras terminadas en 2025 (USD 19 M certificados) se fijaron para que la facturación de USD 70 M cierre con la certificación mensual. Dotación: 450 propios; subcontratistas 300 estimados / 212 en nóminas con ART / 131 en el molinete de la obra 1 (frente a 110 estimados).

**Contrastes y cómo los cubre.**
- C03: P01 (3 sub-riesgos), R04, R05, R06.
- C13: R05 (peatones), R06 (trabajadores de subcontratistas; ¿a quién se atribuyen los controles?), R09 (vecinos).
- C16: P01 con tres causas en tres obras, con P y V distintas.
- C19: R06, R07, R08.
- C27: la exposición cambia con la obra y el día (subcontratistas con dotación no determinada; altura de la estructura que sube; obras con fecha de fin).
- De costado: C18 (sin cobertura de linderos en la obra 4; robo sólo con violencia y deducible mínimo USD 10 mil; RC patronal no cubre solidaria), C10.

### S05-P01 · Caída de un trabajador desde altura (padre)
- **Tensiona:** C16, prioridad por sub-riesgo determinante (§1.4) e invariancia de granularidad.
- **Determinante pretendido:** S03 (obra vial) por contención: P 3 × Ip 4 × Vc 5 = 60, frente a S01 (4 × 4 × 3 = 48) y S02 (3 × 4 × 4 = 48). Si un evaluador lleva Vc de S03 a 4 y P de S01 a 4 con Vc 4, el determinante cambia: divergencia esperada (A1, A4).

### S05-P01-S01 · Edificio en altura
- **Pretendido:** P 4 (2024-11 en otro edificio de la empresa, dentro de 3 años; jerarquía 1: 1,1/100 × 45 ≈ 40% → 4). Ip 4. Ie 2 (paralización 3–8 días × USD 13,8 mil + multa 35–80 mil + civil ≈ USD 210 mil → 300–400 mil = 6–8%). Ic 2 (2–3; obra 1 = 26% de la certificación, degradación). Il 4 (paralización de obra y causa penal posible). Vc 3 (3–4; red a 3 pisos debajo, arnés 64%, rescate probado). Vr 2 (2–3; reanudación probada en 2024).
- **Anomalías esperadas:** A11 (arnés y red: ¿P o V? el evento es la caída, actúan después → V).

### S05-P01-S02 · Nave industrial
- **Pretendido:** P 3 (3–4; propio 2022-10 > 3 años; jerarquía 1: 1,6/100 × 16 ≈ 26% → 3; precursor 2026-09). Ip 4. Ie 2. Ic 2. Il 4. Vc 4 (4–5; sin red, sin plan de rescate, 38 min). Vr 3.

### S05-P01-S03 · Obra vial
- **Tensiona además:** C27 y faltante de dotación; fuentes que divergen (jerarquía 1: 0,4/100 × 8–14 = 3–6% → 1–2; comparable cercano 2023 → 3; precursores propios → 3).
- **Pretendido:** P 3 (2–3). Ip 4. Ie 2 (multa vialidad 48 mil + paralización + solidaria). Ic 2 (2–3; obra 3 = 45%). Il 4. Vc 5 (4–5; puente 2 sin anclaje, sin red, sin rescate, 52 min, sin señal). Vr 3.
- **Faltante deliberado:** cuántos trabajadores del subcontratista trabajan en altura y cuántas horas → **deja evaluable** (Ip no depende; P queda en 2–3).

### S05-R04 · Derrumbe de una excavación en la obra vial
- **Pretendido:** P 4 (2026-02 en la obra 3). Ip 4 (4–5; 2 a 4 personas en la zanja: más de una muerte posible como techo). Ie 2. Ic 2 (2–3). Il 4. Vc 5 (4–5; rescate a pala, sin plan, 52 min). Vr 2 (2–3).
- **Nota:** el título se acotó a la obra vial (única con excavaciones abiertas con personas dentro en el horizonte) para no crear una segunda granularidad ambigua.

### S05-R05 · Caída de una carga de la grúa torre sobre la vía pública
- **Tensiona:** C13 (terceros), C03; exposición de público que cambia con la hora.
- **Pretendido:** P 4 (2025-06 objeto fuera del predio dentro de 3 años; 14/120 izajes sobre la calzada). Ip 4 (4–5; 30 peatones por minuto en pico: más de una muerte como techo). Ie 3 (2–3; indemnizaciones 150–400 mil por persona + paralización 2–4 semanas ≈ 200 mil + multa hasta 100 mil + multa contractual → USD 500–900 mil = 10–18%). Ic 3 (2–3). Il 4. Vc 4 (pasarela probada sólo hasta 25 kg; nada contiene una carga de 1 t). Vr 3.

### S05-R06 · Accidente de un trabajador de un subcontratista
- **Tensiona:** C13 (a qué organización se atribuyen P, I y V: A6), C27, solapamiento con P01 y R04 (A7 posible, no buscado como C25).
- **Pretendido:** P 5 (12 a 19 informados por año). Ip 3 (2–4; plausible: lesión con baja; techo 4). Ie 1 (1–2; solidaria con ART vencida). Ic 1. Il 2 (2–4). Vc 3 (3–4). Vr no_aplica.
- **Faltante deliberado (pedido por la cobertura):** dotación real de subcontratistas (212 / 300 / molinete) y accidentes no informados → **deja evaluable** (P es 5 con cualquier dotación del rango).

### S05-R07 · Robo de materiales y herramientas en obra
- **Pretendido:** P 5 (9 a 14 por año). Ie 1 (máximo USD 22 mil = 0,4%). Ic 1. Ip 1. Il 1. Vc 4 (3–4). Vr 2 (1–2).
- **Anomalías esperadas:** A8 si queda por encima de riesgos de personas.

### S05-R08 · Atraso de la obra de la escuela con multa contractual
- **Tensiona:** C19; evento ya en curso (A6 posible: ¿el evento es el atraso actual o el vencimiento del 2026-12-15?).
- **Pretendido:** P 5. Ie 2 (24–57 días × USD 4,5 mil = 108–257 mil + aceleración 140 mil ≈ 5–8%; techo 3 con tope de USD 900 mil = 18%). Il 2 (2–3). Ic 1. Ip 1. Vc 4 (ampliación y suspensión sin prueba). Vr 3 (3–4; plan de aceleración presente sin prueba).
- **Nota:** el título se acotó a la obra 4, la única con atraso y multa en curso.

### S05-R09 · Daño a una construcción lindera
- **Tensiona:** C13 (vecinos), C11 (información incompleta), C18 de costado (sin cobertura de linderos en la obra 4).
- **Pretendido:** P 3 (3–4; propio 2019 > 3 años; fisuras 2026-05 en otro lindero; comparables 6/41). Ip **unknown** (1–5: de fisuras sin personas a derrumbe parcial con 5 ocupantes, dormitorios contra la medianera). Ie **unknown** (1–4: USD 5 mil = 0,1% a reconstrucción + realojamiento + indemnizaciones > USD 0,5 M). Ic 2 (2–3; paralización de la obra 4, 12% de la certificación). Il 3 (3–4). Vc 4 (monitoreo no instalado; apuntalamiento probado en 2019; sin protocolo de evacuación). Vr 3.
- **Evaluabilidad pretendida:** **no evaluable** (§9.3: la cota de Ip con máximo 5 supera el `C_raw` de las dimensiones conocidas).
- **Faltante deliberado:** estado de la vivienda lindera y tipo, profundidad y estado de su fundación → **no deja evaluable**. Además, `safety_critical` por `i_pers_max ≥ 4` (§8.2).

**Riesgos corrientes (C19) de S05:** R06, R07, R08.

---

## S22 · Productos químicos industriales

**Magnitud de referencia:** RO 2025 = USD 6,2 M (positivo, sin partidas extraordinarias; 2023 tiene USD 0,3 M). Cortes: 2% = 124 mil; 10% = 620 mil; 30% = 1,86 M. Margen de contribución conocido por línea (A 510 mil/mes, B 660 mil/mes, C 330 mil/mes; 72 mil por día hábil). **Ninguno de los faltantes es la escala económica.**

**Contrastes y cómo los cubre.**
- C01: R02 (cloro con barrio a 140 m; P baja por estadística sectorial, Ip 5), R01.
- C03: R01, R02, R04, R05.
- C05: R03, R08 (régimen ambiental con reincidencia y clausura del vertido), R02.
- C06: una sola planta, un solo depósito de solventes, un solo reactor principal (R01, R06, R07).
- C10 y C18: TRO con deducible de USD 100 mil, sublímite de pérdida de beneficio USD 6 M a 9 meses, inundación con deducible del 10% mínimo 250 mil y sin pérdida de beneficio, exclusión de contaminación gradual y de corrosión; RC con sublímite de contaminación súbita USD 1 M y exclusión de responsabilidad contractual. Nada de eso entra en I ni en V.
- C13: vecinos y escuela (R02), arroyo y regantes (R03, E01), choferes externos (R04), clientes (R09).
- C17: E01 (lluvia intensa → R07 + R03).
- C19: R03, R04, R05.
- C22: R04 y R05 (lesión sin nada que restablecer). R08 **no** es sanción pura: la clausura del vertido deja algo que restablecer (transporte de efluente), de modo que `v_rec = no_aplica` sería un error.
- C24: R01 (espuma, detección, muro cortafuego → V; puesta a tierra → P), R06 (cubeto y trasvase → V).
- C26: R09 (daño en instalaciones del cliente).
- De costado: C02 (R04, R05), C09 (incendio y rotura de equipo con par de escala en otras empresas de la familia), C11 (espesor del reactor, muestreo pendiente).

### S22-R01 · Incendio en el depósito de solventes inflamables
- **Pretendido:** P 3 (3–4; propio 2020 > 3 años; comparables 2 en 10 años; +1 por luminarias no Ex y puestas a tierra fallidas). Ie 5 (4–5; depósito e inventario USD 2,9 M + línea A 6–8 meses 3,1–4,1 M → 6,0–7,0 M = 97–113%). Ip 4. Ic 5 (línea A, función crítica, 6–8 meses). Il 3 (3–4). Vc 3 (3–4; detección probada, espuma con boquilla tapada y 2,1%, puerta trabada abierta en 2026-08). Vr 4 (4–5; contactos sin contrato).
- **Anomalías esperadas:** A10 o A11 si se cargan espuma o muro en P; A1 en Ie (cerca del corte de 100%).

### S22-R02 · Liberación de cloro gaseoso durante la descarga de una cisterna
- **Tensiona:** C01 (P baja con Ip 5), C03, C13, C05; divergencia entre jerarquía 1 (cámara: 3/9.000 × 24 ≈ 0,8% → 1, aunque mide "con lesionados") e historia propia (2021, > 3 años → 3).
- **Pretendido:** P 2 (1–3; precursores: flexible vencido y prueba de hermeticidad omitida). Ip 5 (rotura del flexible: 20 ppm hasta 450 m con cierre a 60 s, 2,8 km sin cierre; barrio y escuela dentro). Ie 5 (4–5; clausura 7 semanas ≈ USD 2,5 M + indemnizaciones a terceros). Ic 4 (4–5). Il 4 (4–5). Vc 4 (3–4; válvulas de cierre probadas, exceso de flujo sin prueba, sin plan con la comunidad). Vr 3 (2–3; reventa de hipoclorito 2023-04, dentro de 3 años, 60%).
- **Anomalías esperadas:** A3 (consecuencia extrema con P baja), A1 en P (divergencia de fuentes), `consecuencia_extrema` y `safety_critical`.
- **Faltantes:** prueba de la válvula de exceso de flujo; estudio con población actual → dejan evaluable (Vc 3–4).

### S22-R03 · Derrame de producto al desagüe pluvial y al arroyo
- **Pretendido:** P 4 (2023-10 dentro de 3 años; 7 a 11 derrames por año en la playa como precursores). Ie 2 (2–3; multa con reincidencia + remediación 60–150 mil ≈ 2–5%). Ip 1. Ic 1. Il 3 (3–4; sumario, plan de remediación; techo 4 si llega al canal de riego). Vc 3 (3–4). Vr 2 (2–3; consultora actuó en 2023).
- **Faltante deliberado:** usos del arroyo aguas abajo y caudal en estiaje → **deja evaluable** (Il en 3–4).

### S22-R04 · Accidente con autoelevador en la playa de carga
- **Pretendido:** P 5 (1 a 3 accidentes con lesión por año, 14 a 19 cuasi-accidentes). Ip 3 (3–4; fractura con 24 días; atropello de un chofer como techo). Ie 1. Ic 1. Il 2. Vc 3 (3–4). Vr no_aplica.
- **Faltante deliberado:** cuasi-accidentes y choques anteriores a 2025 → **deja evaluable**.

### S22-R05 · Lesiones por contacto con producto corrosivo en el envasado
- **Pretendido:** P 5 (4 a 8 por año). Ip 2 (2–3; ocular 2024 con 30 días y recuperación completa). Ie 1. Ic 1. Il 1. Vc 2 (2–3; duchas probadas semanalmente, enfermería). Vr no_aplica.

### S22-R06 · Rotura del reactor de mezcla principal
- **Pretendido:** P 4 (3–4; fisura de camisa 2024-11 dentro de 3 años; picado 2026-05). Plausible = perforación reparable o fisura (1–6 semanas): Ic 4 (3–5; techo 5 con reactor nuevo 9–11 meses). Ie 3 (3–5 como techo; 4 semanas: 660 mil + 120 mil = 12,6%; reactor nuevo: 6,6 + 1,4 M = 129%). Ip 1. Il 1. Vc 2 (cubeto y trasvase probados). Vr 3 (2–3; R-2 y R-3 probados en 2024-11 con 35%; façon sin uso).
- **Faltante deliberado:** espesor de pared posterior a 2019 → **deja evaluable** (P en 3–4).
- **Anomalías esperadas:** A1 en Ie e Ic (modo plausible).

### S22-R07 · Inundación del predio por desborde del arroyo
- **Pretendido:** P 3 (2–3; propio 2015 > 3 años; precursor 2024-02; entubamiento de 2021 como condición nueva +1 posible). Ie 4 (daño USD 1,31 M + margen 6–10 semanas 2,2–3,6 M ≈ 3,5–4,9 M = 56–79%). Ic 4. Ip 1 (1–2). Il 1 (1–2). Vc 4 (4–5; plan nunca ensayado, compuertas nunca colocadas, bombas dependen del tablero). Vr 4 (4–5).
- **Faltante:** estudio hidrológico → deja evaluable.

### S22-R08 · Sanción por incumplimiento de la habilitación ambiental de vertidos
- **Tensiona:** C05 (Legal con ancla de clausura temporal; multa a Económico), C22 por contraste (no es sanción pura).
- **Pretendido:** P 4 (4–5; acta 2025-09; 2 de 8 muestras propias de 2026 fuera de límite; muestreo oficial pendiente). Ie 3 (2–3; multa 50–500 mil, plausible ≈ 100 mil + transporte de efluente USD 12,6 mil/día durante 60–90 días ≈ 0,9–1,2 M = 14–19%). Il 4 (clausura preventiva del vertido). Ic 4 (3–4; bruto sin transporte: líneas B y C detenidas hasta cumplir). Ip 1. Vc 4 (3–4). Vr 3 (transporte usado en 2022-07, > 3 años → presente sin prueba; cupo 100 de 140 m³).
- **Faltante deliberado:** resultado del muestreo oficial del 2026-08-20 → **deja evaluable** (P 4–5 con o sin él).
- **Anomalías esperadas:** A11 si alguien pone `v_rec = no_aplica`; A1 en Ic.

### S22-R09 · Venta de un lote fuera de especificación que daña instalaciones de un cliente
- **Tensiona:** C26 (consecuencia en el cliente: qué parte es de la organización; evento = despacho, no el daño), C13.
- **Pretendido:** P 3 (3–4; propio 2022-06 > 3 años; lotes rechazados y certificados sin titulación). Ie 2 (2–3; intercambiador 150–250 mil + pérdida de producción del cliente + retiro ≈ 3–6%). Ip 1. Ic 1. Il 2 (2–3). Vc 2 (2–3; trazabilidad probada 2026-03). Vr 2 (2–3).
- **Faltante deliberado:** cuántos lotes salen sin titulación → **deja evaluable** (P 3–4).
- **Anomalías esperadas:** A6 (evento iniciador: contaminación del lote o despacho).

### S22-E01 · Lluvia intensa que inunda el predio y arrastra producto al arroyo (miembros S22-R07; S22-R03)
- **Tensiona:** C17, criterio de creación (§10.2).
- **Plausible:** sí (2024-02: rebalse de la cámara con pH 9,8 en la salida con la misma causa; IBC en el piso de la zona inundable; válvula del pluvial en la parte más baja). **Material:** sí, Il conjunta 4 (clausura del establecimiento por vertido con reincidencia mientras la planta está inundada) frente a 1–2 (R07) y 3–4 (R03); Ie conjunta ≈ 1,31 + 3,6 + multa hasta 1 M + remediación 0,15 ≈ USD 6 M = 97% → 4–5.
- **Pretendido:** P 2 (2–3; una inundación del predio en 2015). Ie 4 (4–5). Ip 1 (1–2). Ic 4 (4–5 si la clausura se extiende). Il 4. Vc 5 (4–5; las medidas se estorban: válvula bajo el agua, bombas que vacían agua contaminada al arroyo, misma brigada). Vr 4 (4–5).
- **Anomalías esperadas:** A7 si un evaluador no sostiene la materialidad; A1 en P.

**Riesgos corrientes (C19) de S22:** R03, R04, R05.

**Riesgos corrientes (C19) de S02:** R04, R06, R07.

---

## Faltantes deliberados de la tanda, por alcance

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S02-R04 | Días de baja de 2023 | Deja evaluable |
| S02-R06 | Cortes anteriores a 2023 y costo de 2023 y 2025 | Deja evaluable |
| S05-P01-S03 | Trabajadores del subcontratista en altura por día | Deja evaluable |
| S05-R06 | Dotación real de subcontratistas; accidentes no informados | Deja evaluable |
| S05-R09 | Estado y fundación de la vivienda lindera | **No deja evaluable** (Ip e Ie unknown) |
| S22-R03 | Usos del arroyo aguas abajo | Deja evaluable |
| S22-R04 | Cuasi-accidentes anteriores a 2025 | Deja evaluable |
| S22-R06 | Espesor del reactor desde 2019 | Deja evaluable |
| S22-R08 | Resultado del muestreo oficial 2026-08-20 | Deja evaluable |
| S22-R09 | Lotes liberados sin titulación | Deja evaluable |

Los demás faltantes de las fichas (estudio de carga de fuego, simulacros, estudios hidrológicos, etc.) son incidentales y se pretende que dejen evaluable.

## Riesgos del diseño que no se sostienen

- Ninguno se cae. Dos títulos se acotaron sin cambiar el evento: S05-R04 a la obra vial y S05-R08 a la escuela (la cobertura los escribe genéricos; con las cuatro obras habrían sido una segunda granularidad ambigua).
- S05-R06 se solapa en parte con S05-P01 y S05-R04 (un trabajador de subcontratista que cae o queda sepultado está en ambos). Es del diseño aprobado; puede dar A7 no buscada.
- La cobertura pone C22 en S22; se cubre con R04 y R05. R08 no sirve para C22 porque la clausura del vertido sí deja algo que restablecer.


---

<!-- tanda industria-b -->

# Intención de diseño · EMI-41 · Industria y construcción · tanda industria-b (S23, S24, S25, S37)

No abrir antes de la comparación de la Fase 8.

> Fase 7 · construido 2026-10-06 · niveles pretendidos según **metodologia v0.1**. Fecha de corte de la información: 2026-09-30. Esta tanda cubre S23 (Autopartes Andinas S.A.), S24 (Plásticos del Oeste S.A.), S25 (Farmacéutica Regional S.A.) y S37 (fábrica de muebles a medida, ex E2). Ninguna ficha de esta tanda lleva C25.

Notación: P, I-econ, I-pers, I-cont, I-legal, Cont (contención), Rec (recuperación). `valor (min–max)`. Magnitud económica de referencia entre paréntesis en cada empresa.

---

## S23 · Autopartes Andinas S.A. (proveedor just-in-time) — RO 2025 USD 6,1 M, normalizado; margen de contribución 22%

**Contrastes y cómo los cubre:** C06 (una sola prensa transfer con 43% de la facturación, R02; nave de inyección única, R05) · C13 (terminales como clientes concentrados con penalidades, R02–R04; matrices y moldes de terceros en custodia, R05; usuarios de vehículos, R01; centro de servicio de acero, R03) · C26 (R01: el daño ocurre en vehículos del cliente y en usuarios) · C32 (R02, R03: la empresa abastece líneas de montaje de otras; penalidades por parada del cliente) · C19 (R03, R06) · de costado C09 (escala mediana frente a S37) y C18 (RC por producto que excluye la campaña de retiro; sublímite de bienes en custodia; rotura de maquinaria que excluye forros).

### S23-R01 · Piezas con soldadura de tuerca fuera de especificación que llevan a un retiro de vehículos
- **Contrastes y reglas:** C26 (§4.1.3 reparto entre Económico, Personas y Legal; §2.1 si el iniciador es la fabricación de la pieza defectuosa o el despacho/montaje); C13 (la campaña la decide la terminal: A6 sobre organización de referencia); C11 implícito por faltante; C18 de costado (exclusión de retiro).
- **Redacción:** el evento se escribió como "se producen piezas ... y se montan en vehículos", que junta fabricación y montaje: busca ver si el evaluador toma como iniciador la fabricación (ingreso del defecto al producto, §2.1.2) y si el ensayo de arrancamiento cada 2 h va a V (contención) y no a P.
- **Pretendido:** P 3 (3–4) — sin campaña propia; comparable regional 2023 y 4 campañas de proveedores nacionales en 5 años; precursores 2026-05 y 2026-07; +1 posible por mantenimiento atrasado. I-econ **unknown (2–5)**: mínimo 20% × USD 1,1 M = USD 0,22 M / 6,1 M = 3,6% → 2; máximo USD 12,2 M + 0,18 + 0,04 = USD 12,4 M / 6,1 M = 204% → 5. I-pers 3 (2–4): usuarios de vehículos, ningún desprendimiento en campo; el choque es una coincidencia adicional. I-cont 1. I-legal 3 (2–3). Cont 3 (3–4): bloqueo probado 2025-08 y contención en cliente 2024-03 (real), trazabilidad por turno sin uso; no alcanza piezas montadas. Rec 5 (4–5): nada repone el costo de la campaña.
- **Evaluabilidad pretendida:** no evaluable. C_raw conocido = max(Pers 3×3×3 = 27; Legal 27; Cont 1×…) = 27; cota de Econ = 3 × 5 × max(3, 5) = 75 > 27.
- **Faltante deliberado:** parte del costo que carga la terminal (comité de garantía sin criterio escrito) y período de la campaña → **no deja evaluable** (§9.2, §9.3).
- **Anomalías esperadas:** A2/A6 (organización de referencia, I-econ), A1 en I-pers (2 a 4), A11 sobre si el ensayo cada 2 h es P o V.

### S23-R02 · Falla del conjunto embrague-freno de la prensa transfer
- **Contrastes y reglas:** C06 (§4.4 Continuidad bruta con reposición de mercado 10–12 semanas), C32 (penalidades por parada del cliente dentro de Económico), §2.2.4 (stock de seguridad y bloqueo automático a V), §2.4.
- **Pretendido:** P 4 (4–5): falla 2024-10 en historia propia de 14 años; desgaste 62% y subida del tiempo de frenado; forros locales con vida de 22 meses (+1 posible). I-econ 4 (4–5): 11 semanas × USD 0,158 M = 1,74 M + penalidades con tope 3,0 M + reparación 0,455 M = USD 5,2 M / 6,1 M = 85%; sin penalidades USD 2,2 M = 36% → 4 igual; 5 si se cuenta la pérdida de las piezas por traslado de matrices. I-pers 1. I-cont 4 (función "estampado en la transfer" detenida 10–12 semanas). I-legal 1. Cont 3 (2–3): bloqueo y stock de 6 días, ambos con actuación real 2024-10. Rec 3 (2–3): adaptadores para 30% del volumen, prueba 2025-06 parcial y uso real 2024-10; reparación con forros locales en 8 días (real 2024-10) puede leerse como 2.
- **Anomalías esperadas:** A11 (el stock en consignación como contención o recuperación), A1 en Rec.

### S23-R03 · Interrupción de entregas del centro de servicio de acero
- **Contrastes y reglas:** C13 (proveedor; a qué organización se atribuyen los controles), C19 (corriente), §2.2.4 (stock a V).
- **Pretendido:** P 4 (3–4): 2023-09 y 2025-04 en los últimos 3 años; aviso de negociación salarial. I-econ 4 (3–4): bruto sin stock (V): 2 semanas × USD 0,227 M = 0,45 M + penalidades hasta 3,0 M = USD 3,45 M / 6,1 M = 57%; quien tome el stock como exposición baja a 2–3. I-pers 1. I-cont 3 (2–3): estampado 62% detenido 1–2 semanas. I-legal 1. Cont 2 (2–3): stock de chapa y piezas con actuación real 2023-09. Rec 3: segundo centro, 30% del tonelaje, real 2026-06.
- **Faltante deliberado:** stock del propio centro → **deja evaluable**.
- **Anomalías esperadas:** A11/A1 en I-econ por el stock (exposición o barrera, §2.3).

### S23-R04 · Rescisión del contrato de suministro por la terminal B
- **Contrastes y reglas:** C13, C32 de costado (dependencia de un cliente), §4.1.5 (consecuencia completa: pérdida permanente de un cliente).
- **Pretendido:** P 3 (3–4): precursores fuertes (etapa 2 desde 2026-05-30; con 120 PPM en septiembre no puede cumplir 3 meses bajo 100 antes del 2026-11-30; pedido de cotización a otro proveedor); sector sin denominador. I-econ 4 (4–5): 9 meses × USD 0,44 M = 3,97 M + indemnizaciones 1,3 M − ahorro 0,6 M = USD 4,7 M / 6,1 M = 77%; si se toma la pérdida permanente, ≥ 100% → 5. I-pers 1. I-cont 1 (1–2): no se detiene una función crítica. I-legal 1. Cont 4 (4–5). Rec 4 (4–5): cartera sin adjudicar, sin plan.
- **Anomalías esperadas:** A6 (horizonte de la consecuencia de una pérdida permanente), A1 en I-econ.

### S23-R05 · Incendio en la nave de inyección
- **Contrastes y reglas:** C06, C13 (moldes de las terminales en custodia: daño de terceros que paga la empresa), C18 de costado (sublímite de bienes en custodia USD 3,0 M frente a 4,0 M), §2.2.4 (muro cortafuego con portones abiertos, rociadores sólo en depósito: controles pasivos a V, que fallan en parte, §5.2).
- **Pretendido:** P 4 (3–4): igniciones 2021-07 y 2024-02 en registro de 11 años; precursores 2025–2026; mangueras vencidas. I-econ 5: USD 12,7 M + 4,0 M + 3,0 M + 0,6 M + 6 meses × 0,56 M = USD 23,7 M / 6,1 M = 388%. I-pers 3 (3–4): 30 personas en turno A sin detección en la nave; 4 puertas y 2 portones a ≤ 45 m. I-cont 5 (inyección 4–8 meses). I-legal 4 (3–4): clausura preventiva del sector. Cont 3 (3–4): hidrantes y brigada probados (2026-09, simulacro 2026-05, real 2024-02), sin detección en la nave, portones del muro abiertos. Rec 4 (4–5): 5 de 38 moldes con duplicado, sin acuerdos, sin plan.
- **Anomalías esperadas:** A1 en I-pers y Cont; A11 sobre el muro cortafuego (§2.3).

### S23-R06 · Atrapamiento de la mano de un operario en una prensa mecánica
- **Contrastes y reglas:** C19 (corriente), C03 de costado (§8.2 `safety_critical` por daño irreversible), C22 de costado (§5.5.2).
- **Pretendido:** P 4 (4–5): 2023-05 y 2025-02; cortina de la prensa 3 fuera de servicio y tiempo de parada de la prensa 4 sobre el límite (+1 posible). I-econ 1: USD 60 mil + 9 mil = 1,1% del RO. I-pers 4 (3–4): amputación de dedos o mano = incapacidad permanente → `safety_critical`. I-cont 1. I-legal 3 (3–4). Cont 3 (3–4): parada de emergencia probada; emergencias real 2025-02 en 14 min; liberación nunca ensayada; sin protocolo de amputación. Rec **no_aplica** (2 si el evaluador cuenta la prensa detenida 1–5 días).
- **Anomalías esperadas:** A1 en I-pers (3 o 4) y en Rec (`no_aplica` o 2).

---

## S24 · Plásticos del Oeste S.A. (inyección y extrusión) — RO 2025 USD 2,1 M, normalizado; margen de contribución 28%

**Contrastes y cómo los cubre:** C03 (R01 personas en depósito y nave expuestas a humo; R02 atrapamiento con cuerpo entero en inyectoras grandes) · C06 (nave única; línea de coextrusión única, R03) · C26 (R04, envase no apto en alimento del cliente) · C19 (R05, R06, R03) · de costado C02 (R05 cortes de luz, R06 quemaduras) y C18 (incendio a valor histórico con prorrata: USD 8,5 M asegurados frente a USD 23,6 M; RC con sublímite de productos y exclusión de retiro).

### S24-R01 · Incendio en el depósito de materia prima y producto terminado
- **Contrastes y reglas:** C03 (§4.3 número plausible de víctimas; §5.5 contención como V de Personas), C06, C18 de costado (infraseguro: no entra en I ni V, D17), §2.2.4 y §5.2 (detectores con 4 de 22 sin respuesta; bomba sin respaldo: medidas que fallan en parte).
- **Pretendido:** P 4 (3–5): ignición 2024-07 en los últimos 3 años; garrafas dentro y 2 observaciones eléctricas abiertas (+1); LED desde 2024-09 (−1 para esa causa). I-econ 5: sólo el depósito USD 4,75 M + 1 mes de parada 0,58 M + limpieza 0,3 M = USD 5,6 M / 2,1 M = 268%. I-pers 4 (3–5): 7 personas en depósito y 44 en producción expuestas a humo denso y tóxico sin rociadores; una muerte plausible → `safety_critical`. I-cont 5 (10–15 meses si alcanza la nave; 2–4 semanas si no). I-legal 4 (3–4). Cont 4 (3–4): detección parcial sin aviso externo, sin rociadores, hidrantes probados pero dependientes de energía, brigada sin ejercicio con hidrantes desde 2023; evacuación probada (simulacro 2025-11). Rec 5 (4–5).
- **Anomalías esperadas:** A1 en I-pers y Cont; A5 entre Personas 4 y Económico 5.

### S24-R02 · Atrapamiento de un operario entre los platos de una inyectora
- **Contrastes y reglas:** C03 (§2.3 test de la barrera: el enclavamiento es preventivo y va a P; §8.2), C22 de costado.
- **Pretendido:** P 4 (4–5): 2024-11; anulaciones 2025-09 y 2026-07; bloqueo incumplido 5 de 12 (condiciones activas). I-econ 1 (1–2): USD 7 mil a 67 mil / 2,1 M = 0,3% a 3,2%. I-pers 4 (3–4): torso o cabeza entre platos en las 3 de más de 500 t → `safety_critical`. I-cont 1. I-legal 4 (3–4): responsabilidad penal posible de directivos. Cont 4 (3–4): parada probada, apertura de platos nunca ensayada, un mecánico en turno C, enfermera sólo en A, emergencias 18 min real. Rec **no_aplica**.
- **Faltante deliberado:** frecuencia de ingreso entre platos → **deja evaluable**.
- **Anomalías esperadas:** A1 en Cont y en I-legal.

### S24-R03 · Rotura del reductor de la línea de coextrusión
- **Contrastes y reglas:** C06, C19, §4.4 (plazo de 14–16 semanas en el borde de "más de 3 meses"), §2.4.
- **Pretendido:** P 4 (4–5): falla del reductor 2023-08; hierro 180 ppm y vibraciones en alarma (+1 posible). I-econ 4: 15 semanas × USD 47 mil = 0,70 M + reductor y montaje 0,30 M = USD 1,0 M / 2,1 M = 48%; con el cliente perdido (USD 0,6 M × 28% = 0,17 M) 56%. I-pers 1. I-cont 5 (4–5): 14–16 semanas > 3 meses para la función de lámina (35%). I-legal 1. Cont 3 (2–3): corte por sobrecorriente (real 2023) y 9 días de lámina en stock. Rec 3: monocapa 25% con uso real 2023-08; taller local nunca probado.
- **Faltante deliberado:** horas del reductor y revisión interna → **deja evaluable** (los precursores fijan P).
- **Anomalías esperadas:** A1 en I-cont (4 o 5); A3 si dispara `consecuencia_extrema` en un riesgo de equipo.

### S24-R04 · Material no apto para contacto con alimentos en un lote de envases
- **Contrastes y reglas:** C26 (§4.1.3, consecuencia en el cliente y en consumidores; §2.1 iniciador = ingreso del material al lote), C13 de costado (cláusula de retiro sin tope del cliente 1).
- **Pretendido:** P 3 (2–3): sin ocurrencia; precursores 2025-10 y 2026-08; sector 3 retiros nacionales en 5 años. I-econ 3 (3–4): retiro USD 0,35–0,8 M + multa 0,05 M + potes 0,01 M = 0,41–0,86 M / 2,1 M = 20%–41%; con la pérdida del cliente 1 (USD 0,84 M de contribución) sube a 4. I-pers 1 (1–3). I-cont 1 (1–3): sólo si se suspende el registro. I-legal 3 (3–4). Cont 3 (3–4): control de color apenas sensible, trazabilidad probada 2026-03. Rec 4 (4–5).
- **Faltante deliberado:** migración y toxicología del molido → **deja evaluable** (I-pers con rango 1–3, sin superar a Económico).
- **Anomalías esperadas:** A6/A11 sobre si el daño en consumidores cuenta como Personas de la organización; A1 en I-econ.

### S24-R05 · Corte del suministro eléctrico de la red
- **Contrastes y reglas:** C02 de costado (frecuente y menor: A8 si queda por encima de R03 o R04), C19, §3.3 ancla 5.
- **Pretendido:** P 5 (9 cortes en 2025, 6 en 2026). I-econ 1: USD 6–14 mil / 2,1 M = 0,3–0,7%; máximo USD 31 mil = 1,5%; bruto sin detención ordenada (1–2 días de coextrusión) unos USD 20–30 mil, sigue en 1. I-pers 1. I-cont 1 (1–2): con el bruto de 1–2 días de la línea de lámina, 2. I-legal 1. Cont 2 (2–3): UPS probada 2026-03 y procedimiento aplicado. Rec 2 (1–2). C_raw 5×1×2 = 10.
- **Anomalías esperadas:** ninguna o A8.

### S24-R06 · Quemadura de un operario con material fundido
- **Contrastes y reglas:** C19, C02 de costado, C22 de costado.
- **Pretendido:** P 5: varias por año; sector 2,4 cada 100 trabajadores × 117 = 2,8 por año. I-econ 1. I-pers 2 (2–3): segundo grado con 6–12 días de baja. I-cont 1. I-legal 1. Cont 2 (2–3): duchas probadas 2026-09, actuación real 2026-03 conforme. Rec **no_aplica**.
- **Anomalías esperadas:** A1 en I-pers (2 o 3).

---

## S25 · Farmacéutica Regional S.A. (medicamentos) — RO 2025 USD 12,1 M, normalizado; margen de contribución 46%

**Contrastes y cómo los cubre:** C04 (R06, serialización como requisito regulatorio para despachar; corte P/V con credencial, §2.1) · C05 (R04 suspensión del área; R01–R02 retiros y notificación; regla de trazabilidad y de cefalosporinas descritas como reglas concretas) · C26 (R01, R02: daño en pacientes; R03) · C19 (R01, R03, R05) · de costado C13 (operador logístico en R03; proveedor de serialización en R06; façon en R04) y C20 (R01: historia propia de 10 años frente a estadística sectorial cuantitativa).

### S25-R01 · Lote de comprimidos fuera de especificación que obliga a retirarlo del mercado
- **Contrastes y reglas:** C20 (§3.2: jerarquía 1 = 0,34 retiros por planta-año → 29% → 3; jerarquía 2 = retiro 2024-09 en los últimos 3 años → 4; rango obligatorio, `uncertainty` ≥ medium), C05, C26, C19.
- **Pretendido:** P 3 (3–4), uncertainty medium. I-econ 2: USD 0,31–0,9 M / 12,1 M = 2,6%–7,4%. I-pers 2 (1–2). I-cont 1. I-legal 3 (notificación obligatoria). Cont 2 (2–3): simulacro 2026-02 94% en 48 h, real 2024-09 91%. Rec 3 (2–4): stock repone el mercado; el producto no se recupera.
- **Anomalías esperadas:** A1 en P si un evaluador elige sin rango.

### S25-R02 · Contaminación cruzada con cefalosporina en la línea de llenado
- **Contrastes y reglas:** C26 (pacientes como consumidores fuera de la organización, §4.3), C05 (regla concreta de cefalosporinas; suspensión posible), §2.2.4 (el hisopado posterior al arranque y la farmacovigilancia son V; el orden de campañas es P).
- **Redacción:** "contaminación cruzada" se interpretó como residuo de un producto en otro (definición de buenas prácticas), no como contaminación microbiológica.
- **Pretendido:** P 3 (2–3): sin ocurrencia propia; precursor 2025-09; sector 2 retiros en 6 años; revalidación pendiente (+1) y controles nuevos desde 2025-10 (−1). I-econ 4 (3–4): 6 semanas × USD 0,40 M = 2,4 M + retiro 0,2–0,4 M + 12 meses de cefalosporinas 2,8 M = USD 5,4–5,6 M / 12,1 M = 45%; sin línea dedicada USD 2,8 M = 23% → 3. I-pers 4 (3–5): anafilaxia en pacientes alérgicos expuestos por vía parenteral; una muerte plausible → `safety_critical`. I-cont 4 (llenado 4–8 semanas). I-legal 4 (3–4). Cont 4 (4–5): el método de liberación no detecta cefalosporina; farmacovigilancia mediana 9 días; dosis administradas no se recuperan. Rec 3 (2–3): stock de 6–8 semanas de inyectables.
- **Anomalías esperadas:** A1 en I-pers; A5.

### S25-R03 · Excursión de temperatura en el transporte de inyectables de 2 a 8 °C
- **Contrastes y reglas:** C19, C13 de costado (controles en manos del operador: atribución, A6), C02 de costado.
- **Pretendido:** P 5 (13 excursiones en 33 meses). I-econ 1 (1–2): USD 6,7 mil a 260 mil / 12,1 M = 0,06%–2,1%. I-pers 1 (1–2). I-cont 1. I-legal 1 (1–3). Cont 3 (3–4): registradores sin alarma, 18% sin archivo, tiempo real en 6 de 14 camiones. Rec 2 (2–3): stock de 9 semanas y reclamo al operador con cobro real.
- **Anomalías esperadas:** A11 (el reclamo al operador como recupero de fondos, V, o como transferencia).

### S25-R04 · Suspensión de la elaboración en el área de comprimidos
- **Contrastes y reglas:** C05 (§4.5 ancla 4; multa a Económico y suspensión a Legal), §2.1 (iniciador regulatorio: la constatación en inspección).
- **Pretendido:** P 3 (3–4): comparables 2023 y 2025; relevamiento 9 de 46 = 20%; 5 acciones vencidas e inspección prácticamente segura en 12 meses (+1 posible). I-econ 4 (4–5): 4 meses × USD 1,73 M = 6,9 M + 0,9 M = USD 7,8 M / 12,1 M = 64%; con 7 meses USD 13,0 M = 107% → 5. I-pers 1 (1–2). I-cont 5 (4–5): 4–7 meses en comparables. I-legal 4. Cont 4 (3–4): stock de 6 semanas, respuesta sin antecedente. Rec 3: façon probado (real 2025-03) para 2 de 38 productos.
- **Faltante deliberado:** fecha de la próxima inspección → **deja evaluable** (P queda en 3–4).
- **Anomalías esperadas:** A11 (stock como contención o recuperación), A6 (evento regulatorio).

### S25-R05 · Contaminación microbiológica del sistema de agua purificada
- **Contrastes y reglas:** C19, §5.2 (bloqueo de lotes con única actuación real 2023-02, más de 3 años: presente sin prueba).
- **Pretendido:** P 3 (2–3): ocurrencia propia hace más de 3 años; 7 excursiones en comparables 2021–2025; precursores 2026-04 y 2026-07. I-econ 3 (2–3): 1,3 semanas × USD 0,80 M = 1,04 M + lotes 0,25–0,8 M + 0,05 M = USD 1,3–1,9 M / 12,1 M = 11%–16%. I-pers 1 (1–2). I-cont 3 (7–12 días). I-legal 1 (1–2). Cont 3. Rec 3 (2–3).
- **Anomalías esperadas:** A1 en Cont por la regla de 3 años.

### S25-R06 · Ransomware en el sistema de serialización y trazabilidad
- **Contrastes y reglas:** C04 (§2.1: el evento está escrito como cifrado, posterior al uso de la credencial; §5.4 restauración probada sólo para la base), C05 (modo de contingencia regulatorio), C13 de costado (proveedor con cuenta compartida).
- **Redacción:** el evento se escribió a propósito después del iniciador (uso de la credencial del proveedor o robada); se espera que el evaluador lo mueva a `riesgo_evento`.
- **Pretendido:** P 3 (3–4): sin cifrado propio; 6 laboratorios comparables en 2022–2025; credencial comprometida 2025-05 (si se toma la credencial como iniciador, 4). I-econ 3 (3–4): 3,5 semanas × USD 0,80 M = 2,8 M + 0,35 M + 0,2 M = USD 3,35 M / 12,1 M = 28%; con la mitad de la venta recuperada, 16% → 3. I-pers 1. I-cont 4 (despacho 3–4 semanas). I-legal 2 (1–3). Cont 4 (4–5). Rec 3 (3–4): restauración de la base probada 2025-10; servidores de línea y contingencia sin prueba.
- **Faltante deliberado:** registros de VPN de 7 días → **deja evaluable**.
- **Anomalías esperadas:** A6 (evento), A1 en P.

---

## S37 · Fábrica de muebles a medida (PyME, ex E2) — RO 2025 −USD 0,11 M; RO 2024 −USD 0,04 M; RO 2023 +USD 0,16 M; margen de contribución desconocido

**Magnitud de referencia pretendida:** fallback 2 de §4.2 = promedio normalizado de los ejercicios positivos de los últimos tres = USD 0,16 M (sólo 2023). Margen operativo 2023 = 7,8%; 2025 = −4,6%. Con el margen de contribución desconocido, §4.2 "Monto" punto 3 pide el mínimo con el margen operativo: el del último ejercicio es negativo, lo que no da un monto; se espera A2 y que los evaluadores usen el margen de 2023 o pasen a `unknown`.

**Contrastes y cómo los cubre:** C02 (R03, R06) · C06 (un galpón, una CNC) · C08 (R01 sin detección, matafuegos vencidos, sin plan; R07) · C09 (incendio y ransomware frente a empresas grandes; multas de la autoridad laboral que en S37 pesan en Económico) · C11 (casi todo `reported`, sin registros) · C15 (fallback 2) · C18 (incendio con suma desactualizada USD 420 mil frente a 0,98 M, prorrata, sin pérdida de beneficio) · C19 (R02, R03, R06) · C21 (R04, R05, R07) · C22 (R02, R03) · C24 (R01: falta de plan de continuidad a V-recuperación, §2.4; matafuegos y alarma de intrusión como pasivos a V, §2.2.4) · de costado C03 (R01, R02) y C04 (R07).

### S37-R01 · Incendio en el taller
- **Contrastes y reglas:** C06, C08, C24 (§2.4, §2.2.4), C11, C18, C09 (par de escala con incendios de empresas grandes), C03 de costado.
- **Pretendido:** P 3 (2–4): historia propia sólo de palabra (~2019, 2023); comparable en la misma ciudad 2022; precursores observados por un tercero 2026-08. I-econ 5: USD 0,98 M / 0,16 M = 612% (cualquier magnitud lo deja en 5). I-pers 4 (3–4): 24 personas, polvo y solventes, sin detección ni capacitación, cabina a 35 m de la salida → `safety_critical`. I-cont 5 (4–6 meses). I-legal 4 (3–4): clausura con certificado vencido. Cont 4 (4–5). Rec 5.
- **Faltantes:** registros de limpieza y mantenimiento, valor del galpón → **dejan evaluable** (I-econ ya es 5).
- **Anomalías esperadas:** A11 (la falta de plan; §2.4), A1 en P.

### S37-R02 · Contacto de la mano con la hoja de la escuadradora o la fresa de la tupí
- **Contrastes y reglas:** C19, C22 (§5.5.2), C03 de costado, C09 (la multa laboral pesa 1–16% de la magnitud de referencia).
- **Pretendido:** P 4 (4–5): 2024-06 con ART; ~2021 de palabra; protectores desmontados. I-econ 2 (1–3): multa USD 1–25 mil / 0,16 M = 0,6%–15,6%. I-pers 3 (3–4): amputación de dedos. I-cont 1. I-legal 2 (2–3). Cont 4. Rec **no_aplica**.
- **Anomalías esperadas:** A1 en I-pers y en I-econ; A8 si I-econ supera a I-pers por la escala.

### S37-R03 · Cortes, golpes y lesiones por esfuerzo
- **Contrastes y reglas:** C02 (A8 frente a R01), C19, C22.
- **Pretendido:** P 5: 8 denuncias en 2023–2026 más lesiones sin denuncia; sector 9,8 cada 100 → 2,45 por año. I-econ 1. I-pers 2 (2–3). I-cont 1. I-legal 1. Cont 3 (3–4). Rec **no_aplica**. C_raw 5×2×3 = 30.
- **Faltante deliberado (no económico):** lesiones sin denuncia, sólo estimación del dueño → **deja evaluable** (P ya es 5 con las denuncias).
- **Anomalías esperadas:** A8 si queda cerca de R01.

### S37-R04 · Rotura del husillo del centro de mecanizado CNC
- **Contrastes y reglas:** C06, C21 (§4.2 punto 3), C15, §5.2 (la tercerización real es de 2022-09, más de 3 años: presente sin prueba).
- **Pretendido:** P 3 (3–4): rotura 2022-09 (más de 3 años); ruido desde 2026-07; husillo de 4 años con vida informada de 6–9. I-econ **unknown (4–5)**: facturación afectada unos USD 0,195 M en 7 semanas; mínimo con margen operativo 2023 (7,8%) USD 15 mil + husillo 23 mil + sobrecosto de tercero unos 10 mil = USD 48 mil / 0,16 M = 30% → 4; máximo USD 0,195 M + 23 mil = 0,218 M / 0,16 M = 136% → 5. I-pers 1. I-cont 4 (corte y mecanizado al 35–40% durante 6–8 semanas). I-legal 1. Cont 5. Rec 3 (3–4).
- **Evaluabilidad pretendida:** no evaluable: C_raw conocido = Cont 3 × 4 × max(5, 3) = 60; cota Econ = 3 × 5 × 5 = 75 > 60.
- **Anomalías esperadas:** A2 (margen operativo negativo), A1 en I-econ.

### S37-R05 · Pérdida del principal cliente corporativo
- **Contrastes y reglas:** C21, C15, C13 de costado.
- **Pretendido:** P 3 (3–4): 4 de 7 proyectos en 2026, multa y pedido de plan 2026-08. I-econ **unknown (4–5)**: mínimo USD 0,82 M × 7,8% = 0,064 M + indemnizaciones 0,046 M = 0,11 M / 0,16 M = 69% → 4; máximo USD 0,82 M + 0,05 M = 0,87 M / 0,16 M = 544% → 5. I-pers 1. I-cont 1. I-legal 1. Cont 5. Rec 4.
- **Evaluabilidad pretendida:** no evaluable (sólo Económico tiene peso; la cota supera a las dimensiones conocidas).
- **Anomalías esperadas:** A2, A6 (evento gradual: cuándo "deja de asignar").

### S37-R06 · Robo de herramientas y máquinas portátiles
- **Contrastes y reglas:** C02, C19, C11.
- **Pretendido:** P 4 (4–5): robo 2024-03; faltantes en obra de palabra. I-econ 2 (1–3): robo de 2024 USD 4,8 mil + 1 día de instalación 0,6 mil = 3,4%; todas las portátiles USD 42 mil = 26%. I-pers 1. I-cont 1. I-legal 1. Cont 3. Rec 2 (1–3): reposición real 2024-03 en 2 días.
- **Faltante deliberado:** inventario y faltantes en obra → **deja evaluable**.

### S37-R07 · Ransomware en la computadora de gestión y facturación
- **Contrastes y reglas:** C04 de costado, C08, C09 (par de escala con ransomware en empresas grandes), C11, C21.
- **Pretendido:** P 2 (2–3): encuesta sectorial 7% por año (jerarquía 1); toma del correo 2024-09 de palabra. I-econ **unknown (2–5)**: mínimo USD 2–5 mil / 0,16 M = 1,3%–3%; máximo 2–4 semanas de facturación USD 0,1–0,2 M = 62%–125%. I-pers 1. I-cont 3 (3–4). I-legal 1 (1–2). Cont 4 (4–5). Rec **unknown (2–5)**.
- **Faltante deliberado (no económico):** existencia y fecha de las copias de seguridad → **no deja evaluable**: C_raw conocido = max(Pers 2×1×4 = 8; Legal 8) = 8; cota de Continuidad con Rec `unknown` = 2 × 3 × 5 = 30 > 8.
- **Anomalías esperadas:** A2, A1 en Rec.

---

## Faltantes deliberados de la tanda

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S23-R01 | Parte del costo de la campaña que carga la terminal y período de la campaña | No deja evaluable |
| S37-R07 | Existencia, fecha y restaurabilidad de las copias de seguridad (no económico) | No deja evaluable |
| S37-R04, S37-R05 | Margen de contribución (pedido por la cobertura) | No deja evaluable (C21 con C15) |
| S23-R03 | Stock propio del centro de servicio | Deja evaluable |
| S24-R02 | Frecuencia de ingreso entre platos | Deja evaluable |
| S24-R03 | Horas del reductor y revisión interna | Deja evaluable |
| S24-R04 | Migración y toxicología del molido no apto | Deja evaluable (I-pers 1–3) |
| S25-R04 | Fecha de la próxima inspección | Deja evaluable |
| S25-R06 | Registros de VPN de más de 7 días | Deja evaluable |
| S37-R03 | Lesiones sin denuncia (no económico) | Deja evaluable |
| S37-R06 | Inventario y faltantes en obra | Deja evaluable |
| S37-R01 | Registros de limpieza y mantenimiento; valor del galpón | Deja evaluable |

## Riesgos corrientes (C19) de cada empresa

- **S23:** S23-R03 (interrupción del proveedor de acero), S23-R06 (atrapamiento en prensa).
- **S24:** S24-R05 (cortes de luz), S24-R06 (quemaduras), S24-R03 (rotura del reductor).
- **S25:** S25-R01 (retiro de un lote), S25-R03 (excursión de temperatura), S25-R05 (agua purificada).
- **S37:** S37-R03 (cortes y lesiones por esfuerzo), S37-R06 (robo de herramientas), S37-R02 (contacto con sierra o tupí).

## Riesgos del diseño que no se sostienen

No se cambió el conjunto. Para que lo decida Emiliano:

1. **S37, C21 con C15.** §4.2 "Monto" punto 3 calcula el mínimo con el margen operativo; con RO negativo en 2025 ese margen es negativo y el mínimo no existe. Tres riesgos de S37 (R04, R05, R07) quedan con I-econ `unknown` por construcción y dos de ellos no evaluables sin ningún faltante adicional. Es la tensión que la cobertura pide, pero la regla no dice qué margen usar; si la Fase 5 lo resuelve (por ejemplo, el margen de los ejercicios de la magnitud de referencia), estos niveles pretendidos cambian.
2. **S23 "Incendio en la planta"** se escribió como incendio en la nave de inyección (con propagación posible a estampado por los portones del muro). Es el mismo evento acotado al sector con la carga de fuego; si se quiere el incendio de toda la planta, cambia I-pers y Cont.
3. **S25 "Contaminación cruzada en el área estéril"** se escribió como residuo de cefalosporina en otro producto. Si la intención de la cobertura era contaminación microbiológica del llenado aséptico, el riesgo cambia de P y de V.
4. **S25 "Clausura de un área"** se escribió como "suspensión de la elaboración", que es la sanción que las reglas sanitarias genéricas describen; el evento sigue siendo la medida de la autoridad sobre un área.
5. **Fuentes cuantitativas sectoriales.** Para no abrir divergencias de P no buscadas (§3.2 obliga a rango cuando una fuente de jerarquía 1 diverge de la historia propia), sólo S25-R01 (C20), S24-R06, S25-R03, S37-R02, S37-R03 y S37-R07 traen frecuencias con denominador; en los demás el dato sectorial se dio sin denominador.

## Actualización por los avisos de la Fase 5 (2026-10-06)

Se aplicaron a las 25 fichas los 5 avisos de `v0/fase-5/avisos-fase-7.md`: estructura de costos o margen donde hay ventas perdidas (en S37 se dice qué costos deja de pagar y que el dueño no sabe su proporción, para no romper C21); aclaración de si los costos de antecedentes son brutos o con la respuesta actuando; verificación en 12 meses de barreras pasivas (S23-R05 muro cortafuego, S24-R01 muro, S25-R06 firewall, S37-R07 router); sección "Comparación con comparables o sector" en cada ficha de riesgo; frecuencia anual observada en S24-R06 y S37-R06. Único cambio de nivel pretendido: S24-R05 I-cont pasa a 1 (1–2). Las comparaciones nuevas refuerzan, sin moverlos, los ajustes +1 posibles de S25-R06 (28 de 41 laboratorios exigen doble factor a proveedores) y S23-R05 (detección en naves).
