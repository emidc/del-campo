# Cobertura de EMI-41 · empresas sintéticas

> Fecha: 2026-10-05 · Fase 6 del plan EMI-15 + EMI-41 · **v2 aprobada por Emiliano** (2026-10-06 10:36 UTC, los 14 puntos de "Para aprobar").
> Se apoya en `metodologia-v0.md` **metodologia v0.1**, `protocolo.md` **protocolo v0.1**, `decisiones-v0.md` v0.1 y `fuentes/respuestas-emiliano.md`. No usa resultados de la Fase 4 (dry run), que corre en paralelo.
> Las filas de changelog que fija este diseño se agregaron a `changelog-metodologia.md` como CH-075 a CH-078. La matriz completa empresa × contraste está en `matriz-cobertura.csv`.

**Historia de este documento.** El borrador v1 (21:13 UTC) proponía cinco empresas y 38 fichas. A las 21:23 UTC Emiliano aprobó esas cinco y pidió agregar 36 empresas suyas. Cuatro de ellas coinciden con diseños del v1 y se fusionan: Química Cuyo (ex E1), CuyoPay (ex E3), Empaque Andino (ex E4) y Centro Médico Cuyo (ex E5); en cada una se conserva el diseño del v1 con el nombre de Emiliano. La fábrica de muebles (ex E2) no tiene par en su lista y queda como S37. Resultado: **37 empresas**. A las 21:27 UTC Emiliano eligió que la Fase 8 se haga con una **muestra de 30 fichas sorteadas por familia de actividad** (sección 6).

**Abreviaturas.** *metodología* = `v0/metodologia-v0.md` · *protocolo* = `v0/protocolo.md` · *plan* = `fuentes/plan-emi15-emi41.md` · *respuestas* = `fuentes/respuestas-emiliano.md` · *evaluación* = `evaluacion-plan-emi15-emi41.md` · RO = resultado operativo anual · CP-NN = caso de propiedad · SNN = empresa sintética (la numeración sigue la lista de Emiliano; S37 es la fábrica de muebles).

---

## 1. Propósito y regla de ciego

Este documento elige qué empresas sintéticas construye la Fase 7, por el problema metodológico que cada una permite probar y no por industria. Las empresas cumplen tres funciones: tensionar la metodología con situaciones más parecidas a una cartera real que los casos de propiedad, alimentar la evaluación ciega de la Fase 8 y dar población a la calibración de la Fase 9 (revisión I15); además, al cierre de EMI-41 son el dataset reutilizable de Risk OS (plan, Fase 14). **Regla de ciego:** Emiliano aprueba este documento y después evalúa a ciegas una muestra de estos riesgos. Por eso acá sólo hay empresas y contrastes **a nivel de empresa**: ningún riesgo lleva nivel pretendido de P, I o V, ni dice qué debería quedar arriba, y los riesgos tienen títulos neutros, sin adjetivos de frecuencia o gravedad. La intención de diseño por riesgo la escribe la Fase 7 en un archivo cerrado (sección 8, regla 7). Lo que este documento sí revela (qué contrastes cubre cada empresa) es una contaminación conocida y acotada, que el informe de la Fase 8 declara (Para aprobar, punto 10).

---

## 2. Inventario de contrastes

"Casos de propiedad" dice qué caso ya lo prueba, según la matriz de cobertura de `anexo-casos-diseno.md` (único apartado leído de ese anexo) y los títulos de los casos. Cuando el caso que lo cubre es **caso de origen** de la regla en metodología v0.1, su resultado en la Fase 4 es circular (metodología, "Marcas"): las empresas sintéticas son entonces la primera evidencia no circular.

### 2.1 Contrastes del plan

| # | Contraste | Qué regla o propiedad pone a prueba | Casos de propiedad |
|---|---|---|---|
| C01 | Alta severidad / baja probabilidad | Producto P × I × V frente a riesgos remotos y graves (D14, §14.7); `consecuencia_extrema` y `safety_critical` sin piso (§8); contradicción #2 en la Fase 9 | CP-02, CP-15 |
| C02 | Alta frecuencia / baja severidad | Que el producto no suba lo frecuente y menor por encima de lo grave (A8); anclas altas de P (§3.3) | CP-02 |
| C03 | Exposición humana | Personas con `safety_critical` en I-pers ≥ 4 (D23, §4.3, §8.2); contención como único V de Personas (§5.5); test de la barrera para exposición (§2.3) | CP-02, CP-15, CP-18 (origen de §2.3 y §8.2) |
| C04 | Dependencia tecnológica | Corte P/V en incidentes de sistemas (§2.1, credencial como evento iniciador); recuperación por restauración de datos (§5.4) | CP-07 (origen de §2.1) |
| C05 | Regulación fuerte | Dimensión Legal con anclas reales (§4.5); separación multa (Económico) y sanción (Legal) | CP-13 (origen de §4.4) |
| C06 | Concentración de activos | Un solo sitio o equipo frente a activos dispersos; Continuidad bruta con reposición de mercado (§2.4, §4.4) | CP-05 |
| C07 | Alta resiliencia | Rúbricas de contención y recuperación en sus niveles probados (§5.2–§5.4) | CP-03 |
| C08 | Alta vulnerabilidad | Rúbricas en sus niveles sin prueba o sin medida; falta de plan de continuidad a V (§2.4) | CP-16 (origen de §2.4) |
| C09 | PyME vs empresa grande | Ancla económica relativa al RO (§4.2): un mismo tipo de evento en dos escalas | CP-11 (origen de §4.2) |
| C10 | Transferencia aseguradora relevante | Seguro fuera de I y de V (D17, §4.1.7); exposición retenida visible (§13) | CP-09, CP-17 (origen de §11.3) |
| C11 | Información incompleta | `unknown`, rango de hasta tres niveles, no evaluable, cola de validación (§9); procedencia de EMI-17 | CP-08 (origen de §9) |
| C12 | Operaciones altamente redundantes | Recuperación probada (§5.4); V por dimensión (§5.5) | CP-14 (origen de §5.5), de costado |
| C13 | Exposición a terceros | Proveedores, clientes y contratistas críticos, y terceros afectados (vecinos, pacientes, alumnos, trabajadores de un contratista); a qué organización se atribuye P, I y V (A6) | Sin caso identificado en la matriz |

### 2.2 Contrastes que dejaron sin probar los casos de propiedad o la metodología v0.1

