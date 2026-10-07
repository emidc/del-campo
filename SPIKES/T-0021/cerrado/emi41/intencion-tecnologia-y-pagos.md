# Intención de diseño · EMI-41 · familia Tecnología y pagos

**No abrir antes de la comparación de la Fase 8.**

Archivo cerrado de la Fase 7 (T-0021). Junta, sin cambios, las tandas: tecnologia-y-pagos. Su SHA-256 está publicado en `v0/emi41/hashes-intencion.md`.


---

<!-- tanda tecnologia-y-pagos -->

# Intención de diseño · Fase 7 · Tecnología y pagos (S04, S29, S30)

No abrir antes de la comparación de la Fase 8.

> Tanda: tecnologia-y-pagos · EMI-41 · construida el 2026-10-06 · niveles pretendidos según **metodología v0.1**. Fichas en `v0/emi41/fichas/S04/`, `S29/`, `S30/`. 22 fichas que cuentan (S04: 7; S29: 7; S30: 8) más los padres S29-P01 y S30-P01, que no cuentan.
> Convención: `valor (min–max)`. Magnitudes de referencia (§4.2, punto 1, RO del último ejercicio cerrado, positivo, sin partidas extraordinarias en 2025): S04 USD 2,0 M; S29 USD 32,1 M; S30 USD 9,0 M.

---

## S04 · SaaS B2B (nombre de trabajo de la cobertura: el de S04 en §3.3)

**Contrastes y cómo:** C04 (todos los riesgos son de sistemas; R02, R04 y R06 ponen a prueba el corte P/V con credencial o código como evento iniciador, y R01/R02 la recuperación por restauración); C08 (copias en la misma cuenta y región, sin plan de respuesta ni de continuidad, sin EDR en servidores, sin segundo factor para el contratista: la vulnerabilidad sale alta por hechos, no por adjetivos); C13 (proveedor de nube, contratista de soporte, bibliotecas de terceros, cliente principal); C19 (R07 y R06); C32 (R01, R02 y R07 traen el daño del cliente principal —USD 210 mil de ventas no concretadas en 2024-11— frente a lo que efectivamente paga la empresa: créditos y USD 40 mil de descuento); de costado C11 (R03, faltante que no deja evaluable; R01, R02, R04, R06, faltantes que dejan evaluable), C22 (R03, y discutible en R04 y R07) y C09 (par de escala con S29: falla de nube y ransomware). Sin póliza ciber: la ficha `transferencia.md` lo declara.

### S04-R01 · Falla regional del proveedor de nube
- **Tensiona:** §3.2 con historia propia (dos casos en 3 años) y dato del proveedor de la misma región (4 incidentes en 5,75 años ≈ 0,7/año → ~50%) que coinciden; §5.4 recuperación sin alternativa (copias en la misma región); C32: el daño del cliente no es la pérdida de la empresa.
- **Niveles pretendidos:** P 4 · I-econ 2 (2–3) · I-pers 1 · I-cont 1 (1–3) · I-legal 1 (1–2) · contención 4 (3–4) · recuperación 5 (4–5).
- **Cálculo:** corte de 9 h 10 min → créditos USD 141,5 mil + 36 mil + 8 mil = USD 185,5 mil / RO USD 2,0 M = 9,3% (nivel 2); con el descuento extra de 2024-11 (USD 40 mil), USD 225,5 mil = 11,3% (nivel 3). El caso del sector de 3 días da el techo de continuidad (3) y dispara el derecho de rescisión a 48 h (USD 2,5 M de margen = 125%), que no es el escenario plausible.
- **Anomalías esperadas:** A1 en I-econ (corte en el límite 10%) y en contención (la aplicación sin conexión limita el daño del cliente, no el de la empresa); A6 si un evaluador suma la pérdida del cliente.
- **Faltantes deliberados:** replicación de copias fuera de la región y tiempo de reconstrucción en otra región → **deja evaluable** (recuperación 4–5).

