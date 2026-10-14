# Verificación · Fase 15b

> 2026-10-14 · T-0021. Qué se corrió, con qué comando y qué dio. Rutas relativas a `SPIKES/T-0021/` salvo que digan otra cosa. Node 22.22 en el contenedor (el repo pide 24; los `.ts` corren igual, con el borrado de tipos nativo).

## 1. Punto de partida

| Comprobación | Comando | Resultado |
|---|---|---|
| Huellas de `v1/congelamiento-v1.md` | SHA-256 de cada archivo de su tabla | **18/18** coinciden |
| Manifiesto del dataset (`v0/fase-14/dataset/manifiesto.md`) | SHA-256 de cada archivo listado | **369/369** coinciden |
| Arnés de regresión | `cd regresion-ejecutable && node --run test` | **213 tests: 211 pass, 0 fail, 2 todo** (igual que al cierre de la 15a) |

Las tres se repitieron al final de la fase con el mismo resultado. Nada de la tabla del congelamiento, de la metodología, de las decisiones, del protocolo, de la plantilla ni del changelog cambió.

## 2. CSV sintéticos (`v0/fase-15/sinteticos/`)

```bash
node v0/fase-15/sinteticos/generar.ts          # escribe los cinco archivos
node v0/fase-15/sinteticos/generar.ts --check  # compara sin escribir; sale con 1 si algo difiere
```

| Archivo | Filas | Qué tiene |
|---|---:|---|
| `risks.csv` | 84 | 76 evaluaciones importadas de EMI-41, 2 filas de padre y 6 filas nuevas de la 15b (5 reevaluaciones y la inicial del riesgo sin evaluar) |
| `action-plan.csv` | 10 | los 10 registros aprobados en 10a, todos nuevos |
| `risk-transfer.csv` | 33 | 32 coberturas importadas de las fichas de transferencia y 1 evento nuevo |
| `mapeo-ids.csv` | 209 | cada id nuevo con su origen; 16 evaluaciones del experimento marcadas `no_importada` con el motivo |
| `no-cupo.csv` | 73 | lo que no entró o entró en parte, con campo, ficha, motivo y salida propuesta |

La conversión es determinística: el ULID de cada id sale de la fecha del registro y de un SHA-256 de su origen. `generar.ts --check` y el test lo comprueban byte por byte.

## 3. Validador (`v0/fase-15/validador/`)

```bash
node v0/fase-15/validador/validar.ts v0/fase-15/sinteticos --corte 2026-10-14 [--salida hallazgos.csv]
```

Resultado sobre los CSV sintéticos, con fecha de corte 2026-10-14: **0 rechazos, 103 avisos.**

| Aviso | Cantidad | Por qué |
|---|---:|---|
| RV-EVA-08 | 57 | evaluaciones de EMI-41 registradas con `metodologia v0.2`; los derivados se calculan con la v1 (decisión 6a) |
| RV-ECO-02 | 26 | riesgos con cobertura cuya evaluación vigente no trae `i_econ_monto_bruto` (el dataset no lo registra) |
| RV-ACC-11 | 20 | riesgos `safety_critical` sin acción en curso ni decisión de tratamiento vigente (el dataset no tiene acciones; las nuevas sacan del aviso a S05-P01-S03, con la acción en curso, y a S32-R05, con la decisión de aceptar) |

## 4. Derivados contra la regresión de EMI-41

Test `sinteticos.test.ts`, «los derivados del dataset convertido coinciden con resultado_nuevo de regresion-emi41.csv». Toma las filas importadas (sin las de la 15b), sigue la historia de cada riesgo, toma la vigente según 8a y calcula con las funciones del arnés (`evaluar`, `iEfectivo`, `consecuenciaExtrema`, `safetyCritical`, `banda`, `rankingD10`, `posicionPadre`).

- **59 de 59 objetos coinciden** con `resultado_nuevo` (C, posición, banda, banderas e I efectivo; en los padres, C y posición). Ninguna diferencia que reportar.
- La última evaluación de cada cadena convertida es la que usó la regresión, en los 57 objetos con evaluación.
- En S15 se compara sin la posición: S15-R04 sigue la historia de Emiliano (EV-8115 → EV-11-0064, aceptada) y la regresión ordena a cada evaluador por separado, así que la posición de S15 en el lote mezcla dos rankings que la regresión no mezcla.

## 5. Casos inválidos (`v0/fase-15/invalidos/`)

```bash
node v0/fase-15/invalidos/generar.ts [--check]
```

