#!/usr/bin/env python3
"""Fase 8c · comparación de evaluadores (protocolo v0.2 §11).

Compara las fichas de Emiliano con las del agente sobre la muestra de la Fase 8a
y escribe metricas.csv y anomalias-a1.csv en la carpeta de este script.
También cuenta las banderas de las fichas del agente (paso 5 del prompt 8c).

Uso: python3 comparar.py [RAIZ]   (RAIZ por defecto: tres niveles arriba de este archivo)
No modifica ninguna ficha: sólo lee.
"""
import csv
import glob
import os
import re
import sys
from itertools import combinations

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
F8 = os.path.join(RAIZ, "v0", "fase-8")

FACTORES = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "i_efectivo", "v_cont", "v_rec"]
DIMS = ["econ", "pers", "cont", "legal"]
TARGET_PM1 = 80.0
# Paso 3 del prompt 8c: causa de cada A1, leída en las dos observaciones (no adjudica quién tiene razón).
CAUSAS = {
    ("S22-R02", "p"): "regla ambigua: §3.2 pide un dato de jerarquía 1 'comparable' sin decir cuándo una tasa "
                      "que sólo cuenta liberaciones con lesionados es comparable con el evento iniciador "
                      "(liberación); los dos evaluadores señalan el mismo hecho (agente A2, Emiliano AN-F8-020) "
                      "y lo resuelven distinto",
}


