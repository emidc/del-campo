# Cambios, pruebas y evaluación final · prototipo v25 (congelado el 02/11/2026)

Base: v24.2 (`fase-4/prototipo/index.html`, sha256 `8c07eedb…0bd5`). Esta iteración no abre una ronda nueva de funcionalidades: reorganiza lo existente alrededor del flujo de riesgos en seis pasos, agrega las tres mejoras pedidas dentro de pantallas que ya existían y simplifica.

## 1. Resumen de cambios

| Área | Cambio | Dónde |
|---|---|---|
| Flujo de riesgos | La pestaña «Investigación» (7 etapas) pasa a **Relevamiento en seis pasos**: identificación preliminar (LLM externo), inspección, refinamiento (LLM externo), información faltante (cuestionario), evaluación profesional (Risk OS) y registro en Broker OS. Cada paso dice dónde ocurre, su estado y su resultado. | Riesgos › Relevamiento; Importación › Relevamientos |
| Candidatos | Estados explícitos: candidato, confirmado, descubierto, incierto, descartado (con motivo). Un candidato no es un riesgo hasta el registro. | Paso 1 y 3 del relevamiento |
| Cuestionario | Preguntas con riesgo, responsable y vencimiento. La empresa responde en el portal → «Informada por la empresa · a validar». Validar exige escribir cómo se validó y **no** cambia evaluaciones. | Relevamiento paso 4; Portal › Resumen |
| Puentes | Importación tiene una pestaña «Puentes con LLM» que dice qué funciona (A · CSV de riesgos) y qué es demostración (B · MCP). Cada lote, brecha, comparación e informe muestra su origen. | Importación › Puentes; Configuración › Integraciones |
| Registro | Un lote ligado a un relevamiento deja las evaluaciones de riesgos nuevos **pendientes** para que las acepte otra persona; marca el paso 6 como hecho. | Lote LOTE-CL-2 |
| Mejora 1 · Brechas | «Posibles brechas» dentro de Transferencia: riesgo, cobertura existente, posible brecha, fundamento, evidencia, faltante, acción recomendada, estado de revisión. Confirmar, descartar (con motivo), pedir información (crea una pregunta del cuestionario) o registrar riesgo aceptado por la empresa (con constancia). | Riesgos › Transferencia |
| Mejora 2 · Verificación de póliza | «Verificación contra lo pedido» en la ficha de póliza: pedido, propuesta, emitida, necesidad de transferencia; coincide / difiere / incierto con evidencia. Aceptar con justificación, pedir aclaración o generar un **reclamo a la compañía** (gestión). «Marcar verificada» queda bloqueado mientras haya diferencias abiertas. | Pólizas › ficha; Riesgos › Transferencia |
| Mejora 3 · Informe anual | Borrador de texto del LLM + ocho secciones calculadas con datos de Broker OS. Aprueba alguien distinto de quien registró el borrador; al aprobar se congela una instantánea; se comparte en el portal. | Riesgos › Informe anual; Portal |
| Simplificación | El «Puntaje de riesgo» del panel (v12) queda solo para el equipo, rotulado (decisión de Emiliano del 02/11); el portal ve «Críticos y altos» con conteo por banda. «Brecha a producción» → «Qué falta para producción». El modal de gestiones no ofrece «reclamo» (solo nace de una comparación). | Panel de riesgos; Demo |
| Demo | Demo › Recorrido integral: 12 pasos con Bodega Cerro Liso y botón «Ir como…». Demo › Acerca muestra la versión congelada. | Demo |
| Datos | Semilla v5 (clave `brokeros-demo-v5`): relevamiento EXP-CL-1, 4 brechas, comparación VER-CL-1 de la póliza ALT-TRO-20931, informe INF-CL-2026. | `fuente/src/cierre-v25.js` |

Archivos: nuevo `fuente/src/cierre-v25.js`; cambios acotados en `seed.js`, `screens-a/b/c.js`, `riesgos-v4-vistas.js`, `riesgos-v12-panel.js`, `ui-base.js`, `configuracion-v19.js`, `gestiones-v17.js`, `app.js`, `styles.css`, `build.py`.

## 2. Resultados de las pruebas

Corrida final del 02/11/2026 sobre `prototipo/index.html` (sha256 `a97f6e91f3054ddcb550062b5ef91481259bf5e5979c1470083136dcd685cad2`): **38 scripts, 5318/5318 aserciones en verde, salida 0** (v24.2: 37 scripts, 5056/5056). Detalle por aserción en `evidencia/resultados-detalle.md`; capturas de escritorio y móvil en `evidencia/capturas/`.

| Script | Aserciones | Qué cubre |
|---|---|---|
| `cierre-v25.js` (nuevo) | 100 | Seis pasos, candidatos, cuestionario y validación, importación del relevamiento con evaluaciones pendientes, brechas, verificación de póliza y reclamo, informe anual (aprobación por otra persona, instantánea, portal), recorrido, puentes, puntaje solo del equipo, aislamiento, sin errores de JavaScript |
| `riesgos-v12.js` (adaptado) | 71 | Panel: puntaje y curva para el equipo; conteos por banda sin puntaje en el portal |
| `visual-a11y.js` (+4 rutas) | 583 | axe WCAG A/AA sin violaciones, texto ≥ 12 px, sin scroll horizontal en escritorio y 390 px |
| `aislamiento.js` | 7 | 90 rutas por perfil sin datos de clientes ajenos (incluido el recorrido) |
| Resto (34 scripts de la v24.2) | 4557 | Sin regresiones; ajustes de texto en `rutas.js`, `r-imp.js`, `transversales.js` (clave v5), `permisos.js` y `equipo-v22.js` (expediente heredado) |

