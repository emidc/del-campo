# S29 · Fintech de pagos

> Ficha de empresa · EMI-41 · información al 2026-09-30

| Campo | Dato |
|---|---|
| Código | S29 |
| Arquetipo | Fintech de pagos: procesador y proveedor de servicios de pago para comercios |
| Familia | Tecnología y pagos |
| Actividad | Autoriza pagos con tarjeta de crédito y débito para comercios (presenciales con terminales y en línea), los liquida a cada comercio y gestiona contracargos. Opera bajo licencia de proveedor de servicios de pago otorgada por el regulador financiero. Cobra una comisión sobre cada pago procesado. |
| Ubicación genérica | Oficinas centrales en una capital de Cuyo (tres pisos); un centro de atención a comercios en otra ciudad de la región. Toda la producción corre en un proveedor de nube pública, en dos regiones activas a la vez. |
| Forma jurídica genérica | Sociedad anónima; accionistas: un grupo inversor regional (55%), fondos de capital de riesgo (35%) y fundadores (10%). |

## Dotación

600 empleados propios al 2026-09-30.

| Área | Propios | Horario y turnos | Notas |
|---|---|---|---|
| Tecnología: desarrollo | 190 | Lunes a viernes, 09–18 | 22 equipos de producto. |
| Tecnología: infraestructura y confiabilidad (SRE) | 40 | Lunes a viernes, 09–18; guardia 24 h | Guardia permanente de 3 personas (una por plataforma: autorización, liquidación, datos). |
| Tecnología: seguridad de la información | 30 | Centro de operaciones de seguridad 24 h en tres turnos (06–14, 14–22, 22–06), 4 analistas por turno; el resto, horario de oficina | |
| Operaciones de pagos (liquidaciones, conciliación, contracargos) | 85 | Dos turnos, 06–14 (50) y 14–22 (35), de lunes a sábado | Liquidaciones a comercios: cierre diario a las 13. |
| Atención a comercios | 120 | 07–15 (55), 15–23 (50), 23–07 (15), todos los días | |
| Riesgo y prevención de fraude | 35 | Lunes a sábado, 08–20; una persona de guardia fuera de horario | |
| Cumplimiento y legal | 25 | Lunes a viernes, 09–18 | Incluye 4 personas de reportes regulatorios. |
| Comercial | 45 | Lunes a viernes, 09–18 | |
| Administración, finanzas y dirección | 30 | Lunes a viernes, 09–18 | |
| **Total** | **600** | | |

Ningún riesgo de la lista tiene personas expuestas a daño físico propio de la operación: la operación es oficina y nube.

## Resultados de los tres últimos ejercicios cerrados

| Ejercicio | Facturación | Margen de contribución | Resultado operativo (RO) | Partidas extraordinarias identificadas |
|---|---|---|---|---|
| 2023 | USD 152 M | USD 60,8 M (40%) | USD 27,4 M | Ninguna |
| 2024 | USD 168 M | USD 67,2 M (40%) | USD 30,9 M | Costo no recurrente de la migración a dos regiones de nube, USD 2,1 M (RO sin esa partida: USD 33,0 M) |
| 2025 | USD 181 M | USD 74,2 M (41%) | USD 32,1 M | Ninguna |

- **Volumen:** USD 9.800 M procesados en 2025; 412 M de pagos (1,13 M por día en promedio). 28.400 comercios activos al 2026-09.
- **Estacionalidad:** noviembre y diciembre concentran el 24% del volumen anual; los dos días de mayor volumen de 2025 (fechas de promociones de noviembre) tuvieron 2,6 M de pagos cada uno.
- **Ingresos y margen por día:** facturación diaria promedio de 2025, USD 496 mil; margen de contribución diario promedio, USD 203 mil. En un día pico, 2,3 veces el promedio.
- **Margen de contribución:** facturación menos aranceles de las redes de tarjetas y de los bancos emisores, costo variable de nube, pérdidas por fraude y contracargos no recuperados, y comisiones de agentes. Lo calcula finanzas cada mes; auditado en los estados de 2023 a 2025.
- **Costos fijos 2025:** USD 42,1 M (sueldos y cargas, USD 33,4 M; resto, USD 8,7 M).
- **Liquidaciones a comercios:** USD 26,8 M por día en promedio en 2025.