- `base/`: un lote válido chico (una organización, 7 filas de riesgo, 3 del plan, 2 de transferencia), sintético, sin fichas históricas. **0 rechazos.**
- 55 carpetas, una por regla de rechazo, cada una con sólo el archivo que cambia. `casos.csv` dice qué cambia en cada una.
- `errores-esperados.csv`: `caso`, `regla_id`, `archivo`, `fila`, `error_esperado`. El error esperado es el texto de `contrato/reglas-validacion.csv` con los valores del caso.

Test `invalidos.test.ts`: **cada caso produce exactamente su rechazo (regla, archivo, fila y mensaje) y ningún otro**, leído desde disco y armado en memoria. Las 55 reglas de rechazo del contrato tienen su caso, y las 16 de aviso tienen un lote que las dispara sin rechazos.

## 6. Export ciego (`v0/fase-15/export-ciego/`)

```bash
node v0/fase-15/export-ciego/export-ciego.ts --empresas S29 --version v1 --salida <carpeta fuera del repo> \
  --aceptar "EV-11-0063=<motivo>"
```

- Sin `--aceptar` falla: la metodología v1 cita `EV-11-0063` (línea 52, tabla de las cinco condiciones de EMI-15). Es la evaluación de S02-R07; la metodología no se edita, así que cada export la acepta explícitamente y queda en el manifiesto.
- Dentro del repositorio se niega a escribir. Con la carpeta no vacía, también.
- Muestra de **S29** (no la cita la metodología): 14 archivos más `MANIFIESTO.txt`, en `/mnt/project-files/T-0021/fase-15b/export-ciego-S29/`. El manifiesto de esa muestra está versionado en `v0/fase-15/export-ciego/muestra-S29-MANIFIESTO.txt`.
- Contaminación de las otras empresas aprobadas: S05 y S15 ninguna; S06 (R01, R04), S07 (R01, R07), S28 (R02, R07), S32 (R01, R03) y S36 (R07) aparecen citadas en la metodología.

Test `export-ciego.test.ts`: falla con un archivo fuera de la lista blanca, con una huella distinta, con un id de evaluación en una ficha de empresa (no aceptable), con cada columna de resultado en un CSV, con la plantilla si trae filas, con la contaminación de S06 sin aceptación, con una aceptación de algo que no aparece y con una salida dentro del repo; escribe la muestra con todas las huellas en el manifiesto.

## 7. `pnpm check`

`scripts/tests/t0021-fase-15b.test.mjs` importa los tres tests de la 15b, así que corren en `node --test scripts/tests/*.test.mjs` dentro de `pnpm check`. No se tocó `package.json`, CI, `contexts/`, `apps/` ni `packages/`.

| Paso | Resultado en el contenedor |
|---|---|
| `check-docs` | ✓ 66 decisiones, 29 ADRs, 26 tareas, 0 avisos |
| `check-agent-run` | ✓ |
| `node --test scripts/tests/*.test.mjs` | pasa, 0 fail; incluye las 5 suites de la 15b (99 tests) |
| `pnpm typecheck` | ✓ |
| `pnpm lint` | ✓ |
| `pnpm test` | falla en el contenedor por no tener Postgres, igual que en `main`; CI lo corre con base |
| `tsc --noEmit -p SPIKES/T-0021/v0/fase-15` | ✓ (incluye el arnés) |

El resultado de CI está en el PR.

## 8. Ajuste de la lista de casos históricos

El owner respondió `lista-casos-historicos.md` el 2026-10-14 con un ajuste de contrato: `risks.csv` tiene que poder asociar un riesgo a una sede o unidad. Se agregó `unidad_id` (opcional, id opaco, igual en todas las filas del riesgo por RV-RSK-01) y se regeneraron los CSV sintéticos y los casos inválidos, con la columna vacía.

| Comprobación | Resultado |
|---|---|
| `generar.ts --check` de sintéticos y de inválidos | ✓ |
| Validador sobre los sintéticos, corte 2026-10-14 | 0 rechazos, 103 avisos (los mismos de §3) |
| Tests de la 15b | 100 pass, 0 fail. El nuevo comprueba que `unidad_id` puede variar entre riesgos y que, si varía entre filas de un mismo riesgo, da RV-RSK-01 |
| Arnés de regresión | 213 tests: 211 pass, 0 fail, 2 todo |
| `pnpm check`, `pnpm typecheck`, `pnpm lint` | ✓, salvo los tests de base que necesitan Postgres, como en §7 |
