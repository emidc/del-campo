# Pruebas del prototipo como criterios de aceptación

Los scripts de [`prototipo/pruebas/`](prototipo/pruebas/) describen con aserciones
legibles el comportamiento de la north star v25. Al congelarla, 38 scripts sumaban 5318
aserciones, todas en verde. Sirven como criterios de aceptación **de alto nivel** de
cada corte: no se ejecutan contra el sistema real ni se portan como código. Cada corte
reescribe las que le tocan contra sus propias pantallas y datos, y las suma a su
`## Verification`.

La columna «Corte» sale del [plan](09-plan-de-produccion.md#cortes). La columna
«Corte sugerido» cubre los scripts que el plan no asigna: es una propuesta de esta tarea
para que el slice de cada etapa la confirme o la descarte, no una decisión.

## Cierre v25: el recorrido integral

`cierre-v25.js` (100 aserciones, escritorio y celular) recorre a Bodega Cerro Liso en 12
pasos. Sus grupos de identificadores reparten el recorrido entre cortes:

| Grupo | Qué comprueba | Corte |
|---|---|---|
| V25-0 | Consistencia de la semilla: candidatos, preguntas, brechas y comparaciones citan riesgos, contactos y pólizas de la misma empresa | Transversal (datos de prueba de C7 a C10) |
| V25-1 a V25-5 | Seis pasos y dónde ocurre cada uno; candidatos con destino; evidencia de inspección; cuestionario con responsable, vencimiento y validación; evaluación con revisor | C7 |
| V25-4.aisl | Otra empresa no responde el cuestionario | C12 |
| V25-6 | Del relevamiento al lote con origen CSV; evaluaciones nuevas pendientes; acepta otra persona | C5 |
| V25-7 | La lista muestra los riesgos descubiertos en el relevamiento | C7 |
| V25-8 | Brechas: ausente frente a confirmada, campos, motivo o constancia, pedir información, decisión final, permisos | C8 |
| V25-9 | Comparación pedido, propuesta y emitida; «verificada» solo sin diferencias abiertas | C9 |
| V25-10 | Tarea creada y avance del plan de acción | C6 (sugerido) |
| V25-11 | Informe anual: borrador, aprobación por otra persona, congelamiento | C10 |
| V25-12 | El portal ofrece el informe compartido, sin origen técnico ni brechas en revisión; aislamiento | C12 (V25-12.aisl en el plan) |
| V25-X | Puntaje solo para el equipo; sin índice en el portal; puentes (CSV funciona, MCP es demostración) | C4 (puntaje), C13 (puentes, sugerido) |

## Todos los scripts

| Script | Aserciones | Qué describe | Corte | Corte sugerido |
|---|---:|---|---|---|
| `aislamiento.js` | 7 | Revisor externo y usuarios del portal recorren todas las rutas sin ver datos de otras empresas | C1, C12 | |
| `altas-v16.js` | 190 | Alta manual de persona y empresa, con duplicados | | C4 |
| `bancarios.js` | 18 | Datos de tarjeta y bancarios nunca quedan en registros, eventos, CSV ni MCP (INV-P9) | C1 | |
| `botones.js` | 3 | Sin botones decorativos: cada botón habilitado hace algo | | C4 |
| `cierre-v25.js` | 100 | Recorrido integral de Bodega Cerro Liso (ver arriba) | C5, C7 a C10, C12 | |
| `complementarios.js` | 46 | Inicio por perfil, pólizas, búsqueda con filtros y otros criterios sin script propio | | C4, C6 |
| `configuracion-v19.js` | 232 | Panel de configuración de Broker OS | | C1 |
| `delegar-v15.js` | 118 | Delegar una conversación a otro integrante del equipo | C11 | |
| `drive-v13.js` | 112 | Enlace a la carpeta del cliente en Google Drive | | C4 |
| `equipo-v22.js` | 126 | Alta y baja de integrantes del equipo | | C1 |
| `fichas-v9.js` | 80 | Pestañas de las fichas: contactos, pólizas, gestiones, tareas y notas | C4 | |
| `fotos-v20.js` | 110 | Retratos del equipo en el perfil y junto a sus interacciones | | C4 |
| `gestiones-v17.js` | 126 | Iniciar una gestión (siniestro y otras) desde la ficha | C6 | |
| `humo.js` | 1506 | Cada perfil recorre todas las rutas sin errores de JavaScript | | Transversal |
| `importar-v19.js` | 102 | Importar el CSV de riesgos (contrato A1) | C5 | |
| `inicio-v24.js` | 172 | Inicio al día por rol | C6 | |
| `inicio-v5.js` | 281 | Inicio sin panel «Hoy»: tareas al frente, gestiones en curso, gráficos | | C6 |
| `kpis.js` | 154 | Recuento independiente de K-01 a K-16 frente a lo que muestra el Inicio | C6 | |
| `manuel-v22.js` | 20 | Quién propone y quién autoriza evaluaciones y revisiones de riesgos | | C5 (AD-16) |
| `permisos.js` | 31 | Matriz de permisos ejercida acción por acción con cada perfil | C1 | |
| `prospectos-v18.js` | 156 | Prospectos con su origen | | C4 |
| `r-imp.js` | 46 | Expediente, reimportación con diferencias, conflicto y error de validación | C5 | |
| `r1-manuel.js` | 60 | Recorrido R1 (Manuel) | C6 | |
| `r2-evangelina.js` | 30 | Recorrido R2 (Evangelina): pólizas y renovaciones | C6 | |
| `r3-victoria.js` | 38 | Recorrido R3 (Victoria): alta de persona y vehículo | C6 | |
| `r4-r5-r6.js` | 58 | Recorridos R4 (caución), R5 (facturación) y R6 (siniestro) | C6 | |
| `r7-r8-am32.js` | 56 | Recorridos R7 y R8 (clientes) y notificaciones de llegada por perfil | C11 | |
| `riesgos-am34-35-36.js` | 76 | Matriz, orden con y sin reordenamiento, revisor en todas las superficies, sin ranking | | C4 (AD-13, AD-14) |
| `riesgos-v4.js` | 166 | Vistas de riesgos de una empresa, con aislamiento y persistencia | | C4 |
| `riesgos-v7.js` | 70 | Detalle del riesgo: banderas como símbolos | | C4 |
| `riesgos-v8.js` | 54 | Todo es un riesgo de la lista principal, sin sub-riesgos | | C4 (AD-17) |
| `riesgos-v9.js` | 35 | Etiquetas como símbolos en la lista | | C4 |
| `riesgos-v10.js` | 29 | Tabla con la justificación desplegada | | C4 |
| `riesgos-v11.js` | 26 | Degradé de la matriz según probabilidad e impacto | | C4 |
| `riesgos-v12.js` | 71 | Panel de control de Riesgos | | C4 (puntaje del panel) |
| `riesgos-v13.js` | 194 | El equipo agrega y modifica filas de la lista de riesgos | | C4 |
| `transversales.js` | 36 | Persistencia y reinicio, «Extraer contexto» y salidas MCP, alertas, navegación, determinismo | | C4, C13 |
| `visual-a11y.js` | 583 | Sin scroll horizontal ni cortes, axe-core, texto de 12 px o más, escala de grises | C4 | |

Auxiliares, sin aserciones propias: `lib.js` (arranque de Chromium y registro de
resultados), `rutas.js` (rutas que recorren `humo.js` y `aislamiento.js`; el plan lo cita
en C4), `tabla.js` (arma la tabla de resultados), `vistazo.js` (capturas para inspección
visual) y `correr-todo.sh` (corre todo y sale con el número de scripts que fallaron).

## Reglas que no se negocian

La tabla de [06 §3](06-especificacion-y-handoff.md#3-reglas-de-negocio-que-no-se-negocian)
dice dónde comprueba el prototipo cada regla (la IA no decide, quien importa no acepta,
lo informado no cambia evaluaciones, aislamiento, sin datos bancarios, escritura
atómica). Un corte que toca una de esas reglas la verifica con una prueba propia en el
sistema real, no solo con revisión.
