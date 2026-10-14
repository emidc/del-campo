# Dossier de cierre de EMI-41 · Fase 14

> 2026-10-14 · T-0021, workstream BOS / Risk OS. **Aprobado por Emiliano el 2026-10-14 15:04 UTC: sí a los siete puntos. EMI-41 cerrada** (respuesta en `decisiones-14.md`). Verificación y empaquetado: no se crearon empresas ni riesgos, no se reevaluaron factores, no se editaron fichas, listas, diseño, `cerrado/` ni archivos de la tabla de `v1/congelamiento.md`. Fuente: la repo después de la PR #72 (Fase 12 cerrada y mergeada); la copia de la carpeta compartida está atrasada (`inventario.md`, encabezado).

## Resumen

- **14 criterios de cierre (9 del plan, 5 de EMI-41 en Linear): 9 cumplidos, 5 cumplidos con limitación, ninguno no cumplido.**
- Las limitaciones: plausibilidad revisada por un solo profesional en 6 fichas; ids de evaluación repetidos entre dos familias; cobertura con huecos (EV-14, C34); dataset pendiente de este manifiesto y de los formatos de la Fase 15.
- **Integridad: sin diferencias.** 37 empresas, 255 objetos, 252 fichas con factores; listas, carpetas, padres, escenarios, evaluaciones y regresión cruzan sin faltantes. Las siete huellas de la intención coinciden.
- **Cobertura efectiva: 30 de 35 contrastes tensionaron la metodología**, 4 se cubrieron sin hallazgo propio (C04, C26, C28, C30) y 1 tiene cobertura insuficiente (C34).
- EV-11-0063 y EV-11-0064 ya están aceptadas por Emiliano (2026-10-13). No hay propuestas pendientes.
- **Dataset:** índices de empresas y riesgos, script que los regenera y manifiesto con tres modos de uso. Falta aprobarlo.

## 1. Inventario

Detalle en `inventario.md`; mediciones en `analisis-cierre.json`.

- **Conteos.** 37 empresas en 7 familias; 240 riesgos, 9 sub-riesgos de 3 padres, 3 escenarios. 6 a 10 objetos por empresa.
- **Cruces.** Cada fila de lista tiene su ficha y viceversa; ids únicos; cada padre lista hijos que existen y coinciden con la lista; los miembros de cada escenario existen. Cada riesgo con factores propios tiene su ficha del agente de la Fase 8 y su fila en `regresion-emi41.csv`. Las 30 de Emiliano son la muestra sorteada.
- **Hashes.** Los siete `intencion-*.md` coinciden con la única línea de su familia en `hashes-intencion.md`. En la tabla del congelamiento, 15 de 17 coinciden; los dos CSV de ronda 2 difieren por la aceptación del 2026-10-13 y coinciden con las huellas que ese registro publica.
- **Inconsistencia.** `evaluacion_id` se repite: `EV-0001` a `EV-0027` existen en las fichas del agente de agro y alimentos y en las de servicios a personas. Con (`evaluacion_id`, `risk_id`) todo es único y la regresión no queda ambigua. No se corrige acá.
- **`review_status`.** 255 + 30 de la Fase 8 y 6 de la Fase 12 `pending`; de las 64 de la Fase 11b, 62 `pending` y 2 `accepted`. Lo de la Fase 8 es un campo del experimento (EV-27).

## 2. Criterios de cierre

Una fila por criterio, con evidencia, en `criterios-cierre-emi41.csv`.

| id | Criterio | Dictamen | Por qué |
|---|---|---|---|
| P1 | Al menos 5 empresas | cumplido | 37 |
| P2 | Diversidad justificada | cumplido | Las 37 tienen un contraste directo. S01, S25 y S30 no aportaron nada que otra no aportara (dato para la Fase 15) |
| P3 | Riesgos plausibles | con limitación | Fase 7 aprobada sin cambios; Fase 12 no cuestionó la plausibilidad de ningún riesgo, pero cubre 6 fichas con un revisor |
| P4 | Controles y condiciones | cumplido | Secciones de P, I y V en 251–252 de 252 fichas y en las 37 empresas |
| P5 | Procedencia e incertidumbre | con limitación | 100% de factores con base y evidencia; ids repetidos y 15 filas con `—` como base |
| P6 | Escenarios con unknowns | cumplido | Agente: 15 fichas con unknown, 8 no evaluables. Emiliano: 9 y 7 |
| P7 | Resultados P/I/V | cumplido | 244 evaluables con C, banda y banderas; 8 no evaluables con motivo |
| P8 | Cobertura que tensionó | con limitación | 30 de 35; EV-14 y C34 |
| P9 | Dataset reutilizable | con limitación | Armado; falta aprobar el manifiesto y los formatos de EMI-16 |
| L1 | Cinco o más empresas documentadas | cumplido | Igual que P1 y P4 |
| L2 | Lista de riesgos usable para EMI-15 | cumplido | Evaluada completa en las Fases 8 y 11 |
| L3 | Comparar criticidad y detectar huecos | cumplido | 46 puntos del inventario de evidencia; CH-098 a CH-109 |
| L4 | Procedencia según EMI-17 | con limitación | Igual que P5 |
| L5 | Sin taxonomía exhaustiva | cumplido | Por diseño |

