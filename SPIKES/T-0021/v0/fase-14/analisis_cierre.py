#!/usr/bin/env python3
"""Fase 14 de T-0021: inventario, mediciones de criterios y cobertura efectiva de EMI-41.

Sólo lee. Escribe `analisis-cierre.json` (mediciones que citan inventario.md y el dossier)
y `cobertura-efectiva.csv` en esta carpeta. Uso: python3 analisis_cierre.py
"""
import csv
import glob
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
V0 = RAIZ / "v0"
EMI = V0 / "emi41"


def leer(p):
    with open(p, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


out = {}

# ===================== 1. Inventario e integridad ==========================
lista = []
for f in sorted(glob.glob(str(EMI / "lista-riesgos-*.csv"))):
    lista += leer(f)
ids = [r["risk_id"] for r in lista]
porrid = {r["risk_id"]: r for r in lista}
fichas = {Path(p).stem: Path(p) for p in glob.glob(str(EMI / "fichas" / "S*" / "S*.md"))}
carpetas = sorted(Path(p).name for p in glob.glob(str(EMI / "fichas" / "S*")))
inv = {
    "filas_lista": len(ids),
    "por_tipo": Counter(r["tipo_objeto"] for r in lista),
    "ids_duplicados": [i for i, c in Counter(ids).items() if c > 1],
    "fila_sin_ficha": [i for i in ids if i not in fichas],
    "ficha_sin_fila": sorted(set(fichas) - set(ids)),
    "carpetas": len(carpetas),
    "carpetas_sin_empresa_md": [c for c in carpetas if not (EMI / "fichas" / c / "empresa.md").exists()],
    "carpetas_sin_transferencia_md": [c for c in carpetas if not (EMI / "fichas" / c / "transferencia.md").exists()],
    "ficha_en_carpeta_ajena": [i for i, p in fichas.items() if p.parent.name != porrid.get(i, {}).get("empresa")],
    "empresa_fuera_de_familia_unica": [],
}
fam_emp = defaultdict(set)
for r in lista:
    fam_emp[r["empresa"]].add(r["familia"])
inv["empresa_fuera_de_familia_unica"] = [e for e, s in fam_emp.items() if len(s) > 1]
por_emp = defaultdict(Counter)
por_fam = defaultdict(Counter)
for r in lista:
    por_emp[r["empresa"]][r["tipo_objeto"]] += 1
    por_fam[r["familia"]][r["tipo_objeto"]] += 1
inv["por_familia"] = {k: dict(v) for k, v in sorted(por_fam.items())}
inv["empresas_por_familia"] = {k: sorted(e for e in fam_emp if k in fam_emp[e]) for k in por_fam}
inv["fichas_por_carpeta_vs_lista"] = {c: [len([i for i, p in fichas.items() if p.parent.name == c]),
                                          sum(por_emp[c].values())] for c in carpetas}
inv["carpetas_con_diferencia"] = [c for c, (a, b) in inv["fichas_por_carpeta_vs_lista"].items() if a != b]
# padres e hijos
hijos = defaultdict(list)
for r in lista:
    if r["riesgo_padre_id"]:
        hijos[r["riesgo_padre_id"]].append(r["risk_id"])
pad = {}
for r in lista:
    if r["tipo_objeto"] == "padre":
        txt = fichas[r["risk_id"]].read_text(encoding="utf-8")
        en_ficha = re.findall(r"^\| (S\d\d-P\d\d-S\d\d) \|", txt, re.M)
        pad[r["risk_id"]] = {"hijos_lista": sorted(hijos[r["risk_id"]]), "hijos_ficha": sorted(en_ficha),
                             "coinciden": sorted(en_ficha) == sorted(hijos[r["risk_id"]]),
                             "hijos_existen": all(h in fichas for h in en_ficha)}
inv["padres"] = pad
inv["sub_riesgo_con_padre_inexistente"] = [r["risk_id"] for r in lista if r["tipo_objeto"] == "sub_riesgo"
                                           and porrid.get(r["riesgo_padre_id"], {}).get("tipo_objeto") != "padre"]
inv["escenarios"] = {r["risk_id"]: {"miembros": r["miembros"],
                                    "miembros_existen": all(m in porrid for m in r["miembros"].split(";"))}
                     for r in lista if r["tipo_objeto"] == "escenario"}

# evaluaciones
ag8 = []
for f in sorted(glob.glob(str(V0 / "fase-8" / "agente" / "*" / "fichas.csv"))):
    ag8 += leer(f)
em8 = leer(V0 / "fase-8" / "emiliano" / "fichas-emiliano.csv")
f11a = leer(V0 / "fase-11" / "reevaluacion" / "fichas-reevaluadas.csv")
f11b = leer(V0 / "fase-11" / "reevaluacion" / "fichas-ronda-2.csv")
f12 = leer(V0 / "fase-12" / "piloto-emiliano" / "etapa-b" / "fichas-emiliano-cerradas.csv")
muestra = leer(V0 / "fase-8" / "sorteo" / "muestra-emiliano.csv")
reg = leer(V0 / "fase-11" / "regresion-emi41.csv")
con_factores = [r["risk_id"] for r in lista if r["tipo_objeto"] != "padre"]
ag8_ids = Counter(r["risk_id"] for r in ag8)
reg_ag = Counter(r["risk_id"] for r in reg if r["evaluador"] == "agente")
reg_em = Counter(r["risk_id"] for r in reg if r["evaluador"] == "emiliano")
inv["evaluaciones"] = {
    "agente_f8_filas": len(ag8), "agente_f8_riesgos_distintos": len(ag8_ids),
    "agente_f8_duplicadas": [i for i, c in ag8_ids.items() if c > 1],
    "con_factores_sin_ficha_agente_f8": [i for i in con_factores if i not in ag8_ids],
    "padres_con_ficha_agente_f8": [i for i in pad if i in ag8_ids],
    "agente_f8_fuera_de_lista": [i for i in ag8_ids if i not in porrid],
    "con_factores_sin_regresion_agente": [i for i in con_factores if i not in reg_ag],
    "regresion_filas": len(reg), "regresion_agente": sum(reg_ag.values()), "regresion_emiliano": sum(reg_em.values()),
    "emiliano_f8": len(em8),
    "emiliano_igual_muestra": sorted(r["risk_id"] for r in em8) == sorted(r["risk_id"] for r in muestra),
    "emiliano_sin_regresion": [r["risk_id"] for r in em8 if r["risk_id"] not in reg_em],
    "f11_fichas": len(f11a) + len(f11b),
    "f12_fichas": len(f12),
    "f12_riesgos": [r["risk_id"] for r in f12],
}
todas = ag8 + em8 + f11a + f11b + f12
# evaluacion_id no es único entre familias de la Fase 8: la clave es (evaluacion_id, risk_id)
porid = {(r["evaluacion_id"], r["risk_id"]): r for r in todas}
dup = Counter(r["evaluacion_id"] for r in todas)
inv["evaluaciones"]["ids_duplicados"] = sorted(i for i, c in dup.items() if c > 1)
inv["evaluaciones"]["ids_duplicados_detalle"] = sorted({(r["evaluacion_id"], r["risk_id"], r["caso_empresa"]) for r in todas if dup[r["evaluacion_id"]] > 1})
inv["evaluaciones"]["clave_id_riesgo_unica"] = len(porid) == len(todas)
inv["evaluaciones"]["review_status"] = {
    "agente_f8": Counter(r["review_status"] for r in ag8), "emiliano_f8": Counter(r["review_status"] for r in em8),
    "f11": Counter(r["review_status"] for r in f11a + f11b), "f12": Counter(r["review_status"] for r in f12)}
inv["evaluaciones"]["f11_no_pending"] = [(r["evaluacion_id"], r["risk_id"], r["review_status"], r["revisado_por"],
                                          r["fecha_revision"], r["evaluacion_anterior_id"])
                                         for r in f11a + f11b if r["review_status"] != "pending"]
# hashes de la intención
hashes = (EMI / "hashes-intencion.md").read_text(encoding="utf-8")
ultimo = {}
for m in re.finditer(r"^\| ([^|]+) \| `(cerrado/emi41/[^`]+)` \| `([0-9a-f]{64})` \| ([^|]+) \|", hashes, re.M):
    ultimo[m.group(2)] = (m.group(3), m.group(4).strip())
inv["hashes_intencion"] = {k: {"publicado": v[0], "fecha": v[1], "recalculado": sha(RAIZ / k),
                               "coincide": sha(RAIZ / k) == v[0]} for k, v in ultimo.items()}
inv["hashes_intencion_lineas_por_familia"] = Counter(m.group(1) for m in re.finditer(
    r"^\| `(cerrado/emi41/[^`]+)`", re.sub(r"^\| [^|]+ \| ", "| ", hashes, flags=re.M), re.M))
# congelamiento v1
cong = (RAIZ / "v1" / "congelamiento.md").read_text(encoding="utf-8")
inv["congelamiento_v1"] = {m.group(1): {"congelado": m.group(2), "actual": sha(RAIZ / m.group(1)),
                                        "coincide": sha(RAIZ / m.group(1)) == m.group(2)}
                           for m in re.finditer(r"^\| `([^`]+)` \| `([0-9a-f]{64})` \|", cong, re.M)}
acept = (V0 / "fase-11" / "aceptacion-fichas-emiliano-2026-10-13.md").read_text(encoding="utf-8")
for m in re.finditer(r"^\| `([^`]+)` \| `[0-9a-f]{64}` \| `([0-9a-f]{64})` \|", acept, re.M):
    if m.group(1) in inv["congelamiento_v1"]:
        inv["congelamiento_v1"][m.group(1)]["tras_aceptacion_2026_10_13"] = m.group(2)
        inv["congelamiento_v1"][m.group(1)]["coincide_tras_aceptacion"] = sha(RAIZ / m.group(1)) == m.group(2)
out["inventario"] = inv

# ===================== 2. Mediciones de criterios ==========================
SEC_R = ["## Riesgo", "### Exposición", "### Antecedentes", "### Precursores", "### Controles preventivos",
         "### Condiciones causales", "### Fuentes disponibles", "### Qué se daña y a quiénes", "### Dinero",
         "### Tiempo sin operar", "### Consecuencias legales", "### Contención", "### Recuperación",
         "## Procedencia por dato", "## Faltantes"]
SEC_E = ["## Dotación", "## Resultados de los tres últimos ejercicios", "## Activos principales",
         "## Funciones críticas", "## Terceros relevantes", "## Marco regulatorio", "## Procedencia de los datos"]


def secciones(txt):
    partes = re.split(r"^(#{2,3} .*)$", txt, flags=re.M)
    d = {}
    for i in range(1, len(partes), 2):
        d[partes[i].strip()] = partes[i + 1].strip()
    return d


def tiene(d, pref):
    return any(k.startswith(pref) and v for k, v in d.items())


med = {}
falt_r = defaultdict(list)
kw_resp = re.compile(r"brigada|respuesta|simulacro|plan de emergencia|evacua|aviso|alarma|parada", re.I)
kw_red = re.compile(r"redundan|respaldo|reserva|alternativ|stock|segund|otra planta|otro sitio|backup|réplica", re.I)
v_resp = v_red = 0
bases = Counter()
sin_ev = 0
filas_proc = 0
fichas_proc_vocab = 0
propias = [i for i in con_factores]
for i in propias:
    d = secciones(fichas[i].read_text(encoding="utf-8"))
    for s in SEC_R:
        alt = {"### Controles preventivos": "### Precursores, controles", "### Condiciones causales": "### Precursores, controles",
               "### Precursores": "### Precursores, controles"}
        if not tiene(d, s) and not (s in alt and tiene(d, alt[s])):
            falt_r[s].append(i)
    vtxt = d.get("### Contención", "") + d.get("### Recuperación", "") + d.get("## Contención y recuperación frente al conjunto", "")
    v_resp += bool(kw_resp.search(vtxt))
    v_red += bool(kw_red.search(vtxt))
    proc = d.get("## Procedencia por dato", "")
    ok = True
    for l in proc.splitlines():
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        if len(c) >= 3 and l.startswith("|") and not set(c[0]) <= set("-") and c[0] != "Dato":
            filas_proc += 1
            b = c[1].split()[0] if c[1] else ""
            bases[b] += 1
            ok &= b in ("observed", "reported", "inferred", "assumed")
            sin_ev += "sin_evidencia" in c[2]
    fichas_proc_vocab += ok and bool(proc)
med["fichas_con_factores"] = len(propias)
med["secciones_faltantes_ficha"] = {k: v for k, v in falt_r.items()}
med["v_menciona_respuesta"] = v_resp
med["v_menciona_redundancia_o_alternativa"] = v_red
med["procedencia_filas"] = filas_proc
med["procedencia_bases"] = bases
med["procedencia_sin_evidencia_explicita"] = sin_ev
med["fichas_procedencia_todo_en_vocabulario"] = fichas_proc_vocab
falt_e = defaultdict(list)
for c in carpetas:
    d = secciones((EMI / "fichas" / c / "empresa.md").read_text(encoding="utf-8"))
    for s in SEC_E:
        if not tiene(d, s):
            falt_e[s].append(c)
med["secciones_faltantes_empresa"] = dict(falt_e)
transf = Counter()
for c in carpetas:
    t = (EMI / "fichas" / c / "transferencia.md").read_text(encoding="utf-8").lower()
    for k in ("límite", "deducible", "exclusi", "no está asegurado"):
        transf[k] += k in t
med["transferencia_menciona"] = transf

# evaluaciones: procedencia e incertidumbre
FACT = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "v_cont", "v_rec"]


