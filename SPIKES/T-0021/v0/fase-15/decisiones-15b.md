# Decisiones de la Fase 15b

> 2026-10-14 · T-0021, Fase 15b. Respuesta de Emiliano al «Para aprobar» de `dossier-fase-15b.md`.

## Texto de Emiliano (copia literal)

Revisión en el PR #76 (2026-10-14, 20:25 UTC):

> Seems good.

Respuesta en el hilo del proyecto (2026-10-14, 20:28:27 UTC), en una tarjeta con la pregunta «¿Tu "Seems good" del PR #76 vale como sí a los 9 puntos de "Para aprobar"?»:

> Sí a todo

La opción elegida decía: «Registro tu aprobación de los 9 puntos y sigo con el cierre; los casos históricos quedan pendientes de tu lista.»

## Qué quedó aprobado

| # | Punto | Respuesta |
|---:|---|---|
| 1 | CSV de las 8 empresas, con S07-R06 como caso consistente de EMI-16 | Sí |
| 2 | Los 10 registros de acción y las 6 filas de riesgo nuevas de la 15b | Sí |
| 3 | Validador, con las interpretaciones del dossier §3, y los 55 casos inválidos | Sí |
| 4 | Export ciego en TypeScript, exención de la plantilla vacía y aceptación de `EV-11-0063` en cada manifiesto | Sí |
| 5 | Lo que no cupo: las propuestas del dossier §6, todas la opción a, incluida la de `lote_origen` | Sí |
| 6 | Casos históricos | Sí. La confirmación es responder `lista-casos-historicos.md`, y esa lista sigue sin respuesta |
| 7 | Documento del spike | Sí |
| 8 | Dar EMI-16 por cerrado | Sí |
| 9 | Dar T-0021 por cerrado | Sí, pero la tarea queda abierta hasta que la lista del punto 6 esté respondida: su `## Verification` exige esa confirmación por escrito |

## Qué se hizo con esto

- **Documento del spike.** Quedó **aprobado por el owner** en cinco de sus seis comprobaciones. La de casos históricos queda abierta.
- **Changelog.** Ninguna fila: el anexo de la Fase 15 no tiene ninguna (`anexo-changelog-fase-15.md`).
- **EMI-16.** Lleva un comentario en Linear con el cierre y queda cerrado.
- **T-0021.** No se marcó terminada en ese momento. Faltaba la respuesta de `lista-casos-historicos.md`, y una tarea no se declara terminada con una comprobación de su `## Verification` sin hacer.

## Lista de casos históricos (2026-10-14, 20:43 UTC)

Emiliano respondió `lista-casos-historicos.md` en el hilo del proyecto. Sus respuestas están copiadas en ese archivo, incluida la confirmación, que dice literal:

> Confirmo que los cinco casos históricos pueden expresarse estructuralmente en los formatos propuestos de `risks.csv`, `action-plan.csv` y `risk-transfer.csv`, sin necesidad de exponer sus valores ni reescribir los casos, con una única salvedad de contrato: `risks.csv` debe permitir asociar un riesgo a una sede o unidad dentro de una organización. Incorporado ese ajuste, no identifico otros datos utilizados por Risk OS v1 que queden sin representación en los tres formatos.

Qué se hizo con esto:

- **Ajuste de contrato.** Se agregó `unidad_id` a `risks.csv`. Es opcional, es un id opaco sin clave foránea (D-0063) y es igual en todas las filas del riesgo (RV-RSK-01). No cambia el orden, que sigue siendo por organización (metodología §7.1.4).
- **Documento del spike.** Quedó tildada la comprobación de casos históricos. Las seis están hechas.
- **T-0021.** Queda en condiciones de cerrarse con el merge de este PR, según lo aprobado en el punto 9.
