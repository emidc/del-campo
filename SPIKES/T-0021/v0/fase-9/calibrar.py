#!/usr/bin/env python3
"""Fase 9b · calibración de bandas (protocolo §12 pasos 4 a 7).

Recalcula C_raw desde los factores guardados (metodología v0.2 §5.5, §6, §9.3) y asigna
bandas con cualquier juego de cortes. Sólo lee fichas; escribe en RAIZ/v0/fase-9/.
Uso: python3 calibrar.py RAIZ
"""
import csv, glob, math, os, sys
from collections import Counter, defaultdict
from itertools import combinations

RAIZ = sys.argv[1] if len(sys.argv) > 1 else "."
V0 = os.path.join(RAIZ, "v0")
F8 = os.path.join(V0, "fase-8")
OUT = os.path.join(V0, "fase-9")

# Juegos de cortes: (Media >=, Alta >=, Crítica >=)
JUEGOS = {
    "E": (20, 50, 75),   # elegido por Emiliano (1A de la 9a, 2026-10-08 21:44 UTC)
    "B": (20, 45, 75),   # segundo de la 9a
    "D": (36, 50, 75),   # mueve el corte sin casos Baja/Media al otro extremo de su hueco
}
ORDEN_JUEGOS = ["E", "B", "D"]
BANDAS = ["Baja", "Media", "Alta", "Crítica"]
NB = {b: i for i, b in enumerate(BANDAS)}
VALORES = sorted({p * i * v for p in range(1, 6) for i in range(1, 6) for v in range(1, 6)})
DIMS = ["econ", "pers", "cont", "legal"]