def llenado(rows):
    tot = base = evid = 0
    for r in rows:
        for f in FACT:
            if r[f + "_valor"] in ("", "no_aplica"):
                continue
            tot += 1
            base += r[f + "_base"] in ("observed", "reported", "inferred", "assumed")
            evid += bool(r[f + "_evidencia"])
    unc = Counter(r["uncertainty"] for r in rows)
    nota = sum(1 for r in rows if r["uncertainty"] in ("medium", "high") and not r["uncertainty_nota"].strip())
    actor = Counter(r["actor"] for r in rows)
    return {"fichas": len(rows), "factores_con_valor": tot, "con_base_valida": base, "con_evidencia": evid,
            "uncertainty": unc, "medium_high_sin_nota": nota, "actor": actor}


med["evaluaciones_procedencia"] = {"agente_f8": llenado(ag8), "emiliano_f8": llenado(em8),
                                   "f11": llenado(f11a + f11b), "f12": llenado(f12)}

# vigentes con la v1 candidate
vig = {}
for r in reg:
    k = (r["risk_id"], r["evaluador"])
    vig[k] = porid.get((r["evaluacion_nueva"] or r["evaluacion_anterior"], r["risk_id"]))


def unk(r):
    return [f for f in FACT if r and r[f + "_valor"] == "unknown"]


