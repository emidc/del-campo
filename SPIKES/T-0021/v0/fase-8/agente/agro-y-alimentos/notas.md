# Notas de la corrida F8-AG-01 · Agro y alimentos

- **Evaluador:** agente-8b-agro-y-alimentos (actor ai), fase 8, corrida F8-AG-01.
- **Versiones:** metodologia v0.2, protocolo v0.2.
- **Inicio:** 2026-10-07T02:11:03Z
- **Cierre:** 2026-10-07T11:57Z

## SHA-256 al empezar
- `v0/metodologia-v0.md`: `51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904`
- `v0/protocolo.md`: `1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84`

Al cerrar, los dos archivos tienen el mismo hash.

## Alcance
- 59 objetos de `lista-riesgos-agro-y-alimentos.csv` en 9 empresas (S01, S06, S15, S16, S17, S18, S19, S20, S21): 58 riesgos y 1 escenario por causa común (S19-E01, fuera del ranking por §7.1.2 y §10.4).
- Las empresas se evaluaron una por una, en el orden de la lista. El orden D10 de cada empresa se fijó en `ranking.md` al terminarla y no se cambió después.
- 1 objeto no evaluable: S17-R03, por i_econ unknown (§9.3). Está en la lista aparte de `ranking.md`.
- 55 anomalías en `anomalias.csv` (AN-8-agro-y-alimentos-0001 a 0055).

## ¿Algo impidió evaluar?
No. Se leyeron todas las fichas permitidas. Ningún faltante de datos impidió dar un valor, salvo el caso de S17-R03 que manda la metodología.

## Notas de formato
- `evaluacion_id` usa la forma `EV-NNNN` y es único dentro del archivo de esta familia.
- El protocolo menciona `prioridad_provisional`, pero la plantilla `ficha-evaluacion.csv` no tiene esa columna. Se respetaron los encabezados de la plantilla, así que el campo no está. No hay riesgos padre en la familia.
- La columna `banda` queda vacía (protocolo §8, metodología §6.5).
- `fichas.csv` y `anomalias.csv` usan exactamente los encabezados de las plantillas. Cada escritura se releyó antes de escribir y se confirmó unos segundos después.
