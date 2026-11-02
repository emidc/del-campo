# North star de Broker OS · prototipo v25

> **Es una referencia de experiencia con datos ficticios, no software de producción.**
> Las empresas, personas, pólizas, fotos de inspección e historia de riesgos son
> inventadas. Las integraciones están simuladas: el puente CSV funciona dentro del
> navegador y el puente MCP es una demostración sin servidor. Nada sale a servicios
> externos y el estado vive en el `localStorage` del navegador.

Esta carpeta versiona en el repositorio la north star que el Broker OS real tiene que
respetar: la experiencia unificada de Broker OS, Communication OS y Risk OS que se
trabajó en EMI-45, se validó con Manuel y con el equipo de Del Campo y aceptó Emiliano.
Las tareas `T-0034` a `T-0037` y los cortes C1 a C13 la citan como especificación de
experiencia y como fuente de criterios de aceptación. → `T-0033`

## Identidad de la versión

| | |
|---|---|
| Versión | v25 final, congelada el 02/11/2026 |
| sha256 de `prototipo/index.html` | `a97f6e91f3054ddcb550062b5ef91481259bf5e5979c1470083136dcd685cad2` |
| Etiqueta git | `broker-os-prototipo-v25-final`, en el repositorio propio del prototipo (no en este; ver «Qué no está acá») |
| Artifact publicado | <https://claude.ai/artifact/GqKw7KtS9hb8ATjDzQgEww>, versión 37 (privado del owner) |
| Video demo | <https://youtu.be/JqGC76xU7IA> (no listado) |
| Validación | Recorrida con Manuel y después con el equipo de Del Campo; ambas aceptadas |
| Aceptación | Emiliano, 02/11/2026, sobre esa versión concreta (EMI-45) |
| Pruebas | 38 scripts de Playwright y axe, 5318 de 5318 aserciones en verde al congelar |

La aprobación automática (pruebas y árbitro) no reemplazó las validaciones humanas: las
tres de arriba las informó el owner.

## Reglas de uso

1. **No se modifica.** `prototipo/` es una copia byte a byte de la versión congelada. Un
   cambio de producto va al sistema real o a otro documento; esta referencia queda para
   comparar.
2. **El código del prototipo no se porta.** Es un HTML único con estado en el navegador.
   Del prototipo se toman pantallas, textos, estados de dominio, reglas y pruebas, y las
   pruebas se reescriben contra el sistema real. Nada de `prototipo/` se importa desde
   `apps/`, `packages/` ni `contexts/`.
3. **No decide nada por sí sola.** Lo que la north star propone y no está en
   `decisions.yaml` sigue siendo una propuesta. Las decisiones que el plan necesita
   están en [09](09-plan-de-produccion.md#decisiones-del-owner) y las registra `T-0034`.

## Contenido

| Necesito | Está en |
|---|---|
| Las decisiones DA-1 a DA-9, los contextos y el flujo de riesgos en seis pasos | [01 · Arquitectura funcional](01-arquitectura-funcional.md) |
| Las pantallas y los recorridos | [02 · Pantallas y recorridos](02-pantallas-y-recorridos.md) |
| El recorrido de la demo (Bodega Cerro Liso, 12 pasos) | [03 · Guía de demostración](03-guia-de-demostracion.md) |
| Qué funciona, qué está simulado y qué es futuro | [04 · Implementado frente a simulado](04-implementado-vs-simulado.md) |
| Los contratos CSV (A1 a A4) y MCP (B) y los contratos de datos | [05 · Contratos de integración](05-contratos-de-integracion.md) |
| La especificación funcional por contexto y las reglas que no se negocian | [06 · Especificación y handoff](06-especificacion-y-handoff.md) |
| Las oportunidades postergadas y su condición | [07 · Roadmap y oportunidades postergadas](07-roadmap-y-oportunidades-postergadas.md) |
| Los cambios de la v25, las pruebas y las limitaciones | [08 · Cambios, pruebas y evaluación final](08-cambios-pruebas-y-evaluacion-final.md) |
| Las cinco etapas y los trece cortes hacia producción | [09 · Plan de paso a producción](09-plan-de-produccion.md) |
| Qué script de prueba sirve de criterio de aceptación de cada corte | [10 · Pruebas como criterios de aceptación](10-pruebas-como-criterios.md) |
| El prototipo y sus pruebas | [`prototipo/`](prototipo/) |

Los documentos 01 a 08 son copia sin cambios de los de la carpeta congelada. Las rutas
que citan (`prototipo/index.html`, `fuente/`, `evidencia/`, `fase-5/…`) son de esa
carpeta, no de este repositorio. Los documentos 09 y 10 son nuevos: 09 transcribe el
plan aprobado el 02/11/2026 y 10 cruza ese plan con los scripts.

## El prototipo

```bash
# Comprobar que es la versión aceptada
sha256sum docs/north-star/prototipo/index.html
# a97f6e91f3054ddcb550062b5ef91481259bf5e5979c1470083136dcd685cad2

# Abrirlo: es un archivo autocontenido, sin servidor
xdg-open docs/north-star/prototipo/index.html   # o abrirlo con el navegador
```

Dentro del prototipo, Demo › Recorrido integral sigue a Bodega Cerro Liso en 12 pasos.
El selector de perfil cambia de persona del equipo o de usuario del portal.

### Correr las pruebas

Requieren Node 18 o superior, Playwright con Chromium y `axe-core` 4.10.2. No forman
parte de `pnpm check` ni de la CI: describen el prototipo, no el sistema real.

```bash
cd docs/north-star/prototipo && npm install          # instala axe-core
NODE_PATH="<módulos globales con playwright>:$PWD/node_modules" \
INDEX=$PWD/index.html EVID=/tmp/evid-north-star \
  bash pruebas/correr-todo.sh                        # salida 0 = todo en verde
```

`EVID` tiene que apuntar fuera del repositorio: el script borra y reescribe
`$EVID/resultados` y deja capturas en `$EVID/capturas`. `SCRIPTS="bancarios aislamiento"`
corre solo esos.

## Qué no está acá

Viven en la carpeta congelada del proyecto de Claude (`fase-6-cierre/`), que es la fuente
de esta copia:

- `fuente/` (`build.py` y `src/`): arma el mismo `index.html`. No se versiona porque el
  código no se porta.
- `evidencia/`: 49 MB de capturas y los resultados de la corrida de cierre.
- `broker-os-v25-final.bundle`: el repositorio del prototipo con la etiqueta
  `broker-os-prototipo-v25-final`.

## Datos personales

No hay datos de clientes reales (R-19). Los correos son de dominios `ejemplo` o `invalido`
salvo la casilla de la empresa (`gestion@delcampobroker.com`), y los teléfonos usan la
serie ficticia `555-01xx`. Los nombres de pila del equipo y
sus **retratos reales** están en el prototipo: su uso en el link público lo aprobó
Emiliano el 31/10/2026 y su publicación en este repositorio, el 02/11/2026.
