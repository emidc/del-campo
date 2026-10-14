# Dossier · Fase 15b

> 2026-10-14 · T-0021. Rutas relativas a `SPIKES/T-0021/v0/fase-15/` salvo que digan otra cosa. Rige `decisiones-15a.md`.

## Resumen

1. Las 8 empresas aprobadas ya están en los tres formatos: 84 filas de riesgo, 10 de plan de acción y 33 de transferencia. El script las regenera igual byte por byte.
2. El validador, escrito desde `contrato/`, no rechaza ninguna fila y deja 103 avisos esperables: fichas en v0.2, falta de monto bruto y riesgos `safety_critical` sin acción.
3. Los derivados que Risk OS calcularía desde los CSV coinciden con `regresion-emi41.csv` en los 59 objetos. No hay diferencias que reportar.
4. Las filas nuevas muestran el caso consistente de EMI-16 en S07-R06 y el ciclo completo: la acción se cumple, se abre la revisión, la reevaluación la cierra con `accion_ejecutada`, la eficacia se registra aparte y P queda en 3 (el valor reevaluado), no en el 2 esperado.
5. Hay 55 casos inválidos, uno por regla de rechazo, y cada uno produce exactamente su error. Las 16 reglas de aviso también tienen su prueba.
6. El export ciego funciona. Siempre necesita una aceptación: la metodología v1 cita `EV-11-0063`, de S02-R07. La muestra de S29 está en `/mnt/project-files/T-0021/fase-15b/export-ciego-S29/`.
7. No entraron 73 datos, listados en `sinteticos/no-cupo.csv`. Los más grandes son 33 coberturas sin fechas de vigencia y 12 relaciones del tipo «esta póliza no responde». No cambié ningún formato.
8. Los tests corren dentro de `pnpm check`, sin tocar `contexts/`, `apps/`, `packages/`, `package.json` ni CI.
9. Falta lo tuyo: los cinco casos históricos, los puntos de «Para aprobar» y el cierre de EMI-16 y de T-0021.

## 1. Conversión del dataset (`sinteticos/`)

`generar.ts` lee las listas fijas de EMI-41, las fichas del experimento y las fichas de transferencia de las 8 empresas, y escribe `risks.csv`, `action-plan.csv`, `risk-transfer.csv`, `mapeo-ids.csv` y `no-cupo.csv`. `nuevos.ts` agrega lo de la 15b.

**Ids.** Prefijo de entidad más un ULID determinístico: el tiempo es la fecha del registro y los 80 bits salen de un SHA-256 del origen. El id histórico queda en `id_origen` o `evaluacion_id_origen`, con `lote_origen = T-0021/EMI-41`. La organización es un id opaco `ORG-…`, sin Party (1a). `mapeo-ids.csv` tiene los 209 ids con su origen.

**Historia (8a).** Una cadena por riesgo: la del agente (inicial de la Fase 8 y reevaluaciones de la 11b). La excepción es S15-R04, que sigue la de Emiliano (EV-8115 → EV-11-0064, aceptada), porque es el caso de K8. Quedan fuera 16 evaluaciones del experimento, marcadas `no_importada` en `mapeo-ids.csv` con su motivo:
- 8 paralelas de otro evaluador;
- las 6 del piloto de la Fase 12;
- las 2 fichas de padre, que no tienen factores (7a): de ellas se toma sólo `riesgo_consecuencia`.

**`base = —` (2a).** Ningún «—» llega a los CSV: el enum sigue con cuatro valores. El «—» está en datos de las fichas de información, no en las evaluaciones. Cuatro de las fichas de `base-guion.csv` caen en estas empresas: S06-R05, S07-E01, S07-R04 y S32-R06. Sus factores entran con la base que les dio la ficha de evaluación. Donde la evidencia de un factor mezclaba una referencia con `sin_evidencia` (S06-R05 y S32-R06, entre otras), la evidencia por factor no entra por RV-PRO-03 y queda listada en `no-cupo.csv`. La referencia sigue en la evidencia del registro.

**Procedencia del registro.** La base del registro es la más débil de los factores con valor o rango (RV-PRO-06). La evidencia es la unión de las referencias de los factores, o `sin_evidencia` si no hay ninguna. La procedencia por factor se conserva donde el contrato la acepta (3b).

