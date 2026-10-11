#!/usr/bin/env python3
"""Fase 11b · regresión completa de metodologia v0.3 → v1 candidate (protocolo §13).

Combinación (se recalcula desde factores guardados): F11-5 banderas con una dimensión `unknown` en
evaluables, F11-6 I efectivo `n` cuando el máximo de la `unknown` no supera `n` (B01 y U07 no cambian
ningún cálculo). Asignación: las fichas nuevas de `reevaluacion/fichas-reevaluadas-factores.csv`
(`reevaluar.py`) reemplazan a la anterior de su riesgo; ninguna ficha anterior se toca. Reusa las
funciones de `fase-10/regresion.py` y `fase-9/calibrar.py`. Escribe en RAIZ/v0/fase-11/.
Uso: python3 regresion.py RAIZ
"""
import csv, glob, importlib.util, os, sys

sys.dont_write_bytecode = True
from collections import Counter, defaultdict

RAIZ = sys.argv[1] if len(sys.argv) > 1 else "."
V0 = os.path.join(RAIZ, "v0")
F8 = os.path.join(V0, "fase-8")
OUT = os.path.join(V0, "fase-11")


def _cargar(nombre, ruta):
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


f10 = _cargar("regresion_f10", os.path.join(V0, "fase-10", "regresion.py"))
cal = f10.cal
num, es_true, recalcular, leer, DIMS, BANDAS, NB = cal.num, cal.es_true, cal.recalcular, cal.leer, cal.DIMS, cal.BANDAS, f10.NB
banda_v03, posiciones = f10.banda_v03, f10.posiciones
V_ANT, V_NUE = "metodologia v0.3 / protocolo v0.3", "metodologia v1 candidate / protocolo v1 candidate"
CH = {"F11-1": "CH-098", "F11-2": "CH-099", "F11-3": "CH-100", "F11-4": "CH-101", "F11-5": "CH-102",
      "F11-6": "CH-103", "F11-7": "CH-105", "F11-8": "CH-106", "F11-9": "CH-107"}
REGLA = {"F11-1": "metodología §1.3.4 escenario de referencia", "F11-2": "metodología §4.1.7 seguros obligatorios",
         "F11-3": "metodología §3.2 comparabilidad", "F11-4": "metodología §4.4 degradación material",
         "F11-5": "protocolo §2.3 / metodología §8.2 banderas con unknown", "F11-6": "metodología §7.2 I efectivo n",
         "F11-7": "metodología §9.2 peor creíble", "F11-8": "metodología §4.3 muerte directa y creíble",
         "F11-9": "metodología §5.1 medida anticipatoria"}
FACT = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "v_cont", "v_rec"]


def unk(f, d):
    return f[f"i_{d}_valor"].strip() == "unknown"


def extrema_v1(f):
    """Protocolo §2.3 [F11-5]: valor 5, o `unknown` con `_max` 5, evaluable o no."""
    dims = [d for d in DIMS if num(f[f"i_{d}_valor"]) == 5 or (unk(f, d) and num(f[f"i_{d}_max"]) == 5)]
    return bool(dims), ";".join(dims)


def safety_v1(f):
    p = num(f["i_pers_valor"])
    if p is not None:
        return p >= 4
    return unk(f, "pers") and (num(f["i_pers_max"]) or 0) >= 4


def i_efectivo_v1(f):
    """§7.2 [F11-6]: `≥ n` con una `unknown`, salvo que todo `_max` registrado de las `unknown` sea ≤ n."""
    con = [num(f[f"i_{d}_valor"]) for d in DIMS if num(f[f"i_{d}_valor"]) is not None]
    if not con:
        return ""
    n = max(con)
    us = [d for d in DIMS if unk(f, d)]
    if not us:
        return str(n)
    return str(n) if all(num(f[f"i_{d}_max"]) is not None and num(f[f"i_{d}_max"]) <= n for d in us) else f"≥ {n}"