for quien in ("agente", "emiliano"):
    filas = [(k[0], v) for k, v in vig.items() if k[1] == quien and porrid.get(k[0], {}).get("tipo_objeto") != "padre"]
    con_unk = [rid for rid, v in filas if unk(v)]
    no_ev = [rid for rid, v in filas if v and v["evaluable"] == "false"]
    resreg = {r["risk_id"]: r["resultado_nuevo"] for r in reg if r["evaluador"] == quien}
    no_ev_reg = [rid for rid, _ in filas if resreg[rid].startswith("no evaluable")]
    incompletos = []
    for rid, v in filas:
        faltan = [f for f in FACT if not v[f + "_valor"]]
        if faltan:
            incompletos.append((rid, faltan))
    med[f"v1_{quien}"] = {"fichas": len(filas), "faltan_vigentes": [rid for rid, v in filas if not v],
                          "con_algun_unknown": len(con_unk), "factores_unknown": Counter(f for _, v in filas for f in unk(v)),
                          "no_evaluables_ficha": sorted(no_ev), "no_evaluables_regresion": sorted(no_ev_reg),
                          "no_evaluable_sin_motivo": [rid for rid, v in filas if v["evaluable"] == "false" and not v["motivo_no_evaluable"].strip()],
                          "con_unknown_y_evaluable": len([rid for rid, v in filas if unk(v) and rid not in no_ev_reg]),
                          "factores_vacios": incompletos,
                          "evaluables_sin_c_o_banda": [rid for rid, _ in filas if not resreg[rid].startswith("no evaluable")
                                                       and not re.match(r"C \d+ · pos [^·]+ · (Baja|Media|Alta|Crítica)", resreg[rid])],
                          "sin_banderas": [rid for rid, _ in filas if re.search(r"ext= ·|sc= ·", resreg[rid])],
                          "bandas": Counter(re.match(r"C \d+ · pos [^·]+ · (\w+)", resreg[rid]).group(1)
                                            for rid, _ in filas if resreg[rid].startswith("C "))}