**Transferencia.** `sinteticos/guion/polizas.csv` transcribe 23 pólizas de las fichas `transferencia.md`. `guion/alcance.csv` dice qué póliza alcanza a qué riesgo, con la cita literal de la ficha (las 77 citas se comprobaron contra el texto). De ahí salen 32 coberturas. Lo que la ficha no dice queda vacío:
- `suficiencia` va siempre `no_evaluada`;
- `exposicion_retenida_monto` va vacío;
- `actor` es `import` y `review_status` es `pending`.

**Derivados.** No se importan (6a). El test los recalcula con las funciones del arnés y los compara con `resultado_nuevo` de `v0/fase-11/regresion-emi41.csv`: coinciden los 59. En S15 se compara sin la posición, porque S15-R04 sigue otra historia que el resto de la empresa y la regresión ordena a cada evaluador por separado (`verificacion-15b.md` §4).

## 2. Filas nuevas (`lote_origen = T-0021/15b`)

Todas las escribió un agente: `actor = ai`, `review_status = pending`, `version_metodologia = metodologia v1`, evaluador `agente-15b`. Ninguna se aceptó en tu nombre. Cada reevaluación es una ficha nueva que apunta a la anterior; ninguna anterior se tocó.

| Origen | Riesgo | Qué muestra |
|---|---|---|
| 15B-A01, 15B-R01 | S07-R06 | **Caso consistente (EMI-16).** Una acción cumplida sobre P, con `cambio_esperado` «p 3→2»; la reevaluación `accion_ejecutada` del 2026-10-12, donde P sigue en 3 y el rango baja de 2–4 a 2–3; `efecto_parcial` con la nota de esperado, obtenido y brecha; y la cobertura POL-S07-1 de avería de maquinaria (sublímite de USD 150 M). |
| 15B-A02, 15B-R02 | S36-R06 | Acción cumplida con `efecto_total`: P baja de 4 a 3. |
| 15B-A03, 15B-R03 | S28-R05 | Acción cumplida con `sin_efecto_medible`: ningún factor cambia. |
| 15B-A04, 15B-A05 | S05-P01-S03 (`safety_critical`) | Una acción en curso y una planificada. La planificada no abre revisión ni baja nada. |
| 15B-A06 | S32-R05 (`safety_critical`) | Decisión de tratamiento `aceptar`, con fundamento y revisión el 2027-03-31. |
| 15B-A07 | S06-R01 | Una acción sobre P y V-recuperación, con un mecanismo para cada factor. |
| 15B-A08, 15B-A09 | S29-R04 y S29-P01-S02 | Una misma acción real, escrita como dos registros. |
| 15B-A10 | S15-R03 | Acción cancelada. |
| 15B-R04 | S29-P01-S01 | Reevaluación por `informacion_nueva`: P queda `unknown` con rango 3–5 y el padre S29-P01 pasa a prioridad provisional. |
| 15B-R05 | S05-P01-S01 | Reevaluación por `cambio_contexto`: queda igual a S05-P01-S03, y el padre se muestra con los dos hijos empatados. |
| 15B-S28-N01, 15B-R06 | S28 | Riesgo identificado sin evaluar: los siete factores `unknown`, sin posición. |
| 15B-E01 | S36-R02, POL-S36-1 | Evento `consumo_limite` de USD 1.000. No crea reevaluación ni cambia la criticidad. |

**Ciclo (9a)** (`sinteticos/ciclo.ts` y su test):
- Sin 15B-R01, la acción cumplida 15B-A01 deja una revisión abierta. Con 15B-R01, queda cerrada.
- La vigente de S07-R06 es 15B-R01, con P = 3: el valor reevaluado, no el esperado.
- Si se simula en memoria que la aceptás, la vigente sigue siendo 15B-R01. Si se simula que la rechazás, vuelve a la anterior.
- No se escribió ninguna aceptación.

## 3. Validador (`validador/`)

- `contrato.ts` lee de `contrato/` las columnas, los enums, la severidad y el texto de error.
- `validador.ts` implementa cada regla según su descripción.
- `validar.ts` es la línea de comandos.

El validador devuelve, por fila, cada rechazo y cada aviso con `regla_id`, archivo, fila, id, origen y mensaje.

