# Decisiones de la Fase 15a

> 2026-10-14 · T-0021, Fase 15a (contratos para EMI-16). Respuesta de Emiliano al "Para decidir" de `dossier-fase-15a.md`, escrita en el hilo del proyecto el **2026-10-14 a las 16:15:39 UTC**. Abajo va copiada sin cambios, después una tabla con lo que decidió en cada punto y al final lo que se ajustó en el contrato por esas decisiones.

## Texto de Emiliano (copia literal)

> 1. IDs: opción a. Apruebo ids globales con prefijo de entidad y ULID. Los ids históricos no se renombran y se conservan mediante `id_origen`, `evaluacion_id_origen` y `lote_origen`. `organizacion_id` queda opaco.
> 2. `base = —`: opción a. Se considera dato ausente de la ficha de información, no un nuevo valor de procedencia. Los contratos conservan exclusivamente `observed | reported | inferred | assumed`; la ausencia se expresa mediante `sin_evidencia` y la nota correspondiente.
> 3. Procedencia: opción b. Procedencia por registro obligatoria y procedencia por factor opcional. Cuando exista procedencia por factor se conserva; no se obliga a reconstruirla artificialmente para datos históricos.
> 4. `review_status`: opción a. Por registro en evaluaciones, acciones y coberturas. Los eventos de póliza no requieren revisión profesional propia. `accepted` sólo puede provenir de revisión humana.
> 5. `C_raw` y reordenamiento: opción a. `C_raw` existe únicamente como salida calculada y siempre se presenta junto al vector completo y las banderas. El reordenamiento profesional es un registro propio del contexto Risk OS y no forma parte de los CSV de importación en v1.
> 6. Derivados: opción a. No se importan. Risk OS los calcula mediante las funciones versionadas de la metodología. La presencia de columnas derivadas en un archivo de entrada es error.
> 7. Padres, sub-riesgos y escenarios: opción a. El padre tiene identidad propia pero no evaluación ni factores. Los sub-riesgos lo referencian. Un escenario es un Risk con miembros y evaluación propia y no modifica directamente las evaluaciones de sus miembros.
> 8. Evaluación vigente: opción a, con un cambio. Mantengo una sola historia por riesgo y no importo juntas evaluaciones experimentales paralelas. Sin embargo, una ramificación de `evaluacion_anterior_id` debe ser un rechazo de importación, no un aviso, porque una historia ramificada puede producir más de una evaluación aceptada candidata a vigente y volver ambiguo el estado del riesgo. En v1 la historia debe ser una cadena lineal. La evaluación vigente es la última `accepted`; una evaluación posterior todavía `pending` no reemplaza a la aceptada.
> 9. Ciclo y revisión pendiente: opción a. Una revisión pendiente se abre por acción cumplida, información nueva, cambio de contexto o cambio de versión cuando corresponda, y la cierra una persona mediante reevaluación aceptada o “sin cambio” fundamentado. Un ciclo es una revisión cerrada. Los eventos de póliza conservan su propio historial y no cuentan como ciclos del riesgo.
> 10. Empresas y acciones: opción a. Apruebo S05, S06, S07, S15, S28, S29, S32 y S36, los 10 registros nuevos de acción, los casos válidos adicionales indicados y los 54 casos inválidos de una mutación por regla de rechazo. Los casos agregados por la 15b deben mantenerse identificados mediante `lote_origen = T-0021/15b`.
> 11. Export ciego: opción a. Apruebo lista blanca, generación fuera del repositorio, manifiesto con hashes y las cuatro comprobaciones. La comprobación de contaminación procedente de la metodología o protocolo es obligatoria; sólo puede omitirse para un caso concreto mediante aceptación explícita registrada en el manifiesto.
> 12. Guía de redacción del evento: opción a. Se escribe como anexo que referencia reglas y casos existentes. Lo que requiera reglas nuevas pasa a EMI-43 y no se incorpora al contrato de datos.
> 13. CH-113 y CH-114: opción a. Permanecen pendientes hasta que se abra la próxima versión. La Fase 15 no modifica el changelog congelado.
> 14. Aprobación de los formatos: opción b — sí, con el cambio del punto 8. Apruebo la arquitectura y los contratos de `risks.csv`, `action-plan.csv` y `risk-transfer.csv` con las decisiones anteriores. Una vez ajustada la validación de historia de evaluaciones para rechazar ramificaciones, puede avanzar la Fase 15b con la construcción de CSV sintéticos, validador, casos válidos e inválidos y export ciego.

## Qué se decidió en cada punto