med["padres_resultado"] = {r["risk_id"]: r["resultado_nuevo"] for r in reg if porrid[r["risk_id"]]["tipo_objeto"] == "padre"}
out["mediciones"] = med

# ===================== 3. Cobertura efectiva ================================
matriz = leer(EMI / "matriz-cobertura.csv")
ivf = leer(V0 / "fase-8" / "comparacion" / "intencion-vs-fichas.csv")
tags = defaultdict(set)
for r in ivf:
    for c in r["contrastes"].split(";"):
        if c:
            tags[c].add(r["risk_id"])
cont8 = {r["contraste"]: r for r in leer(V0 / "fase-8" / "comparacion" / "contrastes.csv")}
disc = {r["contraste"]: r for r in leer(V0 / "fase-9" / "discriminacion-contrastes.csv")}
difs = leer(V0 / "fase-8" / "comparacion" / "diferencias-intencion.csv")
a1 = leer(V0 / "fase-8" / "comparacion" / "anomalias-a1.csv")
a1 += [{"anomalia_id": r["anomalia_id"], "riesgos_involucrados": r["risk_id"]}
       for r in leer(V0 / "fase-9" / "anomalias-banda.csv") if r["tipo"] == "A1"]
inventario_ev = leer(V0 / "fase-11" / "inventario-evidencia.csv")
anom = []
for f in glob.glob(str(V0 / "fase-8" / "agente" / "*" / "anomalias.csv")):
    anom += leer(f)
