# T-0018 — Informe de aceptación de VS01

Generado por `scripts/vs01/informe-aceptacion.mjs` desde la planilla local (ignorada por Git).
Sólo números y códigos de caso (R-19). Los motivos de fallo quedan en la planilla local.

### Resultado según el protocolo

| Criterio (§4) | Umbral | Resultado | |
| --- | --- | --- | --- |
| Pólizas encontradas | ≥ 19 de 20 | 20 de 20 | ✓ |
| Coincidencias falsas inequívocas | 0 | 0 | ✓ |
| Vínculos que abren el destino correcto | todos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 92.5 s · VS01 40 s · 20 pares · reducción 56.8 % | ✓ |

**Resultado: cumple los cuatro criterios.**

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
| Vínculos que abren el destino correcto | todos | 20 de 20 | ✓ |
| Mediana VS01 ≤ 50 % de la base | ≥ 19 pares | base 91 s · VS01 39 s · 19 pares · reducción 57.1 % | ✓ |

**Resultado: cumple los cuatro criterios.**