| # | Punto | Opción | Qué quedó decidido | ¿Igual a la recomendada? |
|---:|---|---|---|---|
| 1 | Ids | a | Globales con prefijo de entidad y ULID. Los históricos no se renombran: van a `id_origen`, `evaluacion_id_origen` y `lote_origen`. `organizacion_id` es opaco | Sí |
| 2 | `base = —` | a | Dato ausente de la ficha de información. El enum sigue siendo `observed \| reported \| inferred \| assumed`; la ausencia es `sin_evidencia` con su nota | Sí |
| 3 | Procedencia | b | Por registro obligatoria, por factor opcional. Si existe se conserva; no se reconstruye para datos históricos | Sí |
| 4 | `review_status` | a | Por registro en evaluaciones, acciones y coberturas. Los eventos de póliza no lo llevan. `accepted` sólo por revisión humana | Sí |
| 5 | `C_raw` y reordenamiento | a | `C_raw` sólo como salida calculada, con el vector completo y las banderas. El reordenamiento es un registro de Risk OS, fuera de los CSV de importación en v1 | Sí |
| 6 | Derivados | a | No se importan; los calcula Risk OS con las funciones versionadas. Una columna derivada en la entrada es error | Sí |
| 7 | Padres y escenarios | a | Padre con identidad y sin evaluación ni factores; sub-riesgos que lo referencian; escenario con miembros y evaluación propia, que no modifica a sus miembros | Sí |
| 8 | Evaluación vigente | a, **con un cambio** | Una sola historia por riesgo, sin evaluaciones paralelas del experimento. **La historia ramificada es rechazo, no aviso:** en v1 es una cadena lineal. Vigente = la última `accepted`; una posterior `pending` no la reemplaza | No: cambia la severidad de la ramificación |
| 9 | Ciclo y revisión pendiente | a | Abren la acción cumplida, la información nueva, el cambio de contexto y el cambio de versión cuando corresponde; cierra una persona. Ciclo = revisión cerrada. Los eventos de póliza tienen su historial y no son ciclos | Sí |
| 10 | Empresas y acciones | a | S05, S06, S07, S15, S28, S29, S32 y S36; 10 acciones nuevas; los casos válidos adicionales; un caso inválido de una mutación por regla de rechazo. Lo que agrega la 15b lleva `lote_origen = T-0021/15b` | Sí |
| 11 | Export ciego | a | Lista blanca, fuera del repositorio, manifiesto con hashes y las cuatro comprobaciones. La de contaminación es obligatoria y se omite sólo para un caso concreto con aceptación explícita en el manifiesto | Sí |
| 12 | Guía del evento | a | Anexo que referencia reglas y casos existentes. Lo que pida reglas nuevas va a EMI-43 | Sí |
| 13 | CH-113 y CH-114 | a | Siguen pendientes hasta la próxima versión. La Fase 15 no toca el changelog | Sí |
| 14 | Aprobación | b | Aprobados la arquitectura y los tres contratos, con el cambio del punto 8. Ajustada esa validación, puede avanzar la 15b | — |

## Qué se ajustó por estas decisiones

- **RV-EVA-07** (`contrato/reglas-validacion.csv`) pasa de aviso a **rechazo**, de clase referencial. Ahora dice: "Dos evaluaciones del mismo riesgo apuntan a la misma evaluación anterior (historia ramificada): en v1 la historia es una cadena lineal". Antes contaba sólo las evaluaciones no rechazadas; ahora cuenta todas, porque la decisión pide una cadena lineal sin excepciones. En `contrato/columnas-risks.csv`, `evaluacion_anterior_id` queda con severidad sólo de rechazo.
- **Las reglas quedan en 71: 55 de rechazo y 16 avisos.** Por el punto 10 (un caso inválido por regla de rechazo), la 15b escribe **55** casos inválidos, no 54: el nuevo es la historia ramificada.
- Las columnas y el mapeo que decían "recomendada" o "propuesta" ahora citan la decisión tomada (1a, 3b). La procedencia por factor se muestra "cuando el archivo la trae".
- El dossier y el borrador del spike (`SPIKES/T-0021-formatos-y-modelo-risk-os.md`) remiten a este archivo y tienen los conteos nuevos. El "Para decidir" del dossier queda como estaba, como registro de lo que se preguntó.

## Lo que no cambió

- **EMI-17 no cambia:** el enum de `base` queda igual (2a) y `review_status` usa sus valores (4a). No hay nada que actualizar en el issue.
- **Changelog:** ninguna fila nueva, y CH-113 y CH-114 siguen en `v0/fase-14/anexo-changelog-fase-14.md` (13a). La huella del changelog en `v1/congelamiento-v1.md` no cambia.
- No se tocó nada de la tabla de `v1/congelamiento-v1.md` ni `v1/congelamiento.md`, ni la metodología, las decisiones, el protocolo, la plantilla o el changelog.
- `lista-casos-historicos.md` sigue esperando tus respuestas. No bloquea la 15b, pero el spike no cierra sin ellas.