### S04-R02 · Ransomware sobre la infraestructura de producción
- **Tensiona:** §2.1 (evento = ejecución de código con privilegios, no el cifrado); §3.2 con estadística sectorial voluntaria (3 casos en 76 empresas-año ≈ 4%, nivel 1 si se la toma como jerarquía 1) frente a un comparable de la misma ciudad en 2025-06 (nivel 3) y precursores propios (nivel 3); §2.4 / §4.4 continuidad bruta sin copias (qué es "reposición normal" de datos); C08.
- **Niveles pretendidos:** P 3 (2–4) · I-econ 4 (3–5) · I-pers 1 · I-cont 4 (3–5) · I-legal 3 · contención 4 · recuperación 4 (3–5).
- **Cálculo:** respuesta USD 120–180 mil + créditos USD 177 mil (354 si cruza dos meses) + horas extra USD 40–60 mil + notificación USD 33 mil + legal USD 50 mil ≈ USD 0,42–0,67 M / 2,0 M = 21–34% (3–4). Corte de 5 a 8 días supera las 48 h del anexo: si el cliente principal rescinde, + USD 2,5 M de margen → > 100% (5). Valor plausible 4.
- **Anomalías esperadas:** A1 en P (qué fuente manda) y en I-cont; A11 (copias en la misma cuenta: ¿I o V?); A6 sobre si la rescisión del cliente es parte de la consecuencia.
- **Faltantes deliberados:** texto del contrato renovado en 2026-02 (límite de responsabilidad y exclusión por seguridad de datos) → **deja evaluable** (mueve I-econ dentro de 3–5, ya acotado por la rescisión a 48 h del anexo, que sí está). Datos fuera de la base principal → ver R03.

### S04-R03 · Exposición de datos de clientes por error de configuración
- **Tensiona:** §9.2 y §9.3 (I-econ `unknown` con cota que supera la dimensión conocida → **no evaluable**); §5.5.2 recuperación `no_aplica` (C22); §3.2 historia propia con un caso (2025-09) frente a informe sectorial (23%).
- **Niveles pretendidos:** P 4 (3–4) · I-econ **unknown** (2–5) · I-pers 1 · I-cont 1 · I-legal 3 · contención 4 (3–4) · recuperación **no_aplica**.
- **Cálculo:** sin inventario, la exposición va de unos pocos miles de titulares (notificación + legal ≈ USD 60 mil = 3%, nivel 2) a varias carteras completas (410 mil titulares: notificación USD 33 mil + legal USD 90 mil + multa hasta USD 1,5 M + reclamos fuera del límite → > USD 2 M = > 100%, nivel 5). Cuatro niveles → `unknown`. Dimensión conocida más alta: Legal, 4 × 3 × 4 = 48; cota de Económico 4 × 5 × 4 = 80 > 48 → no evaluable; entra a la cola de validación.
- **Anomalías esperadas:** A2 si un evaluador elige un valor plausible en lugar de `unknown`; A9 si baja P o I por falta de evidencia; A1 en evaluable.
- **Faltantes deliberados:** inventario de contenedores con datos personales → **no deja evaluable**. Si el contenedor de 2025-09 fue leído → deja evaluable (no cambia P: el evento es la exposición).

### S04-R04 · Uso indebido de una credencial de soporte
- **Tensiona:** §2.1 (credencial válida como evento; un antecedente de 2024-07 cuya ocurrencia no se puede confirmar); §2.2.4 y test de la barrera (el número de pedido no validado, la falta de restricción por cliente: ¿P, V o I?); C13 (contratista).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 (2–4) · I-pers 1 · I-cont 1 · I-legal 3 · contención 3 (3–4) · recuperación 3 (2–4; algunos pondrán `no_aplica`).
- **Cálculo:** acceso a datos de un cliente: notificación + legal ≈ USD 0,15 M = 7,5% (2); con pagos desviados de un cliente durante unos días y reclamo fuera del límite: USD 0,3–0,6 M = 15–30% (3); con multa alta, hasta 4.
- **Anomalías esperadas:** A1 en recuperación (restauración de datos modificados probada frente a datos leídos irrecuperables); A11.
- **Faltantes deliberados:** cuántas personas del contratista conocen las contraseñas → **deja evaluable**.

### S04-R05 · Salida simultánea de las dos personas que conocen el núcleo
- **Tensiona:** P sin historia propia ni comparables, con precursores (§3.3, nivel 3 por precursores); I-cont de una función crítica que se degrada sin interrumpir el servicio (§4.4); un riesgo no técnico en una empresa de tecnología.
- **Niveles pretendidos:** P 3 (2–3) · I-econ 4 (3–4) · I-pers 1 · I-cont 4 (3–5) · I-legal 2 · contención 4 · recuperación 4 (3–4).
- **Cálculo:** penalidad USD 300 mil + búsqueda USD 40 mil + devolución posible de USD 360 mil = USD 0,34–0,70 M / 2,0 M = 17–35% (3–4). Valor 4 con rescisión de la orden.
- **Anomalías esperadas:** A1 en I-cont (degradación de una función de mantenimiento: ¿cuenta como interrupción?); A6 (la salida no es un "evento" instantáneo).
- **Faltantes deliberados:** qué parte de la orden de trabajo puede hacer el resto del equipo → **deja evaluable**.

