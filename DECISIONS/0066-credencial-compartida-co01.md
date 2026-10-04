# ADR-0066 — La UI de Communication OS usa una credencial compartida durante CO01

- **Id en `decisions.yaml`:** D-0066
- **Estado:** PROVISIONAL
- **Fecha:** 2026-10-03
- **Supersede:** —

## Contexto

`SLICES/CO01.md` define una UI web que muestra conversaciones de WhatsApp y permite
responder desde el número dedicado. Es un cambio en autenticación, así que R-05 exige
un ADR antes de implementar.

Hechos que restringen la elección:

1. **Communication OS no puede usar el login de VS01 en Q4.** D-0063 prohíbe importar
   código de `apps/web` y deja la integración con Broker OS para el cierre del
   trimestre. El owner quiere integrar Communication OS en Broker OS después, con ese
   login (D-0059).
2. **La UI expone datos personales y puede enviar mensajes** en nombre de Del Campo. Sin
   ninguna barrera, cualquiera con el enlace podría leer las conversaciones y escribir a
   los participantes.
3. **El uso en Q4 es acotado:** dos participantes del equipo, contenido inventado,
   número dedicado y ningún cliente (CO01 §3).
4. **El owner pidió un acceso "muy básico, con un usuario y contraseña genéricos"**
   (2026-10-03). No es OAuth: es una credencial compartida, sin proveedor de identidad.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0066.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Sin autenticación | Deja conversaciones y envío abiertos a cualquiera con la URL (R-19). |
| UI solo en local | Era la salvaguarda propuesta en CO01; el owner prefirió tener la UI desplegada. |
| Login de VS01 (Google, D-0059) | Exige importar código de `apps/web` o duplicarlo; D-0063 deja esa integración para el cierre de Q4. |
| OAuth propio con Google en el contexto | Duplica D-0059 para un laboratorio de dos usuarios, y suma configuración de OAuth que después se descarta. |
| Protección de plataforma de Vercel | Depende del plan y no puede cubrir el receptor, que tiene que quedar público para Meta. |

## Consecuencias

**Más fácil:** cero dependencias nuevas y cero proveedores externos; sale con la UI.

**Más difícil:**

- **No hay responsabilidad individual.** Con una credencial compartida no se sabe quién
  envió cada mensaje. En CO01 el owner opera la prueba, así que se acepta; con más
  usuarios, no.
- **Una filtración de la credencial expone todo.** Por eso vive solo como variable del
  despliegue, la rota el owner y se cambia si alguien deja de participar.
- El receptor (`/webhook`) queda fuera de la credencial: lo protege la firma de Meta.

**Costo de revertir:** bajo. Al integrar Communication OS en Broker OS se reemplaza por
el login de VS01 y se borra la credencial.

## Criterio de falsación

Ver `falsified_by` en `decisions.yaml`.
