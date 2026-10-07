# S04 · SaaS B2B

> Ficha de empresa · EMI-41 · información al 2026-09-30

| Campo | Dato |
|---|---|
| Código | S04 |
| Arquetipo | SaaS B2B |
| Familia | Tecnología y pagos |
| Actividad | Desarrolla y opera una plataforma en la nube de gestión de pedidos, ruteo de entregas y facturación para empresas de distribución. Los clientes la usan todos los días para tomar pedidos de sus vendedores y armar los repartos. Cobra una suscripción mensual por usuario y por volumen de pedidos. |
| Ubicación genérica | Oficinas alquiladas en una ciudad de Cuyo (un piso de 900 m²). La plataforma corre en una sola región de un proveedor de nube pública, en Sudamérica, repartida en dos zonas de disponibilidad de esa región. |
| Forma jurídica genérica | Sociedad anónima de capital cerrado; tres socios fundadores y un fondo de inversión con el 30% de las acciones. |

## Dotación

90 empleados propios al 2026-09-30. Además, 6 personas de una empresa contratista de soporte de primer nivel (no están en la dotación).

| Área | Propios | Horario | Notas |
|---|---|---|---|
| Desarrollo | 38 | Lunes a viernes, 09–18 | Dos de ellos (el arquitecto principal y el líder técnico del motor de pedidos) son quienes conocen el núcleo del sistema (ver S04-R05). |
| Operaciones de plataforma (SRE) | 7 | Lunes a viernes, 09–18; guardia fuera de horario | Guardia rotativa de 1 SRE y 1 desarrollador, localizables por teléfono, 18–09 y fines de semana. |
| Soporte de segundo nivel | 12 | Lunes a sábado, 08–20 | Atiende lo que escala el contratista. |
| Implementación y ventas | 16 | Lunes a viernes, 09–18 | |
| Administración, finanzas y dirección | 17 | Lunes a viernes, 09–18 | Incluye al responsable de seguridad de la información (una persona, con dedicación parcial desde 2025-03). |
| **Total propios** | **90** | | |
| Contratista de soporte de primer nivel | (6) | Lunes a sábado, 07–23, en dos turnos de 2 personas más 2 de franco | Trabaja desde sus propias oficinas, con credenciales de soporte de la plataforma (ver S04-R04). |

Nadie trabaja en un sitio con riesgo físico propio de la operación: la operación es oficina y nube. En la oficina hay en promedio 55 personas por día hábil (el resto trabaja remoto).

## Resultados de los tres últimos ejercicios cerrados

| Ejercicio | Facturación | Margen de contribución | Resultado operativo (RO) | Partidas extraordinarias identificadas |
|---|---|---|---|---|
| 2023 | USD 9,4 M | USD 6,8 M (72%) | USD 1,3 M | Indemnizaciones por reestructuración del área comercial, USD 150 mil (RO sin esa partida: USD 1,45 M) |
| 2024 | USD 10,8 M | USD 7,9 M (73%) | USD 1,7 M | Ninguna |
| 2025 | USD 12,1 M | USD 8,9 M (74%) | USD 2,0 M | Ninguna |

- **Ingresos:** 100% recurrentes (suscripciones). Facturación mensual promedio de 2025: USD 1,0 M. Sin estacionalidad marcada; noviembre y diciembre tienen 15% más de volumen de pedidos que el promedio, pero la suscripción no varía.
- **Concentración:** 146 clientes al 2026-09-30 (distribuidoras mayoristas, cadenas de comercios medianas y operadores logísticos de Argentina y Chile). El cliente principal, una distribuidora mayorista de consumo masivo, representó el 28% de la facturación de 2025 (USD 3,4 M; cuota mensual 2026: USD 283 mil). Los 10 mayores suman el 61%.
- **Margen de contribución:** facturación menos costos variables (infraestructura de nube, que en 2025 fue USD 1,14 M; comisiones de cobro; contratista de soporte de primer nivel; licencias por usuario de terceros). Lo calcula el área de finanzas cada mes; está en los estados contables auditados de 2025.
- **Costos fijos 2025:** USD 6,9 M (sueldos y cargas, USD 5,8 M; oficinas, licencias corporativas y otros, USD 1,1 M).

## Activos principales

