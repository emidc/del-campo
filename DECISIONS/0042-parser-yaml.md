# ADR-0042 — Regularizar el parser YAML existente

- **Id en `decisions.yaml`:** D-0042
- **Fecha:** 2026-09-20
- **Registro:** retrospectivo, exigido por T-0008; no es una nueva instalación.

## Contexto

`package.json` ya declara `yaml: ^2.8.1`; el lockfile observado fija 2.9.0.
`check-docs.mjs` y `decisions.mjs` importan `parse` del paquete. La dependencia llegó
sin el ADR requerido por R-05. Esta regularización conserva sus siete disparadores.

El contexto usa listas, frontmatter, bloques de texto y objetos de supersede parcial.
Un parser ad hoc debe reproducir sintaxis, escapes y errores de YAML antes de validar
las reglas propias de Project OS; mezclar ambos problemas haría menos auditable el checker.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0042.

## Alternativas consideradas

| Alternativa | Costo o limitación |
| --- | --- |
| Parser propio por expresiones regulares | Confunde sintaxis YAML y reglas del proyecto; casos multilínea y anidados exigen mantener un parser. |
| Convertir el corpus a JSON | Obliga a migrar documentos y frontmatter sin resolver una necesidad del producto. |
| Otro parser YAML | Exige dependencia y comparación nuevas sin evidencia de un problema con el actual. |

## Consecuencias

El parser resuelve sintaxis; el checker sigue controlando ids, estados, campos, WIP y
relaciones con ADR. Parsear correctamente no demuestra que una decisión sea correcta.
La instalación queda fijada por el lockfile y el análisis de actualizaciones sigue R-05.

**Costo de revertir:** sustituir los dos consumidores actuales y probar compatibilidad
con el corpus y entradas inválidas. No requiere migrar datos de negocio ni autoriza
cambiar el formato del contexto silenciosamente.
