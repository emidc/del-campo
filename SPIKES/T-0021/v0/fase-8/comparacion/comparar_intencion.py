#!/usr/bin/env python3
"""Fase 8c, paso 4 · intención de diseño (escrita con metodologia v0.1) frente a las fichas (v0.2).

Lee los siete `cerrado/emi41/intencion-*.md`, extrae por riesgo los niveles pretendidos,
los contrastes que menciona, las anomalías esperadas y la evaluabilidad pretendida, y los
compara con las 252 fichas con factores del agente y con las 30 de Emiliano.

Escribe en la carpeta de este script:
- `intencion-vs-fichas.csv`: una fila por ficha del agente con factores (252).
- `diferencias-intencion.csv`: una fila por factor que difiere de lo pretendido, con la
  regla de v0.1 → v0.2 que podría explicarlo (candidata, por factor y por texto).
- `contrastes.csv`: por contraste C01–C35, qué riesgos lo mencionan y cómo salió.
- `pares-d14.csv`: los pares que la intención marcó como prueba del producto (A8 "si queda
  arriba de …") y el orden D10 que les dan las fichas del agente y, si están, las de Emiliano.

La extracción es por texto. Imprime los factores que no encontró; los que se fijan a mano
están en MANUAL con su motivo. Las clasificaciones son candidatas, no adjudicaciones.
Uso: python3 comparar_intencion.py [RAIZ]
"""
import csv
import glob
import math
import os
import re
import sys
from collections import defaultdict

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
F8 = os.path.join(RAIZ, "v0", "fase-8")

FACT = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "v_cont", "v_rec"]
DIMS = ["econ", "pers", "cont", "legal"]
ETIQ = {
    "p": r"P",
    "i_econ": r"(?:Ie|I-econ|Iecon)",
    "i_pers": r"(?:Ip|I-pers|Ipers)",
    "i_cont": r"(?:Ic|I-cont|Icont)",
    "i_legal": r"(?:Il|I-legal|Ilegal)",
    "v_cont": r"(?:Vc|Cont\.?|[Cc]ontención|V-cont|Vcont)",
    "v_rec": r"(?:Vr|Rec\.?|[Rr]ecuperación|V-rec|Vrec)",
}
VAL = r"\**`?(unknown|no_aplica|no aplica|[1-5])`?\**(?:\s*\((?:rango\s*)?([1-5])\s*[–-]\s*([1-5])(?!\d))?"
LINEA_NIVELES = re.compile(
    r"^-\s*(?:\*\*)?(?:Pretendido|Niveles(?: pretendidos)?)\b"
    r"|^-\s*(?:\*\*)?(?:P|Iecon|Ipers|Icont|Ilegal|Vcont|Vrec)\s+[`\d(u*]")
# Factores que la extracción no puede leer por la redacción; el valor sale del texto citado.
MANUAL = {
    ("S33-R06", "i_cont"): ("4", None, None),  # "I-cont: por la letra de §4.4, 4 (degradación > 3 meses)"
}

# Regla de v0.1 a v0.2 que puede mover cada factor (changelog CH-080 a CH-085).
REGLA_FACTOR = {
    "p": ("CH-084", r"precursor|condici[oó]n causal|condici[oó]n|§ ?3\.4|36 meses|F5-4A|ajuste"),
    "v_cont": ("CH-081/CH-085", r"barrera|pasiv|no llega a detenerse|sin corte|redundan|F5-2|F5-4B|transferencia autom"),
    "v_rec": ("CH-081/CH-085", r"formal|planta hermana|contratad|escrit|F5-4B|F5-2|redundan|no llega a detenerse"),
}


def bloques():
    for path in sorted(glob.glob(os.path.join(RAIZ, "cerrado", "emi41", "intencion-*.md"))):
        fam = os.path.basename(path)[len("intencion-"):-3]
        rid, buf = None, []
        for line in open(path, encoding="utf-8"):
            m = re.match(r"^###\s+(S\d\d-[A-Z]\d\d(?:-S\d\d)?)\b", line)
            if m or line.startswith("## ") or line.startswith("# "):
                if rid:
                    yield fam, rid, buf
                rid, buf = (m.group(1) if m else None), ([line] if m else [])
            elif rid:
                buf.append(line)
        if rid:
            yield fam, rid, buf


