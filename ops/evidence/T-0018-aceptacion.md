# T-0018 — Informe de aceptación de VS01

Generado por `scripts/vs01/informe-aceptacion.mjs` desde la planilla local (ignorada por Git).
Sólo números y códigos de caso (R-19). Los motivos de fallo quedan en la planilla local.

Casos congelados (§4.1): 20. Casos medidos: 20. Los códigos coinciden uno a uno.

### Resultado según el protocolo

| Criterio (§4) | Umbral | Resultado | |
| --- | --- | --- | --- |
| Pólizas encontradas | ≥ 19 de 20 | 20 de 20 | ✓ |
| Coincidencias falsas inequívocas | 0 | 0 | ✓ |
| Vínculos que abren el destino correcto | todos, en todos los casos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 92.5 s · VS01 40 s · 20 pares · reducción 56.8 % | ✓ |

**Resultado: cumple los cuatro criterios.**

### Filas por caso

| Caso | Base (s) | VS01 (s) | En pares | Encontrada | Aperturas | Pista del botón |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 48 | 35 | sí | sí | 1 de 1 | no |
| C02 | 188 | 33 | sí | sí | 1 de 1 | no |
| C03 | 101 | 55 | sí | sí | 1 de 1 | no |
| C04 | 91 | 33 | sí | sí | 1 de 1 | no |
| C05 | 81 | 51 | sí | sí | 1 de 1 | no |
| C06 | 29 | 28 | sí | sí | 1 de 1 | no |
| C07 | 87 | 39 | sí | sí | 1 de 1 | no |
| C08 | 74 | 41 | sí | sí | 1 de 1 | no |
| C09 | 82 | 54 | sí | sí | 1 de 1 | no |
| C10 | 85 | 71 | sí | sí | 1 de 1 | no |
| C11 | 131 | 59 | sí | sí | 1 de 1 | no |
| C12 | 111 | 65 | sí | sí | 1 de 1 | no |
| C13 | 81 | 23 | sí | sí | 1 de 1 | no |
| C14 | 97 | 31 | sí | sí | 1 de 1 | no |
| C15 | 123 | 29 | sí | sí | 1 de 1 | no |
| C16 | 113 | 42 | sí | sí | 1 de 1 | no |
| C17 | 138 | 49 | sí | sí | 1 de 1 | no |
| C18 | 112 | 34 | sí | sí | 1 de 1 | no |
| C19 | 72 | 26 | sí | sí | 1 de 1 | no |
| C20 | 94 | 55 | sí | sí | 1 de 1 | sí |

## Amenaza a la validez declarada por el owner

Durante la medición, el botón «Abrir documento» sólo estaba habilitado para las 20 pólizas
conciliadas; el resto de las pólizas mostraba el documento pendiente. El botón funcionó como
pista para elegir la póliza objetivo entre candidatos, y también acortó el recorrido.

Casos en que el operador declaró haber elegido guiado por el botón: C20.

### Sensibilidad: esos casos cuentan como no encontrados y salen de los pares de tiempo

| Criterio (§4) | Umbral | Resultado | |
| --- | --- | --- | --- |
| Pólizas encontradas | ≥ 19 de 20 | 19 de 20 | ✓ |
| Coincidencias falsas inequívocas | 0 | 0 | ✓ |
| Vínculos que abren el destino correcto | todos, en todos los casos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 91 s · VS01 39 s · 19 pares · reducción 57.1 % | ✓ |

**Resultado: cumple los cuatro criterios.**

**Límite de este análisis.** Sólo corrige los casos que el operador declaró haber elegido
guiado por el botón. El botón estuvo visible en los 20 casos conciliados, así que la
reducción que queda es una **cota superior** del efecto de VS01: el resto del atajo no se
puede separar de la medición con estos datos. Además, excluir más de 1 caso dejaría
menos de 19 pares y la medición de tiempo pasaría a no ser válida por §4 — el análisis no
tiene margen para una sensibilidad más agresiva.