def techo(f):
    def mx(k):
        v = num(f[k + "_max"]) or num(f[k + "_valor"])
        return v if v is not None else 5
    P = mx("p")
    c = mx("v_cont")
    r_na = f["v_rec_valor"].strip() == "no_aplica"
    r = None if r_na else mx("v_rec")
    return max(P * mx(f"i_{d}") * cal.v_dim(d, c, r, r_na) for d in DIMS)


def bool_txt(b):
    return "true" if b else "false"


def escribir(nombre, filas, campos=None):
    with open(os.path.join(OUT, nombre), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos or list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)


def completar(f):
    """Campos derivados de una ficha nueva con las reglas de la v1 candidate."""
    ev, c, det = recalcular(f)
    e, edims = extrema_v1(f)
    con = {d: num(f[f"i_{d}_valor"]) for d in DIMS if num(f[f"i_{d}_valor"]) is not None}
    n = max(con.values()) if con else None
    f.update({
        "i_efectivo": i_efectivo_v1(f),
        "i_efectivo_dimensiones": ";".join(d for d in DIMS if con.get(d) == n) if n else "",
        "c_dimension_determinante": det, "consecuencia_extrema": bool_txt(e), "consecuencia_extrema_dimensiones": edims,
        "safety_critical": bool_txt(safety_v1(f)), "evaluable": bool_txt(ev), "c_raw": "" if c is None else str(c),
        "banda": banda_v03(c) if ev else "", "techo_plausible": str(techo(f)),
    })
    us = [k for k in FACT if f[k + "_valor"].strip() == "unknown"]
    if not ev:
        f["motivo_no_evaluable"] = (f"{', '.join(us)} unknown y su cota (§9.3) supera el C_raw de las dimensiones conocidas"
                                    if us else f["motivo_no_evaluable"])
    else:
        f["motivo_no_evaluable"] = ""
    if us and not f["necesidad_validacion"].strip():
        f["necesidad_validacion"] = "Ver la observación [F11-n] de " + ", ".join(us)
    return f