### S04-R06 · Explotación de una vulnerabilidad en una dependencia de terceros
- **Tensiona:** §2.2 (cortafuegos de aplicaciones como control previo al evento —P— frente a detección —V—); P con precursores y un caso de 2023 sin explotación confirmada.
- **Niveles pretendidos:** P 3 (3–4) · I-econ 3 (3–5) · I-pers 1 · I-cont 2 (2–3) · I-legal 3 · contención 4 · recuperación 3 (3–4).
- **Cálculo:** respuesta USD 120–180 mil + reconstrucción USD 15–30 mil + créditos USD 28–178 mil + notificación y legal USD 83 mil ≈ USD 0,25–0,47 M / 2,0 M = 12–24% (3); con multa o reclamos, 4–5.
- **Anomalías esperadas:** A10 si el cortafuegos se descuenta en P y en V sin nombrar dos mecanismos; A1 en P.
- **Faltantes deliberados:** vulnerabilidades de las 280 dependencias del módulo heredado → **deja evaluable** (P 3–4).

### S04-R07 · Incumplimiento del SLA con el cliente principal
- **Tensiona:** C19 y C02 de costado (seis meses en 45, dos en los últimos 12: P 5 con consecuencia chica); **redacción con el evento posterior al iniciador** (§2.1.3): el "incumplimiento" es un resultado mensual de cortes que son eventos de otros riesgos (R01 y fallas de despliegue). Se busca ver qué evento toma cada evaluador y si registra A6 o A7 por solapamiento con R01.
- **Niveles pretendidos:** P 5 · I-econ 1 (1–2) · I-pers 1 · I-cont 1 · I-legal 1 (1–2) · contención 5 (3–5: depende de dónde se ponga el evento) · recuperación **no_aplica** (o 5).
- **Cálculo:** crédito del 10% = USD 28,3 mil / 2,0 M = 1,4% (1); 50% = USD 141,5 mil = 7,1% (2).
- **Anomalías esperadas:** A6 (evento), A7 (solapamiento con R01), A8 (riesgo frecuente y menor).
- **Faltantes deliberados:** ninguno.

---

## S29 · Fintech de pagos (nombre de trabajo: el de S29 en §3.2)

**Contrastes y cómo:** C04 (P01 y R04); C05 (R06 con régimen sancionatorio concreto: tres incumplimientos en 24 meses → plan de adecuación; R04 y R07); C07 y C12 (dos regiones activas con conmutación ensayada, copias inmutables con restauración ensayada en 2026-07, EDR y SOC probados, despliegue gradual con vuelta atrás automática); C10 y C18 (`transferencia.md`: ciber con sublímite de extorsión de USD 2 M, deducible de USD 500 mil, espera de 12 h, exclusión de fallas de infraestructura del proveedor de nube y de errores de software propios, más una exclusión por proveedor sin auditoría vigente que deja fuera a R07; fidelidad para R05); C13 (proveedor de nube, proveedor de verificación); C16 (P01 con tres causas de P y V muy distintas); C20 (P01-S03: historia propia anual frente a estadística internacional del 34%; R05: historia propia sin ocurrencias en 9 años frente a encuesta regional del 17% anual; R04: un caso propio de 2023 frente a estadística de la red ≈ 0,2%); C19 (R05, R06); de costado C02 (R06, P01-S03) y C09 (par de escala con S04 en falla de nube y ransomware).

### S29-P01 · Indisponibilidad del servicio de autorización (padre)
- **Tensiona:** §1.4 (prioridad por sub-riesgo determinante) e invariancia de granularidad (§14.2). Tres causas con P y V muy distintas y la misma consecuencia.
- **Determinante esperado:** S01 (P 4 × I-legal 3 × contención 3 = 36), por encima de S03 (5 × 3 × 2 = 30; con P 3, 18) y de S02 (2 × I-cont 4 × 2 = 16). Si un evaluador toma P 5 y contención 3 en S03, el determinante cambia a S03: es una divergencia buscada.