**Riesgos cuestionados (P3).** Ninguno por plausibilidad. Lo que el piloto de la Fase 12 marcó sobre S06 es información: S06-R02 no desglosa su costo; en S06-R03 el revisor agregó supuestos propios (proveedor de amoníaco a 150 km, clausura de 20 a 45 días) que la ficha no trae; S06-R05 deja el margen indeterminado, por diseño (C21); en S06-R06 se discute si la estiba que cae sobre una persona es el evento o una coincidencia; y faltan mediciones técnicas, médicas y jurídicas. Todo queda registrado en `fase-12/piloto-emiliano/etapa-b/registro.md` y `comparacion/discrepancias.csv`, sin resolver, como lo dejó el cierre de la Fase 12.

**Lo que un script no mide (P4).** Respuesta y redundancia no tienen sección propia: el texto de V las nombra en 161 y 119 fichas, pero no se puede distinguir si en las otras faltan o no aplican, ni juzgar la calidad de un control.

## 3. Cobertura efectiva

`cobertura-efectiva.csv`, con la regla de atribución en `inventario.md` §5: cuenta como hallazgo propio un punto del inventario de evidencia cuyo tema es el contraste, su chequeo de la 8c no cumplido, pares que la intención separa y la banda junta, o lo que el piloto de la Fase 12 discutió sobre ese tema. Lo que aparece en sus riesgos (A1, divergencias, cambios con la v1, anomalías) queda como contexto, porque cada riesgo lleva varios contrastes.

- **Tensionaron (30).** Los que más produjeron: C01 (EV-08, EV-10, EV-14, EV-20, EV-46, tres de ellos preguntas de la Fase 12), C03 (EV-30 y CH-106; 8 de 21 pares juntados), C11 (EV-07, EV-16, EV-23, EV-29; 11 de 19 con la evaluabilidad pretendida), C13 (11 de 28 pares), C19 (EV-26; 14 de 32 pares) y C22 (EV-41; 27 de 33 con `no_aplica` donde se pretendía).
- **Cubiertos sin hallazgo (4).** C04 dependencia tecnológica (12 riesgos), C26 responsabilidad por producto (13), C28 personas vulnerables (12), C30 gobernanza (4). La metodología los procesó sin anomalía propia.
- **Cobertura insuficiente (1).** C34 baja exposición humana con activos de alto valor: 3 riesgos de una sola empresa (S33).
- **Dentro de un contraste.** EV-14: C01 tiene 13 riesgos pero casi ninguno remoto con consecuencia extrema.

## 4. Dataset

En `dataset/`: `indice-empresas.csv` (37 filas: nombre, arquetipo, familia, dotación, RO del último ejercicio, contrastes directos y de costado, conteos, ruta), `indice-riesgos.csv` (255 filas: objeto, padre o miembros, título, ruta, contrastes de la intención, todas las evaluaciones en orden, resultado v1 del agente y de Emiliano, muestra, Fase 12, estado de revisión y propuestas), `construir_indice.py` y `manifiesto.md`.

El manifiesto define tres modos con lo que cada uno puede ver (evaluación ciega sólo con fichas de información; regresión con factores guardados y versión; demostración por empresa), las limitaciones y lo que le queda a la Fase 15. Lleva el SHA-256 de los 369 archivos que componen el dataset.

## 5. Lo que no cierra

Ningún criterio queda `no cumplido`, así que no hay salidas mínimas que proponer ni empresas nuevas.

Dos cosas del prompt no se pueden hacer como están escritas:

- **El changelog está congelado.** El prompt pide agregar las filas del anexo al changelog después de la aprobación, pero `v0/changelog-metodologia.md` está en la tabla de `v1/congelamiento.md`. El anexo propone CH-111 y CH-112 como limitaciones registradas; si se aprueban, quedan en el anexo y pasan al changelog cuando se abra la versión siguiente (punto 6).
- **La Fase 13 está en curso** (`v0/fase-13/` tiene criterios y registro de discrepancias, sin `decisiones-13.md`). Nada de lo que trae hasta ahora cambia este dossier.

## Para aprobar

1. ¿Aprobás el inventario (`inventario.md`) con la repetición de `evaluacion_id` registrada para la Fase 15, sin renombrar fichas?
2. ¿Aprobás la matriz de criterios (`criterios-cierre-emi41.csv`): 9 cumplidos y 5 cumplidos con limitación?
3. ¿Aprobás la cobertura efectiva (`cobertura-efectiva.csv`) con su regla de atribución?
4. ¿Aprobás el manifiesto del dataset (`dataset/manifiesto.md`), con sus tres modos de uso?
5. ¿Registramos S01, S25 y S30 como empresas que no aportaron nada distinto después de la Fase 8, conservándolas en el dataset?
6. ¿Aprobás CH-111 y CH-112 del anexo como limitaciones, para pasarlas al changelog cuando se abra la versión siguiente?
7. ¿Damos EMI-41 por cerrada con este dossier, dejando su estado en Linear como está (Done)?