def regresion_emi41(say):
    nuevas = {f["risk_id"]: completar(dict(f)) for f in leer(os.path.join(OUT, "reevaluacion", "fichas-reevaluadas-factores.csv"))}
    escribir(os.path.join("reevaluacion", "fichas-reevaluadas.csv"), list(nuevas.values()))
    filas, difs_sin_cambio = [], []
    fuentes = [("agente", sorted(glob.glob(os.path.join(F8, "agente", "*", "fichas.csv")))),
               ("emiliano", [os.path.join(F8, "emiliano", "fichas-emiliano.csv")])]
    for evaluador, paths in fuentes:
        ant, nue = {}, {}
        for p in paths:
            for f in leer(p):
                ant[f["risk_id"]] = {"id": f["risk_id"], "f": f}
                fn = dict(nuevas[f["risk_id"]]) if evaluador == "agente" and f["risk_id"] in nuevas else dict(f)
                fn["i_efectivo"] = i_efectivo_v1(fn) if fn["tipo_objeto"] != "padre" else fn["i_efectivo"]
                nue[f["risk_id"]] = {"id": f["risk_id"], "f": fn, "reev": evaluador == "agente" and f["risk_id"] in nuevas}
        for objs in (ant, nue):
            for o in objs.values():
                if o["f"]["tipo_objeto"] != "padre":
                    o["ev"], o["c"], _ = recalcular(o["f"])
            for o in objs.values():
                if o["f"]["tipo_objeto"] == "padre":
                    hijos = [h for h in objs.values() if h["f"]["riesgo_padre_id"] == o["id"] and h.get("ev")]
                    pri = max(hijos, key=lambda h: h["c"], default=None)
                    o.update(ev=pri is not None, c=pri["c"] if pri else None, pri=pri)
        for rid, o in nue.items():
            if not o["reev"] and o["f"]["tipo_objeto"] != "padre":
                a = ant[rid]
                if (a["ev"], a["c"]) != (o["ev"], o["c"]):
                    difs_sin_cambio.append(f"{evaluador} {rid}")
        pos = {}
        for k, objs in (("ant", ant), ("nue", nue)):
            por_emp = defaultdict(list)
            for o in objs.values():
                if o["f"]["tipo_objeto"] in ("riesgo", "padre") and not o["f"]["riesgo_padre_id"].strip():
                    por_emp[o["f"]["caso_empresa"]].append(o)
            pos[k] = {}
            for emp in por_emp.values():
                pos[k].update(posiciones(emp, True))
        for rid in sorted(ant):
            a, n = ant[rid], nue[rid]
            fa, fn = a["f"], n["f"]
            padre = fa["tipo_objeto"] == "padre"
            if padre:
                ea, sa = fa["consecuencia_extrema"], fa["safety_critical"]
                en, sn, edims = ea, sa, ""
                ia = in_ = fa["i_efectivo"]
            else:
                ea, _ = f10.extrema_v03(fa, a["ev"])
                ea, sa = bool_txt(ea), bool_txt(f10.safety(fa, a["ev"]))
                e, edims = extrema_v1(fn)
                en, sn = bool_txt(e), bool_txt(safety_v1(fn))
                ia, in_ = fa["i_efectivo"], fn["i_efectivo"]
            ba = banda_v03(a["c"]) if a["ev"] else ""
            bn = banda_v03(n["c"]) if n["ev"] else ""
            r_ant = f10.resultado(a["ev"], a["c"], pos["ant"].get(rid, "—"), ba, ea, sa, True) + f" · I {ia}"
            r_nue = f10.resultado(n["ev"], n["c"], pos["nue"].get(rid, "—"), bn, en, sn, True) + f" · I {in_}"
            marcas, cambios = [], []
            if n["reev"]:
                ms = [m for m in fn["reglas_aplicadas"].split(";") if m.startswith("F11-")]
                marcas += ms
                fac = [k for k in FACT if (fa[k + "_valor"], fa[k + "_min"], fa[k + "_max"]) != (fn[k + "_valor"], fn[k + "_min"], fn[k + "_max"])]
                cambios.append("factores " + ", ".join(f"{k} {fa[k+'_valor']}→{fn[k+'_valor']}" + (f" (máx {fa[k+'_max'] or '—'}→{fn[k+'_max'] or '—'})" if fa[k+'_max'] != fn[k+'_max'] else "") for k in fac))
            if (a["ev"], a["c"]) != (n["ev"], n["c"]):
                cambios.append(f"C {a['c'] if a['ev'] else 'no evaluable'}→{n['c'] if n['ev'] else 'no evaluable'}")
            if ba != bn:
                cambios.append(f"banda {ba or '—'}→{bn or '—'}")
            if (ea, sa) != (en, sn):
                cambios.append(f"banderas ext {ea}→{en}, sc {sa}→{sn}")
                if not n["reev"]:
                    marcas.append("F11-5")
            if ia != in_:
                cambios.append(f"I efectivo {ia}→{in_}")
                if not n["reev"]:
                    marcas.append("F11-6")
            if pos["ant"].get(rid) != pos["nue"].get(rid):
                cambios.append(f"posición {pos['ant'].get(rid, '—')}→{pos['nue'].get(rid, '—')}")
                if not n["reev"] and not marcas:
                    marcas.append("otros riesgos de la empresa")
            if padre and (a.get("pri") or {}).get("id") != (n.get("pri") or {}).get("id"):
                cambios.append(f"hijo prioritario {(a.get('pri') or {}).get('id')}→{(n.get('pri') or {}).get('id')}")
            marcas = list(dict.fromkeys(marcas))
            filas.append({
                "risk_id": rid, "evaluador": evaluador, "empresa": fa["caso_empresa"], "tipo_objeto": fa["tipo_objeto"],
                "version_anterior": V_ANT, "version_nueva": V_NUE,
                "evaluacion_anterior": fa["evaluacion_id"], "evaluacion_nueva": fn["evaluacion_id"] if n["reev"] else "",
                "resultado_anterior": r_ant, "resultado_nuevo": r_nue, "estado": "cambió" if cambios else "sin_cambio",
                "que_cambio": "; ".join(cambios),
                "regla_que_produjo_el_cambio": "; ".join(f"{m} {REGLA[m]}" if m in REGLA else m for m in marcas),
                "fila_changelog": "; ".join(CH[m] + " (prov.)" for m in marcas if m in CH),
                "nota": "ficha nueva pending; no es una ficha de Emiliano" if n["reev"] else "",
            })
    escribir("regresion-emi41.csv", filas)
    say(f"VERIF fichas sin reevaluar con C_raw o evaluabilidad distinta: {len(difs_sin_cambio)} {difs_sin_cambio}")
    for ev_ in ("agente", "emiliano"):
        fs = [x for x in filas if x["evaluador"] == ev_]
        say(f"EMI41 {ev_}: n={len(fs)} {dict(Counter(x['estado'] for x in fs))}")
        for x in fs:
            if x["estado"] == "cambió":
                say(f"  {x['risk_id']}: {x['que_cambio']} [{x['regla_que_produjo_el_cambio']}]")
        bands = Counter(x["resultado_nuevo"].split(" · ")[2] for x in fs if x["resultado_nuevo"].startswith("C ") and x["tipo_objeto"] in ("riesgo", "padre") and "hijo de" not in x["nota"])
    return filas


