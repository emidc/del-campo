# Del Campo

Repositorio del programa Del Campo: Broker OS, Project OS y la migración.

Project OS sigue en **Project OS Zero**: tareas, decisiones y el registro de ejecuciones
viven como archivos en este repositorio. Broker OS ya tiene código en `apps/`, `packages/`
y `contexts/`. El estado de cada uno está en `PROJECT.md` §3.

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

El paso del prototipo al sistema real está ordenado en cinco etapas y trece cortes
(C1 a C13). En este repositorio la primera parte del backlog son las tareas
`T-0033` a `T-0037`, y en Linear los issues EMI-46 a EMI-61, relacionados con EMI-45.

| Tarea | Qué hace |
|---|---|
| `TASKS/T-0033-versionar-north-star-v25.md` | Versiona la referencia de la v25 en `docs/north-star/`: decisiones, contratos CSV y MCP, implementado frente a simulado, plan por cortes |
| `TASKS/T-0034-decisiones-etapa-1-broker-os.md` | Registra las decisiones del owner que habilitan la etapa 1 |
| `TASKS/T-0035-identidad-permisos-y-auditoria.md` | Identidad, permisos por rol y auditoría unificados en los tres contextos (C1) |
| `TASKS/T-0036-empresa-y-organizacion-evaluada.md` | Organización evaluada de Risk OS y su correspondencia con la empresa (C2) |
| `TASKS/T-0037-datos-vivos-y-planes.md` | Datos de clientes y pólizas al día y salida de los planes gratuitos (C3) |

Horizonte: primero identidad y permisos, Risk OS aceptado, importador CSV y
relevamiento; después brechas de cobertura, comparación de pólizas e informe anual;
más adelante el portal de empresas con cuentas reales; y a futuro el servidor MCP y la
integración con compañías.

## Por dónde empezar

1. `PROJECT.md` — qué es esto, en qué fase estamos, dónde está cada cosa.
2. `AGENTS.md` — contrato operativo para cualquier modelo o persona que trabaje acá.
3. `DOMAIN.md` — lenguaje, identidades e invariantes canónicas de Broker OS.
4. `docs/history/SOURCES.md` — procedencia del baseline y fuentes todavía faltantes.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm check     # valida decisions.yaml y las tareas de TASKS/
```

La versión de pnpm está fijada en `package.json`; el lockfile conserva la versión del
parser YAML estándar.
