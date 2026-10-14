# Cierre del piloto profesional S06 · Fase 12

2026-10-13 · BOS / Risk OS · T-0021 · F12-PILOTO-EMILIANO-01.

**Piloto completado. La v1 es reproducible con los factores registrados, pero Emiliano no la acepta como orden principal de riesgos.** Acepta el producto únicamente como tamizaje bajo condiciones propuestas que la v1 actual todavía no cumple. Emiliano cerró la Fase 12 el 2026-10-13 con este piloto como alcance suficiente. EMI-15 continúa pendiente de su cierre en Fase 13. Ver `../reporte-fase-12.md`.

## Orden y dictamen

- Orden previo A: **R03 > R01 > R04 > R05 > R06 > R02**.
- Orden calculado B: **R03 > R05 > R01 > R04 > R06 > R02**.
- Coinciden **13/15 pares**. Emiliano rechaza ambas inversiones: mantiene R01 sobre R05 por la naturaleza del daño, los pasivos y efectos sistémicos; mantiene R04 sobre R05 por vida humana e irreversibilidad.
- La referencia histórica del agente coincide con B en **15/15 pares y 6/6 bandas**. No es una evaluación nueva independiente ni prueba generalización.

| Posición B | Riesgo | Índice | Banda | Posición previa A |
|---|---|---:|---|---|
| 1 | R03 · Amoníaco | 80 | Crítica | 1 |
| 2 | R05 · Principal cliente | 80 | Crítica | 4 |
| 3 | R01 · Compresor | 75 | Crítica | 2 |
| 4 | R04 · Incendio | 60 | Alta | 3 |
| 5 | R06 · Autoelevador | 36 | Media | 5 |
| 6 | R02 · Corte eléctrico | 5 | Baja | 6 |

R05 alcanza 80 por 4 × 5 × 4; R01 alcanza 75 por 5 × 5 × 3; R04 alcanza 60 por 3 × 5 × 4. La escala económica satura en 5 y no conserva las diferencias nominales entre pérdidas superiores al corte. R03 desempata sobre R05 por Personas 4 frente a 1, tras empate de índice 80 e I efectivo 5. La explicación mecánica no resuelve el rechazo profesional.

Los techos y banderas no modifican el ranking ni las bandas. Las seis fichas son evaluables bajo sus supuestos y permanecen `pending`: entrega completa no equivale a aceptación profesional de cada escenario o factor.

## Respuestas de revisión

**Las ocho preguntas de metodología §16 están respondidas**, incluido el fragmento final. Las respuestas son posteriores a la revelación y están conservadas con su procedencia.

| Pregunta | Criterio expresado por Emiliano |
|---|---|
| EV-24 | Producto ordinal como tamizaje condicionado, no orden principal. |
| EV-06/37 | Evaluación jurídica contextual, basada en conducta, evidencia, causalidad y autoridad. |
| EV-02 | Facturación normalizada como referencia alternativa, con calibración propia y controles de liquidez y solvencia. |
| EV-08 | Tratamiento diferenciado de amenaza terminal, sin equipararla automáticamente a I-económico 5. |
| EV-10/20 | Prioridad estratégica del remoto terminal o fatal; distinción frente al extremo económico absorbible. |
| EV-11 | Banda Crítica incondicional para probable, económico extremo y preparación media. |
| EV-22 | Desempate por Personas, Legal, causalidad sistémica, pérdida irreversible e inminencia. |

Son criterios y propuestas posteriores, no una versión aprobada. El piso de EV-11 modificaría la regla vigente: P 4, I-económico 5, V-contención 3 y V-recuperación 3 dan índice 60, Alta. La nueva secuencia de EV-22 difiere de D10 y, si usa seguro para ordenar criticidad, tensiona D17.

Las propuestas de límites contractuales, seguros y crédito quedan como opinión del revisor, sin validación de cláusulas, cobertura o financiación. No se ejecutaron comunicaciones ni acciones externas.

## Límites y pendientes

Un profesional y un caso sintético con seis riesgos, en ejercicio guiado con aclaraciones registradas. Los supuestos técnicos, médicos y jurídicos no se convierten en diagnósticos o dictámenes verificados. No se alteraron factores para ajustar el orden.

Insumos posteriores al cierre de Fase 12:

1. Una ampliación con profesionales nuevos sería opcional y trabajo posterior; no es requisito para el cierre decidido por Emiliano.
2. Resolver o mantener explícitas las discrepancias de asignación, especialmente Personas de R06, recuperación parcial probada, frontera entre I y V y escenarios sin medición.
3. Validar las propuestas con casos adjudicados y regresión de una versión posterior, si se adoptan.
4. Preparar el cierre de EMI-15 en Fase 13 usando el dictamen ya emitido y el cierre de Fase 12.

No se declara falsación automática de D14: la independencia de los fallos y la ausencia de corrección simple todavía no se demostraron. La v1 permanece congelada.

## Evidencia y reproducción

Las entregas A y B están conservadas en archivos cerrados con huellas. El dictamen, las ocho respuestas, la comparación inicial y los registros de discrepancias quedan por separado dentro del piloto.

`comparacion/discrepancias.csv` contiene 112 registros de diferencias de valores, rangos, procedencia, derivados y orden; no representan 112 problemas independientes. Las dos inversiones tienen dictamen confirmado y continúan sin resolución metodológica. El registro por factor conserva los supuestos y observaciones del coordinador.

Desde `comparacion/`:

```bash
python3 comparar-piloto.py
node verificar-piloto.mjs
```

Salida literal comprobada:

```
PASS: 144 derivados y posiciones coinciden entre Python y TypeScript; 12 fichas, sin cambiar factores.
```

Las huellas de las reglas y las entregas A/B siguen intactas. Los dos CSV de Fase 11 conservan la excepción trazada de aceptación de EV-11-0063/0064 conforme a la regla 5. El cálculo prueba reproducción mecánica, no validez de supuestos ni generalización.
