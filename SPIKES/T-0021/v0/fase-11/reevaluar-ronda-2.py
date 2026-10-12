#!/usr/bin/env python3
"""Fase 11b, segunda ronda (respuesta de Emiliano del 2026-10-11 13:21 UTC al "Para aprobar").

Punto 4: no se acepta el umbral implícito de F11-4 (≥ 10 unidades, ≤ 10% de la capacidad). Las 17 fichas
de la primera ronda que aplicaron F11-4 se corrigen con el criterio de sustituibilidad real: F11-4 aplica
sólo si las demás unidades de la función toman el trabajo de la que se pierde, y la función no pierde
capacidad, throughput ni nivel de servicio de forma material. Donde no aplica, Continuidad vuelve al
valor de la Fase 8 (nivel por duración, con la degradación menor a la mitad un nivel abajo).
Punto 8: fichas nuevas sobre las fichas de Emiliano afectadas, sin sobrescribir las suyas.

Ninguna ficha anterior se toca: cada ficha nueva apunta a la anterior por `evaluacion_anterior_id`.
Escribe reevaluacion/fichas-ronda-2-factores.csv y reevaluacion/cambios-ronda-2.csv.
Uso: python3 reevaluar-ronda-2.py RAIZ
"""
import csv, glob, os, sys

sys.dont_write_bytecode = True
RAIZ = sys.argv[1] if len(sys.argv) > 1 else "."
V0 = os.path.join(RAIZ, "v0")
F8 = os.path.join(V0, "fase-8")
OUT = os.path.join(V0, "fase-11", "reevaluacion")
FECHA = "2026-10-11"
FACT = ["p", "i_econ", "i_pers", "i_cont", "i_legal", "v_cont", "v_rec"]

# F11-4 con sustituibilidad real. True: aplica (Continuidad 1, se corrige sólo la justificación).
F11_4 = {
    "S03-R01": (True, "Una unidad de 80. Las demás unidades de la flota, que incluye 4 tractores equivalentes en la base, toman sus viajes en el día (6 veces en 2025): el transporte no pierde capacidad material."),
    "S03-R02": (True, "Una unidad de 80. Las demás unidades de la flota toman sus viajes al día siguiente: el transporte no pierde capacidad material."),
    "S07-R07": (True, "Un camión de 62. Tras la pérdida total de 2025 la flota mantuvo el movimiento de material planificado durante los 11 meses de la reposición (observado): la unidad es sustituible."),
    "S09-R03": (True, "Un pozo de 32. Los demás pozos pueden subir 15 L/s en total, más que el caudal de un pozo, dentro del permiso: el bombeo no baja."),
    "S11-R04": (True, "Un camión de 22. La capacidad de transporte de la mina no cambia mientras falten 2 camiones o menos (2024-10 y 2026-04 sin pérdida de movimiento, observado)."),
    "S27-R02": (True, "Una sucursal de 60, cerrada hasta 30 días. En cada ciudad hay al menos 4 sucursales de S27 que atienden la misma demanda de dispensa: la sucursal es sustituible. No hay medición de cuántos clientes se trasladan (validar)."),
    "S09-R01": (False, "La salmuera perdida no la produce otra pileta: el bombeo está cerca del máximo permitido y la capacidad ociosa de la planta no la repone. Se pierde el 7% de la producción anual, 12 a 18 meses después: no es sustituible y la degradación es material."),
    "S20-R02": (False, "La capacidad de un silo (8% a 10% del almacenaje) no la toman los otros 11: cada silo es capacidad fija. Recepción y despacho siguen, pero la planta almacena menos durante 1 a 5 meses: degradación material de capacidad."),
    "S20-R03": (False, "Mismo criterio que S20-R02: la capacidad del silo clausurado no la toman los otros 11 durante el peritaje."),
    "S28-R02": (False, "La venta de un local depende de su ubicación: 4 de los 15 locales son los únicos de su ciudad, y el traslado de clientes a otro local de S28 es una medida de recuperación (§5.1), no redundancia de la función. Se pierde el 6,7% de la venta durante más de un año: degradación material."),
    "S32-R01": (False, "Cada equipo trabaja para una operadora en su locación y la empresa no tiene equipo de reserva: los otros 11 siguen con sus propios contratos y no toman el trabajo del que se pierde (la operadora puede dárselo a otro contratista). Se pierden los días facturables de ese equipo: degradación material del servicio."),
    "S32-R02": (False, "Mismo criterio que S32-R01: el equipo parado no lo reemplaza otro de la empresa."),
    "S32-R04": (False, "Mismo criterio que S32-R01: el equipo parado no lo reemplaza otro de la empresa."),
    "S33-R02": (False, "La energía de los strings fuera de servicio no la genera otro bloque: la generación del parque baja en esa proporción. No es sustituible: degradación material."),
    "S33-R04": (False, "La energía del bloque sin inversor no la genera otro bloque y no hay inversor de reserva: la generación baja 4% durante 6 a 8 meses. Degradación material."),
    "S33-R05": (False, "La energía de los bloques sin cable no la genera otro bloque: la generación baja 4% a 8%. Degradación material."),
    "S33-R06": (False, "La potencia perdida por la degradación de los módulos no la recupera otro bloque: la generación baja hasta 6%. Degradación material."),
}

