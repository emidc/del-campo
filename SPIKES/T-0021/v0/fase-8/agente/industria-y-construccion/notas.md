# Notas de la corrida · agente-8b-industria-y-construccion

- **Corrida:** F8-AG-01 · fase 8 · metodologia v0.2 · protocolo v0.2
- **Inicio:** 2026-10-07T02:11:05Z
- **Fin:** 2026-10-07T11:50:15Z
- **SHA-256 al inicio** (iguales al final):
  - `v0/metodologia-v0.md`: 51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904
  - `v0/protocolo.md`: 1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84

## Alcance

Siete empresas de la familia, en este orden: S02, S05, S22, S23, S24, S25 y S37. Son 52 fichas: 47 riesgos, 1 padre (S05-P01), 3 sub-riesgos y 1 escenario (S22-E01). De ellas, 6 son no evaluables y van en una lista aparte en `ranking.md`. El orden D10 de cada empresa se fijó al terminarla y después no se tocó.

## Qué se leyó

Sólo los archivos que permite la consigna:

- `metodologia-v0.md`
- `protocolo.md`, §2, §3, §4 y §10
- las dos plantillas
- `lista-riesgos-industria-y-construccion.csv`
- las carpetas `emi41/fichas/<Sxx>/` de las siete empresas

## Convenciones adoptadas

- **`evaluacion_id`:** `EV-8-industria-y-construccion-NNNN`, correlativo. La consigna sólo fija el formato de los ids de anomalía.
- **`prioridad_provisional`:** la plantilla no tiene esa columna. En la ficha del padre S05-P01 el valor va al final de `justificacion` (AN-…-0006).
- **Valor peor creíble y unknown:** se aplicó la lectura literal. El peor creíble va a `<f>_max` (§4.1.4). Si con eso el rango pasa de tres niveles, el factor queda `unknown` (§9.2). La otra lectura está registrada como A12 (AN-…-0001 y AN-…-0015).
- **Banderas en riesgos no evaluables:** se aplicó §8.2. `consecuencia_extrema` se marca también cuando el `<f>_max` de una dimensión unknown llega a 5 (AN-…-0007).
- **Stock de producto terminado:** se tomó como contención, porque limita cuánto daño económico produce una detención. En S25-R02 y S25-R04 aparece así.
- **`banda`:** vacía en todas las fichas.
- **Una corrección durante la corrida:** en S02-R07 (no evaluable), `consecuencia_extrema` se pasó a `true`, con su referencia a §8.2 y a AN-…-0007. Se hizo al detectar la regla de §8.2 en la empresa siguiente, antes de terminar la familia. No cambió ningún orden.

## Lo que trabó la evaluación

- **S37:** tiene RO negativo en 2024 y 2025. La magnitud de referencia salió del único ejercicio positivo (2023, USD 0,16 M). Con esa base, el económico se satura en 5 con montos chicos (AN-…-0029). Además, el margen operativo negativo deja sin definir el `i_econ_min` de §4.2 F5-1 (AN-…-0030).
- **Tasas sectoriales de jerarquía 1:** en varias, la base no coincide con el evento iniciador tal como lo define §2.1. Algunas cuentan sólo lesiones con baja, otras sólo liberaciones con lesionados, otras sólo autorreportes. Quedaron como A2.
- **Corte P/V de controles:** hubo controles que la ficha lista como contención pero que actúan antes del evento iniciador: kits antiderrame, ensayo destructivo con bloqueo, plan de aceleración. Quedaron como A11.
- **Escenarios por causa común:** la mayoría no se pudo sostener como materiales, en parte porque la escala ya está saturada en 5. Quedaron como A7.
- **Ningún bloqueo impidió producir las fichas.** No se leyó nada fuera de lo permitido, y no se modificó nada fuera de esta carpeta.
