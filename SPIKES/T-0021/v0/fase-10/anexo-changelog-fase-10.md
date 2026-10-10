# Anexo · fila propuesta para el changelog · Fase 10

> **Aplicada** el 2026-10-10 tras la aprobación de Emiliano (01:33 UTC) como CH-097 (el último id seguía siendo CH-096). Esta tabla queda como borrador.

> 2026-10-10 · metodologia v0.3 y protocolo v0.3, **sin cambio**. Es la fila de una corrida y no cambia ninguna regla.
> Releído hoy: el último id de `changelog-metodologia.md` es **CH-096** (PR #67). La fila no se agrega hasta que Emiliano apruebe el "Para decidir" de `reporte-fase-10.md`, y el id se vuelve a leer al aplicarla.

| id | fecha | versión | elemento | antes | después | motivo | fuente |
|---|---|---|---|---|---|---|---|
| CH-097 (prov.) | 2026-10-10 | v0.3 (sin cambio) | Corrida F10-REG-01 (regresión completa v0.2 → v0.3) | — | 20 casos de propiedad y 285 fichas de EMI-41 (255 del agente, 30 de Emiliano) recalculadas desde factores guardados. CH-092 a CH-094 son cambios de combinación o de texto, así que no se reevaluó ningún factor (protocolo §13). Casos: 13 PASS; 3 `regresionó` a FAIL — calibración (CP-05, CP-17, CP-18), ya aprobados por Emiliano y registrados en CH-093; 4 FAIL de la Fase 5 sin cambio; 20/20 iguales a F9B-CAL-01. EMI-41: `C_raw`, evaluabilidad y posición sin cambio en todas las fichas; 268 sólo ganan banda; 3 pasan a `consecuencia_extrema = true` por CH-092 (S10-R05, S17-R03, S34-R01). La banda como paso 1 de D10 no invierte ningún orden. D23 (CH-094) se cumple: P 1 ≤ Media, P 2 ≤ Alta, Crítica ⇒ P ≥ 3. Arnés ejecutable: 188 pass, 0 fail, 7 todo. | Plan, Fase 10; protocolo §13 | `v0/fase-10/reporte-fase-10.md`, `regresion.py`, `regresion-casos.csv`, `regresion-emi41.csv` |