anom_por_r = defaultdict(list)
for a in anom:
    for rid in re.split(r"[;, ]+", a["riesgos_involucrados"]):
        anom_por_r[rid].append(a["codigo"])


def expandir(txt):
    res = set()
    for m in re.finditer(r"(S\d\d)-((?:[RPE]\d\d(?:-S\d\d)?)(?:/(?:[RPE]\d\d))*)", txt):
        for parte in m.group(2).split("/"):
            res.add(f"{m.group(1)}-{parte}")
    return res


EV_CH = {"EV-01": "CH-098", "EV-03": "CH-099", "EV-04": "CH-100", "EV-05": "CH-101", "EV-16": "CH-102",
         "EV-18": "CH-103", "EV-29": "CH-105", "EV-30": "CH-106", "EV-32": "CH-107", "EV-43": "CH-108"}
F12_EV = {"EV-02", "EV-06", "EV-37", "EV-08", "EV-10", "EV-11", "EV-20", "EV-22", "EV-24"}
# Tema de cada punto del inventario: a qué contraste se atribuye por lo que el punto discute
# (no por qué riesgos cita). Asignación de la Fase 14, documentada en inventario.md §4.
EV_TEMA = {"EV-01": ["C25"], "EV-02": ["C15"], "EV-03": ["C10", "C18"], "EV-04": ["C20", "C29"],
           "EV-05": ["C33"], "EV-06": ["C05"], "EV-37": ["C05"], "EV-07": ["C11"], "EV-08": ["C01"],
           "EV-10": ["C01"], "EV-14": ["C01"], "EV-16": ["C11"], "EV-19": ["C02"], "EV-20": ["C01", "C02"],
           "EV-23": ["C11"], "EV-26": ["C19"], "EV-29": ["C11"], "EV-30": ["C03"], "EV-31": ["C07", "C08"],
           "EV-32": ["C27"], "EV-33": ["C02"], "EV-35": ["C14", "C35"], "EV-36": ["C13", "C32"],
           "EV-38": ["C12", "C07"], "EV-39": ["C07", "C08"], "EV-40": ["C08"], "EV-41": ["C22"],
           "EV-42": ["C17"], "EV-43": ["C16"], "EV-46": ["C01", "C02"]}
