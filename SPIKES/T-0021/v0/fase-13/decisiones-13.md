# Decisiones de Emiliano sobre el dossier de la Fase 13

> Mensaje de Emiliano en el hilo de la Fase 13, **2026-10-14 15:01:35 UTC**, sobre el "Para decidir" de `dossier-cierre-emi15.md`. Está copiado tal cual en el anexo. La tabla resume lo que decidió.

## Resultado

| # | Punto | Decisión | Efecto |
|---:|---|---|---|
| 0 | EV-11-0063 y EV-11-0064 | Sin decisión: ya aceptadas el 2026-10-13 | Métricas oficiales: `evaluable` 23/30, banda 16/23 |
| 1 | Conteo de D14 | **a**: 2 de 3, no falsada | S06 es un único caso independiente. Los dos pares son manifestaciones del mismo mecanismo de compensación y comparten R05 |
| 2 | Validez de `P × I × V` | **b**, con precisión de lenguaje | Retenido provisionalmente como **índice heurístico de tamizaje, no validado como función de orden final**. `C_raw` se muestra con el vector de factores y las banderas y puede reordenarse profesionalmente según lo que defina EMI-16. **`C_raw` no es una medida cardinal**: sus diferencias o cocientes no tienen interpretación cuantitativa de criticidad |
| 3 | Calibración de bandas (P09) | **a** | 16/23 = 69,6%: target de 70% no alcanzado, aceptado como limitación no bloqueante de v1. EV-08 y EV-11 pasan a v1.1 |
| 4 | Falsa precisión (L08) | Cumplido con limitación | Condicionado a las restricciones de uso y presentación del punto 2 |
| 5 | Estado de la metodología | **a** | La v1 candidate se promueve a v1 sin cambios de regla. Las propuestas de la Fase 12 son de una futura v1.1 y no bloquean EMI-16 |
| 6 | Destino de lo abierto | **a** | Se aceptan los destinos y se unen las copias de `respuestas-emiliano.md`. Antes de cerrar EMI-15 tienen que quedar creados y vinculados, al menos, los follow-ups de metodología v1.1 y de validación independiente de v1, sin bloquear EMI-16 |
| 7 | ¿Se cierra EMI-15? | **Sí, Done**, una vez materializados los puntos anteriores | |

**Alcance de la promoción** (palabras de Emiliano): la v1 es una baseline estable para uso experimental en Risk OS; no implica que `P × I × V` esté validado como modelo universal ni como orden profesional definitivo.

## Criterios con dictamen final

| Criterio | Dictamen propuesto | Dictamen final |
|---|---|---|
| P09 Calibración de bandas | decide Emiliano | cumplido con limitación (no bloqueante) |
| P12 Decisión sobre `P × I × V` | decide Emiliano | cumplido: retenido provisionalmente como índice heurístico de tamizaje |
| L08 Sin falsa precisión | decide Emiliano | cumplido con limitación, condicionado al punto 2 |

Con esto, de los 22 criterios hay 9 cumplidos, 13 cumplidos con limitación y ninguno no cumplido. `criterios-cierre-emi15.csv` conserva el dictamen propuesto; esta tabla manda.

## Qué se materializó

- Changelog: CH-111 (cierre de EMI-15 y decisión sobre D14) y CH-112 (versión v1), con los ids libres al 2026-10-14.
- `v1/metodologia-v1.md` y `v1/congelamiento-v1.md`. `v1/metodologia-v1-candidate.md` queda como registro.
- `fuentes/respuestas-emiliano.md` con las dos copias unidas.
- Linear: los follow-ups de metodología v1.1 y de validación independiente de v1, vinculados a EMI-15; comentario en EMI-15 y paso a Done.

## Anexo · mensaje de Emiliano, tal cual

> 2026-10-14 15:01:35 UTC · "say it" (Emiliano), en el hilo de la Fase 13.

1. D14: opción a. Acepto el conteo 2 de 3, no falsada. Considero S06 un único caso independiente a efectos de D14; los dos pares son manifestaciones del mismo mecanismo de compensación y comparten el riesgo R05.
2. Validez provisional de `P × I × V`: opción b, con una precisión de lenguaje: la considero retenida provisionalmente como índice heurístico de tamizaje, no validada como función de orden final. `C_raw` deberá mostrarse junto con el vector de factores y las banderas y podrá ser reordenado profesionalmente según lo definido para EMI-16. Además, debe quedar explícito que `C_raw` no es una medida cardinal: sus diferencias o cocientes no tienen interpretación cuantitativa de criticidad.
3. Calibración de bandas: opción a. El resultado 16/23 = 69,6% queda registrado explícitamente como target de 70% no alcanzado, pero aceptado como limitación no bloqueante de v1. Los desacuerdos EV-08 y EV-11 pasan a v1.1.
4. Falsa precisión: cumplido con limitación, condicionado a las restricciones de uso y presentación definidas en el punto 2.
5. Estado de la metodología: opción a. Promover la v1 candidate a v1 sin cambios de regla. Las propuestas surgidas de la Fase 12 pertenecen a una futura v1.1 y no bloquean EMI-16.
6. Destino de abiertos: opción a. Acepto los destinos propuestos y la unión de las copias de `respuestas-emiliano.md`. Antes de cerrar EMI-15 deben quedar creados y vinculados al menos los follow-ups de metodología v1.1 y de validación independiente de v1, sin que estos bloqueen EMI-16.
7. EMI-15: sí, cerrar y pasar a Done una vez materializados los puntos anteriores.

La promoción a v1 significa una baseline estable para uso experimental en Risk OS; no implica que `P × I × V` haya sido validado como modelo universal ni como orden profesional definitivo.