### S29-P01-S01 · Falla del proveedor de nube que alcanza las dos regiones
- **Tensiona:** C13 (P atribuida a un tercero sin control propio); §3.4 (credenciales de 12 h y segundo proveedor de nombres de dominio como controles nuevos verificados: ¿−1?); §2.2 test P/V (esos controles impiden que la falla del proveedor se convierta en indisponibilidad: ¿P o V?).
- **Niveles pretendidos:** P 4 (3–4) · I-econ 1 (1–2) · I-pers 1 · I-cont 1 (1–2) · I-legal 3 (2–3) · contención 3 (3–4) · recuperación 5 (4–5).
- **Cálculo:** 2,6 h × USD 14–33 mil/h × 60% ≈ USD 22–51 mil + créditos USD 205 mil + USD 12 mil ≈ USD 0,24–0,27 M / 32,1 M = 0,8% (1).
- **Anomalías esperadas:** A11 (credenciales de 12 h: P o V), A1 en P.
- **Faltantes deliberados (tercero, proveedor de nube):** dependencias globales entre regiones no informadas por el proveedor → **deja evaluable** (P 3–4 con uncertainty medium).

### S29-P01-S02 · Ransomware sobre la infraestructura de producción
- **Tensiona:** C07 (contención y recuperación en sus niveles probados); §3.2 con estadística sectorial de jerarquía 1 (≈ 2,9% anual, nivel 1) y un comparable regional (nivel 3); §4.4 continuidad bruta sin copias (3 a 6 semanas) frente a la restauración probada en 7 h 40 min (§2.4).
- **Niveles pretendidos:** P 2 (1–3) · I-econ 3 (2–3) · I-pers 1 · I-cont 4 (3–4) · I-legal 3 (3–4) · contención 2 (2–3) · recuperación 2 (1–3).
- **Cálculo:** bruto sin copias, 30 días × USD 203 mil × 60% ≈ USD 3,7 M + créditos USD 0,2 M + respuesta USD 0,8–1,5 M ≈ USD 4,7–5,4 M / 32,1 M = 15–17% (3). Con restauración en 1–2 días (V), ≈ USD 1,3–1,9 M = 4–6% (2): un evaluador que mezcle V en I llega a 2 (A11).
- **Anomalías esperadas:** A1 en P (estadística frente a comparable), A11.
- **Faltantes deliberados:** ninguno.

### S29-P01-S03 · Error en un despliegue de software
- **Tensiona:** **C20** (registro propio con 11 casos en 5,75 años, uno o más por año → 5; estadística internacional del 34% → 3; la regla pide rango y uncertainty ≥ medium); §3.1 (las dos versiones de 2025-10 y 2026-04 detenidas en el 5% son antecedentes aunque se hayan contenido); la estadística mide interrupciones de más de 5 minutos, no versiones defectuosas: un evaluador debería notar que mide un evento posterior. §3.4 (−1 por el entorno de prueba con tráfico reproducido, verificado desde 2025-09).
- **Niveles pretendidos:** P 5 (3–5) · I-econ 1 · I-pers 1 · I-cont 1 · I-legal 3 (2–3) · contención 2 (1–2) · recuperación 1.
- **Cálculo:** 1 h de todo el tráfico: USD 14 mil × 60% + créditos USD 205 mil ≈ USD 0,21 M / 32,1 M = 0,7% (1).
- **Anomalías esperadas:** A1 en P (valor 5, 4 o 3 según la fuente que se tome y el ajuste); A8 de costado.
- **Faltantes deliberados:** ninguno.

### S29-R04 · Uso indebido de una credencial privilegiada con acceso a datos de tarjetas
- **Tensiona:** C04 y §2.1 (credencial válida como evento; 2024-10: ¿credencial robada sin uso = antecedente o precursor?); §2.3 test de la barrera (límite de 500 conversiones por hora: V, no I, aunque acote la cantidad de tarjetas); C20 de costado (caso propio de 2023-02, 3 años y 7 meses antes del corte, frente a estadística ≈ 0,2%); C22 de costado (nada que reponer).
- **Niveles pretendidos:** P 2 (1–3) · I-econ 4 (4–5) · I-pers 1 · I-cont 1 · I-legal 4 (3–4) · contención 2 (1–2) · recuperación **no_aplica**.
- **Cálculo:** bruto, 4,1 M de tarjetas × USD 3–8 = USD 12,3–32,8 M + forense USD 0,4–0,9 M ≈ USD 12,7–33,7 M / 32,1 M = 40–105% (4–5). Un evaluador que aplique el límite de conversiones en I bajaría a 1 (A11 / error de test de la barrera).
- **Anomalías esperadas:** A11, A1 en P y en I-econ.
- **Faltantes deliberados:** ninguno.

