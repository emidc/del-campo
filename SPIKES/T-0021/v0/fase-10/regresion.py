#!/usr/bin/env python3
"""Fase 10 · regresión completa de metodologia v0.2 → v0.3 (protocolo §13).

v0.3 cambia sólo cómo se combinan factores ya asignados (CH-092 `consecuencia_extrema` en no
evaluables, CH-093 umbrales de banda, CH-094 texto de D23 y §8.2), así que todo se recalcula desde
los factores guardados, sin reevaluar (§13). Reusa las funciones de `fase-9/calibrar.py`.
Sólo lee fichas; escribe en RAIZ/v0/fase-10/.
Uso: python3 regresion.py RAIZ
"""
import csv, glob, importlib.util, os, sys

sys.dont_write_bytecode = True
from collections import Counter, defaultdict

RAIZ = sys.argv[1] if len(sys.argv) > 1 else "."
V0 = os.path.join(RAIZ, "v0")
F8 = os.path.join(V0, "fase-8")
OUT = os.path.join(V0, "fase-10")

_spec = importlib.util.spec_from_file_location("calibrar", os.path.join(V0, "fase-9", "calibrar.py"))
cal = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cal)
num, es_true, recalcular, leer, DIMS, BANDAS = cal.num, cal.es_true, cal.recalcular, cal.leer, cal.DIMS, cal.BANDAS

CORTES_V03 = (20, 50, 75)  # metodología v0.3 §6.5 (CH-093)
V_ANT, V_NUE = "metodologia v0.2 / protocolo v0.2", "metodologia v0.3 / protocolo v0.3"
NB = {b: i for i, b in enumerate(BANDAS)}


def banda_v03(c):
    return "" if c is None else cal.banda(c, CORTES_V03)


def extrema_v03(f, evaluable):
    """Protocolo v0.3 §2.3 (CH-092): valor 5, o en un no evaluable `unknown` con `_max` 5."""
    dims = [d for d in DIMS if num(f[f"i_{d}_valor"]) == 5]
    if not evaluable:
        dims += [d for d in DIMS if f[f"i_{d}_valor"].strip() == "unknown" and num(f[f"i_{d}_max"]) == 5]
    return bool(dims), ";".join(d for d in DIMS if d in dims)


def safety(f, evaluable):
    """Protocolo §2.3 `safety_critical` (sin cambio en v0.3)."""
    p = num(f["i_pers_valor"])
    if p is not None:
        return p >= 4
    return (not evaluable) and f["i_pers_valor"].strip() == "unknown" and (num(f["i_pers_max"]) or 0) >= 4


def bool_txt(b):
    return "true" if b else "false"


def posiciones(objs, con_banda):
    """Posición D10 dentro de una organización: 1 + cuántos quedan estrictamente arriba (§7.2).

    v0.2: paso 1 (banda) inactivo; v0.3: activo. Un par indeterminado ("?") no cuenta como arriba.
    """
    def cmp(x, y):
        if con_banda:
            bx, by = NB[banda_v03(x["c"])], NB[banda_v03(y["c"])]
            if bx != by:
                return ">" if bx > by else "<"
        if x["c"] != y["c"]:
            return ">" if x["c"] > y["c"] else "<"
        for campo in ("i_efectivo", "i_pers_valor"):
            vx, vy = num(x["f"][campo]), num(y["f"][campo])
            if vx is None or vy is None:
                return "?"
            if vx != vy:
                return ">" if vx > vy else "<"
        return "="
    ev = [o for o in objs if o["ev"]]
    return {o["id"]: 1 + sum(1 for y in ev if y is not o and cmp(y, o) == ">") for o in ev}


def resultado(ev, c, pos, banda, ext, sc, con_banda):
    if not ev:
        base = "no evaluable"
    else:
        base = f"C {c} · pos {pos}" + (f" · {banda}" if con_banda else " · sin banda")
    return f"{base} · ext={ext} · sc={sc}"


def escribir(nombre, filas):
    with open(os.path.join(OUT, nombre), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)


