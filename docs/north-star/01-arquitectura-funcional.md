# Broker OS · Arquitectura funcional definitiva (prototipo v25, congelado el 02/11/2026)

Datos ficticios. El prototipo no es software de producción: representa la north star que el sistema real debe respetar.

## 1. Decisiones arquitectónicas definitivas

| # | Decisión | Consecuencia en el producto |
|---|---|---|
| DA-1 | **Simplicidad por encima de funcionalidades.** Se reutilizan pantallas y componentes; no se agregan módulos por el benchmark. | Las tres mejoras del benchmark viven dentro de pantallas que ya existían (Transferencia, ficha de póliza, Riesgos). |
| DA-2 | **Broker OS no tiene motor de IA ni chat.** No replica las interfaces de ChatGPT, Claude o Gemini. | El análisis (identificar y estudiar riesgos, refinar con evidencia, preparar cuestionarios, analizar brechas, comparar pólizas, redactar el informe anual) ocurre en un LLM externo. |
| DA-3 | **Broker OS es el sistema de registro y de decisión.** | Gestiona empresas, personas y pólizas; registra información validada; revisa y aprueba propuestas; gestiona riesgos, acciones y transferencias; registra comunicaciones y siniestros; mantiene trazabilidad; presenta información al equipo y a los clientes. |
| DA-4 | **Dos puentes de integración.** A · CSV (hoy) y B · MCP + skills (preferido a futuro). | Todo lo externo entra como **borrador o vista previa** con su origen visible. Nada se escribe sin confirmación humana. |
| DA-5 | **La IA propone; una persona decide.** | La IA nunca acepta evaluaciones, confirma brechas, marca transferencias como verificadas, aprueba ni comparte informes, ni valida información del cliente. |
| DA-6 | **Sin puntajes ni índices de riesgo frente a la empresa** (RO01, X-01). | El portal y el informe anual muestran conteos por banda; la criticidad es de cada riesgo. El «Puntaje de riesgo» de la v12 queda **solo para el equipo**, rotulado como tal (decisión de Emiliano del 02/11). |
| DA-7 | **Estados de dominio explícitos.** | Candidato ≠ riesgo; informado por la empresa ≠ validado; cobertura ausente ≠ brecha confirmada; en póliza ≠ verificada; borrador ≠ aprobado ≠ compartido. |
| DA-8 | **Revisión humana distinta del autor** donde cambia una decisión de riesgo. | Quien importa evaluaciones no las acepta; quien registra el borrador del informe no lo aprueba. |
| DA-9 | **Convergencia de experiencia, no fusión técnica** (D-0063, D-0067). | Broker OS, Risk OS y Communication OS conservan sus bases; Broker OS proyecta y orquesta. |

## 2. Contextos y responsabilidades

```
            LLM externos (ChatGPT · Claude · Gemini) + skills de metodología
                 │  analizan, redactan, comparan          ▲ leen lo autorizado (MCP)
                 ▼  producen CSV o borradores MCP         │
   ┌──────────────────────────── Broker OS ─────────────────────────────┐
   │ Importación (vista previa, errores, conflictos, confirmación)       │
   │ Clientes · Pólizas · Gestiones · Tareas · Inicio por rol            │
   │ Riesgos (proyección de Risk OS): relevamiento, matriz, plan,        │
   │   transferencia + brechas, layout, solicitudes, informe anual       │
   │ Portal de empresas (aislado por empresa)                            │
   │ Registro de eventos (trazabilidad)                                  │
   └───────────┬───────────────────────────┬────────────────────────────┘
               │                           │
          Risk OS (metodología,       Communication OS (CO01:
          evaluaciones append-only)   WhatsApp, correo, atención)
```

## 3. Flujo definitivo de gestión de riesgos

| Paso | Dónde ocurre | Qué guarda Broker OS | Pantalla |
|---|---|---|---|
| 1 · Identificación preliminar | LLM externo (rubro, actividad, procesos, Obsidian) | Candidatos con origen; ninguno es riesgo todavía | Riesgos › Relevamiento |
| 2 · Inspección | Del Campo, presencial o virtual | Modalidad, fecha, participantes, fotos por zona, observaciones, relatos | Riesgos › Relevamiento |
| 3 · Refinamiento | LLM externo, con la evidencia | Candidatos confirmados, descartados (con motivo), descubiertos e inciertos | Riesgos › Relevamiento |
| 4 · Información faltante | La empresa responde | Cuestionario con responsable y vencimiento; respuesta «informada por la empresa · a validar»; validación con «cómo se validó» | Relevamiento (equipo) y Resumen del portal (empresa) |
| 5 · Evaluación profesional | Del Campo, metodología Risk OS | Metodología, evaluador, revisor, supuestos, incertidumbres | Riesgos › Relevamiento |
| 6 · Registro | Broker OS, por CSV o MCP | Lote en vista previa → confirmación atómica → evaluaciones pendientes que acepta otra persona | Importación › Lote |

Desde el paso 6, la gestión operativa y la relación con el cliente siguen en Broker OS (plan de acción, transferencia, brechas, verificación, informe, portal).

## 4. Las tres mejoras incorporadas

1. **Brechas de cobertura** (Riesgos › Transferencia, solo equipo). Resultado estructurado del LLM: riesgo, cobertura existente, posible brecha, fundamento, evidencia, información faltante, acción recomendada y estado de revisión. Decisiones: confirmar, descartar (motivo obligatorio), pedir información (crea una pregunta en el cuestionario) o registrar que la empresa acepta el riesgo (constancia obligatoria). Sin puntajes.
2. **Verificación de pólizas** (ficha de póliza). Comparación pedido / propuesta / emitida / necesidad de transferencia, con resultado (coincide, difiere, incierto) y evidencia por concepto. Decisiones: aceptar con justificación, pedir aclaración, reclamar a la compañía (crea una gestión «Reclamo a la compañía») y registrar cómo se resolvió. La transferencia solo pasa a «Verificada en póliza» por una persona y con todas las diferencias cerradas.
3. **Informe anual de gestión** (Riesgos › Informe anual). El LLM redacta el resumen y las recomendaciones; las ocho secciones de datos las arma Broker OS con lo registrado (conteos por banda, evolución, acciones, transferencias verificadas, brechas confirmadas y riesgos retenidos, siniestros, cambios, recomendaciones). Borrador → aprobado (por otra persona; datos congelados) → compartido en el portal.

## 5. Decisión abierta registrada

- **Puntaje de riesgo del panel (v12, pedido de Emiliano del 29/10).** Tensiona con X-01. Decisión de Emiliano del 02/11: queda solo para el equipo (con el rótulo «Puntaje: solo para el equipo»); el portal y el informe anual muestran conteos por banda. Conviene confirmarlo con la metodología de Risk OS antes de construirlo en el sistema real.
