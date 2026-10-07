# S29 · Transferencia

> Ficha de transferencia · EMI-41 · información al 2026-09-30 · Empresa: S29 · Fintech de pagos

Esta ficha describe sólo las pólizas. No describe medidas de contención ni de recuperación.

## Póliza ciber

- **Vigencia:** 2026-04-01 a 2027-03-31. Aseguradora local con reaseguro en el exterior.
- **Límite agregado anual:** USD 25 M para todas las coberturas juntas.

| Cobertura | Sublímite | Deducible | Período de espera | Notas |
|---|---|---|---|---|
| Respuesta a incidentes (forense, legal, notificación, centro de atención) | USD 5 M | USD 500 mil por evento | — | |
| Responsabilidad por datos y seguridad frente a terceros | USD 25 M (dentro del agregado) | USD 500 mil por evento | — | |
| Cargos y multas de las redes de tarjetas | USD 5 M | USD 500 mil por evento | — | |
| Multas regulatorias, donde la ley permita asegurarlas | USD 1 M | USD 500 mil por evento | — | El área legal opina que las multas del regulador financiero no son asegurables; no hay antecedente. |
| Extorsión (pago, negociación) | USD 2 M | USD 500 mil por evento | — | Incluye el costo del negociador. |
| Interrupción de negocio por un incidente de seguridad en sistemas propios | USD 10 M | — | 12 horas | Indemniza el margen perdido después de las primeras 12 horas de interrupción. |
| Interrupción de negocio por falla de un proveedor de tecnología (dependiente) | USD 3 M | — | 12 horas | Sólo por un incidente de seguridad (ataque) en el proveedor. |

**Exclusiones relevantes:**
- Fallas de infraestructura del proveedor de nube (energía, red, software del proveedor) que no sean consecuencia de un ataque.
- Errores de software propios que no sean consecuencia de un ataque (por ejemplo, un despliegue defectuoso).
- Actos dolosos de directores; actos dolosos de empleados quedan fuera de esta póliza y van a la de fidelidad.
- Incumplimientos de reporte al regulador que no deriven de un incidente de seguridad.
- Pérdidas por incidentes en proveedores cuyo informe de auditoría de seguridad no esté vigente, salvo que la aseguradora lo haya aceptado por escrito (cláusula agregada en la renovación de 2026-04).

**Consumo del límite:** ningún siniestro en las vigencias 2024–2025, 2025–2026 y 2026–2027.

## Póliza de fidelidad (crimen)

- **Vigencia:** 2026-04-01 a 2027-03-31.
- **Cobertura:** pérdida de fondos propios o de terceros a cargo de la empresa por actos deshonestos de empleados, solos o con terceros.
- **Límite:** USD 3 M por evento y agregado anual. **Deducible:** USD 250 mil por evento.
- **Exclusiones relevantes:** pérdidas descubiertas más de 12 meses después del hecho; pérdidas causadas por un empleado del que la empresa ya conocía un acto deshonesto anterior.
- **Consumo:** ningún siniestro.

## Otras pólizas

- Responsabilidad civil general (USD 2 M), daños a oficinas y equipos (USD 4 M), seguro obligatorio de riesgos del trabajo. Ninguna alcanza los riesgos de la lista.
- Terminales en comodato: seguro de robo y daño (USD 10 M), sin relación con los riesgos de la lista.

## Qué riesgos de la lista alcanza cada póliza

| Riesgo | Póliza ciber | Póliza de fidelidad |
|---|---|---|
| S29-P01-S01 | No: exclusión de fallas de infraestructura del proveedor de nube | No |
| S29-P01-S02 | Sí: respuesta, extorsión, interrupción con espera de 12 horas, responsabilidad | No |
| S29-P01-S03 | No: exclusión de errores de software propios | No |
| S29-R04 | Sí: respuesta, responsabilidad y cargos de redes (sublímite de USD 5 M) si quien usa la credencial es un tercero; si es un empleado, ver fidelidad | Sólo por pérdida de fondos; los cargos de las redes no son fondos |
| S29-R05 | No | Sí |
| S29-R06 | No: exclusión de incumplimientos de reporte | No |
| S29-R07 | Sólo si la aseguradora acepta el informe de auditoría del proveedor, que está vencido desde 2024-12 | No |

## Procedencia

| Dato | base | Evidencia | Qué falta confirmar |
|---|---|---|---|
| Condiciones de la póliza ciber | observed | EV-S29-080 (póliza y anexos, 2026-04) | — |
| Condiciones de la póliza de fidelidad | observed | EV-S29-081 (póliza, 2026-04) | — |
| Asegurabilidad de multas del regulador | reported | EV-S29-082 (opinión del área legal, 2026-05) | Sin antecedente. |
