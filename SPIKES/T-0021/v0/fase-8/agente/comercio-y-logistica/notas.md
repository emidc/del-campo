# Notas de la corrida · agente-8b-comercio-y-logistica

- Corrida: F8-AG-01 · fase 8 · metodologia v0.2 · protocolo v0.2 · actor `ai` · todas las fichas `pending`.
- Inicio: 2026-10-07T02:11:07Z · Cierre: 2026-10-07T06:54:38Z (UTC, reloj del contenedor).
- SHA-256 al empezar (iguales al cerrar):
  - `metodologia-v0.md`: `51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904`
  - `protocolo.md`: `1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84`
- Fuentes leídas: sólo las permitidas (metodología, protocolo, las dos plantillas, `lista-riesgos-comercio-y-logistica.csv` y las carpetas `fichas/S03`, `S13`, `S27`, `S28`).

## Alcance
- 26 objetos, todos `tipo_objeto = riesgo` (S03: 7, S13: 6, S27: 6, S28: 7). La lista no trae padres, sub-riesgos ni escenarios; no creé escenarios por causa común (lista fija).
- 26 evaluables, 0 no evaluables, ningún factor `unknown`. Banda vacía en todas.
- 19 anomalías (`AN-8-comercio-y-logistica-0001` a `0019`): A6 5, A2 3, A11 3, A12 2, A7 2, A4 2, A8 2.
- `evaluacion_id`: EV-8401 a EV-8426 (formato `EV-NNNN` del protocolo; el bloque 84xx lo elegí yo y puede chocar con el de otra familia al unir archivos).

## Cosas a saber para la comparación
- Personas: apliqué la definición de "plausible" de §4.3 ("sin suponer coincidencias adicionales") y no la mejor estimación de §9.1.1 cuando chocan (anomalía 0002). Es la decisión que más mueve los niveles de Personas y `safety_critical`.
- Rango de tres niveles: cuando el peor creíble queda a tres o más niveles del plausible, limité el rango y dejé el peor creíble en la observación (anomalía 0001).
- Continuidad: apliqué literal la baja de un nivel para cualquier degradación menor a la mitad, aunque sea mínima (anomalía 0014). Lo uniformé después de terminar S03 (cambió `i_cont` de S03-R01 y S03-R02 antes de cerrar la corrida); no cambió ningún `C_raw` ni el orden D10 de S03, que quedó como se fijó.
- Stock de seguridad y conmutación automática: los cargué en contención por F5-2 (anomalías 0009 y 0019).

## Impedimentos
Ninguno me impidió evaluar. No hubo remisiones de la metodología a documentos que me faltaran para decidir un factor.