def parse(rid, buf):
    texto = "".join(buf)
    niveles = " ".join(l.strip() for l in buf if LINEA_NIVELES.search(l.strip()))
    out = {}
    for f in FACT:
        if (rid, f) in MANUAL:
            out[f] = MANUAL[(rid, f)]
            continue
        m = re.search(r"(?<![\w-])" + ETIQ[f] + r"\s*:?\s*" + VAL, niveles)
        if m:
            out[f] = (m.group(1).replace("no aplica", "no_aplica"), m.group(2), m.group(3))
    anom = " ".join(l for l in buf if re.search(r"^-\s*(?:\*\*)?Anomal", l.strip()))
    esperadas = sorted(set(re.findall(r"\bA ?(\d{1,2})\b", anom)), key=int)
    contr = sorted(set(re.findall(r"\bC(\d\d)\b", texto)))
    evtxt = " ".join(l for l in buf if re.search(r"Evaluabilidad|Consecuencia buscada|→ \*\*no evaluable", l))
    no_eval_txt = bool(re.search(r"no evaluable", evtxt, re.I)) and not re.search(r"→ \*\*evaluable\*\*", evtxt)
    return out, ["A" + a for a in esperadas], ["C" + c for c in contr], no_eval_txt


def leer_csv(p):
    with open(p, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def num(v):
    return int(v) if v in ("1", "2", "3", "4", "5") else None


def v_d(dim, vc, vr, regla):
    """V por dimensión. v0.1: el peor de los aspectos que actúan (CH-081 'antes'). v0.2: secuencial."""
    if dim in ("pers", "legal") or vr is None:
        return vc
    if regla == "v0.1":
        return max(vc, vr)
    if dim == "cont":
        return min(vc, vr)
    return min(vc, math.ceil((vc + vr) / 2))


def criticidad(fs, regla):
    """fs: factor -> (valor_str, max_int|None). Devuelve (evaluable, c_raw|None) por §9.3."""
    def val(f, cota):
        v, mx = fs[f]
        if v == "no_aplica":
            return None, True
        if num(v) is not None:
            return num(v), True
        return (mx or 5) if cota else None, False

    p, pok = val("p", False)
    if not pok:
        return False, None
    conocidas, cotas = [], []
    vc_v, vc_ok = val("v_cont", False)
    vr_v, vr_ok = val("v_rec", False)
    vc_c, _ = val("v_cont", True)
    vr_c, _ = val("v_rec", True)
    for d in DIMS:
        i_v, i_ok = val("i_" + d, False)
        usa_rec = d in ("econ", "cont") and fs["v_rec"][0] != "no_aplica"
        ok = i_ok and vc_ok and (vr_ok or not usa_rec)
        if ok:
            conocidas.append(p * i_v * v_d(d, vc_v, vr_v if usa_rec else None, regla))
        else:
            i_c, _ = val("i_" + d, True)
            cotas.append(p * i_c * v_d(d, vc_c, vr_c if usa_rec else None, regla))
    if not conocidas:
        return False, None
    c = max(conocidas)
    return (all(x <= c for x in cotas)), c


def orden_d10(x, y):
    """D10 (metodología §7.2) dentro de una empresa: '>' x antes, '<' y antes, '=' empate, '?' indeterminado.
    Banda vacía hasta la Fase 9. Un riesgo no evaluable no tiene posición: 'n/e'."""
    if x["evaluable"] != "true" or y["evaluable"] != "true":
        return "n/e"
    cx, cy = int(x["c_raw"]), int(y["c_raw"])
    if cx != cy:
        return ">" if cx > cy else "<"
    for f in ("i_efectivo", "i_pers"):
        rx = x["i_efectivo"] if f == "i_efectivo" else x["i_pers_valor"]
        ry = y["i_efectivo"] if f == "i_efectivo" else y["i_pers_valor"]
        vx, vy = num(rx), num(ry)
        if vx is not None and vy is not None:
            if vx != vy:
                return ">" if vx > vy else "<"
            continue
        cx_ = re.match(r"^≥\s*(\d)$", rx)
        cy_ = re.match(r"^≥\s*(\d)$", ry)
        if cx_ and vy is not None and vy < int(cx_.group(1)):
            return ">"
        if cy_ and vx is not None and vx < int(cy_.group(1)):
            return "<"
        return "?"
    return "="


def pares_producto(bloques_txt, ag, em):
    """Pares que la intención marcó con A8 'si queda arriba/por encima de …'."""
    filas = []
    for rid, texto in bloques_txt.items():
        for frase in re.findall(r"A8[^.;]*?(?:arriba|encima)[^.;]*", texto):
            emp = rid[:3]
            mismos = [k for k in ag if k.startswith(emp + "-") and ag[k]["tipo_objeto"] in ("riesgo", "sub_riesgo") and k != rid]
            explicitos = [emp + "-" + r for r in re.findall(r"\b(R\d\d)\b", frase)]
            if explicitos:
                otros, criterio = explicitos, "explícito"
            elif re.search(r"[Pp]ersonas|seguridad", frase):
                otros, criterio = [k for k in mismos if (num(ag[k]["i_pers_valor"]) or 0) >= 4], "I-pers ≥ 4 en la ficha del agente"
            elif re.search(r"graves", frase):
                otros = [k for k in mismos if "true" in (ag[k]["consecuencia_extrema"], ag[k]["safety_critical"])]
                criterio = "con bandera en la ficha del agente"
            elif "descontrol" in frase:
                otros, criterio = [emp + "-R01"], "explícito (descontrol = R01)"
            else:
                continue
            for o in otros:
                if o not in ag:
                    continue
                oa = orden_d10(ag[rid], ag[o])
                oe = orden_d10(em[rid], em[o]) if rid in em and o in em else ""
                filas.append(dict(riesgo_frecuente=rid, riesgo_grave=o, criterio=criterio, frase_intencion=frase.strip(),
                                  orden_agente=oa, a8_en_agente=oa == ">", orden_emiliano=oe,
                                  a8_en_emiliano=(oe == ">") if oe else ""))
    return filas


def main():
    ag = {}
    for path in glob.glob(os.path.join(F8, "agente", "*", "fichas.csv")):
        for r in leer_csv(path):
            ag[r["risk_id"]] = r
    em = {r["risk_id"]: r for r in leer_csv(os.path.join(F8, "emiliano", "fichas-emiliano.csv"))}
    an_ag = defaultdict(set)
    for path in glob.glob(os.path.join(F8, "agente", "*", "anomalias.csv")):
        for r in leer_csv(path):
            for rid in r["riesgos_involucrados"].split(";"):
                an_ag[rid.strip()].add(r["codigo"])
    # Anomalías de Emiliano: secciones "### AN-F8-NNN — Sxx-Ryy" de sus notas, con "A 7", "A 6"…
    an_em = defaultdict(set)
    notas = open(os.path.join(F8, "emiliano", "notas-emiliano.md"), encoding="utf-8").read()
    for rid, cuerpo in re.findall(r"### AN-F8-\d+ — (S\d\d-R\d\d)\n(.*?)(?=\n### |\Z)", notas, re.S):
        an_em[rid] |= {"A" + c for c in re.findall(r"\bA ?(\d{1,2})\b", cuerpo)}

    filas, difs, faltan = [], [], []
    por_contraste = defaultdict(list)
    contr_padre, bloques_txt = {}, {}
    for fam, rid, buf in bloques():
        bloques_txt[rid] = "".join(buf)
        if rid not in ag:
            continue
        niv, esperadas, contr, no_eval_txt = parse(rid, buf)
        if ag[rid]["tipo_objeto"] == "padre":
            contr_padre[rid] = contr  # los sub-riesgos heredan los contrastes del padre
            continue
        contr = sorted(set(contr) | set(contr_padre.get(rid[:7], [])))
        faltan += [f"{rid}:{f}" for f in FACT if f not in niv]
        a, e = ag[rid], em.get(rid)
        fs_int = {f: (niv.get(f, ("unknown", None, None))[0],
                      int(niv[f][2]) if f in niv and niv[f][2] else None) for f in FACT}
        ev01, c01 = criticidad(fs_int, "v0.1")
        ev02, c02 = criticidad(fs_int, "v0.2")
        row = dict(risk_id=rid, familia=fam, tipo_objeto=a["tipo_objeto"], contrastes=";".join(contr),
                   anomalias_esperadas=";".join(esperadas), anomalias_agente=";".join(sorted(an_ag.get(rid, []))),
                   anomalias_emiliano=";".join(sorted(an_em.get(rid, []), key=lambda x: int(x[1:]))) if e else "",
                   no_evaluable_segun_texto=no_eval_txt,
                   evaluable_int_v01=ev01, c_raw_int_v01=c01 or "", evaluable_int_v02=ev02, c_raw_int_v02=c02 or "",
                   evaluable_agente=a["evaluable"], c_raw_agente=a["c_raw"],
                   evaluable_emiliano=e["evaluable"] if e else "", c_raw_emiliano=e["c_raw"] if e else "")
        for f in FACT:
            vi = niv.get(f, ("", None, None))
            row[f + "_int"] = vi[0]
            row[f + "_int_rango"] = f"{vi[1]}-{vi[2]}" if vi[1] else ""
            row[f + "_ag"] = a[f + "_valor"]
            row[f + "_em"] = e[f + "_valor"] if e else ""
            for quien, ficha in (("agente", a), ("emiliano", e)):
                if ficha is None or not vi[0]:
                    continue
                vq = ficha[f + "_valor"]
                if vq == vi[0]:
                    continue
                ni, nq = num(vi[0]), num(vq)
                if ni is not None and nq is not None:
                    tipo = "±1" if abs(ni - nq) == 1 else "más de 1"
                else:
                    tipo = "estado"  # valor / unknown / no_aplica
                obs = ficha[f + "_observacion"]
                if tipo == "estado" and "unknown" in (vi[0], vq) and f.startswith("i_"):
                    regla = "CH-080 (candidata)"
                elif tipo == "estado" and "no_aplica" in (vi[0], vq):
                    regla = "ninguna (no_aplica no cambió)"
                elif f in REGLA_FACTOR and re.search(REGLA_FACTOR[f][1], obs, re.I):
                    regla = REGLA_FACTOR[f][0] + " (candidata)"
                else:
                    regla = "ninguna"
                difs.append(dict(risk_id=rid, familia=fam, evaluador=quien, factor=f, pretendido=vi[0],
                                 rango_pretendido=row[f + "_int_rango"], evaluado=vq, tipo=tipo,
                                 regla_v01_v02=regla, observacion=obs))
        filas.append(row)
        for c in contr:
            por_contraste[c].append(row)

    # ---------- contrastes ----------
    def dentro(row, quien="ag"):
        ok = n = 0
        for f in FACT:
            vi, vq = num(row[f + "_int"]), num(row[f + "_" + quien])
            if vi is not None and vq is not None:
                n += 1
                ok += abs(vi - vq) <= 1
        return ok, n

    chequeos = {
        "C01": ("bandera (extrema o safety) en riesgos con I pretendido 5 o I-pers ≥ 4",
                lambda r: (num(r["i_pers_int"]) or 0) >= 4 or "5" in [r[f"i_{d}_int"] for d in DIMS],
                lambda r: ag[r["risk_id"]]["consecuencia_extrema"] == "true" or ag[r["risk_id"]]["safety_critical"] == "true"),
        "C03": ("safety_critical donde I-pers pretendido ≥ 4",
                lambda r: (num(r["i_pers_int"]) or 0) >= 4,
                lambda r: ag[r["risk_id"]]["safety_critical"] == "true"),
        "C11": ("misma evaluabilidad que la pretendida (v0.2 sobre niveles pretendidos)",
                lambda r: True,
                lambda r: str(r["evaluable_int_v02"]).lower() == r["evaluable_agente"]),
        "C15": ("I-econ unknown o anomalía A6 (magnitud de referencia)",
                lambda r: True,
                lambda r: r["i_econ_ag"] == "unknown" or "A6" in r["anomalias_agente"]),
        "C16": ("sub-riesgo evaluado completo (no hay padre con factores)",
                lambda r: r["tipo_objeto"] == "sub_riesgo",
                lambda r: num(r["p_ag"]) is not None),
        "C17": ("escenario evaluado como ficha propia",
                lambda r: r["tipo_objeto"] == "escenario",
                lambda r: True),
        "C19": ("sin consecuencia_extrema en riesgos corrientes (I pretendido < 5)",
                lambda r: "5" not in [r[f"i_{d}_int"] for d in DIMS],
                lambda r: ag[r["risk_id"]]["consecuencia_extrema"] != "true"),
        "C20": ("P con rango registrado",
                lambda r: True,
                lambda r: ag[r["risk_id"]]["p_min"] != "" and ag[r["risk_id"]]["p_min"] != ag[r["risk_id"]]["p_max"]),
        "C21": ("I-econ con rango o unknown",
                lambda r: True,
                lambda r: r["i_econ_ag"] == "unknown" or (ag[r["risk_id"]]["i_econ_min"] != ag[r["risk_id"]]["i_econ_max"])),
        "C22": ("recuperación no_aplica donde se pretendía",
                lambda r: r["v_rec_int"] == "no_aplica",
                lambda r: r["v_rec_ag"] == "no_aplica"),
        "C33": ("I-continuidad como la pretendida (redundancia natural: perder una unidad de muchas)",
                lambda r: True,
                lambda r: r["i_cont_ag"] == r["i_cont_int"]),
        "C25": ("A7 registrada donde se esperaba",
                lambda r: "A7" in r["anomalias_esperadas"].split(";"),
                lambda r: "A7" in r["anomalias_agente"].split(";")),
    }
    crows = []
    for c in ["C%02d" % i for i in range(1, 36)]:
        rs = por_contraste.get(c, [])
        ok = n = 0
        for r in rs:
            o, k = dentro(r)
            ok += o
            n += k
        # A1 (divergencia entre evaluadores) no puede aparecer en el registro de un solo evaluador: se excluye.
        esp_r = [set(x for x in r["anomalias_esperadas"].split(";") if x and x != "A1") for r in rs]
        esp = sum(len(e) for e in esp_r)
        apar = sum(len(e & set(r["anomalias_agente"].split(";"))) for e, r in zip(esp_r, rs))
        ev_ok = sum(str(r["evaluable_int_v02"]).lower() == r["evaluable_agente"] for r in rs)
        fila = dict(contraste=c, riesgos=len(rs), ids=";".join(r["risk_id"] for r in rs),
                    factores_dentro_pm1=f"{ok}/{n}", pct_factores_pm1=round(100 * ok / n, 1) if n else "",
                    evaluabilidad_como_pretendida=f"{ev_ok}/{len(rs)}",
                    anomalias_esperadas_aparecidas_sin_a1=f"{apar}/{esp}",
                    chequeo="", chequeo_resultado="")
        if c in chequeos:
            desc, aplica, cumple = chequeos[c]
            rr = [r for r in rs if aplica(r)]
            fila["chequeo"] = desc
            fila["chequeo_resultado"] = f"{sum(bool(cumple(r)) for r in rr)}/{len(rr)}"
        crows.append(fila)

    pares = pares_producto(bloques_txt, ag, em)
    for nombre, rows in (("intencion-vs-fichas.csv", filas), ("diferencias-intencion.csv", difs), ("contrastes.csv", crows),
                         ("pares-d14.csv", pares)):
        with open(os.path.join(AQUI, nombre), "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
    print(len(filas), "fichas comparadas;", len(difs), "diferencias; factores sin extraer:", len(faltan), " ".join(faltan))


if __name__ == "__main__":
    main()
