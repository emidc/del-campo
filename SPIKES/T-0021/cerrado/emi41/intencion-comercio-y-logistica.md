# Intención de diseño · EMI-41 · familia Comercio y logística

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: comercio-y-logistica. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda comercio-y-logistica -->

# Intención de diseño · Comercio y logística (S03, S13, S27, S28)

**No abrir antes de la comparación de la Fase 8.**

> Tanda comercio-y-logistica · Fase 7 de EMI-41 · 2026-10-06 · niveles pretendidos **según metodologia v0.1**. Fichas en `v0/emi41/fichas/S03`, `S13`, `S27`, `S28` (26 fichas, sin padres ni escenarios). Corte de información: 2026-09-30.

Convenciones: P, Ie (económico), Ip (personas), Ic (continuidad), Il (legal), Vc (contención), Vr (recuperación). Rango `min–max` cuando lo pretendido es un valor con rango; "techo" = el `<f>_max` que se espera ver registrado.

---

## S03 · Transporte y depósito

**Magnitud de referencia:** RO 2025 = USD 1,22 M (positivo, sin partidas extraordinarias). Margen de contribución conocido (25,9% total; depósito 33,3%; transporte 22,7%).

**Contrastes y cómo los cubre.**
- C02: R01, R06 y R07 con frecuencia anual y consecuencia por evento pequeña frente al RO.
- C04: R04, sistema de depósito sin soporte, con caídas repetidas.
- C13: mercadería de clientes en custodia (R03, R05, R07), vigilancia contratada (R03), terceros en siniestros viales (R01).
- C19: R06 y R07 (y R01).
- C33: 80 camiones con 4 de reserva (R01, R02): perder una unidad es el 1,25% de la capacidad.
- De costado C03 (R01, R05, R06), C18 (exclusión de robo sin custodia en R02; ninguna póliza sobre el depósito en R05), C11 (faltantes de R04 y R01).
- **C25 en esta empresa: R03** (ver su entrada).

### S03-R01 · Siniestro vial de un camión propio
- **Tensiona:** C02 (A8), C33, C03 de costado; escenario plausible (§4.1.4) frente a peor creíble con una muerte en 71 siniestros.
- **Pretendido:** P 5 (registro propio 8–11 por año; dato sectorial de jerarquía 1 coincide). Ie 1 (rango 1–3; costo promedio USD 14 mil / RO 1,22 M = 1,1%; vuelco con tractor destruido USD 175 mil = 14%; techo con reclamo civil de USD 300 mil + daños ≈ 40% → 4 como `_max` si el evaluador lo registra). Ip 2 (rango 2–3; techo 4). Ic 1 (1,25% de la capacidad de transporte). Il 2 (1–2). Vc 3 (alerta automática con actuación real 2026-02, pero 140 km sin señal). Vr 2 (tractores de reserva con uso real; reposición por usado en 19 días).
- **Anomalías esperadas:** A1 en Ip y en Ie (qué escenario es "plausible"); A8 si queda por encima de R05.
- **Faltante deliberado:** monto final del reclamo civil de 2023 → **deja evaluable** (no cambia Ie plausible; sólo el techo).

### S03-R02 · Robo de carga en ruta
- **Tensiona:** C18 de costado (exclusión de robo sin custodia y sublímite de robo); dato sectorial de jerarquía 1 (146 robos / 9.000 unidades ≈ 1,6% por unidad y año → 72% para 80 unidades) frente a historia propia (1 robo en 2024, 1 intento contenido en 2025): posible rango por fuentes que divergen (C20 sin buscarlo).
- **Pretendido:** P 4 (rango 4–5). Ie 3 (rango 2–3; carga de electrodomésticos USD 125 mil + reparación ≈ 131 mil / 1,22 M = 10,7%; carga promedio USD 45 mil = 3,7%). Ip 2 (1–3). Ic 1. Il 1. Vc 3 (bloqueo de motor con una actuación exitosa y una anulada por inhibidor). Vr 4 (4–5; sin recupero de mercadería; sólo el camión se reemplaza).
- **Anomalías esperadas:** A1 en P (si uno toma la fuente sectorial) y en Ie (valor de la carga típica).