ev_por_r = defaultdict(set)
for e in inventario_ev:
    for rid in expandir(e["fichas_afectadas"]) | expandir(e["punto"]):
        ev_por_r[rid].add(e["id"])
f12_r = {r["risk_id"] for r in f12}
ch_por_r = defaultdict(set)
for r in reg:
    for ch in re.findall(r"CH-\d+", r["fila_changelog"]):
        ch_por_r[r["risk_id"]].add(ch)

# Lo que el piloto de la Fase 12 discutió y que corresponde al tema del contraste (dictamen y registro de S06)
F12_TEMA = {"C08": "Emiliano rechaza que R05 quede sobre R01 y R04 por su mayor vulnerabilidad (V 4 frente a contención parcial)",
            "C09": "I-económico satura en 5 con el RO de una PyME: R01 y R05 empatan en nivel con montos muy distintos",
            "C21": "sin margen de contribución, el revisor acota la pérdida entre piso de margen operativo y ventas perdidas"}
filas_cob = []
for row in matriz:
    c = row["contraste"]
    dire = {s for s in row if re.fullmatch(r"S\d\d", s) and row[s] == "directo"}
    rs = tags.get(c, set())
    r_dir = sorted(r for r in rs if porrid[r]["empresa"] in dire)
    r_cos = sorted(r for r in rs if porrid[r]["empresa"] not in dire)
    propios, fu = [], set()
    tema = sorted((e for e, cs in EV_TEMA.items() if c in cs), key=lambda x: int(x[3:]))
    if tema:
        txt = []
        for e in tema:
            t = e + (f" ({EV_CH[e]})" if e in EV_CH else "") + (" [pregunta de la Fase 12]" if e in F12_EV else "")
            txt.append(t)
        propios.append("puntos del inventario sobre este contraste: " + ", ".join(txt))
        fu |= {"v0/fase-11/inventario-evidencia.csv"}
        if any(e in EV_CH for e in tema):
            fu.add("v0/changelog-metodologia.md")
        if any(e in F12_EV for e in tema):
            fu.add("v1/metodologia-v1-candidate.md §16")
    if c in cont8 and cont8[c]["chequeo"]:
        n, d = cont8[c]["chequeo_resultado"].split("/")
        if n != d:
            propios.append(f"chequeo propio de la 8c no cumplido en todos: «{cont8[c]['chequeo']}» {cont8[c]['chequeo_resultado']}")
            fu.add("v0/fase-8/comparacion/contrastes.csv")
    if c in disc and int(disc[c]["agente_misma_banda_E"] or 0):
        propios.append(f"pares que la intención separa y la banda junta: {disc[c]['agente_misma_banda_E']} de {disc[c]['pares_intencion_distinta_E']}")
        fu.add("v0/fase-9/discriminacion-contrastes.csv")
    if rs & f12_r and c in F12_TEMA:
        propios.append(f"piloto de la Fase 12 ({', '.join(sorted(rs & f12_r))}): {F12_TEMA[c]}")
        fu |= {"v0/fase-12/piloto-emiliano/dictamen-profesional-emiliano.md", "v0/fase-12/piloto-emiliano/etapa-b/registro.md"}
    # lo que aparece en sus riesgos sin que el contraste sea necesariamente la causa
    co = []
    a1c = sorted({a["anomalia_id"] for a in a1 if expandir(a["riesgos_involucrados"]) & rs})
    if a1c:
        co.append(f"A1 {len(a1c)}")
        fu |= {"v0/fase-8/comparacion/anomalias-a1.csv", "v0/fase-9/anomalias-banda.csv"}
    dv = [d for d in difs if d["risk_id"] in rs and d["tipo"] in ("más de 1", "estado")]
    if dv:
        co.append(f"divergencias con la intención de más de un nivel o de estado {len(dv)}")
        fu.add("v0/fase-8/comparacion/diferencias-intencion.csv")
    chs = set()
    for r in rs:
        chs |= ch_por_r[r]
    if chs:
        co.append("cambios de resultado con la v1 por " + ", ".join(sorted(chs)))
        fu.add("v0/fase-11/regresion-emi41.csv")
    an = Counter(code for r in rs for code in anom_por_r[r])
    if an:
        co.append(f"anomalías del agente {sum(an.values())} ({', '.join(f'{k} {v}' for k, v in an.most_common(4))}…)")
    if rs & f12_r and c not in F12_TEMA:
        co.append(f"usados en el piloto de la Fase 12: {', '.join(sorted(rs & f12_r))}")
    if c in cont8 and cont8[c]["chequeo"] and not any(x.startswith("chequeo") for x in propios):
        co.append(f"chequeo de la 8c cumplido: {cont8[c]['chequeo_resultado']}")
    h = ("PROPIOS: " + "; ".join(propios) if propios else "PROPIOS: ninguno") + " | EN SUS RIESGOS: " + ("; ".join(co) or "nada")
    if propios:
        dic = "tensionó"
    elif len(rs) <= 3:
        dic = "cobertura insuficiente"
    else:
        dic = "cubierto sin hallazgo"
    filas_cob.append({"contraste": c, "nombre": row["nombre"].replace("\n", " "), "riesgos_directo": len(r_dir),
                      "riesgos_costado": len(r_cos), "hallazgos": h, "fuentes": "; ".join(sorted(fu)), "dictamen": dic})
