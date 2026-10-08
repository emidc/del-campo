# Decisiones de Emiliano sobre la propuesta de la 9a

> Copiado tal cual de su mensaje en el thread "Fase 9a umbrales preliminares", 2026-10-08 21:44 UTC. Responde al "Para decidir" de `propuesta-umbrales-preliminares.md`.

> 1A, 2a, 3a, 4 sí.
> Adopto los cortes 20 / 50 / 75 como provisionales para la 9b. Las banderas mantienen visibilidad y tratamiento, sin imponer un piso de banda; corresponde corregir esa afirmación de D23.
> CP-05 R1 queda como FAIL de calibración, conservando la adjudicación original y la limitación de max() como evidencia.
> Avanzá con los 252 sintéticos y las señales de §12.6, prestando especial atención a Baja y a los casos de severidad extrema con probabilidad baja. La distribución servirá para revisar los cortes, sin forzar cupos por banda.

| Punto | Decisión |
|---|---|
| 1. Juego de cortes | **A**: Baja < 20 ≤ Media < 50 ≤ Alta < 75 ≤ Crítica (huecos 1a = 20 y 1b = 75), provisional para la 9b |
| 2. Contradicción #2 | **a**: un remoto no llega a la banda más alta; las banderas garantizan visibilidad y tratamiento, sin piso; se corrige el texto de D23 |
| 3. CP-05 R1 | **a**: FAIL — calibración, se conserva la adjudicación original como evidencia del límite de `max()` |
| 4. 9b | Sí, con atención a Baja y a severidad extrema con probabilidad baja; sin cupos |

# Aprobación de la 9b

> Copiado tal cual de su mensaje en el mismo thread, 2026-10-08 21:52 UTC. Responde al "Para decidir" de `reporte-fase-9.md`.

> 1a, 2a, 3a. Apruebo avanzar con CH-093 a CH-096, abrir la v0.3 y preparar la PR, sobre la base del resumen compartido.
>
> * Mantener 20/50/75. El 69,6% queda registrado como target de 70% no alcanzado, sin redondearlo a cumplimiento.
> * Registrar la concentración en Media sin ajustar ahora. Llevar el bloque 45–48 a Fase 11, incluyendo la pregunta sobre extremos con P 3 y V 3. La escasez de casos extremos con probabilidad baja queda como limitación de la validación.
> * D23 y §8.2: usar esta redacción: "Con la fórmula y los umbrales vigentes, P 1 llega como máximo a Media y P 2 como máximo a Alta. Alcanzar Crítica requiere P ≥ 3, aunque esa condición no es suficiente. Las banderas garantizan visibilidad y obligaciones de tratamiento, sin imponer un piso de banda".
>
> Conservar los FAIL de calibración y las discrepancias como evidencia abierta para Fase 11.

**Para la Fase 11** (evidencia abierta): el bloque de `C_raw` 45–48 (61 riesgos sintéticos, 10 extremos con P 3 y V 3: ¿Media o Alta?); los FAIL — calibración CP-05, CP-17 y CP-18; las 13 A1 de banda (`anomalias-banda.csv`); la escasez de riesgos extremos con probabilidad baja como limitación de la validación.