### S03-R03 · Robo en el depósito — **caso C25**
- **Qué busca probar la redacción:** la ficha junta en un riesgo simple dos causas con P, I y V distintas: (a) ingreso de terceros fuera de horario (1 en 2023-07 en 9 años de registro; I potencial de un camión de electrodomésticos ≈ USD 140 mil, 11% del RO si el cliente es de los 5 con responsabilidad de S03; contención: alarma con respuesta policial de 26 min) y (b) sustracción interna durante la operación (2025-02 y diferencias anuales; montos de USD 4–21 mil, < 2% del RO; contención: inventario cíclico que detecta a las 4–8 semanas). Según metodología §1.3.3–4 debería ser un padre con dos sub-riesgos; en lista fija se evalúa como está y se registra **A7**.
- **Tensiona:** C25 (protocolo §3; metodología §1.3.4), C13 (régimen de responsabilidad mixto ante clientes).
- **Pretendido:** P 4 (rango 3–5: 3 si se toma sólo la intrusión, 4–5 si se toma la sustracción interna con diferencias recurrentes). Ie 2 (rango 1–3). Ip 1 (rango 1–2: vigiladores presentes en intrusión). Ic 1. Il 1. Vc 4. Vr 5 (rango 4–5; sin recupero en los antecedentes; el pago al cliente no es recuperación).
- **Anomalías esperadas:** **A7** (granularidad); A1 en P y en Ie según qué causa tome cada evaluador como escenario.
- **Faltante:** origen de los USD 21 mil de diferencias de inventario → deja evaluable.

### S03-R04 · Caída del sistema de gestión del depósito, sin soporte del fabricante
- **Tensiona:** C04, C11 (faltante pedido por la cobertura sobre el sistema antiguo), §2.4 (falta de plan y de servidor de reemplazo va a V, no a I), §9.2–9.3.
- **Pretendido:** P 5 (tres caídas en 2024, 2025 y 2026; precursores activos). Ie `unknown` (rango posible 1–5: horas de caída ≈ USD 8 mil/día + penalidad USD 1,5 mil/día < 2% del RO; pérdida del servidor sin posibilidad de reinstalar → sistema nuevo en 7 meses: margen del depósito 7 × USD 167 mil = 1,17 M + penalidades ≈ 0,2 M + USD 280 mil del sistema ≈ 1,65 M / 1,22 M = 135%). Ip 1. Ic `unknown` (de horas a 7 meses). Il 1. Vc 3 (planilla impresa, actuación real 2025-06 con 35% del volumen). Vr 4 (rango 3–5; copia nunca restaurada, sin servidor de reemplazo).
- **Evaluabilidad pretendida:** C_raw de dimensiones conocidas = P5 × Ip1 × Vc3 = 15 (Il igual). Cota de Ie/Ic con 5 = 5 × 5 × 4–5 ≥ 100 > 15 → **no evaluable**. Entra a la cola de validación.
- **Faltante deliberado:** medio de instalación, clave de licencia y prueba de restauración inexistentes; no se sabe si el sistema se puede reinstalar → **no deja evaluable** (Ie e Ic sin acotar a tres niveles).
- **Anomalías esperadas:** A2 si algún evaluador inventa un plazo; A11 (¿la imposibilidad de reinstalar es I o V?); A1 si uno de los dos fija Ic con la caída de 31 h.