### S29-R05 · Fraude interno en las liquidaciones
- **Tensiona:** **C20** variante "historia propia sin ocurrencias" (§3.2 último punto: 9 años sin casos sólo excluye 4 y 5; decide la encuesta regional, 16 casos en 95 miembros-año ≈ 17% → 3); precursores 2025-11 y 2026-07; C10 (fidelidad con deducible de USD 250 mil, fuera de I y V).
- **Niveles pretendidos:** P 3 (2–3) · I-econ 2 (1–2) · I-pers 1 · I-cont 1 · I-legal 3 (2–3) · contención 3 (2–3) · recuperación 3 (3–4).
- **Cálculo:** un día del comercio más grande, USD 1,2 M + investigación USD 0,08–0,2 M ≈ USD 1,3–1,4 M / 32,1 M = 4% (2); mediana del sector USD 0,18 M + 0,1 M = 0,9% (1).
- **Anomalías esperadas:** A1 en P (si se toma la historia propia como "nunca" → 1–2) y A9 si se baja P porque la encuesta es autodeclarada.
- **Faltantes deliberados:** ninguno.

### S29-R06 · Incumplimiento de un requisito regulatorio de reporte
- **Tensiona:** C05 (Legal con ancla concreta: el próximo incumplimiento sería el tercero en 24 meses y obliga a plan de adecuación → 3; suspensión de altas posible → 4 como techo); separación multa (Económico) / sanción (Legal); C22 de costado (sanción pura, recuperación `no_aplica`); C19 y C02 de costado.
- **Niveles pretendidos:** P 5 (4–5) · I-econ 1 (1–2) · I-pers 1 · I-cont 1 · I-legal 3 (3–4) · contención 4 (3–4) · recuperación **no_aplica**.
- **Cálculo:** multa USD 20–400 mil + USD 10–30 mil = USD 0,03–0,43 M / 32,1 M = 0,1–1,3% (1); suspensión de 90 días, USD 0,9 M = 2,8% (2).
- **Anomalías esperadas:** A1 en Legal; A8.
- **Faltantes deliberados:** ninguno (cómo cuenta el regulador los casos previos al régimen nuevo queda como "qué falta confirmar", no como faltante).

### S29-R07 · Filtración de datos de comercios en el proveedor de verificación
- **Tensiona:** C13 / A6 (P de un evento en un tercero: ¿a quién se atribuyen los controles?); §9 con dos faltantes sobre el tercero; C18 (exclusión por proveedor sin auditoría vigente: el seguro no cubre lo que parece cubrir); el precursor de 2025-03 en el proveedor.
- **Niveles pretendidos:** P 3 (2–4) · I-econ 1 (1–2) · I-pers 1 · I-cont 2 (1–3) · I-legal 3 · contención 4 · recuperación 3 (o `no_aplica`; A1 esperada).
- **Cálculo:** 1.400 legajos: USD 35 mil + legal USD 60–150 mil ≈ USD 0,1–0,19 M = 0,3–0,6% (1); 31.000 legajos: USD 0,78 M + USD 0,15 M ≈ USD 0,93 M = 2,9% (2); multas de dos autoridades en el máximo (USD 3,5 M) llevarían a 3, que no es el escenario plausible.
- **Anomalías esperadas:** A6, A1 en recuperación (verificación manual de altas frente a datos irrecuperables).
- **Faltantes deliberados (tercero, proveedor de verificación):** cuántos legajos conserva el proveedor → **deja evaluable** (I-econ 1–2); qué controles tiene hoy el proveedor y si subcontrata el almacenamiento → **deja evaluable** (P 2–4, uncertainty high).

---

## S30 · Centro de datos regional (nombre de trabajo: el de S30 en §3.3)

**Contrastes y cómo:** C04 (dependencia de infraestructura física para servicios de clientes); C07 y C12 (2N en salas A y B, generadores N+1, derivación estática con actuación real, detección temprana con dos actuaciones reales, enfriadoras de reserva con actuación real); C16 (P01 con tres causas: red + generadores, UPS, error humano); C19 (R04, P01-S02, R06); C32 (124 clientes, de bancos y salud: lo que pierde el cliente frente a créditos con límite de 12 meses de cuotas); de costado C10 y C18 (`transferencia.md`: daño material con suma asegurada de USD 42 M frente a reposición de USD 45,4 M —infraseguro con cláusula de proporción—, espera de 72 h, exclusión de falla de red y de fibra sin daño, exclusión de corrosión; responsabilidad por incumplimiento con límite agregado de USD 10 M y sublímite de USD 2 M por cliente, sin créditos).

