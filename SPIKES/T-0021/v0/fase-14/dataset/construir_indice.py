#!/usr/bin/env python3
"""Regenera indice-empresas.csv e indice-riesgos.csv del dataset sintético de EMI-41.

Fase 14 de T-0021. Lee sólo archivos del experimento; no copia ni modifica fichas.
Uso, desde cualquier carpeta:  python3 construir_indice.py
RAIZ es la carpeta T-0021 (tres niveles arriba de este archivo).
"""
import csv
import glob
import os
import re
from collections import defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
V0 = RAIZ / "v0"


def leer(p):
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def rel(p):
    return os.path.relpath(p, RAIZ)


# --- listas fijas y fichas -------------------------------------------------
lista = []
for f in sorted(glob.glob(str(V0 / "emi41" / "lista-riesgos-*.csv"))):
    lista += leer(f)
fichas = {Path(p).stem: Path(p) for p in glob.glob(str(V0 / "emi41" / "fichas" / "S*" / "S*.md"))}

hijos = defaultdict(list)
for r in lista:
    if r["riesgo_padre_id"]:
        hijos[r["riesgo_padre_id"]].append(r["risk_id"])

# --- empresas: resumen de cobertura §3.1 y matriz --------------------------
cob = (V0 / "emi41" / "cobertura-empresas.md").read_text(encoding="utf-8")
empresas = {}
for m in re.finditer(r"^\| (S\d\d) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (\d+) \|", cob, re.M):
    empresas[m.group(1)] = {"nombre": m.group(2).strip(), "arquetipo": m.group(3).strip(),
                            "familia": m.group(4).strip()}
matriz = leer(V0 / "emi41" / "matriz-cobertura.csv")
cont_emp = defaultdict(lambda: {"directo": [], "costado": []})
for row in matriz:
    for s in empresas:
        v = (row.get(s) or "").strip()
        if v in ("directo", "costado"):
            cont_emp[s][v].append(row["contraste"])


def tamano(s):
    txt = (V0 / "emi41" / "fichas" / s / "empresa.md").read_text(encoding="utf-8")
    dot = ""
    m = re.search(r"## Dotación\s*\n+(.+)", txt)
    if m:
        dot = m.group(1).strip()
        dot = re.split(r"(?<=\.)\s", dot)[0]
    ro = ""
    sec = re.search(r"## Resultados de los tres últimos ejercicios cerrados(.*?)\n## ", txt, re.S)
    if sec:
        filas = [l for l in sec.group(1).splitlines() if re.match(r"\| 20\d\d \|", l)]
        if filas:
            enc = [l for l in sec.group(1).splitlines() if l.startswith("| Ejercicio")][0]
            cols = [c.strip() for c in enc.strip("|").split("|")]
            i = next(k for k, c in enumerate(cols) if "RO" in c)
            ult = [c.strip() for c in filas[-1].strip("|").split("|")]
            ro = f"{ult[0]}: {ult[i]}"
    return dot, ro


# --- evaluaciones ----------------------------------------------------------
FUENTES = [("8", "agente", f) for f in sorted(glob.glob(str(V0 / "fase-8" / "agente" / "*" / "fichas.csv")))]
FUENTES += [("8", "emiliano", str(V0 / "fase-8" / "emiliano" / "fichas-emiliano.csv")),
            ("11", "agente-11b", str(V0 / "fase-11" / "reevaluacion" / "fichas-reevaluadas.csv")),
            ("11", "agente-11b", str(V0 / "fase-11" / "reevaluacion" / "fichas-ronda-2.csv")),
            ("12", "emiliano", str(V0 / "fase-12" / "piloto-emiliano" / "etapa-b" / "fichas-emiliano-cerradas.csv"))]
evals = defaultdict(list)
porid = {}
for fase, quien, f in FUENTES:
    for r in leer(f):
        r["_fuente"] = rel(f)
        evals[r["risk_id"]].append(r)
        # evaluacion_id se repite entre familias de la Fase 8 (agro y servicios): la clave es (id, riesgo)
        porid[(r["evaluacion_id"], r["risk_id"])] = r

muestra = {r["risk_id"] for r in leer(V0 / "fase-8" / "sorteo" / "muestra-emiliano.csv")}
intencion = {r["risk_id"]: r["contrastes"] for r in leer(V0 / "fase-8" / "comparacion" / "intencion-vs-fichas.csv")}

# --- resultado con la v1 candidate (F11-REG-01) ----------------------------
reg = leer(V0 / "fase-11" / "regresion-emi41.csv")


def parsear(res):
    out = {"c_raw": "", "banda": "", "evaluable": "", "consecuencia_extrema": "", "safety_critical": ""}
    if res.startswith("no evaluable"):
        out["evaluable"] = "false"
    else:
        m = re.match(r"C (\d+) · pos [^·]+ · ([^·]+) ·", res)
        if m:
            out.update(c_raw=m.group(1), banda=m.group(2).strip(), evaluable="true")
    m = re.search(r"ext=(\w*)", res)
    out["consecuencia_extrema"] = m.group(1) if m else ""
    m = re.search(r"sc=(\w*)", res)
    out["safety_critical"] = m.group(1) if m else ""
    return out