## Activos principales

| Activo | Ubicación | Valor de reposición | Plazo normal de reposición de mercado | Notas |
|---|---|---|---|---|
| Plataforma de autorización de pagos (software propio) | Dos regiones de nube | Sin valor de mercado | No se compra en el mercado | Procesa en las dos regiones a la vez, 50% del tráfico en cada una. |
| Plataforma de liquidación y conciliación | Dos regiones (una activa, la otra en espera) | Sin valor de mercado | — | |
| Bóveda de datos de tarjetas (tokenización) | Dos regiones | — | — | 4,1 M de números de tarjeta guardados cifrados y reemplazados por códigos en el resto de los sistemas. |
| Terminales de pago en comodato a comercios | Comercios | USD 14,2 M (71 mil terminales) | 6 a 10 semanas por importación | |
| Equipos de oficina | Oficinas | USD 3,1 M | 2 a 4 semanas | |

## Funciones críticas

| Función | Qué entrega | De qué activos o terceros depende | Plazo normal de reposición si se pierde lo que la sostiene |
|---|---|---|---|
| Autorización de pagos | La respuesta a cada pago de un comercio, en menos de 2 segundos | Plataforma de autorización; proveedor de nube; conexiones con las redes de tarjetas | Ver sub-riesgos de S29-P01. |
| Liquidación a comercios | El pago diario a cada comercio de lo vendido | Plataforma de liquidación; bancos pagadores | Ver S29-R05. |
| Reportes al regulador | Información diaria, mensual y de incidentes | Área de reportes regulatorios; almacén de datos | Ver S29-R06. |
| Alta y verificación de comercios | Incorporación de comercios nuevos | Proveedor de verificación de identidad | Reemplazo del proveedor: 3 a 4 meses. |

## Terceros relevantes

- **Proveedor de nube pública:** dos regiones de un mismo proveedor (contrato empresarial con soporte prioritario).
- **Redes de tarjetas y bancos emisores:** reciben las autorizaciones; fijan multas por incumplimiento de sus normas de seguridad.
- **Proveedor de verificación de identidad:** valida la identidad de los titulares y apoderados de los comercios en el alta (ver S29-R07).
- **Bancos pagadores:** ejecutan las transferencias de liquidación.
- **Aseguradora:** pólizas en `transferencia.md`.

## Marco regulatorio genérico

- **Regulador financiero:** licencia de proveedor de servicios de pago. Exige reportes diarios de operaciones, reportes mensuales estadísticos y contables, y la notificación de todo incidente operativo o de seguridad que interrumpa servicios a clientes por más de 30 minutos, dentro de las 4 horas. Sanciones: apercibimiento, multas de USD 20 mil a USD 2 M por infracción, plan de adecuación obligatorio con inspección, suspensión de la incorporación de comercios nuevos, suspensión o revocación de la licencia.
- **Normas de seguridad de datos de tarjetas** de las redes (certificación anual): multas de las redes de USD 5 mil a USD 100 mil por mes de incumplimiento y, en caso de compromiso de datos, cargos por tarjeta comprometida.
- **Protección de datos personales:** notificación a la autoridad dentro de 72 horas y a los titulares; multas de USD 1 mil a USD 1,5 M.
- **Prevención de lavado de dinero:** obligaciones de conocimiento del cliente sobre los comercios.

## Procedencia de los datos de empresa

| Dato | base | Evidencia | Qué falta confirmar |
|---|---|---|---|
| Facturación, margen y RO 2023–2025 | observed | EV-S29-001 (estados contables auditados, 2026-03) | — |
| Volumen y comercios | observed | EV-S29-002 (reporte estadístico mensual al regulador, 2026-08) | — |
| Dotación y turnos | observed | EV-S29-003 (nómina y cronogramas, 2026-09) | — |
| Marco sancionatorio | reported | EV-S29-004 (resumen del área legal, 2026-06) | — |