### S03-R05 · Incendio en el depósito con mercadería de clientes
- **Tensiona:** C13 (mercadería de terceros y responsabilidad contractual parcial), C18 de costado (ninguna póliza sobre el depósito: exposición retenida total), §2.2.4 (no hay rociadores ni detección en la nave: V, no P).
- **Pretendido:** P 3 (rango 3–4; ignición propia en 2021-11, más de 3 años; precursores presentes; +1 posible por dos puntos calientes pendientes). Ie 5 (bienes 1,59 M + responsabilidad ante 5 clientes 3,5 M + margen del depósito 12 meses 2,0 M ≈ 7,1 M / 1,22 M = 580%). Ip 3 (3–4; 21 personas en T1, racks de 9 m, evacuación de 4 min 30 s; techo 4). Ic 5 (función de depósito detenida 10–14 meses). Il 3 (3–4). Vc 4. Vr 5.
- **Anomalías esperadas:** A6 (¿la mercadería de los 9 clientes con renuncia de reclamo entra en la consecuencia de S03?); A11 en la responsabilidad ante el propietario.

### S03-R06 · Lesiones en la carga y descarga (C19)
- **Tensiona:** C02, C19, C03 de costado, C22 de costado.
- **Pretendido:** P 5. Ie 1 (USD 1,8 mil por accidente; máximo 6 mil = 0,5%). Ip 2 (rango 2–3; baja promedio de 18–24 días con incapacidad temporal; internaciones 2 en 3,75 años). Ic 1. Il 2. Vc 4 (rango 3–4; emergencias a 14 min, primeros auxilios sólo en T1 y T2). Vr `no_aplica` (alternativa: 1 por reemplazo del puesto en horas).
- **Anomalías esperadas:** A1 en Ip (2 frente a 3) y en Vr (`no_aplica` frente a 1).

### S03-R07 · Daño a mercadería de clientes por manipulación (C19)
- **Tensiona:** C02 puro, C19.
- **Pretendido:** P 5. Ie 1 (USD 1,1 mil por reclamo; máximo USD 14 mil = 1,1%). Ip 1. Ic 1. Il 1. Vc 2 (inspección que limita al pallet en el 85% de los casos; registro observado). Vr `no_aplica` o 5 (el pago al cliente es la pérdida, no una reposición).
- **Anomalías esperadas:** A1 en Vr; A8 si queda arriba de R05 por P.

---

## S13 · Distribución de insumos enológicos y mineros

**Magnitud de referencia:** RO 2025 = USD 2,05 M. Margen de contribución 19,9% (enológico 21,7%; minero 17,6%).

**Contrastes y cómo los cubre.**
- C06: un único depósito con todo el stock (R01).
- C13: clientes bodegueros y mineros (R02, R04), proveedor único extranjero (R04), transportista contratado (R05), vecinos (R01).
- C19: R03 y R06.
- C26: R02 (insumo contaminado o mal rotulado usado por la bodega cliente).
- De costado C18 (RC producto sin lucro cesante del cliente; incendio sin contenido asegurado; ninguna póliza ambiental) y C11 (faltantes de R02, R04, R05). C23 aparece de costado sin buscarlo (stock pico en febrero en R01 y R06; retenciones en temporada en R03).

### S13-R01 · Incendio en el depósito con productos incompatibles
- **Tensiona:** C06, C13 (vecinos), §2.1 (reacción exotérmica de 2022 sin llama: ¿antecedente del iniciador o precursor?), C23 de costado (pico de febrero).
- **Pretendido:** P 3 (rango 3–4; autocalentamiento de 2022-02 hace 4,6 años; comparable cercano 2024; precursores observados; +1 posible por ocupación del 108% y goteras). Ie 5 (stock 5,2 M + edificio 2,6 M + equipos 0,5 M + remediación 0,15–0,6 M + margen perdido ≥ 2 M → > 10 M / 2,05 M). Ip 3 (rango 3–4; personal y vecinos con humo tóxico). Ic 5 (12–16 meses; incluso con depósito alquilado, 4–6 meses). Il 4 (clausura hasta nueva habilitación). Vc 4 (rango 3–4; detección probada en 2026-03 con 38/42, sin rociadores, nadie de noche, sin procedimiento para vecinos). Vr 4 (carta de intención por un tercio de la superficie, nunca usada; sin plan).
- **Anomalías esperadas:** A1 en P (si toman 2022 como antecedente o como precursor) y en Ip; posible A6 por la temporada.

