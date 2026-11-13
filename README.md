# Del Campo

Repositorio de Broker OS, el sistema de trabajo de Del Campo Broker. Qué se construye, cómo
está armado y el plan están en `PROJECT.md`; las reglas de trabajo, en
`ENGINEERING_RULES.md`.

## North star de Broker OS: prototipo v25

Antes de construir el Broker OS real se armó un **prototipo navegable** que integra
Broker OS, Communication OS y Risk OS en una sola experiencia: trabajo diario por rol,
clientes y pólizas, comunicación, gestión de riesgos y portal de empresas. Es la
referencia de experiencia (north star) para el desarrollo, trabajada en EMI-45.

> **Es un prototipo con datos ficticios, no software de producción.** Las integraciones
> están simuladas: el puente CSV funciona dentro del prototipo y el puente MCP es una
> demostración sin servidor. Ningún cliente real aparece en él.

### Video demo

[![Demo de Broker OS · prototipo v25](https://img.youtube.com/vi/JqGC76xU7IA/hqdefault.jpg)](https://youtu.be/JqGC76xU7IA)

**[Ver la demo en YouTube](https://youtu.be/JqGC76xU7IA)** (6:37, no listado, subtítulos
en español). Sigue a una empresa ficticia, Bodega Cerro Liso, en 12 pasos: del
relevamiento de riesgos preparado con un LLM externo hasta el informe anual que la
empresa ve en su portal. El video tiene capítulos por paso.

Tres ideas que deja el recorrido:

1. La IA trabaja fuera de Broker OS. A Broker OS llega su resultado, rotulado con su origen.
2. Ninguna decisión la toma la IA: cada confirmación tiene autor y queda en el registro de eventos.
3. La empresa no ve puntajes ni índices de riesgo: ve conteos por banda y motivos.

### Estado: versión final congelada

| | |
|---|---|
| Versión | v25 final, congelada el 02/11/2026 |
| Etiqueta git | `broker-os-prototipo-v25-final` (en el repositorio propio del prototipo, todavía no en este) |
| sha256 de `index.html` | `a97f6e91f3054ddcb550062b5ef91481259bf5e5979c1470083136dcd685cad2` |
| Validación | Recorrida con Manuel y después con el equipo de Del Campo; ambas aceptadas |
| Aceptación | Aceptada por Emiliano el 02/11/2026 |
| Pruebas | 38 scripts de Playwright y axe, 5318 de 5318 aserciones en verde |

La referencia completa está versionada en [`docs/north-star/`](docs/north-star/README.md):
el `index.html` congelado y sus pruebas, las decisiones DA-1 a DA-9, los contratos CSV y
MCP, lo implementado frente a lo simulado y el plan por cortes con sus criterios de
aceptación.

El prototipo no se modifica: cualquier cambio va al sistema real. Las observaciones que
dejó la grabación del video quedan como entrada para ese desarrollo.

### Plan hacia el Broker OS real

Desde el 13/11/2026 el rumbo es más simple (`PROJECT.md`): un solo Broker OS con una
aplicación y una base, la sección Riesgos de cada empresa, un servidor MCP y un agente de
riesgos que guarda su trabajo en Broker OS, y después el portal de empresas. Las tareas
vigentes son `T-0059` en adelante.

## Por dónde empezar

1. `PROJECT.md` — qué es esto, cómo está armado y el plan.
2. `ENGINEERING_RULES.md` — las reglas de trabajo.
3. `AGENTS.md` — lo que lee cualquier modelo o persona antes de trabajar acá.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm check     # tipos, lint y tests
```

La versión de pnpm está fijada en `package.json`; el lockfile conserva la versión del
parser YAML estándar.
