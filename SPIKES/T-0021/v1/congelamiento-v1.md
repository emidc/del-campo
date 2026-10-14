# Congelamiento · metodología v1

> **Congelada el 2026-10-14**, después de la decisión de Emiliano del 2026-10-14 15:01:35 UTC sobre el "Para decidir" de `v0/fase-13/dossier-cierre-emi15.md` (punto 5a: "Promover la v1 candidate a v1 sin cambios de regla"). Detalle en `v0/fase-13/decisiones-13.md`.

## Qué es esta versión

- **Las mismas reglas que la v1 candidate** (`v1/congelamiento.md`). `v1/metodologia-v1.md` tiene el mismo cuerpo (§1 a §14 y §16 a §18 idénticos byte a byte). Cambian sólo el encabezado y las secciones de estado: evidencia, cinco condiciones, uso de `C_raw`, §15 y §19.
- **Baseline estable para uso experimental en Risk OS.** No implica que `P × I × V` esté validado como modelo universal ni como orden profesional definitivo. `C_raw` queda retenido provisionalmente como índice heurístico de tamizaje y no es una medida cardinal.
- `decisiones-v0.md`, `protocolo.md` y la plantilla no cambian. Sus encabezados siguen diciendo "v1 candidate" porque ninguna regla cambió.

## Verificación al congelar

- Arnés ejecutable (`SPIKES/T-0021/regresion-ejecutable/`, `node --run test`), sobre esta rama: 213 tests, 211 pass, **0 fail**, 2 `todo` (J01 y e, fuera de v1, EV-44). Ningún archivo que lee cambió.
- Piloto S06 (`v0/fase-12/piloto-emiliano/comparacion/verificar-piloto.mjs`): PASS, 144 derivados.
- Respecto de `v1/congelamiento.md`, sólo cambia una huella de la tabla: la del changelog, por CH-111 y CH-112. Las dos de `fichas-ronda-2*.csv` son las posteriores a la aceptación de EV-11-0063/0064 (`v0/fase-11/aceptacion-fichas-emiliano-2026-10-13.md`).

## Regla

1. **Esta versión no se edita.** Cualquier cambio de regla es una fila nueva de `v0/changelog-metodologia.md` y una versión nueva (v1.1, EMI-43), con su propia regresión.
2. `v1/metodologia-v1-candidate.md` y `v1/congelamiento.md` quedan como registro de la candidate y no se editan.
3. Ninguna ficha se sobrescribe: una evaluación nueva apunta a la anterior con `evaluacion_anterior_id`.
4. Filas del changelog **sin cambio de regla** (por ejemplo, las del cierre de EMI-41) pueden agregarse después de CH-112. Cambian la huella del changelog, y la fase que las agrega registra la huella nueva; no cambian la v1.

## Huellas SHA-256

Rutas relativas a `T-0021/`. El changelog queda fijado con CH-112 como última fila.

| Archivo | SHA-256 |
|---|---|
| `v1/metodologia-v1.md` | `946701326fa11c37fcc68e461d618f2ba556c7809513c2e82232ccc1f21a8709` |
| `v1/metodologia-v1-candidate.md` | `c21ebbec07c65854c03746809ff53e80c36811cb373ed10973a165f84347fec0` |
| `v0/decisiones-v0.md` | `67ca2419792d348813c023e343773b1257df87baec67a3bdc102795bbca35608` |
| `v0/protocolo.md` | `c34ff6672882a369c194e90d4aaef9cac41685050418865176f8fefff5bcae1a` |
| `v0/changelog-metodologia.md` | `a1cff56b7844ebce41d87ec8b522450afd7e362c6981574a6a427d6903ff3310` |
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
| `v0/fase-11/reevaluacion/fichas-ronda-2-factores.csv` | `5e96850b902c04c91107932b49f8999c9b37a1d3fddad91067916af5b4fb6b15` |
| `v0/fase-11/reevaluacion/fichas-ronda-2.csv` | `7c8472b3e23cb6c5db97278c9ea57e15c4a0ebb5db0dd691f4bdfcdc13f35ce7` |

Para verificar: `sha256sum <archivo>` desde `T-0021/` y comparar con la tabla.
