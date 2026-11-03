# ADR-0075 — Un servidor MCP propio y skills de metodología son la dirección de integración con IA

- **Id en `decisions.yaml`:** D-0075
- **Estado:** ACCEPTED (aprobada la dirección; la implementación es progresiva)
- **Fecha:** 2026-11-02
- **Supersede:** —
- **Aprobación:** el owner, el 2026-11-02, «Decisiones de cierre Q4 — Del Campo OS», punto
  3 (MCP Server, skills, compatibilidad y orden de implementación), en el hilo de T-0034.

## Contexto

La north star define dos puentes con la IA externa (DA-4): CSV, que ya funciona en el
prototipo, y MCP más skills, preferido a futuro y sólo demostrado
(`docs/north-star/05-contratos-de-integracion.md`, contrato B). El corte C13 del plan lo
pone en la etapa 4. El owner quiere aprovechar los modelos existentes sin construir un
sistema de agentes dentro de Broker OS (DA-2) y sin depender de un único proveedor.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0075.

## Cómo se aplica

**Las skills van primero.** Se definen y se validan contra el proceso manual actual antes
de que exista el servidor, porque no necesitan código de Broker OS: son instrucciones y
conocimiento del lado del LLM.

| Skill | Entrada | Salida | Paso de la north star |
|---|---|---|---|
| 1 · Identificación preliminar | Rubro, actividad y características de la empresa, con la base de conocimiento sectorial | Riesgos candidatos, supuestos e información faltante | Paso 1 del relevamiento (C7) |
| 2 · Análisis de inspecciones | Fotografías, notas y relatos de inspección | Contraste con la identificación preliminar | Paso 2 (C7) |
| 3 · Refinamiento y tratamiento | Candidatos y evidencia | Riesgos refinados, probabilidad e impacto cuando hay información, medidas de eliminación, mitigación, aceptación o transferencia | Paso 3 (C7) y su importación (C5) |

**El servidor MCP llega cuando aporta valor.** Sólo lectura al principio, consumiendo la
API de aplicación de cada contexto (D-0071), con la identidad y los permisos de D-0072,
restringido a las empresas y evaluaciones autorizadas y con auditoría de cada llamada. Las
escrituras llegan como borradores estructurados, que una persona revisa. No hay
herramientas para aceptar, confirmar, verificar, aprobar, compartir ni validar
(contrato B, DA-5).

**Compatibilidad.** Se busca una sola definición para Claude, Gemini, Codex y ChatGPT. La
compatibilidad real se verifica por producto, interfaz y tipo de cuenta, y se registra.
El personal operativo usa interfaces conversacionales, no línea de comandos.

**Información.** Qué puede salir hacia cada proveedor lo fija D-0074. Las skills no pueden
pedir información de nivel 2 en una cuenta no registrada.

## Pendiente de verificación

- Dónde viven las skills y la base de conocimiento sectorial (repositorio, carpeta privada
  del owner o el proyecto de cada interfaz). Es una decisión de la primera tarea de skills.
- Qué interfaces y tipos de cuenta admiten skills y servidores MCP propios hoy. No se
  verificó al 2026-11-02.
- Si `PROJECT.md` §4 («agentes con efectos externos») se levanta: un MCP de sólo lectura
  no tiene efectos externos y no lo necesita; las escrituras sí lo plantearán.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Motor de IA o chat dentro de Broker OS | Contradice DA-2 y ata el sistema a un proveedor. |
| Sólo CSV, sin MCP | Sigue siendo el puente de hoy, pero obliga a copiar y pegar contexto; el MCP lo resuelve cuando valga la pena. |
| MCP completo antes de producción | El owner no lo exige para la primera versión; las skills se pueden validar antes. |

## Consecuencias

**Más fácil:** el trabajo de skills puede empezar sin esperar a C1 y sin código.

**Más difícil:** mantener una definición compatible con cuatro interfaces puede no ser
posible igual en todas; la verificación de compatibilidad es trabajo explícito.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: que las skills no
mejoren el proceso manual al validarlas, o que ninguna interfaz que use el equipo admita
un servidor MCP propio con autenticación por persona.
