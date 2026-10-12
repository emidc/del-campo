#!/usr/bin/env python3
"""Fase 11b · fichas nuevas del agente por correcciones de asignación (protocolo §13).

Copia la ficha anterior de la Fase 8, cambia sólo los factores que la corrección alcanza y agrega
la nota con la marca [F11-n]. No toca ninguna ficha anterior. Los campos derivados los completa
`regresion.py` (con las reglas de la v1 candidate) en `reevaluacion/fichas-reevaluadas.csv`.
Uso: python3 reevaluar.py RAIZ
"""
import csv, glob, os, sys

sys.dont_write_bytecode = True
RAIZ = sys.argv[1] if len(sys.argv) > 1 else "."
F8 = os.path.join(RAIZ, "v0", "fase-8", "agente")
OUT = os.path.join(RAIZ, "v0", "fase-11", "reevaluacion")
FECHA = "2026-10-11"
LECTURA_F11_4 = ("Lectura del evaluador, no regla: una unidad entre diez o más equivalentes y una pérdida de hasta "
                 "un décimo de la capacidad de la función, que sigue entregando.")

# risk_id: [(marca, {factor: (valor, min, max)}, nota)]. Un valor None deja ese campo como estaba.
C = {
    # F11-1 escenario de referencia único (EV-01)
    "S08-R03": [("F11-1", {"i_econ": ("unknown", "2", "4"), "i_cont": ("unknown", "2", "4")},
                 "Sin base para elegir un escenario de referencia entre rodamiento (1–4 días), motor (5 a 14 semanas) y corte de energía (minutos): los antecedentes (40 min en 2024-01, 9 h en 2021-06) no dicen cuál es más frecuente y los precursores apuntan a rodamiento y motor. Antes los valores salían del motor y la P de cualquier detención. Económico y Continuidad quedan unknown con el rango que cubre los escenarios.")],
    "S04-R04": [("F11-1", {"i_econ": ("2", "2", "5")},
                 "Escenario de referencia: entrar y leer o descargar datos de un cliente, que es lo que define el evento; Legal (3) ya salía de ese escenario. La desviación de pagos exige además cambiar datos bancarios y va al máximo. Asesoría, forense y notificación ≈ USD 100–150 mil / RO 2025 USD 2,0 M = 5–7,5% → 2; máximo 5 (desviación sobre el cliente principal).")],
    # F11-2 seguros obligatorios (EV-03)
    "S02-R01": [("F11-2", {"i_econ": ("unknown", "2", "4")},
                 "Las prestaciones médicas y la indemnización por incapacidad permanente que paga la ART son bruto (D17, §4.1.7) y la ficha no las cuantifica. Con reclamo civil, multa y costos (6,9–11% del RO) más esa indemnización, el bruto puede quedar en 2, 3 o 4 sin base para preferir → unknown con ese rango.")],
    "S02-R02": [("F11-2", {"i_econ": ("unknown", "2", "4")},
                 "Con un trabajador aplastado, las prestaciones y la indemnización que paga la ART son bruto (D17, §4.1.7) y la ficha no las cuantifica. Sumadas a multa, reclamo civil y daños (6–11% del RO), el bruto puede quedar en 2, 3 o 4 sin base para preferir → unknown con ese rango.")],
    "S37-R02": [("F11-2", {"i_econ": ("unknown", "2", "5")},
                 "Prestaciones, salarios e indemnización por incapacidad que paga la ART son bruto (D17, §4.1.7); la ficha no da el monto. Con una magnitud de referencia de USD 0,16 M cualquier indemnización por una amputación cambia el nivel: rango 2–5, más de tres niveles → unknown."),
                ("F11-3", {"p": ("4", "4", "5")},
                 "La tasa de la superintendencia cuenta lesiones con baja, no todo contacto de la mano con la hoja o la fresa: es una cota inferior (17–35% anual, ancla 3) y no fija el nivel. Historia propia: corte de 2024-06 dentro de 36 meses → 4. Los rozones de 2025 (sin evidencia) darían 5 → máximo. Sin ajuste.")],
    "S37-R03": [("F11-2", {"i_econ": ("unknown", "1", "2")},
                 "Prestaciones médicas y salarios de bajas cortas que paga la ART son bruto (D17, §4.1.7), sin monto en la ficha. Con la magnitud de referencia de USD 0,16 M (2% = USD 3,2 mil) pueden quedar en 1 o 2 sin base para preferir → unknown con ese rango.")],
    "S34-R06": [("F11-2", {"i_econ": ("unknown", "2", "5")},
                 "La muerte plausible del operador (Personas 4) lleva prestaciones e indemnización a cargo de la aseguradora de riesgos del trabajo, que son bruto (D17, §4.1.7); la ficha no da el monto. Con RO USD 0,52 M cualquier indemnización cambia el nivel: rango 2–5 → unknown.")],
    # F11-3 comparabilidad de jerarquía 1 (EV-04)
    "S22-R02": [("F11-3", {"p": ("4", "", "")},
                 "La tasa de la cámara cuenta sólo liberaciones con lesionados, no toda liberación: es una cota inferior (~0,8% anual) y no fija el nivel. Decide la historia propia: liberación de 2021-09 → ancla 3; +1 (§3.4.2) por el flexible con prueba hidráulica vencida, la prueba de hermeticidad omitida y el detector fuera de calibración → 4.")],
    "S15-R01": [("F11-3", {"p": ("4", "", "")},
                 "La base de la aseguradora cuenta siniestros con daño mayor al 10% por finca, no toda caída de granizo: es una cota inferior (17% con dos fincas, ancla 3) y no fija el nivel. Historia propia de 15 temporadas: granizo de 2025-12 dentro de 36 meses → 4. Sin ajustes.")],
    "S29-P01-S02": [("F11-3", {"p": ("3", "", "")},
                     "La estadística del equipo de respuesta cuenta casos con consecuencia (ransomware, compromiso de datos), no la ejecución de código con privilegios en producción: es una cota inferior (2,9% anual) y no fija el nivel. Precursores propios (equipo rojo 2026-03, campaña de 2026-06 con 12 clics) y comparable de un país vecino en 2024-09 → ancla 3. Sin ajuste: las llaves físicas ya existían durante los precursores.")],
    "S29-R04": [("F11-3", {"p": ("3", "", "")},
                 "La estadística de la red de tarjetas cuenta compromisos de datos, no el uso de una credencial privilegiada sin motivo: es una cota inferior (0,17%) y no fija el nivel. Antecedente propio de 2023-02, hace más de 36 meses → ancla 3. Sin ajuste.")],
    "S04-R02": [("F11-3", {"p": ("4", "3", "4")},
                 "La encuesta de la cámara mide ransomware que afectó producción, no la ejecución de código con privilegios: es una cota inferior (3,9%) y no fija el nivel. Comparable de la misma ciudad en 2025-06 y precursores propios → ancla 3; +1 (§3.4.2) por condiciones peores que lo habitual (segundo factor en 70% de las identidades, copias en la misma cuenta, 14 vulnerabilidades críticas abiertas, claves sin rotar) → 4. Mínimo 3 sin el ajuste.")],
    # F11-8 muerte directa y creíble (EV-30)
    "S22-R04": [("F11-7", {"i_legal": ("1", "1", "4")},
                 "El límite de tres niveles es sobre la duda del valor plausible: plausible 1 (denuncia a la ART sin actuación de la autoridad, como en 2023–2026); la muerte con causa penal posible es el peor creíble → máximo 4. El factor deja de ser unknown."),
                ("F11-8", {"i_pers": ("4", "2", "4")},
                 "Una muerte por atropello es consecuencia directa del evento y creíble (2 muertes en el sector) → 4. Lo más frecuente (contusiones, 7 de 8) queda como mínimo 2.")],
    "S31-R06": [("F11-8", {"i_pers": ("4", "3", "4")},
                 "En una colisión con un camión pesado en ripio, sin alerta ni ambulancia (bruto), una muerte es consecuencia directa y creíble: hubo fallecidos en el yacimiento antes de 2017 y la tasa provincial lo registra → 4. La internación (lo más frecuente con lesionados) queda como mínimo 3.")],
    "S32-R05": [("F11-8", {"i_pers": ("4", "3", "4")},
                 "Atrapamiento o golpe por la tubería o una llave: la amputación propia de 2025 (incapacidad permanente) y el fallecido de la cuenca en 2022 por una llave hidráulica muestran que la muerte o el daño irreversible son directos y creíbles → 4. Fracturas con baja quedan como mínimo 3.")],
    "S19-R06": [("F11-8", {"i_pers": ("4", "3", "4")},
                 "El evento incluye la salpicadura en los ojos; con soda al 50% y sin lavado (bruto), la pérdida parcial de la visión es consecuencia directa y creíble → daño irreversible grave, 4. La quemadura con incapacidad temporal queda como mínimo 3.")],
    "S14-R04": [("F11-8", {"i_pers": ("4", "3", "4")},
                 "Con pocos casos de neumonía (2 a 9 en los brotes del sector, 24% de usuarios mayores de 60) y letalidad notificada de 8–12%, una muerte es consecuencia directa y creíble del escenario → 4."),
                ],
    "S26-R03": [("F11-8", {"i_pers": ("4", "3", "4")},
                 "El 3% de los errores de medicación con daño termina en muerte o daño permanente, en pacientes internados: consecuencia directa y creíble del evento → 4. La internación prolongada queda como mínimo 3.")],
    # F11-9 medida anticipatoria (EV-32)
    "S35-R02": [("F11-9", {"v_cont": ("3", "3", "4")},
                 "El protocolo de evacuación por viento (ráfagas de más de 60 km/h, probado en 2025-10) se activa ante un colapso inminente y limita el daño a las personas cuando la carpa cae: es contención aunque actúe antes (§5.1). No evita la pérdida de la carpa ni el reintegro → limita parte del daño y deja pasar una parte importante → 3.")],
    # F11-7 peor creíble y tres niveles (EV-29)
    "S02-R07": [("F11-7", {"i_econ": ("2", "2", "5")},
                 "El límite de tres niveles es sobre la duda del plausible: plausible 2 (atraso de 3 a 7 días hábiles, 8 de 10 casos); la rescisión por un tercer atraso largo es el peor creíble → máximo 5. El factor deja de ser unknown.")],
    "S22-R06": [("F11-7", {"i_econ": ("2", "2", "5")},
                 "Escenario de referencia: fisura de la camisa, el mismo que fija Continuidad 3 (1 a 2 semanas sin R-1 × USD 660 mil por mes + USD 15–30 mil ≈ USD 0,18–0,36 M / RO USD 6,2 M = 3–6%) → 2. La perforación reparable (3 a 6 semanas) da 3 y el reactor nuevo es el peor creíble → máximo 5. El factor deja de ser unknown.")],
    "S03-R04": [("F11-7", {"i_econ": (None, None, "5"), "i_cont": (None, None, "5")},
                 "El peor creíble (pérdida completa del servidor sin poder reinstalar, hasta 7 meses de implementación) va al máximo aunque supere tres niveles: Económico 5, Continuidad 5.")],
    "S28-R07": [("F11-7", {"i_econ": (None, None, "4"), "i_cont": (None, None, "4")},
                 "El peor creíble (pérdida del servidor sin réplica, semanas) va al máximo: Económico 4 (14–41% del RO), Continuidad 4.")],
    "S36-R02": [("F11-7", {"i_econ": (None, None, "5"), "i_pers": (None, None, "4")},
                 "El peor creíble (muerte por la caída de un arco móvil, sector 2019) va al máximo aunque supere tres niveles: Económico 5 (USD 150–400 mil sobre el fondo de reserva), Personas 4. No es directa del evento típico (requiere el arco suelto): no cambia el valor de Personas.")],
    "S36-R04": [("F11-7", {"i_econ": (None, None, "5")},
                 "El peor creíble (abuso sexual con reclamo de USD 150–400 mil) va al máximo: Económico 5.")],
    "S06-R02": [("F11-7", {"i_econ": (None, None, "5")},
                 "El peor creíble (corte de varios días en temporada, con la fruta de los clientes por varias veces el RO) va al máximo: Económico 5.")],
    "S21-R01": [("F11-7", {"i_econ": (None, None, "5")},
                 "El peor creíble (granizo del 45% de la finca 2 con la facturación perdida entera) va al máximo: Económico 5.")],
    "S10-R06": [("F11-7", {"i_cont": (None, None, "4")},
                 "El peor creíble (cautelar que suspende voladuras 45 días) va al máximo: Continuidad 4.")],
}
# F11-4 degradación material (EV-05): Continuidad pasa a 1.
F11_4 = {
    "S03-R01": "Una unidad de 80 (1,25% de la capacidad de transporte)",
    "S03-R02": "Una unidad de 80 (1,25% de la capacidad de transporte)",
    "S27-R02": "Una sucursal de 60 cerrada hasta 30 días; la dispensa sigue en las otras 59",
    "S20-R02": "Un silo de 12 (8–10% del almacenaje) 1 a 5 meses; recepción y despacho siguen",
    "S20-R03": "Un silo de 12 clausurado 3 a 10 días; la planta sigue con 11",
    "S33-R02": "Strings fuera de servicio (5,7% de la generación, como en 2022)",
    "S33-R04": "Un bloque de 25 (4% de la potencia) 6 a 8 meses",
    "S33-R05": "Uno o dos bloques de 25 (4–8% de la potencia) 2 a 14 días",
    "S33-R06": "1–6% de la generación del parque",
    "S07-R07": "Un camión de 62 (1,6% del transporte de mineral)",
    "S09-R01": "Una pileta de 38 fuera de servicio 3 a 4 meses",
    "S09-R03": "Un pozo de 32 (3,1% del bombeo)",
    "S11-R04": "Un camión de 22 (4,5% del transporte)",
    "S28-R02": "Un local de 15 (6,7% de la venta) cerrado 10 a 16 meses; los otros 14 siguen. Caso límite: más de un año al 93% puede leerse como degradación material",
    "S32-R01": "Un equipo de 12 (~8% del servicio) unos 4 meses. Caso límite: cada equipo atiende un contrato",
    "S32-R02": "Un equipo de 12 (~8% del servicio) 2 a 6 semanas. Caso límite: cada equipo atiende un contrato",
    "S32-R04": "Un equipo de 12 (~8% del servicio) 45 a 90 días. Caso límite: cada equipo atiende un contrato",
}
for rid, txt in F11_4.items():
    C.setdefault(rid, []).insert(0, ("F11-4", {"i_cont": ("1", "", "")},
        f"{txt}: la función sigue sin degradación material de capacidad, throughput o nivel de servicio → 1 (§4.4). {LECTURA_F11_4}"))