def regresion_casos(say):
    prev = {r["caso"]: r for r in leer(os.path.join(V0, "fase-10", "regresion-casos.csv"))}
    tabla = leer(os.path.join(V0, "fase-9", "tabla-calibracion.csv"))
    reg = {r["evaluacion_id"]: r for r in leer(os.path.join(V0, "fase-5", "regresion", "fichas-regresion.csv"))}
    porcaso = defaultdict(list)
    for t in tabla:
        porcaso[t["caso"][:5]].append(t)
    filas = []
    for caso in sorted(porcaso):
        banderas, ies, fallas = [], [], []
        for t in porcaso[caso]:
            f = reg[t["evaluacion_id"]]
            ev, c, _ = recalcular(f)
            e3, _ = f10.extrema_v03(f, ev)
            e1, _ = extrema_v1(f)
            s3, s1 = f10.safety(f, ev), safety_v1(f)
            if (e3, s3) != (e1, s1):
                banderas.append(f"{t['riesgo']}: ext {bool_txt(e3)}→{bool_txt(e1)}, sc {bool_txt(s3)}→{bool_txt(s1)}")
            if f["i_efectivo"] != i_efectivo_v1(f) and f["i_efectivo"].strip():
                ies.append(f"{t['riesgo']}: I {f['i_efectivo']}→{i_efectivo_v1(f)}")
        p = prev[caso]
        cambios = banderas + ies
        filas.append({"caso": caso, "version_anterior": V_ANT, "version_nueva": V_NUE,
                      "resultado_anterior": p["resultado_nuevo"], "resultado_nuevo": p["resultado_nuevo"],
                      "estado": "sin_cambio", "circular": p["circular"],
                      "regla_que_produjo_el_cambio": "F11-5" if banderas else "",
                      "fila_changelog": "CH-102 (prov.)" if banderas else "",
                      "nota": " | ".join(["sin factores reevaluados: ninguna corrección de asignación alcanza a los casos"] + cambios)})
    escribir("regresion-casos.csv", filas)
    say(f"CASOS: {dict(Counter(f['resultado_nuevo'].split(' (')[0] for f in filas))}; estados {dict(Counter(f['estado'] for f in filas))}")
    for f in filas:
        if len(f["nota"].split(" | ")) > 1:
            say(f"  {f['caso']}: {f['nota']}")
    return filas


def main():
    rep = []
    regresion_casos(rep.append)
    regresion_emi41(rep.append)
    f10.propiedad_d23(rep.append)
    print("\n".join(rep))


if __name__ == "__main__":
    main()