### S30-P01 · Pérdida de energía en las salas (padre)
- **Tensiona:** §1.4. Sub-riesgos con P y alcance distintos: S01 (todo el edificio, P baja), S02 (racks de una sola fuente, P media), S03 (hasta una sala, P media).
- **Determinante esperado:** S01 por Económico (2 × 3 × 3 = 18) frente a S03 (3 × 2 × 2 = 12) y S02 (3 × 1 × 2 = 6; con I-econ 3 por rescisión, 18). Empate posible S01/S02: A4 de costado.

### S30-P01-S01 · Corte de red con falla de arranque de los generadores
- **Tensiona:** C01 de costado dentro de la empresa (todo el edificio, nunca ocurrido); §3.2 con dato de jerarquía 1 (fallas de arranque por pedido) que lleva a nivel 1, frente al precursor de causa común (agua en el tanque 2 que alimenta a dos generadores) que lleva a 3; §3.4 +1.
- **Niveles pretendidos:** P 2 (1–3) · I-econ 3 (2–4) · I-pers 1 · I-cont 1 (1–2) · I-legal 2 (1–2) · contención 2 (2–3) · recuperación 3 (2–3).
- **Cálculo:** créditos 25% de USD 2,95 M = USD 0,74 M + USD 20–60 mil ≈ USD 0,8 M / 9,0 M = 8,9% (2); más de 4 h con reinicio: 50% = USD 1,48 M ≈ 17% (3); pérdida del cliente mayor (USD 2,6 M de margen) → 4 como techo.
- **Anomalías esperadas:** A1 en P y en I-econ (el crédito al 25% o al 50% depende de si se cuenta el reinicio de clientes).
- **Faltantes deliberados:** ninguno (el resultado del análisis de combustible de 2026-10 es posterior al corte).

### S30-P01-S02 · Falla de un sistema UPS
- **Tensiona:** C12 y test de la barrera (§2.3): los racks con dos fuentes no están expuestos (I) y las llaves de transferencia son barrera (V); 2024-08 como actuación real de la derivación estática (¿antecedente del evento o no, si no se cortó el camino?).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 1 (1–3) · I-pers 1 · I-cont 1 · I-legal 1 (1–2) · contención 2 (2–3) · recuperación 1 (1–2).
- **Cálculo:** créditos USD 65–130 mil + reparación USD 25–90 mil ≈ USD 0,09–0,22 M / 9,0 M = 1–2,4% (1–2); rescisión de 2 de los 10 mayores (USD 1,85 M de margen) = 21% (3) como techo.
- **Anomalías esperadas:** A11 (racks de una sola fuente: exposición o barrera), A1 en P.
- **Faltantes deliberados:** ninguno.

### S30-P01-S03 · Error durante un mantenimiento eléctrico
- **Tensiona:** §3.4 con ajustes en los dos sentidos (−1 por procedimiento y supervisor desde 2023-07; +1 por electricistas sin habilitación), que se compensan; el caso de 2023-06 queda a 3 años y 3 meses del corte (justo fuera del ancla 4).
- **Niveles pretendidos:** P 3 (2–4) · I-econ 2 (1–3) · I-pers 2 (1–2) · I-cont 1 · I-legal 1 (1–2) · contención 2 (2–3) · recuperación 1 (1–2).
- **Cálculo:** sala A completa: crédito USD 0,3 M + tablero USD 80–250 mil ≈ USD 0,38–0,55 M / 9,0 M = 4–6% (2).
- **Anomalías esperadas:** A1 en P; I-pers por la presencia de electricistas (la ficha describe que en tableros generales se trabaja desenergizado y que en tableros de sala la ropa supera la energía incidente).
- **Faltantes deliberados:** ninguno.