# Punto 8: propuestas sobre fichas de Emiliano (sólo las que cambian). risk_id: [(marca, {factor: (valor, min, max)}, nota)]
EMI = {
    "S02-R07": [
        ("F11-1", {"i_econ": ("2", "1", "5")},
         "Hay base para elegir el escenario de referencia: el registro de entregas al cliente A muestra atrasos repetidos y ninguna rescisión. Escenario de referencia: un atraso; penalidad hasta USD 28 mil más horas extra y fletes, USD 30 a 40 mil / RO USD 1,52 M ≈ 2% a 2,6% → 2 (duda 1–2)."),
        ("F11-7", {"i_econ": (None, None, "5"), "i_cont": ("1", "1", "5")},
         "La rescisión del contrato marco (41% de la facturación, margen ~USD 2,4 M por año) es el peor creíble: va al máximo (Económico 5). Continuidad: un atraso no detiene la planta → 1; la rescisión (PH-800 ociosa 80%) va al máximo 5."),
    ],
    "S15-R04": [
        ("F11-2", {"i_econ": ("unknown", "3", "5")},
         "El monto de USD 195 mil no incluye lo que paga la ART (prestaciones e indemnización tarifada), que es parte del costo bruto. La información no lo trae y no se puede acotar: con él, el bruto puede pasar el 100% del RO (USD 310 mil) → unknown 3–5."),
    ],
}
NOTA_EMI = "Propuesta del agente sobre la ficha de Emiliano, a su pedido (2026-10-11 13:21 UTC, punto 8); la valida él."


def leer(p):
    with open(p, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main():
    f8_ag = {(f["evaluacion_id"], f["risk_id"]): f for p in sorted(glob.glob(os.path.join(F8, "agente", "*", "fichas.csv"))) for f in leer(p)}
    emi = {f["risk_id"]: f for f in leer(os.path.join(F8, "emiliano", "fichas-emiliano.csv"))}
    ronda1 = {f["risk_id"]: f for f in leer(os.path.join(OUT, "fichas-reevaluadas-factores.csv"))}
    campos = list(next(iter(ronda1.values())).keys())
    filas, log = [], []
    n = len(ronda1)

    def nueva(f, ant, evaluador_previo, motivo, marcas, cambios, notas):
        nonlocal n
        n += 1
        f = dict(f)
        for fac, (v, mn, mx) in cambios.items():
            antes = f"{f[fac + '_valor']} [{f[fac + '_min']}-{f[fac + '_max']}]"
            if v is not None:
                f[fac + "_valor"] = v
            if mn is not None:
                f[fac + "_min"] = mn
            if mx is not None:
                f[fac + "_max"] = mx
            log.append({"risk_id": f["risk_id"], "evaluador_anterior": evaluador_previo, "evaluacion_anterior_id": ant,
                        "evaluacion_id": f"EV-11-{n:04d}", "factor": fac, "antes": antes,
                        "despues": f"{f[fac + '_valor']} [{f[fac + '_min']}-{f[fac + '_max']}]", "motivo": motivo})
        for fac, nota in notas:
            f[fac + "_observacion"] = f"{f[fac + '_observacion']} {nota}"
        f.update({
            "evaluacion_id": f"EV-11-{n:04d}", "evaluador": "agente-11b", "actor": "ai", "fase": "11",
            "corrida_id": "F11-REG-01", "version_metodologia": "metodologia v1 candidate",
            "version_protocolo": "protocolo v1 candidate", "fecha": FECHA, "tipo_evaluacion": "reevaluacion",
            "evaluacion_anterior_id": ant, "motivo": motivo, "review_status": "pending", "revisado_por": "",
            "fecha_revision": "",
            "reglas_aplicadas": ";".join(dict.fromkeys([x for x in f["reglas_aplicadas"].split(";") if x] + marcas)),
        })
        filas.append(f)

    for rid in sorted(F11_4):
        aplica, txt = F11_4[rid]
        r1 = ronda1[rid]
        orig = f8_ag[(r1["evaluacion_anterior_id"], rid)]
        nota = (f"**[F11-4 corregido, {FECHA}]** Sin el umbral de la primera ronda, que Emiliano no aceptó (punto 4). {txt} "
                + ("F11-4 aplica: Continuidad 1." if aplica else
                   f"F11-4 no aplica: Continuidad vuelve al valor por duración de la ficha de la Fase 8 ({orig['i_cont_valor']})."))
        cambios = {} if aplica else {"i_cont": (orig["i_cont_valor"], orig["i_cont_min"], orig["i_cont_max"])}
        nueva(r1, r1["evaluacion_id"], "agente-11b", "correccion_evaluacion", ["F11-4"], cambios, [("i_cont", nota)])

    for rid in sorted(EMI):
        f = emi[rid]
        marcas, cambios, notas = [], {}, []
        for marca, cs, nota in EMI[rid]:
            marcas.append(marca)
            for fac, t in cs.items():
                prev = cambios.get(fac, (None, None, None))
                cambios[fac] = tuple(x if x is not None else y for x, y in zip(t, prev))
            notas.append((next(iter(cs)), f"**[{marca}, {FECHA}]** {nota}"))
        notas.append(("i_econ", NOTA_EMI))
        nueva(f, f["evaluacion_id"], "emiliano", "cambio_version_metodologia", marcas, cambios, notas)

    with open(os.path.join(OUT, "fichas-ronda-2-factores.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        w.writerows({k: f.get(k, "") for k in campos} for f in filas)
    with open(os.path.join(OUT, "cambios-ronda-2.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(log[0].keys()))
        w.writeheader()
        w.writerows(log)
    print(f"{len(filas)} fichas nuevas (EV-11-{len(ronda1) + 1:04d} a EV-11-{n:04d}), {len(log)} factores cambiados")


if __name__ == "__main__":
    main()