def leer(p):
    with open(p, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def num(x):
    x = (x or "").strip()
    return int(x) if x in ("1", "2", "3", "4", "5") else None


def es_true(x):
    return (x or "").strip().lower() == "true"


def v_dim(d, c, r, r_na):
    if d in ("pers", "legal") or r_na:
        return c
    if d == "cont":
        return min(c, r)
    return min(c, math.ceil((c + r) / 2))


def recalcular(f):
    """Devuelve (evaluable, c_raw o None, dimensiones determinantes)."""
    P = num(f["p_valor"])
    if P is None:
        return False, None, ""
    c = num(f["v_cont_valor"])
    rraw = f["v_rec_valor"].strip()
    r_na = rraw == "no_aplica"
    r = num(rraw)
    conocidos, cotas = {}, []
    for d in DIMS:
        i = num(f[f"i_{d}_valor"])
        if i is not None and c is not None and (r is not None or r_na or d in ("pers", "legal")):
            conocidos[d] = P * i * v_dim(d, c, r, r_na)
        else:
            def mx(campo):
                v = num(f[campo + "_valor"])
                return v if v is not None else (num(f.get(campo + "_max", "")) or 5)
            ii, cc = mx(f"i_{d}"), mx("v_cont")
            rr = None if r_na else mx("v_rec")
            cotas.append(P * ii * v_dim(d, cc, rr, r_na))
    if not conocidos:
        return False, None, ""
    m = max(conocidos.values())
    if any(t > m for t in cotas):
        return False, None, ""
    return True, m, ";".join(d for d in DIMS if conocidos.get(d) == m)


def banda(c, juego):
    if c is None:
        return "no evaluable"
    m, a, k = JUEGOS[juego] if isinstance(juego, str) else juego
    return "Baja" if c < m else "Media" if c < a else "Alta" if c < k else "Crítica"


def orden_d10(x, y, juego):
    """Paso 1 banda, paso 2 C_raw, 3 I efectivo, 4 I-personas (CH-086)."""
    bx, by = NB[banda(x["c"], juego)], NB[banda(y["c"], juego)]
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


def orden_craw(x, y):
    if x["c"] != y["c"]:
        return ">" if x["c"] > y["c"] else "<"
    return "="


def escribir(nombre, filas, campos):
    with open(os.path.join(OUT, nombre), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        w.writerows(filas)


def pct(a, n):
    return f"{100.0 * a / n:.1f}%" if n else "—"


def main():
    rep = []  # líneas de salida para el reporte (stdout)
    say = rep.append

    # ---------- fichas del agente ----------
    ag = {}
    for p in sorted(glob.glob(os.path.join(F8, "agente", "*", "fichas.csv"))):
        fam = os.path.basename(os.path.dirname(p))
        for f in leer(p):
            ag[f["risk_id"]] = {"f": f, "fam": fam}
    intencion = {r["risk_id"]: r for r in leer(os.path.join(F8, "comparacion", "intencion-vs-fichas.csv"))}

    difs = []
    for rid, x in ag.items():
        f = x["f"]
        if f["tipo_objeto"] == "padre":
            continue
        ev, c, det = recalcular(f)
        x.update(ev=ev, c=c, det=det)
        if ev != es_true(f["evaluable"]) or (ev and str(c) != f["c_raw"].strip()):
            difs.append(f"{rid}: ficha evaluable={f['evaluable']} c_raw={f['c_raw']} · recalculado {ev} {c}")
    # padres: posición y banda de su hijo prioritario (metodología §1.4)
    for rid, x in ag.items():
        if x["f"]["tipo_objeto"] != "padre":
            continue
        hijos = [ag[h] for h in ag if ag[h]["f"]["riesgo_padre_id"] == rid and ag[h].get("ev")]
        x.update(ev=bool(hijos), c=max((h["c"] for h in hijos), default=None), det="(hijo prioritario)")
    say(f"VERIF fichas agente con factores: {sum(1 for x in ag.values() if x['f']['tipo_objeto']!='padre')}; diferencias de C_raw/evaluable: {len(difs)}")
    for d in difs:
        say("  DIF " + d)

    filas = []
    for rid in sorted(ag):
        x = ag[rid]; f = x["f"]
        it = intencion.get(rid, {})
        cint = num_or(it.get("c_raw_int_v02"))
        fila = {"risk_id": rid, "familia": x["fam"], "empresa": f["caso_empresa"], "tipo_objeto": f["tipo_objeto"],
                "riesgo_padre_id": f["riesgo_padre_id"], "en_ranking_principal": "sí" if f["tipo_objeto"] in ("riesgo", "padre") else "no",
                "evaluable": "true" if x["ev"] else "false", "c_raw": x["c"] if x["c"] is not None else "",
                "c_raw_ficha": f["c_raw"], "dimension_determinante": x["det"], "p": f["p_valor"],
                "i_max": max([num(f[f"i_{d}_valor"]) or 0 for d in DIMS]) if f["tipo_objeto"] != "padre" else "",
                "consecuencia_extrema": f["consecuencia_extrema"], "safety_critical": f["safety_critical"],
                "c_raw_intencion_v02": cint if cint is not None else ""}
        for j in ORDEN_JUEGOS:
            fila[f"banda_{j}"] = banda(x["c"], j)
            fila[f"banda_intencion_{j}"] = banda(cint, j) if it else ""
        filas.append(fila)
    escribir("bandas-sinteticos.csv", filas, list(filas[0].keys()))

    # ---------- distribución (paso 4) ----------
    principal = [r for r in filas if r["en_ranking_principal"] == "sí"]
    con_factores = [r for r in filas if r["tipo_objeto"] != "padre"]
    for nombre, pob in (("ranking principal (riesgos + padres)", principal), ("252 fichas con factores", con_factores)):
        ev = [r for r in pob if r["evaluable"] == "true"]
        say(f"DIST {nombre}: n={len(pob)} evaluables={len(ev)} no evaluables={len(pob)-len(ev)}")
        for j in ORDEN_JUEGOS:
            c = Counter(r[f"banda_{j}"] for r in ev)
            say(f"  {j} {JUEGOS[j]}: " + " · ".join(f"{b} {c[b]} ({pct(c[b], len(ev))})" for b in BANDAS))
    ev = [r for r in principal if r["evaluable"] == "true"]
    for clave in ("familia", "dimension_determinante"):
        say(f"DIST por {clave} (ranking principal, juego E y B y D)")
        grupos = defaultdict(list)
        for r in ev:
            k = r[clave]
            if clave == "dimension_determinante":
                k = "varias" if ";" in k else k
            grupos[k].append(r)
        for k in sorted(grupos):
            partes = []
            for j in ORDEN_JUEGOS:
                c = Counter(r[f"banda_{j}"] for r in grupos[k])
                partes.append(f"{j}: " + "/".join(str(c[b]) for b in BANDAS))
            say(f"  {k} (n={len(grupos[k])}) " + " | ".join(partes))
    say("DIST por empresa (ranking principal) B/M/A/C con E; empresas sin Baja o con una sola banda")
    por_emp = defaultdict(list)
    for r in ev:
        por_emp[r["empresa"]].append(r)
    emp_filas = []
    for e in sorted(por_emp):
        for j in ORDEN_JUEGOS:
            c = Counter(r[f"banda_{j}"] for r in por_emp[e])
            emp_filas.append({"empresa": e, "juego": j, "n": len(por_emp[e]), **{b: c[b] for b in BANDAS},
                              "bandas_usadas": sum(1 for b in BANDAS if c[b])})
    escribir("bandas-por-empresa.csv", emp_filas, list(emp_filas[0].keys()))
    for j in ORDEN_JUEGOS:
        ef = [x for x in emp_filas if x["juego"] == j]
        say(f"  {j}: empresas con 1 sola banda {sum(1 for x in ef if x['bandas_usadas']==1)}; con 2 {sum(1 for x in ef if x['bandas_usadas']==2)}; "
            f"sin ninguna Baja {sum(1 for x in ef if x['Baja']==0)} de {len(ef)}; con alguna Crítica {sum(1 for x in ef if x['Crítica']>0)}; "
            f"media de riesgos en la banda más poblada {sum(max(x[b] for b in BANDAS)/x['n'] for x in ef)/len(ef):.2f}")

    # ---------- sensibilidad de los cortes sin casos ----------
    cs = sorted(r["c_raw"] for r in ev)
    say("SENS corte Baja/Media (Alta 50, Crítica 75) sobre ranking principal: Media>=x -> Baja n, Media n")
    for x in [v for v in VALORES if 12 <= v <= 36]:
        b = sum(1 for c in cs if c < x); m = sum(1 for c in cs if x <= c < 50)
        say(f"  {x}: Baja {b} ({pct(b,len(cs))}) Media {m} ({pct(m,len(cs))})")
    say("SENS corte Crítica (Media 20, Alta 50): Crítica>=x -> Alta n, Crítica n")
    for x in (75, 80, 100, 125):
        a = sum(1 for c in cs if 50 <= c < x); k = sum(1 for c in cs if c >= x)
        say(f"  {x}: Alta {a} ({pct(a,len(cs))}) Crítica {k} ({pct(k,len(cs))})")

    # ---------- señal §12.6 (paso 6) ----------
    for nombre, pob in (("ranking principal", principal), ("252 con factores", con_factores)):
        e2 = [r for r in pob if r["evaluable"] == "true"]
        for j in ORDEN_JUEGOS:
            c = Counter(r[f"banda_{j}"] for r in e2)
            sobre = [b for b in BANDAS if c[b] > len(e2) / 2]
            vacias = [b for b in BANDAS if c[b] == 0]
            say(f"SEÑAL {nombre} {j}: >50% {sobre or 'ninguna'}; vacías {vacias or 'ninguna'}")

    # ---------- banderas frente a bandas ----------
    for j in ORDEN_JUEGOS:
        for bandera in ("consecuencia_extrema", "safety_critical"):
            c = Counter(r[f"banda_{j}"] for r in principal if es_true(r[bandera]))
            say(f"BANDERA {j} {bandera}: " + " · ".join(f"{b} {c[b]}" for b in BANDAS + ["no evaluable"]))
    remotos = [r for r in principal if r["evaluable"] == "true" and r["p"] in ("1", "2") and r["i_max"] == 5]
    say(f"REMOTOS P1-2 con alguna dimensión en 5 (ranking principal, evaluables): {len(remotos)}")
    for j in ORDEN_JUEGOS:
        c = Counter((r["p"], r[f"banda_{j}"]) for r in remotos)
        say(f"  {j}: " + " · ".join(f"P{p} {b} {n}" for (p, b), n in sorted(c.items())))
    p12 = Counter(r["p"] for r in principal if r["evaluable"] == "true")
    say(f"  P de evaluables del ranking principal: {dict(sorted(p12.items()))}")
    for r in remotos:
        say(f"    {r['risk_id']} P{r['p']} C{r['c_raw']} ext={r['consecuencia_extrema']} sc={r['safety_critical']} E={r['banda_E']} D={r['banda_D']}")

    # ---------- banda en la muestra (§11 regla 4) ----------
    muestra = leer(os.path.join(F8, "sorteo", "muestra-emiliano.csv"))
    em = {r["risk_id"]: r for r in leer(os.path.join(F8, "emiliano", "fichas-emiliano.csv"))}
    emx = {}
    for rid, f in em.items():
        ev_, c_, det_ = recalcular(f) if f["tipo_objeto"] != "padre" else (False, None, "")
        emx[rid] = {"f": f, "ev": ev_, "c": c_, "det": det_}
        if ev_ != es_true(f["evaluable"]) or (ev_ and str(c_) != f["c_raw"].strip()):
            say(f"  DIF emiliano {rid}: ficha {f['evaluable']} {f['c_raw']} · recalculado {ev_} {c_}")
    mfilas, anomalias = [], []
    for j in ORDEN_JUEGOS:
        ambos = coinc = 0
        conf = Counter()
        for m in muestra:
            rid = m["risk_id"]; e, a = emx[rid], ag[rid]
            be, ba = banda(e["c"] if e["ev"] else None, j), banda(a["c"] if a["ev"] else None, j)
            conf[(be, ba)] += 1
            if e["ev"] and a["ev"]:
                ambos += 1; coinc += be == ba
        incl = sum(n for (x, y), n in conf.items() if x == y)
        say(f"MUESTRA {j}: coincidencia de banda con los dos evaluables {coinc}/{ambos} = {pct(coinc, ambos)}; "
            f"contando 'no evaluable' como categoría {incl}/{len(muestra)} = {pct(incl, len(muestra))}")
        etiquetas = BANDAS + ["no evaluable"]
        say("   filas Emiliano / columnas agente: " + " ".join(e[:5] for e in etiquetas))
        for x in etiquetas:
            say(f"   {x[:12]:12} " + " ".join(f"{conf[(x, y)]:5d}" for y in etiquetas))
    n_an = 0
    for m in muestra:
        rid = m["risk_id"]; e, a = emx[rid], ag[rid]
        fila = {"risk_id": rid, "empresa": m["empresa"], "familia": m["familia"],
                "evaluable_emiliano": e["ev"], "c_raw_emiliano": e["c"] or "", "evaluable_agente": a["ev"], "c_raw_agente": a["c"] or "",
                "ext_emiliano": e["f"]["consecuencia_extrema"], "ext_agente": a["f"]["consecuencia_extrema"],
                "sc_emiliano": e["f"]["safety_critical"], "sc_agente": a["f"]["safety_critical"]}
        difs_f = []
        for campo in ["p_valor"] + [f"i_{d}_valor" for d in DIMS] + ["v_cont_valor", "v_rec_valor"]:
            ve, va = e["f"][campo].strip(), a["f"][campo].strip()
            if ve != va:
                difs_f.append(f"{campo.replace('_valor','')} {ve}→{va}")
        fila["factores_distintos (Emiliano→agente)"] = "; ".join(difs_f)
        for j in ORDEN_JUEGOS:
            be, ba = banda(e["c"] if e["ev"] else None, j), banda(a["c"] if a["ev"] else None, j)
            fila[f"banda_emiliano_{j}"], fila[f"banda_agente_{j}"] = be, ba
            fila[f"coincide_{j}"] = be == ba
        mfilas.append(fila)
        be, ba = fila["banda_emiliano_E"], fila["banda_agente_E"]
        if be != ba:
            n_an += 1
            if not (e["ev"] and a["ev"]):
                causa = "evaluabilidad"
            else:
                grandes = [d for d in difs_f if (lambda p: p[0].isdigit() and p[1].isdigit() and abs(int(p[0]) - int(p[1])) > 1)(d.split(" ")[1].split("→"))]
                causa = "factores con diferencia de más de un nivel" if grandes else "factores distintos dentro de ±1 que cruzan un corte"
            bandera = []
            if fila["ext_emiliano"] != fila["ext_agente"]:
                bandera.append("consecuencia_extrema distinta")
            if fila["sc_emiliano"] != fila["sc_agente"]:
                bandera.append("safety_critical distinta")
            anomalias.append({"anomalia_id": f"AN-9B-{n_an:04d}", "tipo": "A1", "risk_id": rid, "factor": "banda",
                              "juego": "E (20/50/75)", "valor_emiliano": be, "valor_agente": ba,
                              "c_raw_emiliano": e["c"] or "", "c_raw_agente": a["c"] or "",
                              "causa": causa, "banderas": "; ".join(bandera) or "iguales",
                              "detalle": fila["factores_distintos (Emiliano→agente)"],
                              "en_otros_juegos": "; ".join(f"{j}: {'coincide' if fila['coincide_'+j] else 'difiere'}" for j in ("B", "D"))})
    escribir("bandas-muestra.csv", mfilas, list(mfilas[0].keys()))
    escribir("anomalias-banda.csv", anomalias, list(anomalias[0].keys()) if anomalias else ["anomalia_id"])
    say(f"A1 de banda (juego E): {len(anomalias)}")
    for an in anomalias:
        say(f"  {an['anomalia_id']} {an['risk_id']} E:{an['valor_emiliano']}({an['c_raw_emiliano']}) A:{an['valor_agente']}({an['c_raw_agente']}) {an['causa']} | {an['banderas']} | {an['detalle']} | {an['en_otros_juegos']}")
    # ranking dentro de una empresa con el paso 1 activo
    por_e = defaultdict(list)
    for m in muestra:
        por_e[m["empresa"]].append(m["risk_id"])
    for j in ORDEN_JUEGOS:
        n = cc = cambios = 0
        for e_, rs in por_e.items():
            for x, y in combinations(sorted(rs), 2):
                if not (emx[x]["ev"] and emx[y]["ev"] and ag[x]["ev"] and ag[y]["ev"]):
                    continue
                oe, oa = orden_d10(emx[x], emx[y], j), orden_d10(ag[x], ag[y], j)
                n += 1; cc += oe == oa
        say(f"RANKING muestra {j}: {cc}/{n} pares concordantes con banda como paso 1")

    # ---------- discriminación (paso 5) ----------
    ev_int = [r for r in principal if r["evaluable"] == "true" and r["c_raw_intencion_v02"] != ""]
    for j in ORDEN_JUEGOS:
        conf = Counter((r[f"banda_intencion_{j}"], r[f"banda_{j}"]) for r in ev_int)
        coinc = sum(n for (x, y), n in conf.items() if x == y)
        lejos = sum(n for (x, y), n in conf.items() if x in NB and y in NB and abs(NB[x] - NB[y]) >= 2)
        say(f"INTENCION {j}: n={len(ev_int)} misma banda que la intención {coinc} ({pct(coinc,len(ev_int))}); a 2+ bandas {lejos}")
        say("   filas intención / columnas agente: " + " ".join(BANDAS))
        for x in BANDAS:
            say(f"   {x:8} " + " ".join(f"{conf[(x, y)]:4d}" for y in BANDAS))
        # pares dentro de empresa: intención en bandas distintas, agente en la misma
        n = mismo = 0
        emp = defaultdict(list)
        for r in ev_int:
            emp[r["empresa"]].append(r)
        for rs in emp.values():
            for x, y in combinations(rs, 2):
                bx, by = x[f"banda_intencion_{j}"], y[f"banda_intencion_{j}"]
                if bx != by:
                    n += 1; mismo += x[f"banda_{j}"] == y[f"banda_{j}"]
        say(f"   pares de una misma empresa con intención en bandas distintas: {n}; el agente los deja en la misma banda: {mismo} ({pct(mismo,n)})")
    # pares de prueba de D14
    pares = leer(os.path.join(F8, "comparacion", "pares-d14.csv"))
    for j in ORDEN_JUEGOS:
        misma = inv = distinto_craw = nev = 0
        for p in pares:
            a, b = ag[p["riesgo_frecuente"]], ag[p["riesgo_grave"]]
            if not (a["ev"] and b["ev"]):
                nev += 1; continue
            misma += banda(a["c"], j) == banda(b["c"], j)
            o1, o2 = orden_d10(a, b, j), orden_craw(a, b)
            distinto_craw += (o2 != "=" and o1 != o2)
            inv += o1 == ">"
        say(f"PARES D14 {j}: {len(pares)} pares, {nev} con no evaluable; en la misma banda {misma}; frecuente arriba {inv}; banda ordena distinto que C_raw {distinto_craw}")
    # contrastes
    contr = leer(os.path.join(F8, "comparacion", "contrastes.csv"))
    cfilas = []
    for c in contr:
        ids = [i for i in c["ids"].split(";") if i in ag and ag[i]["ev"] and i in intencion and intencion[i]["c_raw_int_v02"].strip().isdigit()]
        fila = {"contraste": c["contraste"], "riesgos_evaluables": len(ids)}
        for j in ("E",):
            n = mismo = 0
            for x, y in combinations(ids, 2):
                if ag[x]["f"]["caso_empresa"] != ag[y]["f"]["caso_empresa"]:
                    continue
                bx, by = banda(int(intencion[x]["c_raw_int_v02"]), j), banda(int(intencion[y]["c_raw_int_v02"]), j)
                if bx != by:
                    n += 1; mismo += banda(ag[x]["c"], j) == banda(ag[y]["c"], j)
            fila.update({f"pares_intencion_distinta_{j}": n, f"agente_misma_banda_{j}": mismo})
            fila["bandas_intencion_E"] = "/".join(str(sum(1 for i in ids if banda(int(intencion[i]["c_raw_int_v02"]), j) == b)) for b in BANDAS)
            fila["bandas_agente_E"] = "/".join(str(sum(1 for i in ids if banda(ag[i]["c"], j) == b)) for b in BANDAS)
        cfilas.append(fila)
    escribir("discriminacion-contrastes.csv", cfilas, list(cfilas[0].keys()))
    tot_n = sum(f["pares_intencion_distinta_E"] for f in cfilas); tot_m = sum(f["agente_misma_banda_E"] for f in cfilas)
    say(f"CONTRASTES E: pares de misma empresa con intención en bandas distintas {tot_n}; agente misma banda {tot_m}")
    for f in cfilas:
        if f["pares_intencion_distinta_E"]:
            say(f"  {f['contraste']}: {f['agente_misma_banda_E']}/{f['pares_intencion_distinta_E']} · intención {f['bandas_intencion_E']} · agente {f['bandas_agente_E']}")

    # ---------- regresión de bandas sobre los casos de propiedad (paso 7) ----------
    tabla = leer(os.path.join(OUT, "tabla-calibracion.csv"))
    reg = {r["evaluacion_id"]: r for r in leer(os.path.join(V0, "fase-5", "regresion", "fichas-regresion.csv"))}
    porcaso = defaultdict(list)
    for t in tabla:
        f = reg[t["evaluacion_id"]]
        ev_, c_, _ = recalcular(f)
        if (ev_ and str(c_) != f["c_raw"]) or ev_ != es_true(f["evaluable"]):
            say(f"  DIF caso {t['evaluacion_id']}")
        t["_c"] = c_
        porcaso[t["caso"][:5]].append(t)  # CP-11-A y CP-11-B son un solo caso
    rfilas = []
    for caso in sorted(porcaso):
        ts = porcaso[caso]
        anterior = ts[0]["categoria_f5"]
        circ = ts[0]["circular_c_raw"]
        for j in ORDEN_JUEGOS:
            fallas, blandas, orig = [], [], []
            for t in ts:
                b = banda(t["_c"], j)
                esp = set(t["banda_esperada"].replace("Media/Baja", "Baja/Media").split("/")) if t["tipo_expectativa"] in ("dura", "blanda", "revisada") else None
                if esp is None:
                    continue
                ok = b in esp
                etiqueta = f"{t['riesgo']}{(' ' + t['momento']) if t['momento'] else ''} {b} (esperada {t['banda_esperada']})"
                if t["tipo_expectativa"] == "dura" and not ok:
                    fallas.append(etiqueta)
                elif t["tipo_expectativa"] == "blanda" and not ok:
                    blandas.append(etiqueta)
                elif t["tipo_expectativa"] == "revisada" and not ok:
                    orig.append(etiqueta)
            if anterior != "PASS":
                nuevo = anterior + (" (secundaria: FAIL — calibración)" if fallas else "")
                estado = "sin_cambio"
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
            if caso == "CP-05":
                nota.append("FAIL — calibración aceptado por Emiliano (decisión 3a, 2026-10-08 21:44 UTC): se conserva la adjudicación original como evidencia del límite de max()")
            if estado == "regresionó" and caso != "CP-05" and j == "E":
                nota.append("criterio de banda recién juzgable; Emiliano adoptó el juego sabiendo este FAIL (decisión 1A, 2026-10-08 21:44 UTC), protocolo §13 aceptación")
            rfilas.append({"caso": caso, "juego": f"{j} {JUEGOS[j]}", "version_anterior": "metodologia v0.2 sin umbrales (F5-REG-01)",
                           "version_nueva": f"metodologia v0.2 + cortes {j}", "resultado_anterior": anterior, "resultado_nuevo": nuevo,
                           "estado": estado, "circular": circ, "regla_que_produjo_el_cambio": "D12 (umbrales de banda)",
                           "fila_changelog": "CH-093 (prov.)", "nota": " | ".join(nota)})
    escribir("regresion-bandas.csv", rfilas, list(rfilas[0].keys()))
    for j in ORDEN_JUEGOS:
        rf = [r for r in rfilas if r["juego"].startswith(j)]
        c = Counter(r["resultado_nuevo"].split(" (")[0] for r in rf)
        say(f"REGRESION {j}: " + ", ".join(f"{k} {v}" for k, v in sorted(c.items())) +
            " · FAIL — calibración: " + ", ".join(r["caso"] + ("*" if r["circular"] == "sí" else "") for r in rf if r["resultado_nuevo"] == "FAIL — calibración"))

    print("\n".join(rep))


def num_or(x):
    x = (x or "").strip()
    return int(x) if x.isdigit() else None


if __name__ == "__main__":
    main()
