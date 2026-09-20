# ADR-0040 — La autoridad documental se descompone en ejes; VS01 no escribe en Drive

- **Id en `decisions.yaml`:** D-0040
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`D-0009` declara que Drive es autoritativo sobre contenido, existencia, ubicación y ACLs, y
que Broker OS nunca es plano de control. `D-0032`, del mismo día, acepta como capacidad
futura que Broker OS cree estructura canónica para Contactos y Cuentas sin carpeta
histórica validada, y difiere explícitamente la alineación entre ambas.

La tensión se resuelve separando ejes en vez de elegir un bando: proponer una estructura no
es ser autoridad sobre la ubicación, y `D-0009` sigue siendo verdadera sin cambios.

Hay además un hueco en `R-14`: exige aprobación humana para "modificación o eliminación de
un archivo existente en Drive" y no menciona la creación ni el movimiento. Como toda acción
de negocio no listada tiene default prohibida, hoy crear una carpeta está prohibido por
deducción y no por texto. Un límite que se deduce es un límite que alguien va a discutir.

La evidencia de T-0004 sostiene la prudencia: de 24 entidades muestreadas, 9 carpetas
resultaron accesibles y 15 devolvieron 404 bajo la identidad de discovery, ninguna pudo
declararse conforme por falta de convención aprobada, y 1.450 de 1.786 partes no tienen
ninguna referencia documental.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0040`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Habilitar creación de carpetas con aprobación caso por caso en VS01 | Requiere una convención de nombres que no existe. Crear estructura sin convención aprobada es inventar la convención por la puerta de atrás |
| Supersede de `D-0009` | Su statement sigue siendo verdadero. Reemplazarla perdería historia sin ganar precisión |
| Dejar la tensión sin resolver hasta la tarea de Drive | El hueco de `R-14` quedaría abierto mientras tanto, y es el que decide qué puede hacer un agente |

## Consecuencias

**Más fácil:** se puede diseñar la conciliación asistida y la estructura canónica futura sin
tocar la autoridad de Drive sobre contenido y permisos, que no se mueve.

**Más difícil:** cualquier escritura futura necesita su propia decisión, su tarea y
aprobación humana, y antes de eso una convención de nombres aprobada.

**Costo de revertir:** nulo para VS01, que es de solo lectura. Una carpeta creada, en
cambio, no se descrea: por eso la capacidad queda preparada y no habilitada.