### S30-R04 · Falla de la refrigeración de una sala
- **Tensiona:** C19; §3.4 +1 por condiciones nuevas (días de calor en aumento, 3 enfriadoras sin rociado); antecedente propio de 2026-01 (pérdida parcial con un equipo apagado).
- **Niveles pretendidos:** P 4 (3–5) · I-econ 2 (2–3) · I-pers 1 · I-cont 1 (1–2) · I-legal 1 · contención 2 (2–3) · recuperación 2 (2–3).
- **Cálculo:** sala B: crédito del 25% USD 0,28 M + 10% de temperatura USD 0,11 M + reparación ≈ USD 0,4–0,5 M / 9,0 M = 4–6% (2).
- **Anomalías esperadas:** A1 en P (si 2026-01 cuenta como evento: la sala no perdió el agua helada sino capacidad).
- **Faltantes deliberados:** ninguno.

### S30-R05 · Incendio en una sala de datos
- **Tensiona:** C34 de costado (casi todo en Económico y Continuidad, pocas personas); §2.1 (¿el humo de 2022 y 2025 es ignición?); §3.2 base actuarial de jerarquía 1 (0,6% → 1) frente a historia propia con dos casos de humo (→ 4 si se cuentan): rango ancho; §5.3 con contención probada en la etapa temprana (detección + corte del rack) y sin prueba en la etapa de extinción.
- **Niveles pretendidos:** P 3 (2–4) · I-econ 5 · I-pers 3 (2–4) · I-cont 4 (4–5) · I-legal 4 (3–4) · contención 3 (2–4) · recuperación 4 (4–5).
- **Cálculo:** infraestructura USD 6–9 M + margen perdido USD 0,73 M × 7–10 meses = USD 5,1–7,3 M + créditos ≈ USD 11,5–16,8 M / 9,0 M = 128–187% (5). `consecuencia_extrema` esperada.
- **Anomalías esperadas:** A1 en P y contención; A3 si queda baja en el ranking.
- **Faltantes deliberados:** informe y nuevo ensayo de hermeticidad de la sala C y la inspección de cilindros vencida → **deja evaluable** (contención 2–4 porque la detección temprana y el corte del rack están probados con actuación real; si un evaluador la deja `unknown`, la cota de Económico 4 × 5 × 5 = 100 supera a las conocidas y el riesgo queda no evaluable: divergencia buscada sobre §9.2).

### S30-R06 · Acceso físico no autorizado a las salas
- **Tensiona:** C19; antecedente de 2025-03 (¿llegar al pasillo de la sala es el evento?) y de 2023-08 (fuera de los 3 años); test de la barrera con la cerradura de la jaula; C32/A6 (el daño es de los equipos de clientes).
- **Niveles pretendidos:** P 4 (2–4) · I-econ 1 (1–3) · I-pers 1 · I-cont 1 · I-legal 2 (2–3) · contención 3 (2–4) · recuperación **no_aplica**.
- **Cálculo:** auditoría USD 35 mil + reclamos acotados ≈ USD 0,05–0,15 M / 9,0 M = 0,6–1,7% (1); pérdida del cliente mayor (USD 2,6 M de margen) = 29% (3) como techo.
- **Anomalías esperadas:** A6, A1 en P.
- **Faltantes deliberados:** tarjetas activas sin conciliar → **deja evaluable** (refuerza P; no la cambia de rango).

### S30-R07 · Corte simultáneo de los dos proveedores de fibra
- **Tensiona:** C13; §3.3 nivel 5 por "condiciones presentes y activas" (obra de cloacas programada sobre el ducto común entre 2026-11 y 2027-03, dentro del horizonte) sin ningún antecedente propio del evento; C18 (exclusión de fibra sin daño).
- **Niveles pretendidos:** P 4 (3–5) · I-econ 2 (2–3) · I-pers 1 · I-cont 1 (1–2) · I-legal 1 (1–2) · contención 4 (4–5) · recuperación 5 (4–5).
- **Cálculo:** créditos USD 0,28–0,55 M / 9,0 M = 3–6% (2).
- **Anomalías esperadas:** A1 en P; A6 si se discute si la obra futura cuenta dentro de los 12 meses.
- **Faltantes deliberados:** ninguno (por dónde corren los cables de los proveedores propios de los clientes queda como dato de exposición).

### S30-R08 · Inundación por rotura de una cañería
- **Tensiona:** C19; §3.4 +1 (pérdida reparada en 2026-07 en el mismo tramo); base actuarial (1,2%) frente a historia propia (2019) y precursor; contención presente sin prueba (bandejas, válvula manual).
- **Niveles pretendidos:** P 3 (3–4) · I-econ 2 (2–3) · I-pers 1 (1–2) · I-cont 3 (3–4) · I-legal 1 · contención 4 (3–4) · recuperación 3 (3–4).
- **Cálculo:** distribución USD 0,4 M + créditos USD 52–105 mil + margen USD 0,07–0,14 M ≈ USD 0,52–0,65 M / 9,0 M = 6–7% (2); con tablero de sala, ≈ USD 0,9 M = 10% (3).
- **Anomalías esperadas:** A1 en I-cont (7% de racks durante 2 a 4 semanas: degradación un nivel abajo).
- **Faltantes deliberados:** antigüedad y material de la cañería → **deja evaluable** (P 3–4).