def leer(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def valor(ficha, f):
    """Devuelve (estado, entero o None). estado: valor | unknown | no_aplica | cota."""
    raw = (ficha["i_efectivo"] if f == "i_efectivo" else ficha[f + "_valor"]).strip()
    if raw in ("1", "2", "3", "4", "5"):
        return "valor", int(raw)
    if raw == "no_aplica":
        return "no_aplica", None
    m = re.match(r"^(≥|>=)\s*(\d)$", raw)
    if m:
        return "cota", int(m.group(2))
    return "unknown", None


def rango(ficha, f):
    v = valor(ficha, f)[1]
    lo = ficha.get(f + "_min", "").strip()
    hi = ficha.get(f + "_max", "").strip()
    return (int(lo) if lo else v, int(hi) if hi else v)


def kappa_lineal(pares, k=5):
    n = len(pares)
    if n == 0:
        return None
    obs = [[0] * k for _ in range(k)]
    for a, b in pares:
        obs[a - 1][b - 1] += 1
    fa = [sum(obs[i]) for i in range(k)]
    fb = [sum(obs[i][j] for i in range(k)) for j in range(k)]
    w = lambda i, j: 1 - abs(i - j) / (k - 1)
    po = sum(w(i, j) * obs[i][j] for i in range(k) for j in range(k)) / n
    pe = sum(w(i, j) * fa[i] * fb[j] for i in range(k) for j in range(k)) / (n * n)
    if pe == 1:
        return None
    return (po - pe) / (1 - pe)


def es_true(x):
    return x.strip().lower() == "true"


def pct(a, n):
    return round(100.0 * a / n, 1) if n else ""


# ---------- D10 dentro de una empresa (metodología §7.2) ----------
def orden_d10(x, y):
    """'>' si x va antes, '<' si y va antes, '=' empate legítimo, '?' indeterminado.
    Banda vacía hasta la Fase 9: el paso 1 no decide."""
    cx, cy = int(x["c_raw"]), int(y["c_raw"])
    if cx != cy:
        return ">" if cx > cy else "<"
    for f in ("i_efectivo", "i_pers"):
        ex, vx = valor(x, f)
        ey, vy = valor(y, f)
        if ex == "valor" and ey == "valor":
            if vx != vy:
                return ">" if vx > vy else "<"
            continue
        # ≥ n o unknown: decide sólo si lo conocido alcanza (CH-086)
        if ex == "cota" and ey == "valor" and vy < vx:
            return ">"
        if ey == "cota" and ex == "valor" and vx < vy:
            return "<"
        return "?"
    return "="


def main():
    muestra = leer(os.path.join(F8, "sorteo", "muestra-emiliano.csv"))
    em = {r["risk_id"]: r for r in leer(os.path.join(F8, "emiliano", "fichas-emiliano.csv"))}
    ag, familia_de = {}, {}
    todas_ag = []
    for path in sorted(glob.glob(os.path.join(F8, "agente", "*", "fichas.csv"))):
        fam = os.path.basename(os.path.dirname(path))
        for r in leer(path):
            ag[r["risk_id"]] = r
            familia_de[r["risk_id"]] = fam
            todas_ag.append((fam, r))

    ids = [m["risk_id"] for m in muestra]
    faltan = [i for i in ids if i not in em or i not in ag]
    if faltan:
        sys.exit("Faltan fichas para: " + ", ".join(faltan))

    filas = []  # metricas.csv

    def fila(seccion, metrica, factor, n, numerador, valor_, target="", cumple="", nota=""):
        filas.append(dict(seccion=seccion, metrica=metrica, factor=factor, n=n, numerador=numerador,
                          valor=valor_, target=target, cumple=cumple, nota=nota))

    # ---------- versiones ----------
    vers = {(r["version_metodologia"], r["version_protocolo"]) for r in list(em.values()) + [r for _, r in todas_ag]}
    fila("condiciones", "versiones declaradas", "todas", len(em) + len(todas_ag), "", "; ".join(" + ".join(v) for v in sorted(vers)))

    # ---------- por factor ----------
    a1 = []
    for f in FACTORES:
        num, mismo_estado, exactos, pm1, rng_id, rng_sol, n_rng = [], 0, 0, 0, 0, 0, 0
        for rid in ids:
            e, a = em[rid], ag[rid]
            se, ve = valor(e, f)
            sa, va = valor(a, f)
            if se == sa:
                mismo_estado += 1
            if se == "valor" and sa == "valor":
                num.append((ve, va))
                exactos += ve == va
                pm1 += abs(ve - va) <= 1
                if f != "i_efectivo":
                    re_, ra = rango(e, f), rango(a, f)
                    n_rng += 1
                    rng_id += re_ == ra
                    rng_sol += not (re_[1] < ra[0] or ra[1] < re_[0])
                if abs(ve - va) > 1:
                    obs = lambda r: r["justificacion"] if f == "i_efectivo" else r[f + "_observacion"]
                    a1.append(dict(
                        anomalia_id="", fase=8, version_metodologia="metodologia v0.2", codigo="A1", factor=f,
                        riesgos_involucrados=rid,
                        descripcion=f"{f}: Emiliano {ve}, agente {va} (diferencia {abs(ve - va)}).",
                        dato_vs_metodologia="sin_clasificar", estado="abierta", decision="",
                        regla_resultante="", version_que_la_incorpora="",
                        valor_emiliano=ve, valor_agente=va,
                        observacion_emiliano=obs(e), observacion_agente=obs(a),
                        causa_8c=CAUSAS.get((rid, f), "")))
        n = len(num)
        p = pct(pm1, n)
        fila("factor", "% dentro de ±1", f, n, pm1, p, "≥ 80%", "sí" if n and p >= TARGET_PM1 else "no")
        fila("factor", "% exacto", f, n, exactos, pct(exactos, n))
        k = kappa_lineal(num)
        fila("factor", "kappa ponderado lineal", f, n, "", "" if k is None else round(k, 3),
             nota="indefinido: sin variación esperada" if k is None else "")
        fila("factor", "acuerdo de evaluabilidad", f, len(ids), mismo_estado, pct(mismo_estado, len(ids)),
             nota="mismo estado: ambos valor, ambos unknown/≥n o ambos no_aplica")
        if f != "i_efectivo":
            fila("factor", "rango idéntico", f, n_rng, rng_id, pct(rng_id, n_rng),
                 nota="rango = (min, max), o (valor, valor) sin rango")
            fila("factor", "rangos que se solapan", f, n_rng, rng_sol, pct(rng_sol, n_rng))

    # ---------- nivel de riesgo ----------
    for campo in ("evaluable", "consecuencia_extrema", "safety_critical"):
        same = sum(es_true(em[r][campo]) == es_true(ag[r][campo]) for r in ids)
        te = sum(es_true(em[r][campo]) for r in ids)
        ta = sum(es_true(ag[r][campo]) for r in ids)
        k = kappa_lineal([(2 if es_true(em[r][campo]) else 1, 2 if es_true(ag[r][campo]) else 1) for r in ids], k=2)
        fila("riesgo", "% coincidencia", campo, len(ids), same, pct(same, len(ids)),
             nota=f"true: Emiliano {te}, agente {ta}; kappa {'' if k is None else round(k, 3)}")
    ambos = [r for r in ids if es_true(em[r]["evaluable"]) and es_true(ag[r]["evaluable"])]
    cexact = sum(em[r]["c_raw"] == ag[r]["c_raw"] for r in ambos)
    fila("riesgo", "c_raw idéntico (informativo, sin target)", "c_raw", len(ambos), cexact, pct(cexact, len(ambos)))
    fila("riesgo", "banda", "banda", "", "", "pendiente de la Fase 9")

    # ---------- ranking dentro de una empresa (CH-077) ----------
    por_emp = {}
    for rid in ids:
        por_emp.setdefault(em[rid]["caso_empresa"], []).append(rid)
    n_par, conc, fuera = 0, 0, []
    for emp, rs in sorted(por_emp.items()):
        for x, y in combinations(sorted(rs), 2):
            evs = [es_true(d[r]["evaluable"]) for d in (em, ag) for r in (x, y)]
            if not all(evs):
                fuera.append(f"{x}/{y}")
                continue
            oe, oa = orden_d10(em[x], em[y]), orden_d10(ag[x], ag[y])
            n_par += 1
            conc += oe == oa
            fila("ranking_par", "orden D10", f"{x} vs {y}", 1, int(oe == oa), f"Emiliano {oe} · agente {oa}",
                 nota="> = el primero va antes")
    fila("ranking", "concordancia de orden (pares de una misma empresa)", "ranking", n_par, conc, pct(conc, n_par),
         nota="fuera por no evaluable en algún evaluador: " + ", ".join(fuera))

    # ---------- banderas en la población del agente (paso 5) ----------
    con_factores = [(fam, r) for fam, r in todas_ag if r["tipo_objeto"] != "padre"]
    fams = sorted({fam for fam, _ in con_factores})
    for fam in fams + ["total"]:
        rs = [r for fm, r in con_factores if fam in ("total", fm)]
        ext = sum(es_true(r["consecuencia_extrema"]) for r in rs)
        sc = sum(es_true(r["safety_critical"]) for r in rs)
        fila("banderas_agente", "consecuencia_extrema", fam, len(rs), ext, pct(ext, len(rs)))
        fila("banderas_agente", "safety_critical", fam, len(rs), sc, pct(sc, len(rs)))
        for d in DIMS:
            nd = sum(d in r["consecuencia_extrema_dimensiones"].split(";") for r in rs if es_true(r["consecuencia_extrema"]))
            fila("banderas_agente", f"consecuencia_extrema por {d}", fam, len(rs), nd, pct(nd, len(rs)))

    # ---------- escribir ----------
    with open(os.path.join(AQUI, "metricas.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    for i, r in enumerate(a1, 1):
        r["anomalia_id"] = f"AN-8C-{i:04d}"
    campos = ["anomalia_id", "fase", "version_metodologia", "codigo", "factor", "riesgos_involucrados", "descripcion",
              "dato_vs_metodologia", "estado", "decision", "regla_resultante", "version_que_la_incorpora",
              "valor_emiliano", "valor_agente", "observacion_emiliano", "observacion_agente", "causa_8c"]
    with open(os.path.join(AQUI, "anomalias-a1.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        w.writerows(a1)
    print(f"{len(ids)} pares, {len(a1)} A1, {len(con_factores)} fichas del agente con factores")


if __name__ == "__main__":
    main()