### S13-R02 · Venta de un lote contaminado o mal rotulado a un cliente
- **Tensiona:** C26 (consecuencia en el cliente; ¿el iniciador es la contaminación de origen, la del fraccionamiento o la entrega?), §4.1.3 (reparto entre Económico, Personas y Legal), C18 de costado.
- **Qué busca probar la redacción:** el evento está escrito como "entrega al cliente", posterior a la contaminación de origen o del fraccionamiento (§2.1.3). Para el lote de origen contaminado, el control de ingreso es P; para S13, el iniciador razonable es el ingreso del producto contaminado a su stock o el error de rotulado.
- **Pretendido:** P 4 (2024-02 y 2025-01 dentro de 3 años). Ie 4 (rango 3–5; reclamo de una bodega USD 690 mil / 2,05 M = 34%; lote completo USD 4,7 M = 229% como techo). Ip 1 (rango 1–2). Ic 1. Il 3 (retiro obligatorio y notificación). Vc 3 (trazabilidad probada en simulacro, pero actuación real con aviso a los 9 días). Vr 5 (rango 4–5; el vino del cliente no se recupera; el proveedor sólo repuso producto).
- **Faltantes:** casos de consumidores en el sector; vino tratado por las otras dos bodegas → **dejan evaluable** (Ip acotado a 1–2; Ie ya en rango).
- **Anomalías esperadas:** A6 (evento iniciador y organización de referencia de la consecuencia); A1 en Ie.

### S13-R03 · Retención en aduana de una importación (C19)
- **Tensiona:** C19, C23 de costado, §2.2.4 (stock de seguridad es V).
- **Pretendido:** P 5 (retenciones de más de 10 días todos los años). Ie 2 (rango 1–3; 2025-02: USD 46 mil + 14 mil = 60 mil / 2,05 M = 2,9%). Ip 1. Ic 1 (degradación parcial de algunos productos, < 50%). Il 1. Vc 3. Vr 3 (stock de seguridad para el 52% de la facturación; aéreo con uso real; sin alternativa para levaduras).
- **Anomalías esperadas:** A1 en Ie según temporada; A6 si un evaluador toma la vendimia como escenario.

### S13-R04 · Quiebra del proveedor extranjero único de un reactivo homologado
- **Tensiona:** C13 (proveedor único), §3.2 (sin historia propia; sector; precursores), §2.4 (homologación del sustituto como reposición normal), §4.4 (degradación de una línea del 13,6%).
- **Pretendido:** P 3 (rango 3–4; precursores observados en 2026; sector con 3 casos en 7 años). Ie 4 (rango 3–4; sin stock: margen 0,9 M × 5,5/12 ≈ 0,41 M + penalidad 25 mil × ~24 semanas ≈ 0,6 M + anticipo 0,18 M ≈ 1,2 M / 2,05 M = 58%; sin penalidad, ≈ 0,59 M = 29%). Ip 1. Ic 4 (rango 2–4; línea de 13,6% de la facturación sin abastecer 4–7 meses, como degradación). Il 2. Vc 3 (stock de 12 semanas, propio y en consignación). Vr 4 (sustituto sin prueba iniciada).
- **Faltante deliberado:** contrato firmado con el cliente principal (penalidad y tope del borrador) → **deja evaluable** (Ie acotado a 3–4).
- **Anomalías esperadas:** A1 en Ic (¿función crítica o no?) y en P; A11 (¿el stock reduce la consecuencia bruta o es V?).