def regresion_emi41(say):
    filas, difs = [], []
    fuentes = [("agente", sorted(glob.glob(os.path.join(F8, "agente", "*", "fichas.csv")))),
               ("emiliano", [os.path.join(F8, "emiliano", "fichas-emiliano.csv")])]
    for evaluador, paths in fuentes:
        objs = {}
        for p in paths:
            for f in leer(p):
                objs[f["risk_id"]] = {"id": f["risk_id"], "f": f}
        for o in objs.values():
            f = o["f"]
            if f["tipo_objeto"] == "padre":
                continue
            o["ev"], o["c"], _ = recalcular(f)
            if o["ev"] != es_true(f["evaluable"]) or (o["ev"] and str(o["c"]) != f["c_raw"].strip()):
                difs.append(f"{evaluador} {o['id']}: ficha {f['evaluable']} {f['c_raw']} · recalculado {o['ev']} {o['c']}")
        for o in objs.values():
            if o["f"]["tipo_objeto"] == "padre":  # §1.4: posición y banda del hijo prioritario
                hijos = [h for h in objs.values() if h["f"]["riesgo_padre_id"] == o["id"] and h.get("ev")]
                pri = max(hijos, key=lambda h: h["c"], default=None)
                o.update(ev=pri is not None, c=pri["c"] if pri else None, pri=pri)
        # Ranking principal por organización: riesgos y padres; los hijos de un padre van dentro del padre.
        por_emp = defaultdict(list)
        for o in objs.values():
            if o["f"]["tipo_objeto"] in ("riesgo", "padre") and not o["f"]["riesgo_padre_id"].strip():
                por_emp[o["f"]["caso_empresa"]].append(o)
        pos02, pos03 = {}, {}
        for emp in por_emp.values():
            pos02.update(posiciones(emp, False))
            pos03.update(posiciones(emp, True))
        for rid in sorted(objs):
            o, f = objs[rid], objs[rid]["f"]
            padre = f["tipo_objeto"] == "padre"
            ext_ant, sc_ant = f["consecuencia_extrema"].strip() or "—", f["safety_critical"].strip() or "—"
            if padre:  # el padre no tiene factores propios: banderas tal cual
                ext_nue, sc_nue, ext_dims = ext_ant, sc_ant, ""
            else:
                e, ext_dims = extrema_v03(f, o["ev"])
                ext_nue, sc_nue = bool_txt(e), bool_txt(safety(f, o["ev"]))
            b = banda_v03(o["c"]) if o["ev"] else ""
            r_ant = resultado(o["ev"], o["c"], pos02.get(rid, "—"), "", ext_ant, sc_ant, False)
            r_nue = resultado(o["ev"], o["c"], pos03.get(rid, "—"), b, ext_nue, sc_nue, True)
            reglas, cambios = [], []
            if o["ev"]:
                cambios.append("banda nueva")
                reglas.append("D12 / metodología §6.5 (umbrales 20/50/75)")
            if ext_nue != ext_ant:
                cambios.append(f"consecuencia_extrema {ext_ant}→{ext_nue} ({ext_dims})")
                reglas.append("protocolo §2.3 consecuencia_extrema en no evaluable")
            if sc_nue != sc_ant:
                cambios.append(f"safety_critical {sc_ant}→{sc_nue}")
                reglas.append("protocolo §2.3 safety_critical (sin cambio de regla: discrepancia de registro)")
            if pos02.get(rid) != pos03.get(rid):
                cambios.append(f"posición {pos02.get(rid)}→{pos03.get(rid)}")
                reglas.append("D10 paso 1 (banda)")
            filas_ch = []
            if "banda nueva" in cambios:
                filas_ch.append("CH-093")
            if any(c.startswith("consecuencia_extrema") for c in cambios):
                filas_ch.append("CH-092")
            nota = ""
            if padre and o.get("pri"):
                nota = f"padre: posición y banda de su hijo prioritario {o['pri']['id']} (§1.4)"
            elif f["tipo_objeto"] in ("sub_riesgo", "escenario"):
                nota = "fuera del ranking principal (§7.1.2, §10.4): banda sin posición"
            elif f["riesgo_padre_id"].strip():
                nota = f"hijo de {f['riesgo_padre_id']}: ordena el padre"
            filas.append({
                "risk_id": rid, "evaluador": evaluador, "empresa": f["caso_empresa"], "tipo_objeto": f["tipo_objeto"],
                "version_anterior": V_ANT, "version_nueva": V_NUE,
                "resultado_anterior": r_ant, "resultado_nuevo": r_nue,
                "estado": "cambió" if cambios else "sin_cambio",
                "que_cambio": "; ".join(cambios), "regla_que_produjo_el_cambio": "; ".join(reglas),
                "fila_changelog": "; ".join(filas_ch), "nota": nota,
            })
    escribir("regresion-emi41.csv", filas)
    say(f"VERIF C_raw/evaluable recalculado contra ficha: {len(difs)} diferencias")
    for d in difs:
        say("  DIF " + d)
    for ev_ in ("agente", "emiliano"):
        fs = [x for x in filas if x["evaluador"] == ev_]
        c = Counter(x["estado"] for x in fs)
        solo_banda = sum(1 for x in fs if x["que_cambio"] == "banda nueva")
        otras = [x for x in fs if x["que_cambio"] and x["que_cambio"] != "banda nueva"]
        say(f"EMI41 {ev_}: n={len(fs)} {dict(c)}; sólo banda nueva {solo_banda}; otros cambios {len(otras)}")
        for x in otras:
            say(f"  {x['risk_id']}: {x['que_cambio']}")
        bands = Counter(x["resultado_nuevo"].split(" · ")[2] for x in fs if x["resultado_nuevo"].startswith("C "))
        say(f"  bandas v0.3: " + " · ".join(f"{b} {bands[b]}" for b in BANDAS))
    # evaluables con alguna dimensión unknown y _max 5: CH-092 no los alcanza (sólo no evaluables)
    return filas