with open(AQUI / "cobertura-efectiva.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(filas_cob[0]), lineterminator="\n")
    w.writeheader()
    w.writerows(filas_cob)
out["cobertura"] = Counter(r["dictamen"] for r in filas_cob)

# empresas sin aporte distinguible después de la Fase 8
cita = defaultdict(set)
for r in lista:
    rid = r["risk_id"]
    s = r["empresa"]
    if ev_por_r[rid]:
        cita[s].add("inventario")
    if ch_por_r[rid]:
        cita[s].add("changelog")
    if any(expandir(a["riesgos_involucrados"]) & {rid} for a in a1):
        cita[s].add("A1")
    if rid in f12_r:
        cita[s].add("fase12")
for e in inventario_ev:
    for s in re.findall(r"\b(S\d\d)\b(?!-)", e["fichas_afectadas"]):
        cita[s].add("inventario")
unico = defaultdict(list)
for row in matriz:
    dire = [s for s in row if re.fullmatch(r"S\d\d", s) and row[s] == "directo"]
    if len(dire) == 1:
        unico[dire[0]].append(row["contraste"])
out["empresas_sin_aporte_distinguible"] = sorted(s for s in carpetas if not cita[s] and not unico[s])
out["empresas_citas"] = {s: sorted(cita[s]) for s in carpetas}
out["empresas_unico_directo"] = dict(unico)

with open(AQUI / "analisis-cierre.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1, default=lambda o: dict(o) if isinstance(o, Counter) else str(o))
print(json.dumps({"cobertura": out["cobertura"], "sin_aporte": out["empresas_sin_aporte_distinguible"]}, ensure_ascii=False))