### S13-R05 · Derrame durante el transporte a un cliente
- **Tensiona:** C13 (60% de las entregas mineras las hace un transportista contratado: ¿a quién se atribuyen los controles preventivos y la contención?), C03 de costado.
- **Pretendido:** P 4 (rango 3–4; pérdida de contención en 2024-08 dentro de la caja). Ie 2 (rango 2–4; derrame en ripio ≈ USD 35–60 mil = 2–3%; con arroyo USD 400 mil + multas ≈ 25–40%). Ip 3 (rango 2–3). Ic 1. Il 3. Vc 4 (respuesta especializada a 5–7 h nunca desplegada; sin señal en 70 km; kits del transportista sin revisar). Vr 3.
- **Anomalías esperadas:** A6 (organización de referencia con el transportista), A1 en Ie.

### S13-R06 · Robo de mercadería (C19)
- **Tensiona:** C19; §3.4 (control nuevo después del antecedente: −1).
- **Pretendido:** P 3 (rango 3–4; robo propio 2023-10 a 2 años y 11 meses del corte; alarma ampliada en 2023-11 → −1). Ie 2 (rango 2–3; USD 46 mil = 2,2%; en febrero hasta USD 500 mil = 24%). Ip 1. Ic 1. Il 2 (1–2; notificación a la autoridad de precursores si hay sustancias controladas). Vc 3. Vr 3 (rango 3–4).
- **Anomalías esperadas:** A1 en P (ajuste −1) y en Ie (temporada).

---

## S27 · Cadena de farmacias

**Magnitud de referencia:** RO 2025 = USD 8,1 M. Margen de contribución 25,0%.

**Contrastes y cómo los cubre.**
- C02: R01, R03, R05 (frecuentes, consecuencia pequeña por evento).
- C05: R02 (inhabilitación del director técnico y clausura de sucursal), R04 (datos de salud), R05 (sumario sanitario).
- C12: R04 (copias inmutables con restauración probada en 19 h) y R06 (droguerías con actuación real en 2024-12; rociadores probados).
- C19: R01, R03 y R05.
- C33: 60 sucursales: un evento en una sucursal no detiene la dispensa (R01, R02, R03).
- De costado C04 (R04) y C06 (R06: centro único que abastece el 85%).

### S27-R01 · Robo a mano armada en una sucursal (C19)
- **Pretendido:** P 5. Ie 1 (USD 2,5 mil = 0,03%). Ip 2 (rango 2–3; una internación de 3 días en 27 robos; techo 4 por arma de fuego). Ic 1. Il 1. Vc 3 (rango 3–4; botón antipánico con 6/6 actuaciones reales, pero la policía llega a los 7–22 min). Vr 1 (reapertura al día siguiente).
- **Anomalías esperadas:** A8 (frecuente y menor), A1 en Ip.

### S27-R02 · Faltante de medicamentos de stock regulado
- **Tensiona:** C05 (Legal con ancla real), separación multa (Económico) y sanción (Legal), §5.5 (Legal sólo con contención), C33.
- **Pretendido:** P 5 (rango 4–5; sumarios 2023 y 2025 y 7 diferencias en la auditoría de 2026-03). Ie 1 (multa 9 mil + cierre 7 mil = 0,2%). Ip 1. Ic 1 (una sucursal de 60). Il 4 (rango 3–4; inhabilitación y clausura temporal). Vc 3 (conciliación automática con detecciones reales, pero no detecta sustracciones registradas como dispensa). Vr 2 (directores técnicos de reserva con actuación real de 4 días).
- **Anomalías esperadas:** A5 (Il 4 frente a Ie 1); A8 si queda arriba de R06.

### S27-R03 · Falla del frío en una sucursal (C19)
- **Pretendido:** P 5. Ie 1 (descarte promedio USD 4,1 mil; máximo 14,2 mil = 0,18%). Ip 1. Ic 1. Il 1. Vc 3. Vr 2.
- **Faltante deliberado:** valor del stock refrigerado de 11 sucursales → **deja evaluable** (con el máximo conocido de USD 14,2 mil, aun triplicado, Ie sigue en 1).

