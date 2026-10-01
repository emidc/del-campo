# ADR-0064 — Enlaces de Drive informados por Zoho, sin comprobar

- **Id en `decisions.yaml`:** D-0064
- **Estado:** ACCEPTED
- **Fecha:** 2026-10-01
- **Supersede:** D-0057 en parte (cláusula «sólo se ofrecen como enlace las relaciones
  comprobadas por una persona»)

## Contexto

VS01 se aceptó el 28/09/2026 con 20 vínculos comprobados a mano. En producción, el resto
de las 1.930 pólizas muestra el documento como pendiente, aunque Zoho tiene enlaces para
una parte de ellas. Para que el equipo use VS01 a diario hace falta ofrecer esos enlaces.
Comprobarlos uno por uno (D-0057) no escala, y comprobarlos por API exigiría una
integración con Drive que D-0057 descartó para este momento.

Evidencia del lote del 16/09 (conteos sobre el export completo, no sólo el scope): en
Pólizas, «URL drive doc poliza» apunta a un archivo en 590 filas y a una carpeta en 61;
en Contactos, «Drive URL» apunta a una carpeta en 264 filas y a un archivo en 1; en
Cuentas, a una carpeta en 83 y a otro destino en 1. En la muestra de T-0004, 15 de 24
enlaces de clientes devolvieron 404 bajo la identidad de discovery, sin poder distinguir
inexistencia de falta de permisos.

## Referencia canónica

La decisión vive en `decisions.yaml` (D-0064). Este ADR explica por qué.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Cargarlos como pendientes | La app no ofrece enlace para un pendiente: el equipo no gana nada |
| Cargarlos como comprobados, con «Zoho» como verificador | Falsea el registro de D-0057 y borra la diferencia entre un enlace comprobado y uno informado |
| Comprobarlos por API de Drive | Integración, permisos y custodia de credenciales que D-0057 dejó fuera; además no resuelve que un 404 pueda ser falta de permisos de una cuenta |
| Seguir sólo con comprobación manual | Cobertura de 20 pólizas; VS01 no es operativo |

## Consecuencias

El equipo ve un enlace en las pólizas que Zoho tiene vinculadas, con un rótulo que deja
claro que nadie lo comprobó. Algunos enlaces pueden no abrir o apuntar a una versión
anterior: el rótulo lo advierte y la comprobación humana sigue disponible para
promoverlos. Los enlaces a carpeta de una póliza se omiten porque una carpeta no es el
documento. La cobertura queda limitada a lo que Zoho tiene, alrededor de un tercio de
las pólizas del scope. Revertir es borrar el nivel de Zoho: los comprobados no cambian.

Una medición confirmatoria de VS01 con la mayoría de las pólizas mostrando algún enlace
eliminaría la pista del botón registrada en `ops/evidence/T-0018-aceptacion.md`.