Cómo interpreté lo que el contrato no fija:
- **Dos etapas.** Si un archivo falla en estructura (RV-ARCH-01 a 04), se informan sólo esos rechazos: sin columnas confiables, ninguna regla de fila tiene sentido.
- **RV-ARCH-05** se aplica a las columnas cuyo `regla_id` la nombra. Los enteros y montos los controla su propia regla (RV-FAC-02, RV-ECO-01, RV-TRF-03).
- **Precedencia.** Si una acción trae eficacia sin estar cumplida (RV-ACC-09), la reevaluación que la mide no repite el defecto como RV-EVA-05. Sin esa precedencia, RV-ACC-09 nunca podría aparecer sola.
- **RV-ACC-11.** Cuentan una acción `en_curso` o una decisión de tratamiento con `fecha_proxima_revision` posterior a la fecha de corte. Una acción planificada no cuenta.
- **RV-TRF-09.** Cierran el aviso un evento `renovacion` o `vencimiento` de esa cobertura.
- **RV-UNC-03.** Busca un porcentaje unido a confianza, certeza o seguridad. «2% de la suma asegurada» no dispara.
- **Fecha de corte.** Es un parámetro (`--corte`). Los tests usan 2026-10-14.

## 4. Casos inválidos (`invalidos/`)

El lote base es sintético y chico:
- un padre con dos hijos;
- un riesgo con inicial y reevaluación por acción;
- otro riesgo;
- un escenario de los dos;
- tres registros del plan de acción;
- una cobertura con un evento.

Cada carpeta `RV-…/` trae sólo el archivo que cambia. `casos.csv` dice el cambio y `errores-esperados.csv` tiene las columnas pedidas. Algunos casos cambian más de una celda porque el estado de partida lo exige: por ejemplo, pasar un factor a `unknown` vacía su valor. Dos lo hacen para no disparar una segunda regla: **RV-EVA-04 y RV-EVA-05** sacan además la eficacia de A1. Si no, la acción apuntaría a una evaluación que ya no la mide (RV-ACC-08).

Los invariantes que la 15a definió como tests y no como casos inválidos (§3.5) quedan probados en `sinteticos.test.ts`:
- la transferencia no cambia derivados (D17);
- el padre no tiene score;
- el escenario no modifica a sus miembros.

## 5. Export ciego (`export-ciego/`)

Sigue la especificación de la 15a (§8) con dos diferencias. Las dos están en el código y en el manifiesto:
- **Lenguaje.** Está en TypeScript, no en Python, para que su test corra en `pnpm check`.
- **Plantilla.** `v0/plantillas/ficha-evaluacion.csv` está en la lista blanca, pero su encabezado tiene columnas de resultado (`review_status`, `c_raw` y otras). La comprobación 3 la exime sólo si no tiene ninguna fila. Con filas, falla.

**La comprobación 2 siempre encuentra `EV-11-0063`** en `metodologia-v1.md`, línea 52, en la tabla de las cinco condiciones de EMI-15. Es la evaluación de S02-R07, y la metodología congelada no se edita. Lo traté con el mecanismo de 11a: un id de evaluación en la metodología o el protocolo se acepta con `--aceptar` y queda escrito en el manifiesto. En cualquier otro archivo, no se puede aceptar.

**Muestra.** Es de S29, que la metodología no cita: 14 archivos y el manifiesto, en `/mnt/project-files/T-0021/fase-15b/export-ciego-S29/`. El manifiesto está versionado en `export-ciego/muestra-S29-MANIFIESTO.txt`.

**Contaminación de las empresas aprobadas:**
- S05 y S15 no tienen ninguna.
- S06, S07, S28, S32 y S36 tienen riesgos citados en la metodología, y no se exportan sin aceptación.

## 6. Lo que no cupo (`sinteticos/no-cupo.csv`, 73 filas)

Cada fila trae el campo, la ficha, el motivo y la salida propuesta. Ningún formato cambió.