### S27-R04 · Ransomware sobre el sistema de ventas y recetas
- **Tensiona:** C04 y C24 (§2.1: el iniciador es el acceso con credencial válida; el incidente de 2024-11 es un antecedente del iniciador aunque no llegó a cifrar), C12, §5.4 (restauración probada), C05 (datos de salud).
- **Pretendido:** P 4 (rango 3–4; uso indebido de credencial en 2024-11; comparables regionales en 2023 y 2025). Ie 4 (sin copias: 3–6 semanas × USD 103 mil de margen diario ≈ 2,2–4,3 M + respuesta 0,15–0,4 M ≈ 2,4–4,7 M / 8,1 M = 30–58%). Ip 1. Ic 4 (3–6 semanas). Il 3. Vc 3 (centro de monitoreo probado en 2026-07; segmentación en 22 de 60). Vr 2 (rango 2–3; restauración central probada en 19 h; terminales no probadas a escala; venta sin conexión con uso real del 35%).
- **Anomalías esperadas:** A1 en P (si el evaluador no toma 2024-11 como iniciador) y en Vr.

### S27-R05 · Error de dispensa a un paciente (C19)
- **Tensiona:** C02 con Personas; C22 de costado (recuperación sin nada que reponer); C11 de costado (subregistro).
- **Pretendido:** P 5. Ie 1 (USD 60 mil = 0,7%). Ip 3 (rango 2–3; internación de 4 días; techo 4 en adultos mayores). Ic 1. Il 2 (rango 2–3). Vc 4 (rango 3–4). Vr `no_aplica`.
- **Faltante:** errores no informados (la tasa propia es la sexta parte de la sectorial) → deja evaluable (P ya en 5 con la historia propia).
- **Anomalías esperadas:** A1 en Ip.

### S27-R06 · Incendio en el centro de distribución
- **Tensiona:** C12 (contención y recuperación probadas), C06 de costado, §5.5 (V por dimensión con dos aspectos probados), §3.2 (historia propia sin ocurrencias desde 2014).
- **Pretendido:** P 3 (rango 2–3; sin igniciones propias; sector 2 casos en 8 años; precursores observados en 2026-04). Ie 5 (stock 14 M + edificio 5,2 M + equipos 2,4 M = 21,6 M / 8,1 M = 267%). Ip 3 (rango 2–4). Ic 5 (abastecimiento del 85% detenido 12–15 meses). Il 4 (rango 3–4; suspensión de la habilitación del centro). Vc 2 (rango 1–2; rociadores con ensayo de flujo completo 2026-02, detección probada, simulacro). Vr 2 (droguerías con actuación real 2024-12: 70% de productos en 48 h).
- **Anomalías esperadas:** A1 en Vc (1 frente a 2) y en Vr.

---

## S28 · Cadena de supermercados: 15 locales y un centro de distribución

**Magnitud de referencia:** RO 2025 = USD 12,1 M (sin partidas extraordinarias en 2025; la de 2024 no se usa). Margen de contribución 23,0%.

**Contrastes y cómo los cubre.**
- C02: R03, R05, R06.
- C06: R01 (centro único que abastece el 78%).
- C19: R03, R05 y R06.
- C26: R04 (alimento elaborado en el local, consumidores fuera de la organización).
- C33: R02 (15 locales; 11 con otro local a menos de 8 km), R06.
- De costado C28 (multitudes de 250 a 900 clientes en R02; consumidores de grupos expuestos en R04), C04 (R07), C13 (proveedores que abastecen directo en R01; vigilancia en R05).
- C18 aparece de costado sin buscarlo: exclusión de paneles combustibles y sublímite de stock en R01.