Fallas encontradas y corregidas en esta iteración: el recorrido mostraba datos de Cerro Liso a perfiles del portal y al revisor externo (ahora solo se abre desde el equipo); textos de 11 y 11,5 px en el gráfico de bandas; botón desbordado en la ficha de póliza a 390 px.

## 3. Evaluación final

### Criterios de cierre

| Criterio | Resultado | Evidencia |
|---|---|---|
| El flujo de seis pasos se entiende y se recorre de punta a punta | Cumple | `cierre-v25.js` V25-1 a V25-7; recorrido de 12 pasos |
| Se distingue candidato / validado / pendiente / simulado | Cumple | Chips de estado y rótulos de origen; V25-2, V25-4, V25-X.puentes |
| Importar, vista previa, errores, conflictos y confirmación | Cumple | `r-imp.js`, `importar-v19.js`, V25-6 |
| Las tres mejoras funcionan con decisión humana | Cumple | V25-8, V25-9, V25-11 |
| La IA nunca decide | Cumple | Pruebas de permisos y de autoría (V25-6.propia, V25-11.propio) |
| Sin puntajes ni índices frente a la empresa | Cumple (el puntaje queda solo para el equipo, por decisión de Emiliano) | V25-X.panel, V12-portal-sin-puntaje; ver §5 |
| Aislamiento entre empresas | Cumple en la interfaz | `aislamiento.js`, V25-4.aisl, V25-12.aisl |
| Accesibilidad y móvil | Cumple (axe WCAG A/AA sin violaciones; texto ≥ 12 px; sin desbordes a 390 px) | `visual-a11y.js` |
| No se presenta como integración real ni como producción | Cumple | Puentes, Configuración, Acerca, banda «Prototipo» |

No hay bloqueos críticos: el prototipo queda en condiciones de cierre técnico. La validación con Manuel y la sesión con el equipo están hechas y aceptadas; Emiliano aceptó la versión publicada el 02/11/2026: **cierre definitivo**.

### UX
- El relevamiento es la única pantalla nueva de primer nivel dentro de Riesgos; reemplaza a Investigación, no se suma.
- Las tres mejoras se abren donde ya se trabajaba (Transferencia, ficha de póliza, Riesgos) y comparten el patrón «fila expandible + decisión con motivo».
- Riesgo residual: el relevamiento es denso en pantallas chicas; se validó sin desbordes, pero es la pantalla a observar en la sesión con el equipo.

### Funcionalidad
- Funciona en el navegador: relevamiento, cuestionario y validación, importación CSV, brechas, comparación y reclamo, informe anual, portal.
- Demostración: borradores MCP precargados; pasos 1 y 3 del LLM con resultados precargados.

### Datos
- Todo ficticio. Los estados y campos de §Contratos de `05-contratos-de-integracion.md` son los que el sistema real debe respetar.
- Las cifras del informe salen de los datos del prototipo en el momento de aprobar; no se importan del LLM.

## 4. Limitaciones conocidas

1. Estado en `localStorage`: los cambios viven en un navegador; «Reiniciar demo» vuelve a la semilla.
2. Permisos y aislamiento solo en la interfaz (selector de perfil); no hay identidad real.
3. MCP no existe: los borradores con origen «Puente B · MCP» están precargados.
4. Solo el CSV de evaluaciones (A1) tiene importador; brechas, comparación e informe tienen contrato pero no importador.
5. Los pasos 1 y 3 del relevamiento (LLM externo) no se ejecutan: se muestran sus resultados precargados.
6. El informe anual no genera PDF.
7. El relevamiento completo solo está armado para Bodega Cerro Liso (y uno resumido para Logística Bahía).
8. Las fotos de inspección son ilustraciones ficticias.

## 5. Decisión tomada: puntaje del panel

La v12 mostraba un «Puntaje de riesgo» agregado que tensiona con X-01 de RO01. Emiliano decidió el 02/11 dejarlo **solo para el equipo**: el panel del equipo lo muestra con su curva y el rótulo «Puntaje: solo para el equipo»; el portal y el informe anual muestran conteos por banda. Queda para confirmar con la metodología de Risk OS en el sistema real.

## 6. Validaciones humanas

La corrida automática no reemplaza las validaciones humanas.

| Validación | Estado |
|---|---|
| Validación con Manuel | Hecha y aceptada (informado por Emiliano el 02/11/2026) |
| Sesión con el equipo de Del Campo (`fase-5/kit-sesion-validacion.html`) | Hecha y aceptada; los ajustes de la v25 salen de ella |
| Aceptación de Emiliano sobre esta versión concreta (sha256 en `LEEME.md`) | Aceptada el 02/11/2026 sobre la versión publicada en el artifact del prototipo (versión 37) |