v1 = {}
for r in reg:
    clave = (r["risk_id"], "agente" if r["evaluador"] == "agente" else "emiliano")
    vig = r["evaluacion_nueva"] or r["evaluacion_anterior"]
    d = parsear(r["resultado_nuevo"])
    ficha = porid.get((vig, r["risk_id"]), {})
    d["evaluacion_vigente"] = vig
    d["motivo_no_evaluable"] = ficha.get("motivo_no_evaluable", "") if d["evaluable"] == "false" else ""
    d["review_status"] = ficha.get("review_status", "")
    v1[clave] = d

# --- índice de riesgos -----------------------------------------------------
CAMPOS_R = ["risk_id", "empresa", "familia", "tipo_objeto", "riesgo_padre_id", "miembros", "titulo",
            "ruta_ficha", "contrastes_intencion", "evaluaciones",
            "v1_agente_evaluacion", "v1_agente_c_raw", "v1_agente_banda", "v1_agente_evaluable",
            "v1_agente_consecuencia_extrema", "v1_agente_safety_critical", "v1_agente_motivo_no_evaluable",
            "en_muestra_emiliano", "v1_emiliano_evaluacion", "v1_emiliano_c_raw", "v1_emiliano_banda",
            "v1_emiliano_evaluable", "en_fase_12", "review_status_vigente", "propuestas_sobre_ficha_emiliano"]


def orden(e):
    return (int(e["fase"]), e["evaluacion_id"])


filas_r = []
for r in lista:
    rid = r["risk_id"]
    ev = sorted(evals.get(rid, []), key=orden)
    a = v1.get((rid, "agente"), {})
    e = v1.get((rid, "emiliano"), {})
    miembros = r["miembros"] or (";".join(hijos[rid]) if r["tipo_objeto"] == "padre" else "")
    props = [f"{x['evaluacion_id']} ({x['review_status']}"
             + (f", {x['revisado_por']} {x['fecha_revision']})" if x["review_status"] != "pending" else ")")
             for x in ev if x["fase"] == "11" and porid.get((x["evaluacion_anterior_id"], rid), {}).get("actor") == "human"]
    rs = [f"agente:{a.get('review_status', '')}"]
    if e:
        rs.append(f"emiliano:{e.get('review_status', '')}")
    filas_r.append({
        "risk_id": rid, "empresa": r["empresa"], "familia": r["familia"], "tipo_objeto": r["tipo_objeto"],
        "riesgo_padre_id": r["riesgo_padre_id"], "miembros": miembros, "titulo": r["titulo"],
        "ruta_ficha": rel(fichas[rid]) if rid in fichas else "",
        "contrastes_intencion": intencion.get(rid, ""),
        "evaluaciones": ";".join(x["evaluacion_id"] for x in ev),
        "v1_agente_evaluacion": a.get("evaluacion_vigente", ""), "v1_agente_c_raw": a.get("c_raw", ""),
        "v1_agente_banda": a.get("banda", ""), "v1_agente_evaluable": a.get("evaluable", ""),
        "v1_agente_consecuencia_extrema": a.get("consecuencia_extrema", ""),
        "v1_agente_safety_critical": a.get("safety_critical", ""),
        "v1_agente_motivo_no_evaluable": a.get("motivo_no_evaluable", ""),
        "en_muestra_emiliano": "true" if rid in muestra else "false",
        "v1_emiliano_evaluacion": e.get("evaluacion_vigente", ""), "v1_emiliano_c_raw": e.get("c_raw", ""),
        "v1_emiliano_banda": e.get("banda", ""), "v1_emiliano_evaluable": e.get("evaluable", ""),
        "en_fase_12": "true" if any(x["fase"] == "12" for x in ev) else "false",
        "review_status_vigente": ";".join(rs),
        "propuestas_sobre_ficha_emiliano": "; ".join(props),
    })

# --- índice de empresas ----------------------------------------------------
CAMPOS_E = ["empresa", "nombre", "arquetipo", "familia", "dotacion", "ro_ultimo_ejercicio",
            "contrastes_directo", "contrastes_costado", "riesgos", "sub_riesgos", "padres", "escenarios",
            "fichas_con_factores", "ruta"]
filas_e = []
for s in sorted(empresas):
    tipos = defaultdict(int)
    for r in lista:
        if r["empresa"] == s:
            tipos[r["tipo_objeto"]] += 1
    dot, ro = tamano(s)
    filas_e.append({
        "empresa": s, **empresas[s], "dotacion": dot, "ro_ultimo_ejercicio": ro,
        "contrastes_directo": ";".join(cont_emp[s]["directo"]),
        "contrastes_costado": ";".join(cont_emp[s]["costado"]),
        "riesgos": tipos["riesgo"], "sub_riesgos": tipos["sub_riesgo"], "padres": tipos["padre"],
        "escenarios": tipos["escenario"],
        "fichas_con_factores": tipos["riesgo"] + tipos["sub_riesgo"] + tipos["escenario"],
        "ruta": rel(V0 / "emi41" / "fichas" / s),
    })


def escribir(p, campos, filas):
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos, lineterminator="\n")
        w.writeheader()
        w.writerows(filas)


escribir(AQUI / "indice-riesgos.csv", CAMPOS_R, filas_r)
escribir(AQUI / "indice-empresas.csv", CAMPOS_E, filas_e)
print(f"indice-empresas.csv: {len(filas_e)} filas; indice-riesgos.csv: {len(filas_r)} filas")