### S28-R01 · Incendio en el centro de distribución
- **Tensiona:** C06, §3.4 (ignición contenida en 2023-08 cuenta como antecedente; control nuevo después: −1), §5.2 (bomba que no arrancó en 2025-09 y se reparó).
- **Pretendido:** P 4 (rango 3–4; ignición propia en 2023-08; sensor de hidrógeno y extracción desde 2023-10 → −1 posible). Ie 5 (36 M / 12,1 M = 298%). Ip 3 (rango 3–4; 180 personas, cámaras de poliuretano sin rociadores). Ic 5 (14–18 meses para el 78% del abastecimiento). Il 2 (rango 2–3). Vc 3 (rango 2–3; rociadores probados sólo en la zona seca). Vr 3 (plan con actuación real 2024-07 que cubrió el 55% del volumen).
- **Anomalías esperadas:** A1 en P (ajuste −1) y en Vc.

### S28-R02 · Incendio en un local
- **Tensiona:** C33 (¿la redundancia de otros locales es V-recuperación o hace la consecuencia bruta pequeña? test de la barrera §2.3), §4.4 (un local es el 6,7% de la venta: degradación < 50%), C28 de costado.
- **Pretendido:** P 4 (rango 3–4; ignición en 2025-05, cartel exterior apagado con extintor; campana 2022-12). Ie 5 (rango 4–5; local propio promedio 10 M + margen 4,6 M ≈ 14,6 M / 12,1 M = 121%; alquilado ≈ 8,4 M = 69%). Ip 3 (rango 3–4; techo 5 con 900 clientes en hora pico). Ic 4 (rango 2–4; un local cerrado 10–16 meses como degradación de la venta). Il 2. Vc 3. Vr 3 (rango 3–4; traslado de ventas observado sólo 2 días; 4 locales únicos en su ciudad).
- **Anomalías esperadas:** A1 en Ic y en Vr; A11 (redundancia en I o en V).

### S28-R03 · Caída de un cliente en un local (C19)
- **Pretendido:** P 5. Ie 1 (promedio USD 11 mil; máximo 68 mil = 0,6%). Ip 2 (rango 2–3; 19% con guardia, 2,5% con fractura). Ic 1. Il 2. Vc 3. Vr `no_aplica`.
- **Anomalías esperadas:** A1 en Ip; C22 de costado.

### S28-R04 · Venta de un alimento contaminado
- **Tensiona:** C26 (consumidores fuera de la organización), C28 de costado (grupos expuestos), §2.1 (el evento escrito incluye "se pone a la venta": iniciador posterior a la contaminación).
- **Pretendido:** P 4 (rango 4–5; brote propio 2025-03; precursores en la auditoría de 2026-05). Ie 1 (rango 1–2; 166 mil / 12,1 M = 1,4%). Ip 3 (rango 3–4; 17 enfermos y 3 internados; con Listeria en fiambres, una muerte plausible en grupo expuesto). Ic 1. Il 3 (rango 3–4; clausura del sector, notificación). Vc 4 (rango 3–4; el retiro probado no alcanza a productos por peso; aviso a los 4 días). Vr 3.
- **Faltante deliberado:** cuántas personas de grupos expuestos compran fiambre fraccionado → **deja evaluable** (Ip acotado a 3–4).
- **Anomalías esperadas:** A1 en Ip; A6 por el iniciador.

### S28-R05 · Hurto en los locales (C19)
- **Tensiona:** C02 extremo: el evento unitario es de USD 36, el agregado anual es USD 1,75 M (14% del RO).
- **Pretendido:** P 5. Ie 1 (rango 1–3; por evento < 0,01%; si el evaluador toma el agregado anual, 14% → 3). Ip 1 (1–2). Ic 1. Il 1. Vc 3. Vr 5 (rango 4–5).
- **Anomalías esperadas:** A6 o A7 (unidad del evento: hurto individual o merma anual); A1 en Ie.

### S28-R06 · Falla del frío en un local (C19)
- **Pretendido:** P 5. Ie 1 (promedio USD 28 mil + 10 mil = 0,3%; máximo 74 mil = 0,6%). Ip 1. Ic 1. Il 1. Vc 3 (grupos probados mensualmente en 11 de 15; falla real 2025-12). Vr 2.