# S03-R01 también recibe el máximo de Económico por F11-7.
C["S03-R01"].append(("F11-7", {"i_econ": (None, None, "4")},
    "El peor creíble (siniestro con muerte de un tercero y reclamo civil de USD 150–380 mil, ≥ 30% del RO) va al máximo: Económico 4."))

MOTIVO = "cambio_version_metodologia"


def main():
    previas = {}
    for p in sorted(glob.glob(os.path.join(F8, "*", "fichas.csv"))):
        with open(p, newline="", encoding="utf-8") as fh:
            for f in csv.DictReader(fh):
                previas[f["risk_id"]] = f
    campos = list(next(iter(previas.values())).keys())
    filas, log = [], []
    for n, rid in enumerate(sorted(C), 1):
        f = dict(previas[rid])
        ant = f["evaluacion_id"]
        marcas = []
        for marca, cambios, nota in C[rid]:
            marcas.append(marca)
            for fac, (v, mn, mx) in cambios.items():
                antes = f"{f[fac + '_valor']} [{f[fac + '_min']}-{f[fac + '_max']}]"
                if v is not None:
                    f[fac + "_valor"] = v
                if mn is not None:
                    f[fac + "_min"] = mn
                if mx is not None:
                    f[fac + "_max"] = mx
                despues = f"{f[fac + '_valor']} [{f[fac + '_min']}-{f[fac + '_max']}]"
                f[fac + "_observacion"] = f"{f[fac + '_observacion']} **[{marca}, {FECHA}]** {nota}"
                log.append({"risk_id": rid, "evaluacion_anterior_id": ant, "marca": marca, "factor": fac,
                            "antes": antes, "despues": despues})
        f.update({
            "evaluacion_id": f"EV-11-{n:04d}", "evaluador": "agente-11b", "actor": "ai", "fase": "11",
            "corrida_id": "F11-REG-01", "version_metodologia": "metodologia v1 candidate",
            "version_protocolo": "protocolo v1 candidate", "fecha": FECHA, "tipo_evaluacion": "reevaluacion",
            "evaluacion_anterior_id": ant, "motivo": MOTIVO, "review_status": "pending", "revisado_por": "",
            "fecha_revision": "",
            "reglas_aplicadas": ";".join(dict.fromkeys(f["reglas_aplicadas"].split(";") + marcas)),
        })
        filas.append(f)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "fichas-reevaluadas-factores.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=campos)
        w.writeheader()
        w.writerows(filas)
    with open(os.path.join(OUT, "cambios-por-factor.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(log[0].keys()))
        w.writeheader()
        w.writerows(log)
    print(f"{len(filas)} fichas nuevas, {len(log)} factores cambiados")


if __name__ == "__main__":
    main()
