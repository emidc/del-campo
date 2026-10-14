#!/usr/bin/env python3
"""Fase 15a · inventario de campos para el contrato de EMI-16.

Sólo lee. Cuenta, desde las fichas de evaluación reales del experimento, cómo se usa
cada columna de la plantilla; lista las filas de procedencia con base `—` de las fichas
de información de EMI-41; y lista los esquemas de `evaluacion_id` y sus colisiones.
Escribe `uso-columnas.csv`, `ids-evaluacion.csv` y `inventario-campos.json` en esta
carpeta. No toca ninguna ficha.

    cd SPIKES/T-0021/v0/fase-15 && python3 inventario_campos.py
"""
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
V0 = AQUI.parent
RAIZ = V0.parent

FICHAS = {
    "F8-agente": sorted((V0 / "fase-8" / "agente").glob("*/fichas.csv")),
    "F8-emiliano": [V0 / "fase-8" / "emiliano" / "fichas-emiliano.csv"],
    "F11b": [V0 / "fase-11" / "reevaluacion" / "fichas-reevaluadas.csv",
             V0 / "fase-11" / "reevaluacion" / "fichas-ronda-2.csv"],
    "F12": [V0 / "fase-12" / "piloto-emiliano" / "etapa-b" / "fichas-emiliano-cerradas.csv"],
}
# Las fichas del dry run (casos de propiedad, Fase 4) no son de EMI-41: sólo entran en el
# cruce de ids, porque reutilizan el esquema EV-NNNN.
DRY_RUN = V0 / "dry-run" / "fichas-dry-run.csv"
PLANTILLA = V0 / "plantillas" / "ficha-evaluacion.csv"
FACTORES = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "v_cont", "v_rec"]
ENUM_BASE = {"observed", "reported", "inferred", "assumed"}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def leer(fs, fuente):
    filas = []
    for f in fs:
        with f.open(encoding="utf-8") as h:
            for r in csv.DictReader(h):
                r["_fuente"] = fuente
                r["_archivo"] = str(f.relative_to(RAIZ))
                filas.append(r)
    return filas


out = {}

# 1. Huellas de v1/congelamiento-v1.md
cong = (RAIZ / "v1" / "congelamiento-v1.md").read_text(encoding="utf-8")
huellas = {}
for m in re.finditer(r"^\| `([^`]+)` \| `([0-9a-f]{64})` \|", cong, re.M):
    huellas[m.group(1)] = sha(RAIZ / m.group(1)) == m.group(2)
out["huellas_congelamiento_v1"] = {"total": len(huellas), "coinciden": sum(huellas.values()),
                                   "no_coinciden": [k for k, v in huellas.items() if not v]}

# 2. Uso de cada columna de la plantilla
plantilla = next(csv.reader(PLANTILLA.open(encoding="utf-8")))
filas = []
for fuente, fs in FICHAS.items():
    filas += leer(fs, fuente)
out["fichas"] = dict(Counter(r["_fuente"] for r in filas))
out["fichas_total"] = len(filas)
faltan = defaultdict(list)
for fuente, fs in FICHAS.items():
    for f in fs:
        h = next(csv.reader(f.open(encoding="utf-8")))
        for c in plantilla:
            if c not in h:
                faltan[c].append(str(f.relative_to(RAIZ)))
out["columnas_ausentes_en_archivos"] = {k: len(v) for k, v in faltan.items()}

uso = []
for c in plantilla:
    n = Counter()
    for r in filas:
        if c not in r:
            n["ausente"] += 1
            continue
        v = (r[c] or "").strip()
        if v == "":
            n["vacio"] += 1
        elif v == "unknown":
            n["unknown"] += 1
        elif v == "no_aplica":
            n["no_aplica"] += 1
        elif v == "—":
            n["guion"] += 1
        else:
            n["con_valor"] += 1
    distintos = len({(r.get(c) or "").strip() for r in filas if (r.get(c) or "").strip()})
    uso.append({"columna": c, "filas": len(filas), "con_valor": n["con_valor"], "vacio": n["vacio"],
                "unknown": n["unknown"], "no_aplica": n["no_aplica"], "guion": n["guion"],
                "ausente_en_archivo": n["ausente"], "valores_distintos": distintos})
with (AQUI / "uso-columnas.csv").open("w", encoding="utf-8", newline="") as h:
    w = csv.DictWriter(h, fieldnames=list(uso[0]))
    w.writeheader()
    w.writerows(uso)

# bases por factor en las evaluaciones
out["base_por_factor_evaluaciones"] = {f: dict(Counter((r[f + "_base"] or "").strip() or "(vacío)" for r in filas))
                                       for f in FACTORES}
out["base_fuera_de_enum_evaluaciones"] = [
    (r["evaluacion_id"], r["risk_id"], f) for r in filas for f in FACTORES
    if (r[f + "_base"] or "").strip() not in ENUM_BASE | {""}]
out["base_vacia_con_valor"] = [
    (r["evaluacion_id"], r["risk_id"], f, r["tipo_objeto"]) for r in filas for f in FACTORES
    if not (r[f + "_base"] or "").strip() and (r[f + "_valor"] or "").strip()]
out["fichas_sin_factores"] = Counter((r["tipo_objeto"], r["_fuente"]) for r in filas
                                     if not (r["p_valor"] or "").strip())