---

## Faltantes deliberados de la tanda, por alcance

| risk_id | Faltante | Alcance pretendido |
|---|---|---|
| S04-R03 | Inventario de contenedores con datos personales | **No deja evaluable** (I-econ `unknown`, cota > C_raw conocido) |
| S04-R01 | Replicación de copias fuera de la región; tiempo de reconstrucción | Deja evaluable |
| S04-R02 | Texto del contrato renovado con el cliente principal | Deja evaluable |
| S04-R04 | Personas del contratista que conocen las contraseñas | Deja evaluable |
| S04-R05 | Parte de la orden de trabajo que puede hacer el resto del equipo | Deja evaluable |
| S04-R06 | Vulnerabilidades de las dependencias del módulo heredado | Deja evaluable |
| S29-P01-S01 | Dependencias globales entre regiones (tercero: proveedor de nube) | Deja evaluable |
| S29-R07 | Legajos que conserva el proveedor; sus controles; subcontratista (tercero: proveedor de verificación) | Deja evaluable |
| S30-R05 | Hermeticidad de la sala C tras la reparación; inspección de cilindros | Deja evaluable (no evaluable si la contención se deja `unknown`) |
| S30-R06 | Tarjetas activas sin conciliar | Deja evaluable |
| S30-R08 | Antigüedad y material de la cañería | Deja evaluable |

## Riesgos corrientes (C19) de cada empresa

- **S04:** S04-R07 (incumplimiento mensual del SLA) y S04-R06 (vulnerabilidad en dependencia).
- **S29:** S29-R06 (reporte regulatorio) y S29-R05 (fraude interno en liquidaciones); de costado S29-P01-S03.
- **S30:** S30-R04 (refrigeración), S30-P01-S02 (UPS) y S30-R06 (acceso físico).

## Riesgos del diseño que no se sostienen

- **S04-R07** se solapa con S04-R01 y con las fallas de despliegue: el incumplimiento del SLA es un resultado de cortes que son eventos de otros riesgos. Se construyó igual y se aprovecha para probar §2.1.3, pero es probable que los dos evaluadores registren A7; no es un caso C25 diseñado.
- **S29-P01-S01 y S29-P01-S03** tienen consecuencias económicas menores al 1% del RO; con P alta, el padre queda determinado por Legal (notificación obligatoria). Es coherente con la escala de S29 (C09), pero el padre puede quedar en una posición que un evaluador juzgue baja (A8).
- **S30-P01**: el cambio respecto de la cobertura es sólo de hechos (la exposición de electricistas en S03 se describe con energía incidente menor que la protección para no romper la "misma consecuencia" del padre). Si se hubiera dejado la exposición a arco eléctrico en tableros generales, S03 habría tenido una consecuencia de Personas propia y el padre no se sostendría como tal.
- Ajustes de escala respecto de la cobertura: S04 RO 2025 USD 2,0 M (facturación USD 12,1 M); S29 facturación 2025 USD 181 M y RO USD 27,4 M / 30,9 M / 32,1 M; S30 facturación 2025 USD 35,4 M y RO 2025 USD 9,0 M. Ninguno cambia un contraste.

## Avisos de la Fase 5 aplicados

El 2026-10-06 se agregaron a las 22 fichas los datos que piden los 5 avisos de `v0/fase-5/avisos-fase-7.md`: margen o costos que dejan de pagarse cuando hay ventas perdidas; si los montos de antecedentes son brutos o con la respuesta actuando; verificación en 12 meses de barreras pasivas; comparación de controles y condiciones con el sector (o que no se sabe); frecuencia anual observada. Ningún nivel pretendido según v0.1 cambia. Para v0.2 conviene mirar: S04-R02, S04-R03, S04-R06 y S30-R06 traen controles peores que el sector (posible ajuste de P hacia arriba); S29-P01-S02 y S30-R05 traen controles mejores que el sector; S29-P01-S03 tiene dos versiones defectuosas en los últimos 12 meses (refuerza P 5).