def regresion_casos(say):
    tabla = leer(os.path.join(V0, "fase-9", "tabla-calibracion.csv"))
    reg = {r["evaluacion_id"]: r for r in leer(os.path.join(V0, "fase-5", "regresion", "fichas-regresion.csv"))}
    f9 = {r["caso"]: r for r in leer(os.path.join(V0, "fase-9", "regresion-bandas.csv")) if r["juego"].startswith("E")}
    porcaso = defaultdict(list)
    for t in tabla:
        f = reg[t["evaluacion_id"]]
        ev, c, _ = recalcular(f)
        if ev != es_true(f["evaluable"]) or (ev and str(c) != f["c_raw"].strip()):
            say(f"  DIF caso {t['evaluacion_id']}")
        e, _ = extrema_v03(f, ev)
        t.update(_ev=ev, _c=c, _ext=bool_txt(e), _sc=bool_txt(safety(f, ev)), _f=f)
        porcaso[t["caso"][:5]].append(t)
    filas, inversiones = [], 0
    for caso in sorted(porcaso):
        ts = porcaso[caso]
        anterior = ts[0]["categoria_f5"]
        fallas, blandas, orig, banderas = [], [], [], []
        for t in ts:
            if t["_ext"] != t["_f"]["consecuencia_extrema"] or t["_sc"] != t["_f"]["safety_critical"]:
                banderas.append(f"{t['riesgo']}: ext {t['_f']['consecuencia_extrema']}→{t['_ext']}, sc {t['_f']['safety_critical']}→{t['_sc']}")
            if t["tipo_expectativa"] not in ("dura", "blanda", "revisada"):
                continue
            b = banda_v03(t["_c"]) if t["_ev"] else "no evaluable"
            esp = set(t["banda_esperada"].replace("Media/Baja", "Baja/Media").split("/"))
            if b in esp:
                continue
            et = f"{t['riesgo']}{(' ' + t['momento']) if t['momento'] else ''} {b} (C {t['_c']}; esperada {t['banda_esperada']})"
            {"dura": fallas, "blanda": blandas, "revisada": orig}[t["tipo_expectativa"]].append(et)
        # D10 con banda como paso 1 contra el orden por C_raw dentro de cada momento
        por_mom = defaultdict(list)
        for t in ts:
            if t["_ev"] and t["tipo_objeto"] == "riesgo":
                por_mom[(t["caso"], t["momento"])].append(t)
        for grupo in por_mom.values():
            for x in grupo:
                for y in grupo:
                    if x["_c"] > y["_c"] and NB[banda_v03(x["_c"])] < NB[banda_v03(y["_c"])]:
                        inversiones += 1
        if anterior != "PASS":
            nuevo, estado = anterior + (" (secundaria: FAIL — calibración)" if fallas else ""), "sin_cambio"
        elif fallas:
            nuevo, estado = "FAIL — calibración", "regresionó"
        else:
            nuevo, estado = "PASS", "sin_cambio"
        nota = []
        if fallas:
            nota.append("banda fuera de lo adjudicado: " + "; ".join(fallas))
        if blandas:
            nota.append("expectativa blanda no alcanzada: " + "; ".join(blandas))
        if orig:
            nota.append("contra la adjudicación original (revisada en la Fase 5): " + "; ".join(orig))
        if banderas:
            nota.append("banderas recalculadas distintas de la ficha: " + "; ".join(banderas))
        if estado == "regresionó":
            nota.append("aprobado por Emiliano: " + ("3a (2026-10-08 21:44 UTC), adjudicación original conservada como evidencia del límite de max()"
                                                     if caso == "CP-05" else "1A y 1a (2026-10-08 21:44 y 21:52 UTC), adoptó 20/50/75 sabiendo este FAIL")
                        + "; registrado en CH-093")
        prev = f9.get(caso)
        coincide_9b = prev is not None and prev["resultado_nuevo"] == nuevo and prev["estado"] == estado
        nota.append("igual que F9B-CAL-01 juego E" if coincide_9b else f"DIFIERE de F9B-CAL-01 juego E ({prev and prev['resultado_nuevo']})")
        filas.append({"caso": caso, "version_anterior": "metodologia v0.2 (F5-REG-01, sin umbrales)", "version_nueva": V_NUE,
                      "resultado_anterior": anterior, "resultado_nuevo": nuevo, "estado": estado,
                      "circular": ts[0]["circular_c_raw"],
                      "regla_que_produjo_el_cambio": "D12 / metodología §6.5 (umbrales 20/50/75)" if estado != "sin_cambio" or fallas else "",
                      "fila_changelog": "CH-093" if estado != "sin_cambio" or fallas else "", "nota": " | ".join(nota)})
    escribir("regresion-casos.csv", filas)
    c = Counter(f["resultado_nuevo"].split(" (")[0] for f in filas)
    say(f"CASOS: {dict(sorted(c.items()))}; estados {dict(Counter(f['estado'] for f in filas))}")
    say(f"  igual que F9B-CAL-01 juego E: {sum(1 for f in filas if 'igual que F9B' in f['nota'])}/{len(filas)}")
    say(f"  pares donde la banda (paso 1 de D10) invierte el orden por C_raw: {inversiones}")
    for f in filas:
        if f["estado"] != "sin_cambio" or "secundaria" in f["resultado_nuevo"] or "banderas" in f["nota"]:
            say(f"  {f['caso']}: {f['resultado_anterior']} → {f['resultado_nuevo']} [{f['estado']}] {f['nota']}")
    return filas


def propiedad_d23(say):
    """CH-094 como propiedad: con 20/50/75, P 1 ≤ Media, P 2 ≤ Alta, Crítica ⇒ P ≥ 3 (sobre las 125 combinaciones)."""
    peor = defaultdict(lambda: -1)
    for p in range(1, 6):
        for i in range(1, 6):
            for v in range(1, 6):
                peor[p] = max(peor[p], NB[banda_v03(p * i * v)])
    ok = BANDAS[peor[1]] == "Media" and BANDAS[peor[2]] == "Alta" and peor[3] == NB["Crítica"]
    say(f"D23 (CH-094): banda máxima por P {[(p, BANDAS[peor[p]]) for p in range(1, 6)]} → {'se cumple' if ok else 'NO se cumple'}")


def main():
    os.makedirs(OUT, exist_ok=True)
    rep = []
    regresion_casos(rep.append)
    regresion_emi41(rep.append)
    propiedad_d23(rep.append)
    print("\n".join(rep))


if __name__ == "__main__":
    main()
