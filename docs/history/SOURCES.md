# Fuentes del baseline

Este archivo preserva la procedencia de Project OS Zero sin fabricar documentos
canónicos a partir de resúmenes.

## Material recibido

El 2026-09-07 se recibieron un bundle Markdown y siete archivos raíz sueltos. El bundle
es la fuente estructural usada para esta revisión.

| Artefacto recibido | SHA-256 |
|---|---|
| `DelCampo-ProjectOS-Zero-bundle.md` | `2364190514c9892d2c97bf49e10b0925025db243b094eab8fcca87120e7c9531` |
| `README.md` | `c0d19960e26c75b7ca6ca00c1f2e9c14d606574bf9ab708ea7a521b682c63b3b` |
| `PROJECT.md` | `af30bdb8f70c152ba03a7056f17d939d009f163d8cfc00a3aee17efe3f6a876d` |
| `package.json` | `79f27a62a54473133799db88c48da53b276acde861ac43e2a6abde9841a7d9dd` |
| `ENGINEERING_RULES.md` | `9b7f815223f22d9c23d85b54b69a1d5e561c895541bfeaa713506ab19ecc29b3` |
| `decisions.yaml` | `3b043e623bbc1cccb6f1e66ec6298ba265afdf878acf64bd427fcb5636e29fec` |
| `CLAUDE.md` | `e495c1007f289f40f6c833af85c0010bd42af728720f297b65315368d7fe428f` |
| `AGENTS.md` | `a46f2fee6bbdc18bae4f776e9e0e727ef35773c4bbb64e48c5c0b0df65df23ad` |

## Fuente canónica recuperada

`DOMAIN.md v0.1` se recuperó completo y literalmente, en tres tramos contiguos,
desde la conversación canónica `6a9de4e0-0be0-83e9-915e-db0cdf7269c5`:

- secciones 1–20: mensaje `d2596a7c-626c-4204-a7fb-8c13ed54dae2`;
- secciones 21–40: mensaje `3bd88a78-536f-4ee2-bb86-b20ed16dcb43`;
- secciones 41–74: mensaje `d0a48dc6-4490-4033-8d8d-e2cc2cf56d51`.

Para integrarlo con Project OS Zero se normalizaron dos puntos de autoridad: el
preámbulo distingue la semántica canónica de dominio de la autoridad de decisiones, y
la sección 69 reemplaza los ids `OPEN-001` a `OPEN-009` por referencias estables
`D-0022` a `D-0030`. El texto y el estado canónicos de esas decisiones viven en
`decisions.yaml`.

| Artefacto incorporado | SHA-256 |
|---|---|
| `DOMAIN.md` | `e15279b1a686484a694aab29509a84e32488a23eca2eda1fff9715c8464b4214` |

## Fuente canónica citada pero no recibida

- `Project Charter` / `CHARTER` (la conversación menciona v0.2.1)

Hasta incorporar el original:

- no afirmar que este repositorio contiene el Charter completo;
- no reemplazarlo por resúmenes;
- al recibirlo, guardarlo completo y conservar versión o hash.