| Qué | Filas | Dónde | Propuesta |
|---|---:|---|---|
| Procedencia por factor que el contrato rechaza: `v_rec_base` en un `v_rec` `no_aplica` (RV-PRO-05), y una evidencia por factor que mezcla `sin_evidencia` con referencias (RV-PRO-03) | 12 + 6 | risks | **a)** queda fuera, como ahora: las referencias siguen en la evidencia del registro. b) Relajar RV-PRO-05 y RV-PRO-03, lo que cambia el contrato. Recomiendo a. |
| Coberturas sin fecha de vigencia: la ficha no la da (23) o da texto sin fechas como «Anual», «Año lectivo 2026» o «Hasta la recepción provisoria» (10). Incluye todo S05, las ART, AP y RC de varias empresas | 33 | transfer | **a)** quedan fuera hasta tener las fechas. b) Una columna `vigencia_texto` con fechas opcionales, lo que cambia el contrato. Recomiendo a: la vista de transferencia necesita fechas para avisar vencimientos. |
| «La póliza no responde por este riesgo» | 12 | transfer | **a)** fuera: no es una cobertura. b) Una fila con `suficiencia = sin_cobertura`, que hoy igual exige vigencia. Recomiendo a, y volver a mirarlo cuando la vista de suficiencia exista. |
| Siniestros de vigencias anteriores (S15, S32 y S36) | 5 | transfer | Fuera. La ficha no los asocia a ninguna cobertura registrada y no dice a cuál; inventarla está prohibido. |
| Límite que depende del equipo (S32) y vigencia que termina «en la fecha o en la cosecha» (S15) | 2 | transfer | Cupo parcial: se registró el dato seguro y el resto queda en el texto. |
| Procedencia de la transferencia asignada por la conversión (S06, S15 y S28 no la registran) | 3 | transfer | `reported`, `sin_evidencia` y `medium` con nota. Si preferís otra base, cambia sólo el script. |

Hay además una ambigüedad del contrato que no está en `no-cupo.csv`. `lote_origen` es una sola columna por fila y vale tanto para `id_origen` (el riesgo) como para `evaluacion_id_origen` (la evaluación). En una reevaluación de la 15b sobre un riesgo de EMI-41, la fila dice `id_origen = S07-R06` con `lote_origen = T-0021/15b`, así que el riesgo aparece con dos orígenes. El validador lo acepta, porque RV-ID-03 sólo exige que cada par identifique una sola entidad. Propongo a) dejarlo así y leer el origen del riesgo de su primera fila; b) agregar `evaluacion_lote_origen`, lo que cambia el contrato.

Por las decisiones 5a y 8a, dos criterios de cobertura de la 15a quedan sólo en el dataset del experimento, no en los CSV: K9 (dos evaluadores sobre el mismo riesgo) y K10 (el reordenamiento del piloto de S06). K12 (siniestros que consumieron límite) lo cubre el evento sintético 15B-E01, no un siniestro del dataset.

## 7. Spike y changelog

- `SPIKES/T-0021-formatos-y-modelo-risk-os.md` quedó «listo para revisión del owner». Trae cada comprobación con su respuesta y su evidencia, la de los casos históricos lista para vos, cómo regenerar todo y lo que no se probó. No tildé nada en `TASKS/`.
- `anexo-changelog-fase-15.md` queda sin filas: nada de la 15b cambia ni aclara una regla de la metodología.

## Para aprobar

Respondé sí o no a cada punto, o escribí el cambio que querés.

1. **CSV y caso consistente.** ¿Aceptás `risks.csv`, `action-plan.csv` y `risk-transfer.csv` de las 8 empresas, con S07-R06 como el caso consistente de EMI-16?
2. **Acciones nuevas.** ¿Aceptás los 10 registros de acción y las 6 filas de riesgo nuevas de la 15b (§2), todas `pending`?
3. **Validador y casos inválidos.** ¿Aceptás el validador, con las interpretaciones de §3, y los 55 casos inválidos con sus errores esperados?
4. **Export ciego.** ¿Aceptás el script en TypeScript, la exención de la plantilla vacía en la comprobación 3 y que la cita `EV-11-0063` de la metodología se acepte en cada export, escrita en el manifiesto?
5. **Lo que no cupo.** ¿Aceptás las propuestas de §6 (todas la opción a, sin cambiar formatos), incluida la de `lote_origen`?
6. **Casos históricos.** ¿Confirmás por escrito, en `lista-casos-historicos.md`, que los cinco casos se expresan en los formatos, o qué ajuste necesitan, sin valores?
7. **Documento del spike.** ¿Aceptás `SPIKES/T-0021-formatos-y-modelo-risk-os.md` como respuesta a las comprobaciones de T-0021?
8. **¿Dar EMI-16 por cerrado?**
9. **¿Dar T-0021 por cerrado?**