| Activo | Ubicación | Valor de reposición | Plazo normal de reposición de mercado | Notas |
|---|---|---|---|---|
| Plataforma de software propia (código, ~1,1 M de líneas; 9 años de desarrollo) | Repositorios en un servicio de terceros, con copia diaria en la nube | Sin valor de mercado; reescribirla desde cero se estimó en 2025 en 60 personas-año | No se compra en el mercado | El 40% del código es un módulo heredado de 2017 (facturación y motor de pedidos). |
| Base de datos principal de clientes (6,2 TB; pedidos, catálogos, clientes finales de los clientes) | Región única del proveedor de nube; réplica en una segunda zona de la misma región | No aplica valor de reposición; ver copias en S04-R01 y S04-R02 | — | Contiene datos personales de clientes finales de los clientes (nombre, domicilio, teléfono, identificación fiscal): unos 410 mil registros al 2026-08. |
| Almacenamiento de objetos (14 TB; exportaciones, adjuntos, reportes) | Misma región | — | — | 2.300 contenedores y carpetas; ver S04-R03. |
| Infraestructura de nube contratada | Misma región | Gasto mensual USD 95 mil | Se aprovisiona en horas si la región está disponible | |
| Equipos de oficina y notebooks | Oficinas | USD 0,4 M | 2 a 4 semanas | |

## Funciones críticas

| Función | Qué entrega | De qué activos o terceros depende | Plazo normal de reposición si se pierde lo que la sostiene |
|---|---|---|---|
| Plataforma en producción (toma de pedidos, ruteo, facturación) | El servicio que los clientes usan para vender y despachar cada día | Región del proveedor de nube; base de datos principal; equipo SRE | Si la región falla: lo que tarde el proveedor en restablecerla. Si se pierden los datos o el entorno: reconstrucción desde copias (ver S04-R01 y S04-R02). |
| Mantenimiento y corrección del núcleo del sistema | Corrección de fallas del motor de pedidos y facturación; entregas comprometidas en contratos | Dos personas que conocen el módulo heredado | Contratación de un perfil equivalente en la región: 3 a 5 meses, más 6 a 9 meses hasta conocer el módulo (estimación del área de personas, 2025). |
| Soporte a clientes | Atención de incidentes de usuarios | Contratista de soporte de primer nivel; soporte propio | Reemplazo del contratista: 2 a 3 meses. |

## Terceros relevantes

- **Proveedor de nube pública:** aloja toda la producción en una región. Contrato estándar del proveedor, con crédito de servicio como único remedio por indisponibilidad.
- **Cliente principal:** distribuidora mayorista de consumo masivo, 28% de la facturación. Opera 4 centros de distribución y unos 1.900 pedidos por hora en horario comercial a través de la plataforma.
- **Contratista de soporte de primer nivel:** 6 personas con credenciales de soporte.
- **Proyectos de software abierto y bibliotecas de terceros:** unas 1.240 dependencias directas e indirectas.
- **Servicio de repositorio de código:** aloja los repositorios.

## Marco regulatorio genérico

- **Protección de datos personales** (ley nacional genérica, aplicable por los datos de clientes finales que trata como encargada de tratamiento de sus clientes): obligación de notificar a la autoridad de protección de datos dentro de las 72 horas de conocida una brecha y a los titulares afectados sin demora indebida; la autoridad puede aplicar apercibimiento, multas de USD 1 mil a USD 1,5 M según cantidad de titulares y reincidencia, y la suspensión o clausura de la base de datos. En Chile rige una norma equivalente para 9 clientes.
- **Contratos con clientes:** el contrato estándar fija disponibilidad mensual del 99,5% y un crédito del 5% de la cuota mensual por mes bajo ese umbral, con responsabilidad limitada a 12 meses de cuotas. El cliente principal tiene condiciones propias (ver S04-R07 y S04-R02).
- No hay regulador sectorial de la actividad.

## Procedencia de los datos de empresa

| Dato | base | Evidencia | Qué falta confirmar |
|---|---|---|---|
| Facturación, margen de contribución y RO 2023–2025 | observed | EV-S04-001 (estados contables auditados 2023–2025, 2026-04) | — |
| Concentración de clientes | observed | EV-S04-002 (reporte de facturación por cliente, 2026-01) | — |
| Dotación por área y guardias | observed | EV-S04-003 (nómina y cronograma de guardias, 2026-09) | — |
| Registros de clientes finales en la base principal | inferred | EV-S04-004 (conteo de la tabla de clientes finales, 2026-08) | Puede haber duplicados entre clientes. |
| Plazo de contratación y aprendizaje de perfiles del núcleo | reported | EV-S04-005 (estimación del área de personas, 2025-10) | Estimación interna, sin comparables. |
| Costo de reescritura de la plataforma | assumed | sin_evidencia | Estimación del director técnico en una reunión de directorio de 2025. |