### S28-R07 · Caída del sistema de cobro en todos los locales
- **Tensiona:** C04, §9.3 (V-recuperación `unknown` que impide evaluar), §2.4.
- **Pretendido:** P 4 (rango 4–5; caídas totales en 2024-12 y 2025-08; controles nuevos en 2025-01 y 2025-10 → −1 posible). Ie 1 (rango 1–3; caída de horas: 3 h 40 min en diciembre ≈ USD 410 mil de venta × 80% × 23% ≈ 75 mil = 0,6%; pérdida del servidor: 9–26 días × USD 190 mil de margen diario ≈ 1,7–5 M = 14–41% como techo). Ip 1. Ic 1 (rango 1–2; techo 4 con pérdida del servidor). Il 1. Vc 3 (vuelta atrás probada en una caja; enlace con conmutación probada). Vr `unknown` (sin contrato de soporte encontrado, copia nunca restaurada, sin réplica).
- **Evaluabilidad pretendida:** C_raw de dimensiones conocidas (Ip, Il) = P4 × 1 × Vc3 = 12. Cota de Ie con Vr = 5: 4 × 1 × 5 = 20 > 12 → **no evaluable**.
- **Faltante deliberado:** contrato de soporte y prueba de restauración → **no deja evaluable**.
- **Anomalías esperadas:** A2 si alguien fija Vr sin hecho; A1 en Ie e Ic (escenario según la causa).

---

## Faltantes deliberados de la tanda, por alcance

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S03-R04 | Posibilidad de reinstalar el sistema; copia nunca restaurada (sistema antiguo, pedido por la cobertura) | No deja evaluable (Ie e Ic `unknown`) |
| S28-R07 | Contrato de soporte del software de cobro; copia nunca restaurada | No deja evaluable (Vr `unknown`) |
| S03-R01 | Monto final del reclamo civil de 2023 | Deja evaluable |
| S03-R03 | Origen de las diferencias de inventario | Deja evaluable |
| S13-R04 | Contrato firmado con el cliente minero principal | Deja evaluable (Ie 3–4) |
| S13-R02 | Consumidores afectados en el sector; vino tratado por otras bodegas | Deja evaluable |
| S27-R03 | Valor de heladeras en 11 sucursales | Deja evaluable |
| S27-R05 | Errores de dispensa no informados | Deja evaluable |
| S28-R04 | Personas de grupos expuestos que compran fiambre fraccionado | Deja evaluable (Ip 3–4) |

## Riesgos corrientes (C19) de cada empresa

- **S03:** S03-R06 (lesiones en carga y descarga), S03-R07 (daño a mercadería por manipulación); también S03-R01.
- **S13:** S13-R03 (retención en aduana), S13-R06 (robo de mercadería).
- **S27:** S27-R01 (robo a mano armada), S27-R03 (falla del frío en una sucursal), S27-R05 (error de dispensa).
- **S28:** S28-R03 (caída de un cliente), S28-R05 (hurto), S28-R06 (falla del frío en un local).

## Riesgos del diseño que no se sostienen (sin cambiar el conjunto)

1. **S28-R05 · Hurto en los locales.** El evento unitario (un hurto de USD 36) y la consecuencia que importa (merma anual de USD 1,75 M) no son el mismo objeto; la ficha lo deja abierto. Es más un indicador de pérdida continua que un evento con P en 12 meses; se espera A6/A7. Se mantiene porque prueba C02, pero puede contaminar las métricas de Ie.
2. **S28-R07 · Caída del sistema de cobro.** La consecuencia depende mucho de la causa (horas por actualización o enlace; semanas por pérdida del servidor). No es el caso C25 de la tanda, pero puede producir un segundo A7 no buscado.
3. **S13-R04 · Quiebra del proveedor único.** Que una línea del 13,6% de la facturación cuente como "función crítica" es discutible; Ic puede divergir más de un nivel por definición, no por hechos.
