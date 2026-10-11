# Congelamiento · metodología v1 candidate

> **Congelada el 2026-10-11 a las 13:37 UTC**, después del sí de Emiliano del 2026-10-11 13:21:54 UTC al "Para aprobar" de `v0/fase-11/reporte-fase-11.md` (punto 9: "Sí, después de aplicar 2/4/8 y una última regresión+arnés con 0 FAIL").

## Condición de congelamiento, cumplida

- Se aplicaron los puntos 2 (opción c), 4 (F11-4 por sustituibilidad real, sin umbral) y 8 (fichas nuevas sobre las de Emiliano, sin sobrescribir).
- Última regresión F11-REG-01: casos de propiedad 20/20 sin cambio respecto de la v0.3 (13 PASS, 3 FAIL combinación, 3 FAIL calibración, 1 FAIL ranking, todos con causa nombrada desde la Fase 5 o la 9). En EMI-41 todo cambio tiene regla; D23 se cumple. Se volvió a correr a las 13:37 UTC y sus salidas no cambiaron.
- Arnés ejecutable (`SPIKES/T-0021/regresion-ejecutable/`, `node --test`): 213 tests, 211 pass, **0 fail**, 2 `todo` (J01 y e), explícitamente fuera de v1 (EV-44). `tsc` y `eslint` limpios.

## Regla

1. **Esta versión no se edita durante la Fase 12.** Ningún archivo de la tabla se modifica.
2. Cualquier cambio es una fila nueva de `v0/changelog-metodologia.md` y una versión nueva, con su propia regresión.
3. `v0/metodologia-v0.md` queda como registro de la v0.3 y no se reemplaza.
4. Ninguna ficha se sobrescribe: una evaluación nueva apunta a la anterior con `evaluacion_anterior_id`.
5. Las fichas nuevas de la Fase 11b siguen en `review_status = pending`. Las dos propuestas sobre fichas de Emiliano (EV-11-0063 y EV-11-0064) esperan su validación; validarlas no cambia ninguna regla.

## Huellas SHA-256

Rutas relativas a `T-0021/`.

| Archivo | SHA-256 |
|---|---|
| `v1/metodologia-v1-candidate.md` | `c21ebbec07c65854c03746809ff53e80c36811cb373ed10973a165f84347fec0` |
| `v0/decisiones-v0.md` | `67ca2419792d348813c023e343773b1257df87baec67a3bdc102795bbca35608` |
| `v0/protocolo.md` | `c34ff6672882a369c194e90d4aaef9cac41685050418865176f8fefff5bcae1a` |
| `v0/changelog-metodologia.md` | `1a5e05539ce3a89d43cbf4badd2f89c48b3633611f7fdad79a32e9d5ff01b291` |
| `v0/plantillas/ficha-evaluacion.csv` | `e678dd9ef9e36e2cc03698ab11e6b1d5fdcc3a2d1ef6fe9d5d8850eada049a06` |
| `v0/metodologia-v0.md` | `72e8491d640911400e3a526a9273ae7088a0f72933e6fcfc36c34a0648d02a6c` |
| `v0/fase-11/reevaluar.py` | `8314d175cd8cb8374c0962f0b271d239348c8a581a7e72446fb62aa6ed74cc08` |
| `v0/fase-11/reevaluar-ronda-2.py` | `5294fdcae0d81233a7dec93600d3a2c40bef102db2cfd8bbe4189da0c7f30b10` |
| `v0/fase-11/regresion.py` | `64dd954d4d5f7240d4ba2c4cad9a838b814e2ea7026923d05aa1b399c1c51e06` |
| `v0/fase-11/regresion-casos.csv` | `197be26dbe14a5a6cdaec400b2987fd6f44e5d7e2b8cc75fd8e8de951e4b5d8f` |
| `v0/fase-11/regresion-emi41.csv` | `85a1a26ab5f6b8d7811598855cf49e8c0de7c0cb591c3762fdeadc1f0af7ae15` |
| `v0/fase-11/reevaluacion/cambios-por-factor.csv` | `9512f5246525c2074f6a8151edb769cf15c5e35bdcea8b5aae05b569a716f5fc` |
| `v0/fase-11/reevaluacion/cambios-ronda-2.csv` | `496a4e62f7f892bc63d0f8d875a2b426bdd20ec308edeaa6d1a6683a3fec36e6` |
| `v0/fase-11/reevaluacion/fichas-reevaluadas-factores.csv` | `d90490583051fed10ba8c9749621d21c99dcb790383e16a0cde8925a00853c9e` |
| `v0/fase-11/reevaluacion/fichas-reevaluadas.csv` | `e6997c42a531328b750b7edab85cc68b86bde280a12a3f900d514d86e423d018` |
| `v0/fase-11/reevaluacion/fichas-ronda-2-factores.csv` | `20d27cba5fb4e5794618626caaad420bc3e85f657974cc2673bd4d0c2716ef69` |
| `v0/fase-11/reevaluacion/fichas-ronda-2.csv` | `43eda632c802794a3f4c3e07cad264ad1f2724d4e6732763f4ba1c5ec83913a9` |

Para verificar: `sha256sum <archivo>` desde `T-0021/` y comparar con la tabla. `v0/metodologia-v0.md` está en la tabla para poder comprobar que la v0.3 no cambió.