out["fichas_sin_factores"] = {f"{k[0]}|{k[1]}": v for k, v in out["fichas_sin_factores"].items()}
out["valores_enum"] = {c: dict(Counter((r.get(c) or "").strip() or "(vacío)" for r in filas))
                       for c in ["tipo_objeto", "actor", "tipo_evaluacion", "motivo", "review_status",
                                 "uncertainty", "evaluable", "banda", "version_metodologia",
                                 "consecuencia_extrema", "safety_critical", "prioridad_provisional"]}

# 3. Las filas de procedencia con base `—` de las fichas de información
guion = []
for p in sorted((V0 / "emi41" / "fichas").glob("S*/*.md")):
    if p.name in ("empresa.md", "transferencia.md"):
        continue
    t = p.read_text(encoding="utf-8")
    m = re.search(r"^## Procedencia por dato\n(.*?)(?=^## |\Z)", t, re.S | re.M)
    if not m:
        continue
    for linea in m.group(1).splitlines():
        c = [x.strip() for x in linea.strip().strip("|").split("|")]
        if not linea.startswith("|") or len(c) < 3 or c[0] == "Dato" or set(c[0]) <= set("-"):
            continue
        b = c[1].split()[0] if c[1] else ""
        if b not in ENUM_BASE:
            guion.append({"ficha": str(p.relative_to(RAIZ)), "risk_id": p.stem, "dato": c[0], "base": c[1],
                          "evidencia": c[2], "que_falta_confirmar": c[3] if len(c) > 3 else ""})
out["procedencia_base_fuera_de_enum_fichas_informacion"] = len(guion)
out["procedencia_guion"] = guion

# 4. Esquemas de evaluacion_id y colisiones
dry = leer([DRY_RUN], "dry-run")
todas = filas + dry
esquemas = defaultdict(Counter)
for r in todas:
    pat = re.sub(r"\d+", "N", r["evaluacion_id"])
    origen = r["_archivo"].split("/")[-2] if r["_fuente"] == "F8-agente" else r["_fuente"]
    esquemas[pat][origen] += 1
rangos = {}
for r in todas:
    origen = r["_archivo"].split("/")[-2] if r["_fuente"] == "F8-agente" else r["_fuente"]
    rangos.setdefault(origen, []).append(r["evaluacion_id"])
out["esquemas_id"] = {k: dict(v) for k, v in esquemas.items()}
out["rangos_id"] = {k: [v[0], v[-1], len(v), len(set(v))] for k, v in rangos.items()}
por_id = defaultdict(list)
for r in todas:
    origen = r["_archivo"].split("/")[-2] if r["_fuente"] == "F8-agente" else r["_fuente"]
    por_id[r["evaluacion_id"]].append((origen, r["risk_id"]))
col_emi = {k: v for k, v in por_id.items() if len([x for x in v if x[0] != "dry-run"]) > 1}
col_todas = {k: v for k, v in por_id.items() if len(v) > 1}
out["colisiones_dentro_emi41"] = len(col_emi)
out["colisiones_con_dry_run"] = len(col_todas)
out["ids_en_tres_fuentes"] = sum(1 for v in col_todas.values() if len(v) == 3)
par = Counter((r["evaluacion_id"], r["risk_id"]) for r in filas)
out["par_evaluacion_risk_unico_emi41"] = all(v == 1 for v in par.values())
ambiguos = set(col_emi)
out["evaluacion_anterior_id_ambiguo"] = [(r["evaluacion_id"], r["risk_id"], r["evaluacion_anterior_id"])
                                         for r in filas if r["evaluacion_anterior_id"] in ambiguos]
risk = Counter(r["risk_id"] for r in todas)
out["risk_id_emi41_distintos"] = len({r["risk_id"] for r in filas})
out["risk_id_dry_run_distintos"] = len({r["risk_id"] for r in dry})
out["risk_id_compartidos_emi41_dry_run"] = len({r["risk_id"] for r in filas} & {r["risk_id"] for r in dry})

with (AQUI / "ids-evaluacion.csv").open("w", encoding="utf-8", newline="") as h:
    w = csv.writer(h)
    w.writerow(["evaluacion_id", "apariciones", "fuentes_y_risk_id"])
    for k, v in sorted(col_todas.items()):
        w.writerow([k, len(v), "; ".join(f"{o}:{rid}" for o, rid in v)])

# 5. accion_* en las fichas del dry run (las únicas con acciones)
out["dry_run_motivos"] = dict(Counter(r["motivo"] or "(vacío)" for r in dry))
out["dry_run_con_accion"] = [(r["evaluacion_id"], r["risk_id"], r["accion_id"], r["accion_efecto"])
                             for r in dry if r["accion_id"]]

(AQUI / "inventario-campos.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({k: out[k] for k in ["huellas_congelamiento_v1", "fichas", "fichas_total",
                                      "columnas_ausentes_en_archivos", "procedencia_base_fuera_de_enum_fichas_informacion",
                                      "esquemas_id", "colisiones_dentro_emi41", "colisiones_con_dry_run",
                                      "ids_en_tres_fuentes", "par_evaluacion_risk_unico_emi41"]},
                 ensure_ascii=False, indent=1))
