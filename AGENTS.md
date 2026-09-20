# Del Campo — AGENTS.md

Contrato operativo del repositorio. Lo lee cualquier persona o modelo que trabaje acá, con cualquier herramienta. Es **neutral respecto del proveedor**: nada acá depende de Claude Code, Codex, Gemini ni Antigravity.

Este archivo no repite el contenido de los documentos canónicos. Los nombra. Leerlos cuando la tarea los necesite.

---

## Rol

Ingeniero de software senior trabajando en el programa Del Campo. La responsabilidad no es producir código: es transformar necesidades de negocio en un sistema mantenible, testeable, observable y desplegable de forma progresiva.

Del Campo Broker es una correduría de seguros real, en operación. Los datos son de clientes reales. Las acciones tienen consecuencias comerciales y contractuales.

---

## Antes de empezar cualquier cosa

1. **Declarar el workstream**: `POS` (Project OS), `BOS` (Broker OS) o `MIG` (Migración). Están relacionados pero no se mezclan.
2. **Leer el contexto que la tarea declara** en `contextRefs`. Si la tarea no lo declara, la tarea está incompleta.
3. **Distinguir hechos de suposiciones.** Enunciar las suposiciones relevantes en voz alta.
4. **Chequear `decisions.yaml`** antes de decidir algo que huela a ya decidido. Las decisiones con estado `OPEN` no se resuelven en el camino: se resuelven con spike y ADR.

---

## Dónde está el contexto

| Necesito saber | Está en |
|---|---|
| Qué es el programa, fase actual, WIP limit | `PROJECT.md` |
| Qué significa una entidad, qué se modela y qué no | `DOMAIN.md` |
| Cómo se trabaja: reglas, permisos, DoD, seguridad | `ENGINEERING_RULES.md` |
| Qué está decidido, qué es provisional, qué está abierto | `decisions.yaml` y `DECISIONS/` |
| Cómo se escribe una tarea | `TASKS/_TEMPLATE.md` |
| Qué se registra de cada ejecución | `ops/AGENTRUN.md` |

No inventar requisitos porque puedan ser útiles más adelante. El alcance de cada capacidad se refina en su POC.

---

## Contrato de tarea

Toda tarea vive en `TASKS/` como archivo versionado. Estructura completa en `TASKS/_TEMPLATE.md`. Lo esencial:

**Obligatorio siempre:** `id`, `kind`, `title`, `status`, `riskClass`, y las secciones `## Why`, `## Outcome`, `## Non-scope`, `## Verification`.

**`## Verification` contiene evidencia verificable.** Cuando el outcome es mecánico,
incluye comandos ejecutables. Un `SPIKE` o `REVIEW` puede depender de comprobaciones
humanas explícitas. No se acepta un “Done” subjetivo.

`contextRefs` es obligatorio en toda tarea y siempre es una lista. Puede quedar vacío
solo cuando no existe contexto externo a la propia tarea. `## Data effects` es
obligatorio en todo lo que toque base de datos o sistemas externos; `## Decision
unlocked` lo es en `SPIKE` y `POC`.

**Nunca se escribe en la tarea:** el nombre de rama, el perfil de permisos, la política de revisión ni la lista de archivos a tocar. La rama se deriva del id. Los permisos se derivan de `riskClass` y **se hacen cumplir por configuración, no por texto**: un documento de tarea es advisory, y escribir permisos ahí crea la ilusión de un control que no existe.

---

## Aprobación humana

Las reglas completas están en `ENGINEERING_RULES.md` (R-13 y R-14). El resumen que hay que tener presente siempre:

- **Autónomo:** leer, analizar, correr checks, editar en una rama, abrir un PR.
- **Requiere aprobación humana:** merge a `main`, cualquier cosa contra producción, cambios a `.claude/` o a CI, y **toda acción de negocio con efecto externo** — comunicaciones a clientes o aseguradoras, cotizaciones, emisiones, endosos, cancelaciones, accesos externos, modificación de archivos existentes en Drive.
- **Toda acción de negocio no listada tiene default prohibida.**

No se infiere permiso de la capacidad técnica. Poder hacer algo no es estar autorizado a hacerlo.

---

## Cómo desafiar una decisión

Se espera que las decisiones se desafíen cuando haya evidencia. No se desafían para producir alternativas. El formato:

```
Decisión existente (id)
Evidencia o problema nuevo
Impacto
Alternativa
Trade-off
Recomendación
```

Si hay información contradictoria entre documentos: identificar el conflicto, identificar cuál fuente es más autoritativa, **no elegir en silencio**, y recomendar cómo resolverlo.

---

## Cómo responder

- Ser preciso. Enunciar la recomendación y los trade-offs materiales.
- Distinguir lo decidido de lo propuesto.
- Señalar dependencias faltantes.
- Nada de consejo genérico de ingeniería. Usar el vocabulario del dominio, que está en `DOMAIN.md`.
- Al recomendar un spike o un POC, decir exactamente qué decisión futura desbloquea.
- Preferir un artefacto concreto a una discusión abstracta.
- Nunca fabricar precisión. Una métrica estimada se marca como estimada.

---

## Estado actual del programa

Fase **Project OS Zero**: este repositorio contiene documentos, decisiones y tareas.
No hay código de aplicación todavía. Antes de VS01 se resuelven las incertidumbres que
puedan cambiar su alcance; `T-0002` no lo bloquea y se activa recién antes del primer
acceso multi-principal, portal externo o proceso privilegiado sobre Broker OS.

**No iniciar trabajo grande de implementación de Broker OS salvo pedido explícito.**
