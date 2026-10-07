#!/usr/bin/env python3
"""Sorteo de la muestra de Emiliano para la Fase 8 (T-0021, EMI-15 + EMI-41).

Regla: CH-076 y cobertura-empresas.md §6 (estratificación por familia).
Lee sólo las columnas risk_id, empresa, familia, tipo_objeto, riesgo_padre_id
y miembros de v0/emi41/lista-riesgos-*.csv. No abre fichas de información,
ni la intención de diseño, ni evaluaciones.

Uso (desde RAIZ/v0):  python3 fase-8/sorteo/sortear.py
Salida: fase-8/sorteo/muestra-emiliano.csv; la consola va a log.txt.

Unidad de sorteo: un riesgo simple, un escenario, o un padre con todos sus
sub-riesgos (cuenta tantas fichas como sub-riesgos). El padre en sí no suma.

Cuota exacta: dentro de cada familia las unidades se ordenan por risk_id y se
barajan con random.Random(SEMILLA + índice de la familia en CUOTAS). Se recorren
en ese orden; una unidad entra si cabe en lo que falta de la cuota y se salta si
la excede (sólo puede pasar con un padre de 3 sub-riesgos). Se para al llenar la
cuota. Como toda familia tiene riesgos simples de sobra, la cuota siempre se
llena exacta. El resultado es determinístico dada la semilla.
"""
import csv
import glob
import os
import random
import sys

SEMILLA = 731905  # registrada en fase-8/congelamiento.md §6 antes de correr

CUOTAS = [  # cobertura-empresas.md §6
    ("Minería", 5),
    ("Energía y agua", 3),
    ("Agro y alimentos", 7),
    ("Industria y construcción", 6),
    ("Comercio y logística", 3),
    ("Tecnología y pagos", 3),
    ("Servicios a personas", 3),
]
COLUMNAS = ["risk_id", "empresa", "familia", "tipo_objeto", "riesgo_padre_id", "miembros"]

base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # RAIZ/v0
filas = []
for ruta in sorted(glob.glob(os.path.join(base, "emi41", "lista-riesgos-*.csv"))):
    with open(ruta, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            filas.append({c: r[c] for c in COLUMNAS})
print(f"Semilla: {SEMILLA}")
print(f"Filas leídas: {len(filas)}")

# Unidades por familia
unidades = {}
subs = {}
for r in filas:
    if r["tipo_objeto"] == "sub_riesgo":
        subs.setdefault(r["riesgo_padre_id"], []).append(r)
for r in filas:
    t = r["tipo_objeto"]
    if t in ("riesgo", "escenario"):
        unidades.setdefault(r["familia"], []).append((r["risk_id"], [r]))
    elif t == "padre":
        hijos = sorted(subs.get(r["risk_id"], []), key=lambda x: x["risk_id"])
        if not hijos:
            sys.exit(f"Padre sin sub-riesgos: {r['risk_id']}")
        unidades.setdefault(r["familia"], []).append((r["risk_id"], hijos))
    elif t != "sub_riesgo":
        sys.exit(f"tipo_objeto desconocido: {t} en {r['risk_id']}")

familias_lista = {r["familia"] for r in filas}
if familias_lista != {f for f, _ in CUOTAS}:
    sys.exit(f"Familias no coinciden con la tabla: {sorted(familias_lista)}")

muestra = []
for i, (familia, cuota) in enumerate(CUOTAS):
    us = sorted(unidades[familia], key=lambda u: u[0])
    fichas = sum(len(m) for _, m in us)
    rng = random.Random(SEMILLA + i)
    orden = us[:]
    rng.shuffle(orden)
    elegidas, saltadas, falta = [], [], cuota
    for uid, miembros in orden:
        if falta == 0:
            break
        if len(miembros) <= falta:
            elegidas.append((uid, miembros))
            falta -= len(miembros)
        else:
            saltadas.append(uid)
    if falta:
        sys.exit(f"No se pudo llenar la cuota de {familia}")
    print(f"\n{familia}: {len(us)} unidades, {fichas} fichas, cuota {cuota}")
    for uid, miembros in elegidas:
        extra = f" (padre: {', '.join(m['risk_id'] for m in miembros)})" if len(miembros) > 1 else ""
        print(f"  + {uid}{extra}")
        muestra.extend(miembros)
    for uid in saltadas:
        print(f"  - {uid} saltada: no cabe en lo que faltaba de la cuota")

muestra.sort(key=lambda r: (r["empresa"], r["risk_id"]))
salida = os.path.join(base, "fase-8", "sorteo", "muestra-emiliano.csv")
with open(salida, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["risk_id", "empresa", "familia", "tipo_objeto", "riesgo_padre_id"])
    for r in muestra:
        w.writerow([r["risk_id"], r["empresa"], r["familia"], r["tipo_objeto"], r["riesgo_padre_id"]])
print(f"\nTotal en la muestra: {len(muestra)} fichas")