| # | Contraste | Qué regla o propiedad pone a prueba | Casos de propiedad |
|---|---|---|---|
| C14 | Evento probable fuera del horizonte de 12 meses | D3, metodología §1.1.2 y §3.1: qué P recibe un evento anunciado para dentro de más de un año; si aparece A6 | Ninguno ("Entradas sin ningún caso") |
| C15 | Resultado operativo nulo o negativo | Fallbacks de la magnitud de referencia (§4.2, puntos 2 a 4): promedio de ejercicios positivos, otra medida con A6, y `i_econ = unknown` | Ninguno |
| C16 | Riesgo padre con sub-riesgos de causas distintas | Prioridad por sub-riesgo determinante (§1.4) e invariancia de granularidad (§14.2), que es hipótesis | CP-12 (origen de §1.4) |
| C17 | Escenario por causa común plausible y material | Criterio de creación, I conjunta y separación del ranking (§10, §14.5) | CP-20 (origen de §10) |
| C18 | Pólizas con límite, sublímite, deducible y exclusiones relevantes | Exposición retenida cuando el seguro no cubre lo que parece cubrir (§11.3, §13); que nada de eso entre en I ni en V | CP-09, CP-17 cubren límite; deducible, exclusiones e infraseguro sin caso |
| C19 | Riesgos corrientes de severidad media | Que la población no sea toda extrema: frecuencia de `consecuencia_extrema` (contradicción #3) y calibración sobre una población parecida a la real (I15) | Ninguno: 14 de los 20 casos tienen alguna dimensión en 5 |

### 2.3 Contrastes que agrega esta fase

C20 a C25 salen del borrador v1; C26 a C35, de lo que agregan las empresas de Emiliano.

| # | Contraste | Qué regla o propiedad pone a prueba | Casos de propiedad |
|---|---|---|---|
| C20 | Fuentes de P que divergen | Jerarquía de evidencia y rango obligatorio cuando dos fuentes de jerarquía 1 o 2 no coinciden (§3.2); historia propia sin ocurrencias (§3.2, último punto) | Ninguno |
| C21 | Margen de contribución desconocido | Rango económico entre margen operativo y facturación perdida, y `unknown` si cruza un corte (§4.2, "Monto", punto 3) | Ninguno |
| C22 | Recuperación sin nada que reponer | `v_rec = no_aplica` (§5.5.2) en daños a personas o sanciones puras | Ninguno identificado |
| C23 | Estacionalidad | Si el escenario plausible de I (§4.1.4) toma el momento del año en que el evento es más dañino o uno promedio; posible A6 o A1 | Ninguno |
| C24 | Reglas cuya única evidencia es circular | Corte P/V con controles pasivos (§2.2.4), test de la barrera (§2.3), falta de plan de continuidad (§2.4), aplicadas en riesgos no diseñados como casos de origen | CP-06, CP-07, CP-16, CP-18, todos de origen |
| C25 | Granularidad ambigua en lista fija | Que un evaluador detecte y registre A7 sin repartir la lista (protocolo §3; metodología §1.3.4) | CP-12, de costado |
| C26 | Responsabilidad por producto y retiro del mercado | Consecuencia que ocurre en clientes o consumidores fuera de la organización: cómo se reparte entre Económico, Personas y Legal (§4.1.3), y si el evento iniciador es la contaminación o la venta (§2.1) | Ninguno |
| C27 | Exposición humana cambiante u operación móvil | Personas expuestas que cambian según la obra, la locación o el evento: qué es "exposición actual" (§4.1.6) y si corresponde partir (§1.3) | Ninguno |
| C28 | Personas vulnerables o multitudes | Menores, pacientes, huéspedes y público que no se evacúan solos: contención de Personas (§5.3) y número plausible de víctimas (§4.3) | CP-15, de costado |
| C29 | Tecnología sin historia sectorial | P sin fuentes de jerarquía 1 a 4 (`p_base = assumed`, §3.2) y `uncertainty` alta, sin que eso baje ni suba la criticidad (D9) | Ninguno |
| C30 | Gobernanza y muchos terceros | Causas que dependen de cientos de socios o proveedores con calidad desigual: a quién se atribuyen los controles preventivos (§2.2) | Ninguno |
| C31 | Ciclo productivo largo | Stock o producción que tarda más de un año en reponerse: Continuidad y Económico cuando la reposición normal supera el horizonte (§2.4, §4.4) | Ninguno |
| C32 | Servicio crítico para clientes | La organización entrega un servicio del que dependen otras: qué parte del daño del cliente es consecuencia para la organización (§4.1) | Ninguno |
| C33 | Multi-sitio con redundancia natural | Muchos sitios parecidos: si la redundancia es V-recuperación o hace que la consecuencia bruta sea pequeña (test de la barrera, §2.3) | CP-05, de costado |
| C34 | Baja exposición humana, activos de alto valor | Riesgos donde casi sólo hay Económico y Continuidad: si V por dimensión (§5.5) se comporta igual que con varias dimensiones | Ninguno |
| C35 | Evento gradual o exposición crónica | Eventos sin instante claro (polvo de sílice, degradación de equipos, autocalentamiento): dónde está el evento iniciador (§2.1) y qué es P en 12 meses; posible A6 | Ninguno |

---

## 3. Conjunto de empresas

37 empresas en 7 familias de actividad. Todas son sintéticas; los nombres son de trabajo (sección 8, regla 9). Los números de escala son de diseño: la Fase 7 puede ajustarlos para que cierren entre sí, sin cambiar el contraste que la empresa aporta (Para aprobar, punto 12). Cada empresa tiene al menos dos riesgos corrientes para su actividad (C19); cuáles son lo decide la Fase 7 y lo escribe sólo en el archivo cerrado.

### 3.1 Resumen

| Código | Empresa | Arquetipo | Familia | Fichas | Padre | Escenario |
|---|---|---|---|---|---|---|
| S01 | Bodega Andina S.A. | Bodega mediana integrada | Agro y alimentos | 7 |  |  |
| S02 | Metalúrgica Cuyo S.A. | Industria metalmecánica | Industria y construcción | 7 |  |  |
| S03 | Logística del Oeste S.R.L. | Transporte y depósito | Comercio y logística | 7 |  |  |
| S04 | NubeSur Software S.A. | SaaS B2B | Tecnología y pagos | 7 |  |  |
| S05 | Constructora Cordillera S.A. | Obras múltiples | Industria y construcción | 9 | sí |  |
| S06 | Frío Mendoza S.R.L. | Cámara frigorífica PyME | Agro y alimentos | 6 |  |  |
| S07 | Cobre Cordillerano S.A. | Cobre a cielo abierto y flotación | Minería | 9 |  | sí |
| S08 | Patagonia Oro y Plata S.A. | Minería subterránea | Minería | 7 |  |  |
| S09 | Litio de la Puna S.A. | Litio en salmuera y evaporación | Minería | 7 |  |  |
| S10 | Canteras Argentinas S.R.L. | Caliza y áridos a cielo abierto | Minería | 7 |  |  |
| S11 | Oro Andino S.A. | Oro a cielo abierto y lixiviación en pilas | Minería | 7 |  |  |
| S12 | Litio Directo S.A. | Extracción directa de litio (DLE) | Minería | 6 |  |  |
| S13 | Andes Insumos Técnicos S.A. | Distribución de insumos enológicos y mineros | Comercio y logística | 6 |  |  |
| S14 | Cordillera Hospitality Group S.A. | Hotel 4★ con restaurante, eventos y spa | Servicios a personas | 7 |  |  |
| S15 | Viñedos del Valle S.A. | Producción primaria de uva | Agro y alimentos | 6 |  |  |
| S16 | Cooperativa Vitivinícola Regional | Cooperativa de pequeños productores | Agro y alimentos | 6 |  |  |
| S17 | Mostos y Concentrados Cuyo S.A. | Procesamiento industrial vitícola | Agro y alimentos | 6 |  |  |
| S18 | Frigorífico Pampeano S.A. | Faena y procesamiento cárnico | Agro y alimentos | 7 |  |  |
| S19 | Lácteos del Sur S.A. | Planta láctea | Agro y alimentos | 7 |  | sí |
| S20 | AgroSilos Centro S.A. | Acopio de cereales | Agro y alimentos | 6 |  |  |
| S21 | Empaque Andino S.A. | Fruta fresca, empaque y frío (ex E4) | Agro y alimentos | 8 |  |  |
| S22 | Química Cuyo S.A. | Productos químicos industriales (ex E1) | Industria y construcción | 10 |  | sí |
| S23 | Autopartes Andinas S.A. | Proveedor industrial just-in-time | Industria y construcción | 6 |  |  |
| S24 | Plásticos del Oeste S.A. | Inyección y extrusión | Industria y construcción | 6 |  |  |
| S25 | Farmacéutica Regional S.A. | Fabricación de medicamentos | Industria y construcción | 6 |  |  |
| S26 | Centro Médico Cuyo S.A. | Clínica privada (ex E5) | Servicios a personas | 7 |  |  |
| S27 | Red Farmacias Andinas S.A. | Cadena de farmacias | Comercio y logística | 6 |  |  |
| S28 | Supermercados Regionales S.A. | 15 locales y un centro de distribución | Comercio y logística | 7 |  |  |
| S29 | CuyoPay S.A. | Fintech / pagos (ex E3) | Tecnología y pagos | 7 | sí |  |
| S30 | DataCenter Andino S.A. | Centro de datos regional | Tecnología y pagos | 8 | sí |  |
| S31 | Petrolera Neuquén S.A. | Upstream no convencional | Energía y agua | 6 |  |  |
| S32 | Servicios Petroleros Patagonia S.A. | Servicios a operadoras | Energía y agua | 6 |  |  |
| S33 | Energía Solar Cuyo S.A. | Parque fotovoltaico | Energía y agua | 6 |  |  |
| S34 | Aguas Industriales Cuyo S.A. | Tratamiento de agua para minas y bodegas | Energía y agua | 6 |  |  |
| S35 | Eventos & Catering Mendoza S.R.L. | Catering y eventos temporales | Servicios a personas | 6 |  |  |
| S36 | Colegio Privado Andino | Educación K–12 | Servicios a personas | 7 |  |  |
| S37 | Muebles a medida (PyME, sin par en la lista; ex E2) | Fábrica de muebles a medida | Industria y construcción | 7 |  |  |

### 3.2 Empresas que vienen del borrador v1

Conservan el diseño del v1 con el nombre de la lista de Emiliano.

#### S22 · Química Cuyo S.A. (ex E1)

- **Arquetipo:** productos químicos industriales; formula y envasa productos de limpieza y desinfección industrial a partir de solventes inflamables, ácidos y cloro que recibe en cisternas. **Familia:** Industria y construcción.
- **Escala:** 220 empleados en dos turnos. Facturación USD 60 M; RO de los tres últimos ejercicios, todos positivos, alrededor de USD 6 M. Margen de contribución conocido.
- **Ubicación genérica:** una sola planta en un parque industrial en zona baja, lindera con un barrio residencial y con un arroyo.
- **Contrastes:** C01, C03, C05, C06, C10, C13, C17, C18, C19, C22, C24, C26; de costado C02, C09, C11.
- **Riesgos planeados (10 fichas):**
  1. Incendio en el depósito de solventes inflamables.
  2. Liberación de cloro gaseoso durante la descarga de una cisterna.
  3. Derrame de producto al desagüe pluvial y al arroyo.
  4. Accidente con autoelevador en la playa de carga.
  5. Lesiones por contacto con producto corrosivo en el envasado.
  6. Rotura del reactor de mezcla principal.
  7. Inundación del predio por desborde del arroyo.
  8. Sanción por incumplimiento de la habilitación ambiental de vertidos.
  9. Venta de un lote fuera de especificación que daña instalaciones de un cliente.
  - **Escenario por causa común candidato:** lluvia extrema que produce a la vez la inundación del predio (7) y el derrame al arroyo (3). La Fase 7 deja los hechos para que el evaluador decida si es plausible y material (§10.2); si no lo es, el evaluador no lo crea y registra A7.
- **Información que va a faltar:** la Fase 7 elige qué dato falta y en qué riesgo; en esta empresa, ninguno de los faltantes es la escala económica.
- **Póliza:** todo riesgo operativo (daño material y pérdida de beneficio) con deducible, sublímite de pérdida de beneficio y exclusión de contaminación gradual; responsabilidad civil y por producto con límite por evento.

#### S29 · CuyoPay S.A. (ex E3)

- **Arquetipo:** fintech de pagos; autoriza y liquida pagos con tarjeta para comercios, bajo licencia de proveedor de servicios de pago de un regulador financiero genérico. **Familia:** Tecnología y pagos.
- **Escala:** 600 empleados. Facturación USD 180 M; RO de los tres últimos ejercicios, positivos, alrededor de USD 30 M. Margen de contribución conocido.
- **Ubicación genérica:** oficinas en una capital; producción en un proveedor de nube con dos regiones activas.
- **Contrastes:** C04, C05, C07, C10, C12, C13, C16, C18, C19, C20; de costado C02, C09.
- **Riesgos planeados (4 + 1 padre con 3 sub-riesgos = 7 fichas):**
  - **Padre:** indisponibilidad del servicio de autorización de pagos. Sub-riesgos:
    1. Falla del proveedor de nube que alcanza las dos regiones.
    2. Ransomware sobre la infraestructura de producción.
    3. Error en un despliegue de software.
  4. Uso indebido de una credencial privilegiada con acceso a datos de tarjetas.
  5. Fraude interno en las liquidaciones a comercios.
  6. Incumplimiento de un requisito regulatorio de reporte.
  7. Filtración de datos de comercios en un proveedor tercerizado de verificación de identidad.
- **Información que va a faltar:** la Fase 7 elige; al menos un faltante es sobre un tercero (proveedor de nube o de verificación).
- **Fuentes divergentes (C20):** para al menos un riesgo, la historia propia y una estadística sectorial indican cosas distintas.
- **Póliza:** ciber con sublímite de extorsión, deducible, período de espera para la interrupción y exclusión de fallas de infraestructura del proveedor de nube.

#### S21 · Empaque Andino S.A. (ex E4)

- **Arquetipo:** fruta fresca, empaque y frío; produce fruta en fincas propias, la empaca, la conserva en frío y la exporta por mar a dos mercados. **Familia:** Agro y alimentos.
- **Escala:** 120 empleados permanentes y unos 900 temporarios en cosecha. Facturación USD 40 M, muy concentrada en cuatro meses; RO positivo y variable entre ejercicios, alrededor de USD 4 M. Margen de contribución conocido sólo en forma aproximada (C21).
- **Ubicación genérica:** tres fincas a decenas de kilómetros entre sí, un empaque y un frigorífico único; embarca por un solo puerto.
- **Contrastes:** C03, C06, C10, C13, C14, C18, C19, C21, C23; de costado C01, C05.
- **Riesgos planeados (8 fichas):**
  1. Granizo sobre las fincas.
  2. Helada tardía en floración.
  3. Falla del sistema de frío del frigorífico.
  4. Rechazo de embarques en destino por detección de una plaga cuarentenaria.
  5. Accidente vial del transporte contratado de trabajadores de cosecha.
  6. Paro en el puerto de embarque.
  7. Incendio en la planta de empaque.
  8. Nueva exigencia fitosanitaria del mercado principal, anunciada con entrada en vigor dentro de 18 meses.
- **Información que va a faltar:** la Fase 7 elige; al menos un faltante es sobre el contratista de transporte.
- **Póliza:** seguro agrícola de granizo con deducible por finca y exclusión de helada; seguro de transporte de la carga con exclusión de rechazo sanitario en destino.

#### S26 · Centro Médico Cuyo S.A. (ex E5)

- **Arquetipo:** clínica privada de 120 camas con terapia intensiva, quirófanos y guardia. **Familia:** Servicios a personas.
- **Escala:** 700 empleados. Ingresos USD 50 M. **Resultado operativo nulo o levemente negativo en los tres últimos ejercicios** (fallback 3 de §4.2: otra medida económica nombrada y A6).
- **Ubicación genérica:** un solo edificio en una ciudad grande.
- **Contrastes:** C01, C03, C04, C05, C11, C12, C15, C19, C20, C22, C24, C28; de costado C07, C09, C13.
- **Riesgos planeados (7 fichas):**
  1. Corte del suministro eléctrico externo.
  2. Brote de infección por bacteria multirresistente en terapia intensiva.
  3. Error de medicación en internación.
  4. Interrupción del suministro de oxígeno medicinal.
  5. Ransomware sobre la historia clínica electrónica y los sistemas de turnos.
  6. Incendio en el área de quirófanos.
  7. Suspensión de la habilitación de terapia intensiva tras una inspección.
- **Información que va a faltar:** no hay registro sistemático de eventos adversos; la Fase 7 agrega al menos un faltante sobre el estado de prueba de una medida de respaldo.
- **Fuentes divergentes (C20):** para al menos un riesgo, el registro propio y una estadística sectorial indican cosas distintas.
- **Póliza:** responsabilidad civil profesional con límite por evento y agregado anual; daño material del edificio y equipos.

#### S37 · Fábrica de muebles a medida (PyME; ex E2)

- **Arquetipo:** fabrica muebles a medida para oficinas y comercios con sierras, tupí, un centro de mecanizado CNC y una cabina de barnizado. **Familia:** Industria y construcción.
- **Escala:** 28 empleados en un turno. Facturación USD 2,4 M. **Último ejercicio con pérdida; uno de los dos anteriores positivo** (fallback 2 de §4.2). El dueño no conoce el margen de contribución.
- **Ubicación genérica:** un solo galpón alquilado en las afueras de una ciudad intermedia.
- **Contrastes:** C02, C06, C08, C09, C11, C15, C18, C19, C21, C22, C24; de costado C03, C04.
- **Riesgos planeados (7 fichas):**
  1. Incendio en el taller.
  2. Contacto de un operario con la hoja de la sierra o del tupí.
  3. Cortes, golpes y lesiones por esfuerzo en el taller.
  4. Rotura del centro de mecanizado CNC.
  5. Pérdida del principal cliente corporativo.
  6. Robo de herramientas y máquinas portátiles.
  7. Ransomware en la computadora de gestión y facturación.
- **Información que va a faltar:** no hay registros formales de incidentes; casi todo llega como `reported` por el dueño. Falta el margen de contribución. La Fase 7 agrega al menos un faltante más que no sea económico.
- **Póliza:** seguro integral de comercio con suma asegurada de incendio desactualizada respecto del valor de reposición (infraseguro) y sin cobertura de pérdida de beneficio.
- **Comparación de escala (C09):** el incendio (1) y el ransomware (7) tienen pares del mismo tipo en S22, S29 y S26.

### 3.3 Empresas de la lista de Emiliano

Para estas 32 empresas el diseño es más breve: 6 a 9 fichas cada una (plan, Fase 7: 6 a 12), con lo que tiene que existir para que la Fase 7 las construya.

#### S01 · Bodega Andina S.A.

- **Arquetipo:** Bodega mediana integrada. **Familia:** Agro y alimentos.
- **Escala:** Mediana: 180 empleados, facturación USD 25 M, RO de los tres últimos ejercicios positivo, alrededor de USD 3 M; vino en crianza que representa más de un año de ventas.
- **Ubicación genérica:** Viñedos propios, una bodega con nave de barricas y una línea de embotellado en el mismo predio; exporta la mitad de lo que vende.
- **Contrastes:** C06, C13, C18, C19, C23, C26, C31; de costado C03, C10, C22.
- **Riesgos planeados (7 fichas):**
  1. Incendio en la nave de barricas.
  2. Contaminación de un lote de vino durante la elaboración.
  3. Rotura de un tanque de acero con pérdida de vino.
  4. Falla de la línea de embotellado.
  5. Rechazo de un embarque de exportación por un residuo fuera de norma.
  6. Granizo sobre los viñedos propios.
  7. Accidente de un operario dentro de un tanque (espacio confinado).
- **Información que va a faltar:** La Fase 7 elige; al menos un faltante sobre el valor del stock en crianza.
- **Póliza:** Daño material con valuación del stock a costo y no a precio de venta; sin pérdida de beneficio.

#### S02 · Metalúrgica Cuyo S.A.

- **Arquetipo:** Industria metalmecánica. **Familia:** Industria y construcción.
- **Escala:** Mediana: 140 empleados en dos turnos, facturación USD 18 M, RO alrededor de USD 1,5 M.
- **Ubicación genérica:** Una nave con prensas, puente grúa, soldadura y pintura, en un parque industrial.
- **Contrastes:** C03, C06, C19, C22, C24; de costado C02, C13, C10.
- **Riesgos planeados (7 fichas):**
  1. Atrapamiento de un operario en una prensa.
  2. Caída de una carga desde el puente grúa.
  3. Incendio en la nave iniciado en el sector de soldadura.
  4. Proyección de partículas a los ojos en amolado.
  5. Rotura de la prensa principal.
  6. Corte del suministro eléctrico de la red.
  7. Incumplimiento de una entrega al cliente principal.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Todo riesgo operativo con deducible; riesgos del trabajo obligatorio.

#### S03 · Logística del Oeste S.R.L.

- **Arquetipo:** Transporte y depósito. **Familia:** Comercio y logística.
- **Escala:** Mediana: 160 empleados, 80 camiones propios, facturación USD 20 M, RO alrededor de USD 1,2 M.
- **Ubicación genérica:** Un depósito de mercadería de terceros y una base de flota; recorre rutas regionales.
- **Contrastes:** C02, C04, C13, C19, C33; de costado C03, C18, C11.
- **Riesgos planeados (7 fichas):**
  1. Siniestro vial de un camión propio.
  2. Robo de carga en ruta.
  3. Robo en el depósito.
  4. Caída del sistema de gestión del depósito, sin soporte del fabricante.
  5. Incendio en el depósito con mercadería de clientes.
  6. Lesiones en la carga y descarga.
  7. Daño a mercadería de clientes por manipulación.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre el sistema antiguo.
- **Póliza:** Responsabilidad del transportista con límite por camión y exclusión de robo sin custodia; flota con franquicia.

#### S04 · NubeSur Software S.A.

- **Arquetipo:** SaaS B2B. **Familia:** Tecnología y pagos.
- **Escala:** Mediana: 90 empleados, facturación USD 12 M, RO alrededor de USD 2 M.
- **Ubicación genérica:** Oficinas en una ciudad; producción en una sola región de un proveedor de nube.
- **Contrastes:** C04, C08, C13, C19, C32; de costado C11, C22, C09.
- **Riesgos planeados (7 fichas):**
  1. Falla regional del proveedor de nube.
  2. Ransomware sobre la infraestructura de producción.
  3. Filtración de datos de clientes por un error de configuración.
  4. Uso indebido de una credencial de soporte.
  5. Salida simultánea de las dos personas que conocen el núcleo del sistema.
  6. Explotación de una vulnerabilidad en una dependencia de software de terceros.
  7. Incumplimiento del acuerdo de nivel de servicio con el cliente principal.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Ninguna póliza ciber.

#### S05 · Constructora Cordillera S.A.

- **Arquetipo:** Obras múltiples. **Familia:** Industria y construcción.
- **Escala:** Mediana-grande: 450 empleados propios y unos 300 de subcontratistas, facturación USD 70 M, RO alrededor de USD 5 M.
- **Ubicación genérica:** Cuatro obras simultáneas (un edificio en altura, una obra vial, una nave industrial, una escuela) en tres ciudades.
- **Contrastes:** C03, C13, C16, C19, C27; de costado C18, C10.
- **Riesgos planeados (9 fichas):**
  - **Padre:** Caída de un trabajador desde altura. Sub-riesgos:
    1. En el edificio en altura.
    2. En la nave industrial.
    3. En la obra vial (puentes y alcantarillas).
  4. Derrumbe de una excavación.
  5. Caída de una carga de la grúa torre sobre la vía pública.
  6. Accidente de un trabajador de un subcontratista.
  7. Robo de materiales y herramientas en obra.
  8. Atraso de una obra con multa contractual.
  9. Daño a una construcción lindera.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre la dotación real de subcontratistas.
- **Póliza:** Todo riesgo construcción por obra con deducible; responsabilidad civil con sublímite por linderos.

#### S06 · Frío Mendoza S.R.L.

- **Arquetipo:** Cámara frigorífica PyME. **Familia:** Agro y alimentos.
- **Escala:** PyME: 22 empleados, facturación USD 1,8 M, RO alrededor de USD 120 mil; guarda fruta de terceros.
- **Ubicación genérica:** Un solo predio con cuatro cámaras y un compresor central.
- **Contrastes:** C06, C08, C09, C13, C19, C23; de costado C11, C21, C18.
- **Riesgos planeados (6 fichas):**
  1. Falla del compresor central.
  2. Corte del suministro eléctrico de la red.
  3. Fuga de refrigerante.
  4. Incendio en los paneles aislantes.
  5. Pérdida del principal cliente.
  6. Accidente con autoelevador dentro de una cámara.
- **Información que va a faltar:** La Fase 7 elige; el dueño no conoce el margen de contribución.
- **Póliza:** Incendio sobre el edificio; la mercadería de terceros no está asegurada por la empresa.

#### S07 · Cobre Cordillerano S.A.

- **Arquetipo:** Cobre a cielo abierto y flotación. **Familia:** Minería.
- **Escala:** Grande: 2.300 empleados propios y contratistas, facturación USD 1.200 M, RO alrededor de USD 300 M.
- **Ubicación genérica:** Mina a cielo abierto, planta concentradora y depósito de relaves en alta montaña, zona sísmica.
- **Contrastes:** C01, C03, C05, C06, C09, C17, C19; de costado C07, C10, C18, C13.
- **Riesgos planeados (9 fichas):**
  1. Falla de un talud del rajo.
  2. Proyección de material en una voladura.
  3. Colisión entre un camión de extracción y un vehículo liviano.
  4. Falla del muro del depósito de relaves.
  5. Interrupción del suministro de agua a la planta.
  6. Rotura del molino principal.
  7. Incendio en un camión de extracción.
  8. Sanción por el balance de agua del permiso ambiental.
  - **Escenario por causa común candidato:** Sismo que produce a la vez la falla de un talud y la del muro de relaves.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre el estado del monitoreo del depósito de relaves.
- **Póliza:** Todo riesgo con deducible alto y sublímite de terremoto; responsabilidad ambiental con exclusión de contaminación gradual.

#### S08 · Patagonia Oro y Plata S.A.

- **Arquetipo:** Minería subterránea. **Familia:** Minería.
- **Escala:** Mediana: 600 empleados, facturación USD 220 M, RO alrededor de USD 50 M.
- **Ubicación genérica:** Una mina subterránea con una rampa de acceso y un único pique de ventilación principal.
- **Contrastes:** C01, C03, C05, C19, C22, C24; de costado C06, C11.
- **Riesgos planeados (7 fichas):**
  1. Derrumbe en una labor.
  2. Caída de roca sobre un trabajador.
  3. Falla de la ventilación principal.
  4. Incendio de un equipo dentro de la mina.
  5. Inundación súbita de una labor.
  6. Atropello con un equipo en la rampa.
  7. Intoxicación con gases de voladura.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre la capacidad real de los refugios.
- **Póliza:** Todo riesgo con exclusión de daños dentro de la mina; riesgos del trabajo.

#### S09 · Litio de la Puna S.A.

- **Arquetipo:** Litio en salmuera y evaporación. **Familia:** Minería.
- **Escala:** Mediana-grande: 700 empleados, facturación USD 300 M, RO alrededor de USD 90 M; producción que tarda entre 12 y 18 meses desde el bombeo.
- **Ubicación genérica:** Salar en altura, pozos de bombeo, piletas de evaporación y una planta de carbonato.
- **Contrastes:** C05, C13, C14, C19, C20, C31; de costado C03, C11.
- **Riesgos planeados (7 fichas):**
  1. Rotura de la membrana de una pileta de evaporación.
  2. Afectación del acuífero de agua dulce de la cuenca.
  3. Falla de los pozos de bombeo de salmuera.
  4. Derrame de reactivos en la planta de carbonato.
  5. Suspensión del permiso de uso de agua.
  6. Accidente vial en el camino de acceso.
  7. Lluvia o nevada extrema sobre las piletas.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre la hidrogeología de la cuenca.
- **Póliza:** Daño material de planta; las piletas están excluidas.

#### S10 · Canteras Argentinas S.R.L.

- **Arquetipo:** Caliza y áridos a cielo abierto. **Familia:** Minería.
- **Escala:** PyME: 45 empleados, facturación USD 6 M, RO alrededor de USD 600 mil.
- **Ubicación genérica:** Una cantera con trituradora primaria a pocos kilómetros de un pueblo.
- **Contrastes:** C02, C09, C13, C19, C35; de costado C03, C11, C21.
- **Riesgos planeados (7 fichas):**
  1. Accidente con un equipo móvil en el frente.
  2. Caída de un trabajador desde el borde del frente.
  3. Proyección de material en una voladura.
  4. Rotura de la trituradora primaria.
  5. Exposición de los operarios a polvo de sílice.
  6. Reclamo de vecinos por vibraciones y polvo.
  7. Vuelco de un camión de despacho en la ruta.
- **Información que va a faltar:** La Fase 7 elige; casi no hay registros de incidentes.
- **Póliza:** Responsabilidad civil con límite bajo; riesgos del trabajo.

#### S11 · Oro Andino S.A.

- **Arquetipo:** Oro a cielo abierto y lixiviación en pilas. **Familia:** Minería.
- **Escala:** Grande: 1.100 empleados, facturación USD 500 M, RO alrededor de USD 140 M.
- **Ubicación genérica:** Mina a cielo abierto, pila de lixiviación con solución cianurada y planta de recuperación, en una cuenca con usuarios agrícolas aguas abajo.
- **Contrastes:** C01, C05, C13, C18, C19; de costado C03, C07, C17.
- **Riesgos planeados (7 fichas):**
  1. Derrame de solución cianurada fuera del sistema de contención.
  2. Falla de estabilidad de la pila de lixiviación.
  3. Intoxicación de un operario con cianuro.
  4. Colisión entre equipos de extracción.
  5. Desborde de la pileta de eventos durante una tormenta.
  6. Robo de metal en la planta de recuperación.
  7. Sanción ambiental por un desvío del monitoreo.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad ambiental con límite y exclusión de contaminación gradual; robo con sublímite.

#### S12 · Litio Directo S.A.

- **Arquetipo:** Extracción directa de litio (DLE). **Familia:** Minería.
- **Escala:** Pequeña y sin ventas todavía: 70 empleados, planta en puesta en marcha, financiada con aportes; **no tiene RO positivo en ningún ejercicio** (fallback 4 de §4.2: `i_econ = unknown`).
- **Ubicación genérica:** Una planta de extracción directa en un salar, con reinyección de salmuera.
- **Contrastes:** C04, C11, C13, C15, C19, C29; de costado C05, C20.
- **Riesgos planeados (6 fichas):**
  1. Falla del material de absorción al pasar a escala industrial.
  2. Derrame de reactivos de proceso.
  3. Incendio en la planta de proceso.
  4. Pérdida del licenciante de la tecnología.
  5. Contaminación de la salmuera reinyectada.
  6. Rotura de un equipo importado sin repuesto en el país.
- **Información que va a faltar:** Por construcción: no hay historia propia ni sectorial comparable para casi ningún evento.
- **Póliza:** Daño material de planta en construcción; sin pérdida de beneficio.

#### S13 · Andes Insumos Técnicos S.A.

- **Arquetipo:** Distribución de insumos enológicos y mineros. **Familia:** Comercio y logística.
- **Escala:** Mediana: 60 empleados, facturación USD 30 M, RO alrededor de USD 2 M; importa la mayor parte de lo que vende.
- **Ubicación genérica:** Un depósito con productos químicos de distintas clases y una oficina comercial.
- **Contrastes:** C06, C13, C19, C26; de costado C18, C11.
- **Riesgos planeados (6 fichas):**
  1. Incendio en el depósito con productos incompatibles.
  2. Venta de un lote contaminado o mal rotulado a un cliente.
  3. Retención en aduana de una importación crítica.
  4. Quiebra del proveedor extranjero único de un insumo.
  5. Derrame durante el transporte a un cliente.
  6. Robo de mercadería.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad civil por producto con exclusión de pérdida de beneficio del cliente.

#### S14 · Cordillera Hospitality Group S.A.

- **Arquetipo:** Hotel 4★ con restaurante, eventos y spa. **Familia:** Servicios a personas.
- **Escala:** Mediana: 220 empleados, 150 habitaciones, facturación USD 22 M, RO alrededor de USD 2,5 M.
- **Ubicación genérica:** Un solo edificio con piscina, spa y salón de eventos.
- **Contrastes:** C03, C13, C19, C23, C28; de costado C04, C10, C22.
- **Riesgos planeados (7 fichas):**
  1. Intoxicación alimentaria en un evento.
  2. Ahogamiento en la piscina.
  3. Incendio en el hotel con huéspedes.
  4. Contaminación del agua del spa con bacterias.
  5. Ransomware sobre el sistema de reservas.
  6. Caída de un huésped.
  7. Robo de datos de tarjetas de huéspedes.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad civil con límite por evento; daño material y pérdida de beneficio.

#### S15 · Viñedos del Valle S.A.

- **Arquetipo:** Producción primaria de uva. **Familia:** Agro y alimentos.
- **Escala:** PyME: 30 empleados permanentes y 120 en cosecha, facturación USD 3 M, RO alrededor de USD 300 mil, muy variable entre años.
- **Ubicación genérica:** Dos fincas en el mismo valle, con riego por turno.
- **Contrastes:** C09, C10, C18, C19, C20, C23; de costado C03, C02.
- **Riesgos planeados (6 fichas):**
  1. Granizo sobre las fincas.
  2. Helada tardía.
  3. Reducción del turno de riego.
  4. Vuelco de un tractor.
  5. Lesiones con herramientas en poda y cosecha.
  6. Ingreso de una plaga a las fincas.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Granizo con deducible y franquicia; sin cobertura de helada.

#### S16 · Cooperativa Vitivinícola Regional

- **Arquetipo:** Cooperativa de pequeños productores. **Familia:** Agro y alimentos.
- **Escala:** Mediana: 300 socios productores, 90 empleados, facturación USD 15 M; **resultado operativo cercano a cero por diseño**, porque liquida a los socios (fallback 3 de §4.2 y A6).
- **Ubicación genérica:** Una planta común de elaboración que recibe la uva de todos los socios.
- **Contrastes:** C06, C13, C15, C19, C26, C30; de costado C11, C23.
- **Riesgos planeados (6 fichas):**
  1. Entrega de uva de un socio con residuos fuera de norma.
  2. Incendio en la planta común.
  3. Falla de la planta durante la vendimia.
  4. Error en la liquidación a los socios.
  5. Accidente en la descarga de uva.
  6. Pérdida de un comprador a granel principal.
- **Información que va a faltar:** La Fase 7 elige; los socios reportan datos de calidad desigual.
- **Póliza:** Daño material de la planta.

#### S17 · Mostos y Concentrados Cuyo S.A.

- **Arquetipo:** Procesamiento industrial vitícola. **Familia:** Agro y alimentos.
- **Escala:** Mediana-grande: 250 empleados, facturación USD 60 M, RO alrededor de USD 6 M; exporta casi todo.
- **Ubicación genérica:** Una planta de proceso continuo con calderas y evaporadores.
- **Contrastes:** C05, C06, C13, C19, C26; de costado C03, C23, C10.
- **Riesgos planeados (6 fichas):**
  1. Falla de una caldera con liberación de vapor.
  2. Corte del suministro de gas.
  3. Contaminación de un lote de mosto concentrado exportado.
  4. Vertido de efluentes fuera de norma.
  5. Quemadura de un operario con vapor.
  6. Rotura del evaporador principal.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Todo riesgo operativo con pérdida de beneficio; responsabilidad por producto con límite.

#### S18 · Frigorífico Pampeano S.A.

- **Arquetipo:** Faena y procesamiento cárnico. **Familia:** Agro y alimentos.
- **Escala:** Grande: 1.200 empleados, facturación USD 400 M, RO alrededor de USD 25 M.
- **Ubicación genérica:** Una planta de faena con cámaras, habilitada para exportar.
- **Contrastes:** C02, C03, C05, C19, C26; de costado C13, C14, C22.
- **Riesgos planeados (7 fichas):**
  1. Contaminación de carne con un patógeno y retiro del producto.
  2. Lesión de un operario con cuchillo o sierra.
  3. Escape de amoníaco de la sala de máquinas.
  4. Suspensión de la habilitación sanitaria para exportar.
  5. Falla del sistema de frío.
  6. Brote de una enfermedad animal que cierra mercados de exportación.
  7. Vertido de efluentes fuera de norma.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Retiro de producto con sublímite y exclusión de pérdida de mercado.

#### S19 · Lácteos del Sur S.A.

- **Arquetipo:** Planta láctea. **Familia:** Agro y alimentos.
- **Escala:** Grande: 800 empleados, facturación USD 250 M, RO alrededor de USD 15 M; recibe leche de 400 tambos.
- **Ubicación genérica:** Una planta con pasteurización, envasado y cámaras.
- **Contrastes:** C06, C13, C17, C19, C26; de costado C05, C30.
- **Riesgos planeados (7 fichas):**
  1. Contaminación de un lote y retiro del producto del mercado.
  2. Falla del pasteurizador.
  3. Corte del suministro eléctrico de la red.
  4. Interrupción de la recolección de leche en los tambos.
  5. Incendio en el depósito de producto terminado.
  6. Lesión de un operario con químicos de limpieza.
  - **Escenario por causa común candidato:** corte eléctrico regional que produce a la vez el corte en la planta (3) y la interrupción de la recolección en los tambos (4), porque los tambos no pueden ordeñar ni enfriar.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Retiro de producto con límite y deducible.

#### S20 · AgroSilos Centro S.A.

- **Arquetipo:** Acopio de cereales. **Familia:** Agro y alimentos.
- **Escala:** Mediana: 70 empleados, facturación USD 45 M, RO alrededor de USD 3 M.
- **Ubicación genérica:** Una planta de silos con elevador y secadora, junto a un pueblo.
- **Contrastes:** C01, C03, C06, C19, C23; de costado C35, C13.
- **Riesgos planeados (6 fichas):**
  1. Explosión de polvo en el elevador.
  2. Incendio por autocalentamiento del grano almacenado.
  3. Atrapamiento de un trabajador dentro de un silo.
  4. Deterioro del grano por humedad.
  5. Colapso estructural de un silo.
  6. Fraude en la balanza de recepción.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Incendio y explosión sobre instalaciones y mercadería con valuación por precio de pizarra.

#### S23 · Autopartes Andinas S.A.

- **Arquetipo:** Proveedor industrial just-in-time. **Familia:** Industria y construcción.
- **Escala:** Mediana: 350 empleados, facturación USD 80 M, RO alrededor de USD 6 M; dos terminales automotrices compran el 85%.
- **Ubicación genérica:** Una planta con inyección y estampado.
- **Contrastes:** C06, C13, C19, C26, C32; de costado C09, C18.
- **Riesgos planeados (6 fichas):**
  1. Defecto de calidad que obliga al cliente a un retiro de vehículos.
  2. Parada de la línea de estampado.
  3. Falla del proveedor de acero.
  4. Pérdida del contrato con una terminal.
  5. Incendio en la planta.
  6. Lesión de un operario en una prensa.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad por producto con exclusión de costos de retiro del cliente.

#### S24 · Plásticos del Oeste S.A.

- **Arquetipo:** Inyección y extrusión. **Familia:** Industria y construcción.
- **Escala:** Mediana: 160 empleados, facturación USD 25 M, RO alrededor de USD 2 M.
- **Ubicación genérica:** Una nave con depósito de materia prima y producto terminado.
- **Contrastes:** C03, C06, C19, C26; de costado C02, C18.
- **Riesgos planeados (6 fichas):**
  1. Incendio en el depósito de materia prima y producto.
  2. Atrapamiento de un operario en una inyectora.
  3. Rotura de la extrusora principal.
  4. Contaminación de un lote de envases para alimentos.
  5. Corte del suministro eléctrico de la red.
  6. Quemadura de un operario con material fundido.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Incendio con suma asegurada por valor histórico.

#### S25 · Farmacéutica Regional S.A.

- **Arquetipo:** Fabricación de medicamentos. **Familia:** Industria y construcción.
- **Escala:** Mediana: 300 empleados, facturación USD 90 M, RO alrededor de USD 12 M.
- **Ubicación genérica:** Una planta con áreas estériles y un depósito con cadena de frío.
- **Contrastes:** C04, C05, C19, C26; de costado C13, C20.
- **Riesgos planeados (6 fichas):**
  1. Desvío de calidad que obliga a retirar un lote.
  2. Contaminación cruzada en el área estéril.
  3. Falla de la cadena de frío en la distribución.
  4. Clausura de un área por la autoridad sanitaria.
  5. Falla del sistema de agua purificada.
  6. Ciberataque al sistema de trazabilidad.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad por producto y retiro con sublímites.

#### S27 · Red Farmacias Andinas S.A.

- **Arquetipo:** Cadena de farmacias. **Familia:** Comercio y logística.
- **Escala:** Mediana-grande: 60 sucursales, 700 empleados, facturación USD 150 M, RO alrededor de USD 8 M.
- **Ubicación genérica:** Sucursales en cinco ciudades y un centro de distribución.
- **Contrastes:** C02, C05, C12, C19, C33; de costado C04, C06.
- **Riesgos planeados (6 fichas):**
  1. Robo a mano armada en una sucursal.
  2. Faltante de medicamentos de stock regulado.
  3. Falla del frío en una sucursal.
  4. Ransomware sobre el sistema de ventas y recetas.
  5. Error de dispensa a un paciente.
  6. Incendio en el centro de distribución.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Robo con franquicia por sucursal; incendio del centro de distribución.

#### S28 · Supermercados Regionales S.A.

- **Arquetipo:** 15 locales y un centro de distribución. **Familia:** Comercio y logística.
- **Escala:** Grande: 1.500 empleados, facturación USD 300 M, RO alrededor de USD 12 M.
- **Ubicación genérica:** Quince locales en una región y un centro de distribución único.
- **Contrastes:** C02, C06, C19, C26, C33; de costado C28, C04, C13.
- **Riesgos planeados (7 fichas):**
  1. Incendio en el centro de distribución.
  2. Incendio en un local.
  3. Caída de un cliente en un local.
  4. Venta de un alimento contaminado.
  5. Hurto en los locales.
  6. Falla del frío en un local.
  7. Caída del sistema de cobro en todos los locales.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Todo riesgo con pérdida de beneficio y período de indemnización corto.

#### S30 · DataCenter Andino S.A.

- **Arquetipo:** Centro de datos regional. **Familia:** Tecnología y pagos.
- **Escala:** Mediana: 80 empleados, facturación USD 35 M, RO alrededor de USD 9 M.
- **Ubicación genérica:** Un edificio con salas de datos, doble alimentación eléctrica, generadores y refrigeración redundante.
- **Contrastes:** C04, C07, C12, C16, C19, C32; de costado C10, C18.
- **Riesgos planeados (8 fichas):**
  - **Padre:** Pérdida de energía en las salas de datos. Sub-riesgos:
    1. Corte de la red con falla de arranque de los generadores.
    2. Falla de un sistema de alimentación ininterrumpida.
    3. Error durante un mantenimiento eléctrico.
  4. Falla de la refrigeración de una sala.
  5. Incendio en una sala de datos.
  6. Acceso físico no autorizado.
  7. Corte simultáneo de los dos proveedores de fibra.
  8. Inundación por rotura de una cañería.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Daño material y responsabilidad por incumplimiento de servicio con límite agregado.

#### S31 · Petrolera Neuquén S.A.

- **Arquetipo:** Upstream no convencional. **Familia:** Energía y agua.
- **Escala:** Grande: 1.800 empleados propios y contratistas, facturación USD 900 M, RO alrededor de USD 250 M.
- **Ubicación genérica:** Un yacimiento con 300 pozos, baterías y una planta de tratamiento.
- **Contrastes:** C01, C05, C13, C19, C27; de costado C03, C10, C18.
- **Riesgos planeados (6 fichas):**
  1. Descontrol de un pozo.
  2. Derrame de hidrocarburo o agua de retorno.
  3. Accidente de un trabajador de contratista en una locación de fractura.
  4. Incendio en una batería.
  5. Afectación de un acuífero por falla del entubamiento.
  6. Accidente vial en los caminos del yacimiento.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Control de pozo con límite por evento; responsabilidad ambiental.

#### S32 · Servicios Petroleros Patagonia S.A.

- **Arquetipo:** Servicios a operadoras. **Familia:** Energía y agua.
- **Escala:** Mediana: 400 empleados, facturación USD 60 M, RO alrededor de USD 5 M; tres operadoras compran todo.
- **Ubicación genérica:** Equipos de reparación de pozos que se mueven entre locaciones de varios clientes.
- **Contrastes:** C03, C13, C19, C27; de costado C06, C09.
- **Riesgos planeados (6 fichas):**
  1. Accidente con un equipo móvil en una locación.
  2. Vuelco de un camión de traslado de equipos.
  3. Pérdida del contrato con la operadora principal.
  4. Incendio de un equipo.
  5. Lesión en una maniobra con tuberías.
  6. Robo de equipos en una locación.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Equipos de contratista con deducible; responsabilidad civil exigida por contrato.

#### S33 · Energía Solar Cuyo S.A.

- **Arquetipo:** Parque fotovoltaico. **Familia:** Energía y agua.
- **Escala:** Mediana: 25 empleados, facturación USD 14 M, RO alrededor de USD 7 M.
- **Ubicación genérica:** Un parque de 100 MW con una sola subestación y transformador.
- **Contrastes:** C06, C13, C19, C34, C35; de costado C10, C18.
- **Riesgos planeados (6 fichas):**
  1. Falla del transformador principal.
  2. Granizo sobre los paneles.
  3. Restricción de despacho por la red.
  4. Incendio en un inversor.
  5. Robo de cable de cobre.
  6. Degradación acelerada de módulos.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Todo riesgo con pérdida de beneficio y deducible por granizo.

#### S34 · Aguas Industriales Cuyo S.A.

- **Arquetipo:** Tratamiento de agua para minas y bodegas. **Familia:** Energía y agua.
- **Escala:** PyME: 35 empleados, facturación USD 5 M, RO alrededor de USD 500 mil; contratos con cuatro clientes.
- **Ubicación genérica:** Opera plantas de tratamiento en predios de sus clientes.
- **Contrastes:** C09, C13, C19, C32; de costado C05, C03, C22.
- **Riesgos planeados (6 fichas):**
  1. Falla de dosificación química que entrega agua fuera de especificación.
  2. Derrame de químicos en una planta.
  3. Falla de la bomba principal de una planta.
  4. Vertido de efluente fuera de norma.
  5. Pérdida de un contrato.
  6. Intoxicación de un operario con cloro.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad civil con exclusión de daño a la producción del cliente.

#### S35 · Eventos & Catering Mendoza S.R.L.

- **Arquetipo:** Catering y eventos temporales. **Familia:** Servicios a personas.
- **Escala:** PyME: 25 empleados y hasta 150 eventuales, facturación USD 3 M, RO alrededor de USD 250 mil.
- **Ubicación genérica:** Una cocina central y eventos en predios de terceros.
- **Contrastes:** C02, C19, C23, C27, C28; de costado C13, C09.
- **Riesgos planeados (6 fichas):**
  1. Intoxicación alimentaria en un evento.
  2. Colapso de una estructura o carpa por viento.
  3. Caída de un trabajador en el montaje.
  4. Incendio en una cocina móvil.
  5. Aglomeración de público en un evento masivo.
  6. Cancelación de un evento por clima.
- **Información que va a faltar:** La Fase 7 elige.
- **Póliza:** Responsabilidad civil por evento con límite fijado por cada predio.

#### S36 · Colegio Privado Andino

- **Arquetipo:** Educación K–12. **Familia:** Servicios a personas.
- **Escala:** Asociación civil sin fines de lucro: 1.200 alumnos, 130 empleados, ingresos USD 6 M; **resultado operativo nulo o negativo en los tres últimos ejercicios** (fallback 3 de §4.2 y A6).
- **Ubicación genérica:** Un edificio de tres pisos, de los años setenta, en zona sísmica; transporte escolar contratado.
- **Contrastes:** C03, C13, C15, C19, C28; de costado C04, C22, C17.
- **Riesgos planeados (7 fichas):**
  1. Accidente del transporte escolar contratado.
  2. Lesión de un alumno en el recreo o en educación física.
  3. Incendio en el edificio con alumnos.
  4. Maltrato de un alumno por parte de personal.
  5. Filtración de datos de alumnos.
  6. Intoxicación en el comedor.
  7. Daño estructural del edificio por un sismo.
- **Información que va a faltar:** La Fase 7 elige; al menos uno sobre el estado estructural del edificio.
- **Póliza:** Responsabilidad civil con límite por evento; accidentes personales de alumnos.

### 3.4 Solapamientos que quedan

Algunas empresas comparten arquetipo o peligro con otra (Viñedos del Valle y Empaque Andino con el granizo; Cobre Cordillerano y Oro Andino con los equipos de extracción; Frío Mendoza y Empaque Andino con la cámara de frío). Se mantienen porque Emiliano las pidió y porque cambian la escala o la organización que sufre el mismo evento (C09), que es lo que prueba el ancla relativa al RO. La regla del plan ("agregar una empresa sólo si aporta cobertura nueva") se cumple a nivel de conjunto: las 32 nuevas aportan C26 a C35, que el v1 no tenía.

---

## 4. Matriz de cobertura

Directo = la empresa lo prueba directamente; de costado = lo toca sin ser su foco. El cruce completo empresa × contraste está en `matriz-cobertura.csv`.

| Contraste | Directo | De costado | Casos de propiedad |
|---|---|---|---|
| C01 Alta severidad / baja probabilidad | S07, S08, S11, S20, S22, S26, S31 | S21 | CP-02, CP-15 |
| C02 Alta frecuencia / baja severidad | S03, S10, S18, S27, S28, S35, S37 | S02, S15, S22, S24, S29 | CP-02 |
| C03 Exposición humana | S02, S05, S07, S08, S14, S18, S20, S21, S22, S24, S26, S32, S36 | S01, S03, S09, S10, S11, S15, S17, S31, S34, S37 | CP-02, CP-15, CP-18 |
| C04 Dependencia tecnológica | S03, S04, S12, S25, S26, S29, S30 | S14, S27, S28, S36, S37 | CP-07 |
| C05 Regulación fuerte | S07, S08, S09, S11, S17, S18, S22, S25, S26, S27, S29, S31 | S12, S19, S21, S34 | CP-13 |
| C06 Concentración de activos | S01, S02, S06, S07, S13, S16, S17, S19, S20, S21, S22, S23, S24, S28, S33, S37 | S08, S27, S32 | CP-05 |
| C07 Alta resiliencia | S29, S30 | S07, S11, S26 | CP-03 |
| C08 Alta vulnerabilidad | S04, S06, S37 |  | CP-16 |
| C09 PyME vs grande | S06, S07, S10, S15, S34, S37 | S04, S22, S23, S26, S29, S32, S35 | CP-11 |
| C10 Transferencia relevante | S15, S21, S22, S29 | S01, S02, S05, S07, S14, S17, S30, S31, S33 | CP-09, CP-17 |
| C11 Información incompleta | S12, S26, S37 | S03, S04, S06, S08, S09, S10, S13, S16, S22 | CP-08 |
| C12 Operaciones redundantes | S26, S27, S29, S30 |  | CP-14 (○) |
| C13 Exposición a terceros | S01, S03, S04, S05, S06, S09, S10, S11, S12, S13, S14, S16, S17, S19, S21, S22, S23, S29, S31, S32, S33, S34, S36 | S02, S07, S18, S20, S25, S26, S28, S35 | — |
| C14 Evento fuera de 12 meses | S09, S21 | S18 | — |
| C15 RO nulo o negativo | S12, S16, S26, S36, S37 |  | — |
| C16 Padre con causas distintas | S05, S29, S30 |  | CP-12 |
| C17 Escenario por causa común | S07, S19, S22 | S11, S36 | CP-20 |
| C18 Límite, deducible, exclusiones | S01, S11, S15, S21, S22, S29, S37 | S03, S05, S06, S07, S13, S23, S24, S30, S31, S33 | CP-09, CP-17 (sólo límite) |
| C19 Riesgos corrientes | todas |  | — |
| C20 Fuentes de P divergentes | S09, S15, S26, S29 | S12, S25 | — |
| C21 Margen de contribución desconocido | S21, S37 | S06, S10 | — |
| C22 Recuperación no_aplica | S02, S08, S22, S26, S37 | S01, S04, S14, S18, S34, S36 | — |
| C23 Estacionalidad | S01, S06, S14, S15, S20, S21, S35 | S16, S17 | — |
| C24 Reglas con evidencia circular | S02, S08, S22, S26, S37 |  | CP-06, 07, 16, 18 (origen) |
| C25 Granularidad ambigua en lista fija | la Fase 7 elige (cerrado) |  | CP-12 (○) |
| C26 Responsabilidad por producto y retiro | S01, S13, S16, S17, S18, S19, S22, S23, S24, S25, S28 |  | — |
| C27 Exposición humana cambiante u operación móvil | S05, S31, S32, S35 |  | — |
| C28 Personas vulnerables o multitudes | S14, S26, S35, S36 | S28 | CP-15 (○) |
| C29 Tecnología sin historia sectorial | S12 |  | — |
| C30 Gobernanza y muchos terceros | S16 | S19 | — |
| C31 Ciclo productivo largo | S01, S09 |  | — |
| C32 Servicio crítico para clientes | S04, S23, S30, S34 |  | — |
| C33 Multi-sitio con redundancia natural | S03, S27, S28 |  | CP-05 (○) |
| C34 Baja exposición humana, activos de alto valor | S33 |  | — |
| C35 Evento gradual o exposición crónica | S10, S33 | S20 | — |

C25: la Fase 7 elige en qué empresas ponerlo y lo registra sólo en el archivo cerrado; marcarlo acá revelaría qué riesgo es.

---

## 5. Contrastes que quedan sin cubrir

| Qué | Por qué no lo cubre EMI-41 | Dónde queda |
|---|---|---|
| Dinámica: acciones, eficacia, reevaluaciones, `motivo` (D16, D18, D22, D25) | La Fase 8 evalúa fichas iniciales de una lista fija; agregar reevaluaciones mezcla reproducibilidad con dinámica | CP-04, CP-09, CP-10, CP-17, CP-19 y la regresión (Fase 10) |
| Obligación de tratamiento de `safety_critical` (§8.2) | Exige acciones o decisiones de la dirección registradas, que no son parte de la evaluación inicial | Vista de seguridad en EMI-16; CP-02, CP-15 |
| Velocidad de materialización, detectabilidad, asegurabilidad, reputación | Excluidas del score por D13; sólo texto | — |
| Recodificar niveles manteniendo el orden (§14.7) | Es un análisis que se corre sobre cualquier conjunto de fichas, no un dato a construir | Fases 4, 5 y 9, sobre fichas existentes |
| Frecuencia de `consecuencia_extrema` | Se mide, no se diseña: C19 sólo evita que la población esté sesgada a extremos | Fases 7 y 8 |
| Orden entre organizaciones | Es una regla, no un dato (sección 7) | Este documento |

Los contrastes con una sola empresa directa (C25 aparte) son C29 (S12), C30 (S16) y C34 (S33). Alcanza para que aparezcan; no para sacar conclusiones generales.

---

## 6. Tamaño total y carga de Emiliano

**Unidad de conteo.** Cuenta cada ficha que lleva factores propios: riesgo simple, sub-riesgo y escenario por causa común. El padre no suma, porque no tiene factores propios: toma los de su sub-riesgo determinante (metodología §1.4; protocolo §2.1).

**Total: 37 empresas y 252 fichas** (240 riesgos simples, 9 sub-riesgos de 3 padres y 3 escenarios por causa común).

**Muestra de la Fase 8 (decisión de Emiliano, 2026-10-05 21:27 UTC).** Con más de 40 fichas rige la muestra de 30 de la respuesta 8, pero la estratificación por empresa con mínimo 3 por empresa no entra con 37 empresas. Emiliano eligió estratificar por **familia de actividad**:
- a cada familia le tocan fichas en proporción a cuántas tiene, con un mínimo de 3, redondeando hasta sumar 30;
- dentro de cada familia, sorteo con semilla fija registrada antes de empezar, hecho por un script que sólo ve `risk_id`, `caso_empresa` y familia;
- **unidad de sorteo:** un riesgo simple, un escenario, o un padre con todos sus sub-riesgos (si sale, cuenta como tantas fichas como sub-riesgos tiene), para que la prioridad del padre se pueda comparar;
- el evaluador agente evalúa las 252 fichas; las 30 de la muestra son las que se comparan con Emiliano.

| Familia | Empresas | Fichas | Fichas en la muestra de la Fase 8 |
|---|---|---|---|
| Minería | S07, S08, S09, S10, S11, S12 | 43 | 5 |
| Energía y agua | S31, S32, S33, S34 | 24 | 3 |
| Agro y alimentos | S01, S06, S15, S16, S17, S18, S19, S20, S21 | 59 | 7 |
| Industria y construcción | S02, S05, S22, S23, S24, S25, S37 | 51 | 6 |
| Comercio y logística | S03, S13, S27, S28 | 26 | 3 |
| Tecnología y pagos | S04, S29, S30 | 22 | 3 |
| Servicios a personas | S14, S26, S35, S36 | 27 | 3 |
| **Total** | **37** | **252** | **30** |

**Qué se pierde con esta muestra.** Con 30 fichas repartidas en 37 empresas, casi ninguna empresa tiene más de una o dos fichas en la muestra, así que las métricas de ranking de protocolo §11 (tau-b y top-3 **por empresa**) no se pueden calcular. Propongo reemplazarlas, sólo para esta muestra, por la concordancia de orden sobre los pares de fichas de una misma empresa que caigan en la muestra, reportada con su `n` y sin target, como ya eran (Para aprobar, punto 4). Las métricas por factor, que son las que tienen target (±1 nivel ≥ 80%), no cambian.

**Carga del evaluador agente y de la regresión.** 252 fichas por corrida. Cada cambio de metodología obliga a correrlas todas otra vez (plan, Fase 10).

---

## 7. Orden entre organizaciones distintas

Punto abierto de metodología §7.1.4 y §15, asignado a esta fase.

**Regla propuesta.**
1. **El ranking es siempre dentro de una organización.** No existe una lista ordenada con riesgos de organizaciones distintas.
2. **Las comparaciones entre empresas se hacen sólo con métricas agregadas del experimento:** distribución de bandas por empresa o por familia, frecuencia de banderas, métricas de reproducibilidad. Ninguna compara posiciones ni `C_raw` de riesgos de empresas distintas.
3. **La banda sí se puede contar entre empresas** ("S37 tiene tres riesgos en Alta"), porque la banda es relativa a cada organización por construcción; no se puede leer como "el riesgo Alta de S37 es tan grave en dinero como el Alta de S29".

**Por qué.** P, I y V son atributos del par riesgo–organización (metodología §1.1.1), y el ancla económica es relativa al RO de cada una (§4.2): el mismo `C_raw` en dos empresas mide cosas distintas. Ordenar entre empresas exigiría una magnitud absoluta, que es justamente lo que D5 dejó de usar. Si Risk OS necesita alguna vez una cartera de varias organizaciones (un grupo o una aseguradora), es otra pregunta, fuera de v0.

**Cuándo se escribe en la metodología.** La Fase 4 corre en paralelo con la metodología v0.1 congelada, y CP-11 compara dos empresas. Para no cambiar la regla en medio del dry run, propongo registrar ahora la decisión en el changelog y escribir el texto en metodología §7.1.4 recién en la versión que salga de la Fase 5 (Para aprobar, punto 6).

---

## 8. Reglas para la Fase 7

1. **Hechos, no niveles.** Cada ficha de información describe hechos con fechas, cantidades y montos. No escribe niveles ("P = 3"), ni juicios que los reemplacen ("riesgo bajo", "muy bien protegido", "poco frecuente"). Donde un evaluador necesite un número para un ancla, el número está.
2. **Hechos suficientes para cada factor**, o un faltante deliberado registrado en el archivo cerrado:
   - **P:** exposición; antecedentes del evento iniciador con fecha, en la organización y en comparables o el sector; precursores; controles preventivos con su estado actual; condiciones causales presentes; las fuentes disponibles con su jerarquía (§3.2).
   - **I:** facturación y RO de los tres últimos ejercicios cerrados, margen de contribución o su ausencia; activos expuestos con su valor de reposición; personas expuestas por turno y zona; funciones críticas y plazo de reposición normal de mercado de lo dañado; marco regulatorio y sanciones posibles.
   - **V:** contención y recuperación descritas por separado, cada medida con su estado de prueba (último ensayo o actuación real, con fecha y resultado, §5.2), y con lo que efectivamente hace cuando falla en parte.
   - **Transferencia**, donde la empresa tiene póliza: cobertura, límite, sublímites, deducible, exclusiones; en una ficha de transferencia aparte, nunca mezclada con los hechos de V.
3. **Procedencia e incertidumbre de EMI-17 en cada dato:** `base` (`observed` | `reported` | `inferred` | `assumed`), referencia de evidencia o `sin_evidencia` explícito, y la nota de qué falta confirmar cuando corresponda.
4. **Redacción del riesgo** `causa → evento → consecuencia` (protocolo §2.1). Lo que la Fase 7 quiera probar con la redacción (por ejemplo un evento escrito después del iniciador, metodología §2.1.3) va sólo al archivo cerrado. Los títulos de la sección 3 pueden reescribirse para que sean riesgos completos, sin cambiar el evento ni agregar adjetivos de frecuencia o gravedad.
5. **Lista fija.** Al terminar la Fase 7 la lista de cada empresa queda cerrada (protocolo §3): `risk_id`, `tipo_objeto`, `riesgo_padre_id` y `miembros` donde corresponda, y la familia de cada empresa para la muestra.
6. **Faltantes deliberados de distinto alcance**: en el conjunto tiene que haber faltantes que dejan el riesgo evaluable y faltantes que no (metodología §9.3), repartidos en varias familias.
7. **Archivo cerrado de intención de diseño.** Por riesgo: qué contraste y qué regla busca tensionar, qué nivel se pretende para P, cada dimensión de I, contención y recuperación (con rango si corresponde), y qué anomalías se esperan. Reglas:
   - vive fuera de la carpeta que reciben los evaluadores: `RAIZ/cerrado/emi41/intencion-diseno.md`, con un encabezado "no abrir antes de la comparación de la Fase 8";
   - la Fase 7 publica su hash SHA-256 en el documento de entrega de la fase, para que la intención no se pueda retocar después de ver resultados (preregistro, protocolo §1.3);
   - no entra en la PR de la Fase 7 ni en Linear: se sube recién después de la comparación de la Fase 8;
   - no lo abren Emiliano ni el evaluador agente hasta que los dos entregaron todas sus fichas (protocolo §10, H12).
8. **Independencia.** La sesión que construye las empresas no es la que evalúa en la Fase 8 (protocolo §10.1).
9. **Nombres y R-19.** Las empresas son sintéticas y no usan datos de empresas ni casos históricos reales. Los nombres de la lista de Emiliano son nombres de trabajo para este documento y el archivo cerrado: en las fichas de información que reciben los evaluadores, cada empresa se identifica por su código y su arquetipo, para que ninguna se confunda con una empresa real de nombre parecido. Las referencias regionales (Cuyo, Patagonia, Neuquén) se mantienen como contexto; la regulación sigue siendo genérica salvo que un contraste necesite una concreta.
10. **Plausibilidad.** Los números cierran entre sí (RO, margen, facturación, valores de activos, dotación).
11. **Riesgos con par de escala (C09).** Cuando el mismo tipo de evento aparece en dos empresas (incendio, ransomware, granizo, retiro de producto), cada ficha se escribe completa por sí misma, con los hechos de su empresa, sin referirse a la otra.
12. **Construcción por tandas.** 252 fichas son muchas para una sola sesión. La Fase 7 puede construir por familia, en sesiones separadas, siempre que todas usen estas reglas y un solo archivo cerrado.
13. **La Fase 7 no evalúa.** No llena fichas de evaluación ni calcula `C_raw`.

---

## Para aprobar

Cada punto se responde con sí o no. Los puntos 1 y 3 ya los decidió Emiliano; se listan para que la aprobación del documento los incluya.

1. **Conjunto de empresas:** las 37 de la sección 3 (las 5 del v1 aprobadas a las 21:23 UTC y las 36 de la lista de Emiliano, con 4 fusionadas).
2. **Fusiones:** Química Cuyo = ex E1, CuyoPay = ex E3, Empaque Andino = ex E4, Centro Médico Cuyo = ex E5, conservando el diseño del v1; la fábrica de muebles queda como S37.
3. **Muestra de la Fase 8:** 30 fichas estratificadas por las 7 familias de la sección 6, con mínimo 3 por familia (elegido por Emiliano a las 21:27 UTC).
4. **Unidad de sorteo y métricas de ranking:** un padre sale con todos sus sub-riesgos; las métricas de ranking por empresa se reemplazan, para esta muestra, por la concordancia sobre pares de una misma empresa, sin target.
5. **Regla entre organizaciones** de la sección 7: ranking sólo dentro de una organización; entre empresas, sólo métricas agregadas; la banda se cuenta pero no se compara en magnitud.
6. **Cuándo entra esa regla:** al changelog ahora; el texto de metodología §7.1.4, en la versión que salga de la Fase 5, para no cambiar la metodología durante el dry run.
7. **Contrastes C20–C35** que agrega esta fase forman parte del inventario.
8. **Dinámica fuera de la Fase 8:** acciones, eficacia y reevaluaciones no se construyen en EMI-41; siguen cubiertas por casos de propiedad y regresión (sección 5).
9. **Archivo cerrado** de la regla 7 de la sección 8: ubicación `RAIZ/cerrado/emi41/`, hash publicado, fuera de la PR de la Fase 7 hasta la comparación de la Fase 8.
10. **Supuesto:** que Emiliano conozca los contrastes por empresa de este documento (y que haya propuesto las empresas) es una contaminación acotada; el informe de la Fase 8 la declara.
11. **Supuesto:** las fichas de información identifican a cada empresa por código y arquetipo, no por el nombre de trabajo (sección 8, regla 9).
12. **Supuesto:** los números de escala de la sección 3 son de diseño y la Fase 7 puede ajustarlos para coherencia interna sin cambiar el contraste.
13. **Supuesto:** S26 y S36 usan a propósito el fallback 3 de §4.2 (otra medida económica con A6), S16 también, y S12 el fallback 4 (`i_econ = unknown`); la divergencia que produzcan entre evaluadores es un resultado buscado.
14. **Supuesto:** el riesgo 8 de S21 (exigencia anunciada a 18 meses) se mantiene en la lista aunque su evento caiga fuera del horizonte, porque probar D3 es su función.
