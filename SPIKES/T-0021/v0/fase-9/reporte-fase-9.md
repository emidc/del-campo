# Reporte de la Fase 9 · calibración de bandas sobre la población sintética

> Fase 9b del plan EMI-15 + EMI-41 (T-0021) · 2026-10-08 · protocolo §12 pasos 4 a 7 · metodologia v0.2 y protocolo v0.2 (sin cambios: es una fase de combinación, ningún factor se tocó) · corrida `F9B-CAL-01` · agente: la sesión de la 9a, que no evaluó en la 8b.
> Script: `calibrar.py` (`python3 calibrar.py RAIZ`), sólo lee fichas. Salidas: `bandas-sinteticos.csv`, `bandas-por-empresa.csv`, `bandas-muestra.csv`, `anomalias-banda.csv`, `discriminacion-contrastes.csv`, `regresion-bandas.csv`.
> **Aprobado por Emiliano el 2026-10-08 21:52 UTC** (1a, 2a, 3a con su redacción de D23 y §8.2; texto en `decisiones-9a.md`). El 69,6% queda como **target de 70% no alcanzado**. Aplicado en la v0.3 con CH-093 a CH-096.
> **I15.** Ni los casos de propiedad ni las 252 fichas sintéticas son la población donde se va a aplicar Risk OS: las dos son contrastantes por diseño. Las distribuciones de este reporte sirven para ver si los cortes discriminan y si concentran o vacían bandas, **no** para decir qué distribución esperar en empresas reales. Los cortes se calibraron sobre casos de propiedad; la coincidencia de banda de la muestra se mide sobre empresas que Emiliano y el agente ya evaluaron.

## Resumen

1. **Distribución** (233 riesgos evaluables del ranking principal, juego elegido 20/50/75): Baja 8,6% · **Media 62,2%** · Alta 20,6% · Crítica 8,6%. Ninguna banda vacía.
2. **Señal §12.6: Media concentra más de la mitad** con el juego elegido. Con Alta ≥ 45 la señal desaparece (Media 36%, Alta 47%). La concentración ya está en el diseño: la intención de los autores, con los mismos cortes, pone el 68% en Media.
3. **El corte que más mueve es el de 50.** 61 riesgos (26%) están en 45 o 48. Entre ellos hay 10 con `consecuencia_extrema` en 45 (P 3, I 5, V 3), el mismo perfil que CP-18, que adjudicaste Alta.
4. **Coincidencia de banda en la muestra:** 16 de 23 = **69,6%** frente al target de 70% (n chico: con 17 se cumplía). 13 A1 de banda: 6 por evaluabilidad, 6 por factores dentro de ±1 que cruzan un corte y 1 por la A1 de P de S22-R02.
5. **Discriminación:** el agente deja en la misma banda el 36% de los pares de una misma empresa que la intención separaba. Con banda como paso 1, D10 nunca ordena distinto que `C_raw` (las bandas son cortes monótonos).
6. **Baja:** 20 riesgos (8,6%), en 14 de 37 empresas. Ningún extremo cae en Baja; 2 `safety_critical` sí (S22-R02 y S26-R06, P 2).
7. **Remoto extremo:** la población casi no lo prueba. En el ranking principal hay 1 riesgo con P 1 (sin ninguna dimensión en 5) y 10 con P 2; sólo 2 combinan P 2 con una dimensión en 5, y los dos quedan en Media. Fuera del ranking, el escenario S07-E01 (P 1, I 5) también queda en Media.
8. **Regresión:** sin cambio respecto de la 9a: 13 PASS, 3 FAIL — calibración (CP-05, CP-17, CP-18) y 4 FAIL de la Fase 5.
9. **Recomendación:** mantener 20/50/75 como umbrales de v0.3, registrar la señal de Media sin ajustar, y corregir D23 y §8.2 como decidiste.

---

## 1. Punto de partida (paso 1)

**Decisiones de Emiliano** (thread "Fase 9a umbrales preliminares", 2026-10-08 21:44 UTC; copiadas en `decisiones-9a.md`): juego **A, cortes 20 / 50 / 75**, provisional para la 9b; contradicción #2 **a**, sin piso, "corresponde corregir esa afirmación de D23"; CP-05 R1 **a**, FAIL — calibración, que conserva la adjudicación original y el límite de `max()` como evidencia; avanzar "prestando especial atención a Baja y a los casos de severidad extrema con probabilidad baja … sin forzar cupos por banda".

**Verificación.** Recalculé `C_raw` y `evaluable` desde los factores (§5.5, §6, §9.3) en las 252 fichas del agente, las 30 de Emiliano y las 51 de los casos: **ninguna diferencia** con lo escrito en las fichas. Los 3 padres toman la posición y la banda de su hijo prioritario (§1.4).

**Juegos** (Media ≥ / Alta ≥ / Crítica ≥):

| Juego | Cortes | Por qué está |
|---|---|---|
| **E** | 20 / 50 / 75 | El que elegiste |
| B | 20 / 45 / 75 | El segundo de la 9a |
| D | 36 / 50 / 75 | Corre el corte que no tenía casos (Baja/Media) al otro extremo de su hueco. Lo elegí sobre el de Crítica porque pediste mirar Baja; la sensibilidad de Crítica está en §2.3 |

---

## 2. Distribución (paso 4)

Población principal: los 243 objetos del ranking principal (240 riesgos y 3 padres), de los que 233 son evaluables y 10 no evaluables (sin banda, lista aparte). Las 252 fichas con factores (que suman 9 sub-riesgos y 3 escenarios) dan casi lo mismo y están en `bandas-sinteticos.csv`.

| Juego | Baja | Media | Alta | Crítica |
|---|---|---|---|---|
| **E** | 20 (8,6%) | **145 (62,2%)** | 48 (20,6%) | 20 (8,6%) |
| B | 20 (8,6%) | 84 (36,1%) | 109 (46,8%) | 20 (8,6%) |
| D | 84 (36,1%) | 81 (34,8%) | 48 (20,6%) | 20 (8,6%) |

**Por familia** (Baja / Media / Alta / Crítica, juego E):

| Familia | n | E | B | D |
|---|---|---|---|---|
| Agro y alimentos | 57 | 6/34/13/4 | 6/19/28/4 | 21/19/13/4 |
| Comercio y logística | 26 | 3/14/7/2 | 3/7/14/2 | 9/8/7/2 |
| Energía y agua | 22 | 0/**19**/2/1 | 0/11/10/1 | 8/11/2/1 |
| Industria y construcción | 42 | 4/24/6/8 | 4/14/16/8 | 17/11/6/8 |
| Minería | 41 | 0/24/14/3 | 0/13/25/3 | 10/14/14/3 |
| Servicios a personas | 27 | 2/17/6/2 | 2/9/14/2 | 7/12/6/2 |
| Tecnología y pagos | 18 | 5/13/0/0 | 5/11/2/0 | 12/6/0/0 |

**Por dimensión determinante** (juego E): Continuidad 0/12/0/1, Legal 1/15/2/1, Personas 0/20/6/1, Económico 3/25/9/7, varias empatadas 14/73/31/9. Continuidad y Legal casi nunca determinan una banda por encima de Media.

**Por empresa** (`bandas-por-empresa.csv`): con E, 2 empresas tienen una sola banda y 19 tienen dos; 23 de 37 no tienen ningún riesgo en Baja y 14 tienen alguno en Crítica. En promedio, la banda más poblada de cada empresa tiene el 66% de sus riesgos (B 59%, D 53%). Como el ranking es siempre dentro de una empresa (CH-075), esto es lo que ve un directorio: con E, en la mayoría de las empresas casi todo dice "Media" y el orden lo hace `C_raw`.

### 2.1 Dónde se acumula: 45 y 48

61 de los 233 riesgos (26%) tienen `C_raw` 45 (25) o 48 (36). Con Alta ≥ 50 van todos a Media; con Alta ≥ 45, todos a Alta. Esa es toda la diferencia entre E y B, y es lo que decide la señal. Los casos de propiedad tenían el corte acá: CP-03 R2 (48, Media) y CP-18 (45, Alta).

### 2.2 Sensibilidad del corte Baja/Media (Alta 50, Crítica 75)

| Media ≥ | 12 | 16 | 18 | **20** | 24 | 25 | 30 | 32 | 36 |
|---|---|---|---|---|---|---|---|---|---|
| Baja | 1,3% | 3,9% | 6,9% | **8,6%** | 13,3% | 19,3% | 20,6% | 30,5% | 36,1% |
| Media | 69,5% | 67,0% | 63,9% | **62,2%** | 57,5% | 51,5% | 50,2% | 40,3% | 34,8% |

Baja nunca queda vacía con cortes de 16 o más. Recién con Media ≥ 32 (o Alta ≥ 45) Media baja de la mitad.

### 2.3 Sensibilidad del corte de Crítica (Media 20, Alta 50)

| Crítica ≥ | **75** | 80 | 100 | 125 |
|---|---|---|---|---|
| Alta | **20,6%** | 22,7% | 28,3% | 29,2% |
| Crítica | **8,6%** | 6,4% | 0,9% | **0% (vacía)** |

Con 100 Crítica queda casi vacía (2 riesgos). 75 sigue siendo el valor más defendible.

---

## 3. Banda en la muestra (§11 regla 4)

Mismos 30 `risk_id`, banda calculada desde los factores de cada uno (`bandas-muestra.csv`).

| Juego | Los dos evaluables (n = 23) | "No evaluable" como categoría (n = 30) |
|---|---|---|
| **E** | **16 / 23 = 69,6%** (target ≥ 70%) | 17 / 30 = 56,7% |
| B | 15 / 23 = 65,2% | 16 / 30 = 53,3% |
| D | 15 / 23 = 65,2% | 16 / 30 = 53,3% |

**Matriz, juego E** (filas Emiliano, columnas agente):

| | Baja | Media | Alta | Crítica | No evaluable |
|---|---|---|---|---|---|
| Baja | 0 | 0 | 0 | 0 | 0 |
| Media | 1 | **11** | 0 | 0 | 0 |
| Alta | 1 | 3 | **5** | 0 | 0 |
| Crítica | 0 | 2 | 0 | **0** | 0 |
| No evaluable | 0 | 5 | 1 | 0 | **1** |

Todos los desacuerdos van en la misma dirección: **el agente pone una banda más baja que Emiliano**, nunca más alta. Los factores de Emiliano son en promedio un poco más severos (P y Personas, reporte de la Fase 8) y el producto lo amplifica al cruzar un corte.

**A1 de banda** (`anomalias-banda.csv`, AN-9B-0001 a AN-9B-0013, juego E):

| Causa | n | Riesgos |
|---|---|---|
| Evaluabilidad (Emiliano no evaluable, agente con banda) | 6 | S04-R03, S12-R05, S13-R05, S19-R06, S28-R07, S37-R03 |
| Factores distintos dentro de ±1 que cruzan un corte | 6 | S07-R01 (60/45), S08-R03 (75/48), S18-R03 (60/48), S20-R06 (36/12), S24-R03 (60/48), S31-R06 (80/45) |
| Factor a más de un nivel | 1 | S22-R02 (60/16): la A1 de P de la Fase 8 (AN-8C-0001) |

En 7 de los 13 la bandera también difiere (`consecuencia_extrema` o `safety_critical`): son las mismas diferencias de Personas 5/4 o 4/3 en el umbral que ya mostró la 8c. Tres de los seis cruces de corte (S07-R01, S18-R03, S24-R03) coinciden con el juego B: caen a los dos lados de 50 (en 45 o 48 contra 60).

**Ranking con banda como paso 1:** 2 de 3 pares concordantes con los tres juegos, lo mismo que en la 8c. No cambia nada: si las bandas son cortes sobre `C_raw`, el paso 1 nunca contradice al paso 2.

---

## 4. Discriminación (paso 5)

Referencia: la **intención de diseño**, es decir, el `C_raw` que pretendía el autor de cada ficha, recalculado con la v0.2 (`intencion-vs-fichas.csv`). No es una adjudicación de Emiliano.

| Juego | Misma banda que la intención (n = 227) | A 2 o más bandas | Pares de una misma empresa que la intención separa | … que el agente deja en la misma banda |
|---|---|---|---|---|
| **E** | 146 (64,3%) | 9 | 278 | **101 (36,3%)** |
| B | 142 (62,6%) | 6 | 361 | 112 (31,0%) |
| D | 130 (57,3%) | 16 | 388 | 103 (26,5%) |

**Intención contra agente, juego E** (filas intención, columnas agente):

| | Baja | Media | Alta | Crítica |
|---|---|---|---|---|
| Baja | 9 | 12 | 1 | 2 |
| Media | 9 | **116** | 25 | 5 |
| Alta | 0 | 15 | 16 | 7 |
| Crítica | 0 | 1 | 4 | 5 |

- La intención misma pone **155 de 227 (68%) en Media** con estos cortes. La concentración de Media no la produce el evaluador: viene del diseño de la población.
- Nada pretendido Alta o Crítica cae en Baja. Lo que más se mezcla es Baja ↔ Media (21) y Media ↔ Alta (40).
- **Pares de prueba de D14** (`pares-d14.csv`, 26): con E, 10 quedan en la misma banda (con B 1, con D 0); el frecuente queda arriba en 2, igual que con `C_raw`; el paso 1 de D10 no ordena ninguno distinto que `C_raw`.
- **Contrastes** (`discriminacion-contrastes.csv`): de 175 pares de una misma empresa que la intención separaba de banda, el agente deja 75 en la misma. Los que más mezclan son C18 (7 de 9), C21 (6 de 9), C15 (4 de 5) y C06 (4 de 7). En C21 la intención ponía 6 riesgos en Baja y el agente ninguno: es el contraste de rangos, donde el valor plausible del agente sube.

---

## 5. Señal de distribución (paso 6)

| Juego | ¿Una banda > 50%? | ¿Banda vacía? |
|---|---|---|
| **E** | **Media (62,2%)** | No |
| B | No (Alta 46,8%) | No |
| D | No (Baja 36,1%) | No |

Es una señal para revisar, no una cuota. Cómo la leo:
- Viene del diseño (la intención da 68% en Media) y del bloque de 45 y 48 (§2.1), no de un corte que tire todo a Media.
- Moverla exige elegir entre los dos lados de 45 a 48, que es justo donde los casos de propiedad chocan: CP-03 R2 (no circular) pide Media y CP-18 (circular) pide Alta.
- Baja **no** queda vacía (8,6%), pero es chica y 23 de 37 empresas no tienen ninguna.

---

## 6. Banderas frente a bandas

Riesgos evaluables del ranking principal: 45 con `consecuencia_extrema` y 70 con `safety_critical`.

| Juego | Extrema en Baja | Extrema en Media | Safety en Baja | Safety en Media |
|---|---|---|---|---|
| **E** | 0 | **15** | 2 | 23 |
| B | 0 | 5 | 2 | 7 |
| D | 4 | 11 | 7 | 18 |

- **Los 15 extremos en Media (E)**: 10 en 45 (P 3, I 5, V 3), 3 en 30, 1 en 40 y 1 en 20. Por P: 12 con P 3, 2 con P 2 y 1 con P 4. Es el perfil de CP-18: severidad extrema, probabilidad media, preparación parcial. Con B, 10 de ellos pasan a Alta.
- **Safety en Baja (E):** S22-R02 y S26-R06, los dos con P 2 y `C_raw` 16. S22-R02 es el riesgo con la A1 de P (Emiliano P 4: Alta).
- **Contradicción #2 en la población.** Con tu decisión (a), un P 1 llega como mucho a Media. La población casi no lo pone a prueba. En el ranking principal hay **1** riesgo con P 1 (S29-R04, I máximo 4, `C_raw` 8, Baja) y 10 con P 2 y sólo **2 con P 2 y alguna dimensión en 5** (S30-R05, 20; S33-R01, 30), los dos `consecuencia_extrema`, los dos en Media con E y en Baja con D. Fuera del ranking, el escenario por causa común S07-E01 (P 1, I 5, `C_raw` 20) queda en Media con E. El remoto extremo se va a probar recién con empresas reales o con la revisión profesional (Fase 12).

---

## 7. Regresión de bandas (paso 7)

`regresion-bandas.csv`, formato de protocolo §13. Versión anterior: v0.2 sin umbrales (F5-REG-01); versión nueva: v0.2 + cortes. Los factores no cambian.

| Juego | PASS | FAIL — calibración | FAIL de la Fase 5 (sin cambio) |
|---|---|---|---|
| **E** | 13 | CP-05, CP-17, CP-18 (circular) | CP-01 (calibración secundaria), CP-07, CP-12, CP-16 |
| B | 13 | CP-03, CP-05, CP-17 | igual |
| D | 13 | CP-05, CP-17, CP-18 (circular) | igual; además CP-01 R1, CP-09 y CP-15 R1 caen a Baja |

- Igual que en la 9a: la búsqueda de cortes se hizo sobre estos mismos casos, así que estos PASS son consistencia, no evidencia.
- Estado `regresionó` en los tres FAIL — calibración: el criterio de banda recién es juzgable. Con E los aceptaste explícitamente (1A y 3a, 2026-10-08), como pide la aceptación de §13.
- **CP-05** se juzga contra la adjudicación original, que conservás. **CP-14** pasa contra la adjudicación revisada (PV-1); contra la original, R1 queda en Baja.
- Blandas no alcanzadas con E: CP-09 y CP-15 R1 (Media; esperabas Alta como posible).

---

## Para decidir

**1. Umbrales para la v0.3**
- **a. Mantener 20 / 50 / 75.** ← recomendado
  - Es el único juego que respeta los casos sin extremos menos CP-05.
  - La muestra queda en 69,6% (la mejor de los tres).
  - La señal de Media viene del diseño.
- b. Bajar Alta a 45. Saca la señal, sube 10 extremos de Media a Alta y arregla CP-18 (circular). Rompe CP-03 R2 (no circular) y la muestra baja a 65,2%.
- c. Subir el corte de Baja (por ejemplo a 25 o 36). Agranda Baja, pero manda a Baja a CP-01 R1, CP-17 y CP-15 R1, y a 4 extremos sintéticos. Va contra lo que decidiste en #2 sobre visibilidad.

**2. ¿La señal de Media exige ajuste?**
- **a. No: queda registrada.** Va a la Fase 11 el bloque de 45 a 48 (61 riesgos; 10 extremos con el perfil de CP-18) como pregunta para la revisión profesional: ¿un extremo con P 3 y V 3 es Media o Alta? ← recomendado
- b. Sí: ajustar ahora, que es la opción 1b.

**3. Redacción de D23 y metodología §8.2** (según tu 2a)
- **a. Reemplazar "Un riesgo remoto puede llegar a la banda más alta por el producto, pero no está obligado"** por: "Con los umbrales de D12, un riesgo con P 1 llega como mucho a Media y uno con P 2 como mucho a Alta; Crítica exige P ≥ 3. Su visibilidad y su tratamiento los garantizan `consecuencia_extrema` y `safety_critical`, que se muestran junto a la banda, sin piso de banda". En §8.2, "Si con los umbrales concretos puede llegar a Crítica lo muestra la Fase 9" pasa a decir el resultado. ← recomendado
- b. Otra redacción que me digas.

Con tu aprobación aplico las filas de `anexo-changelog-fase-9b.md` (CH-093 a CH-096), abro la v0.3 (umbrales en §6, D23/§8.2 y protocolo §2.3 según CH-092) y abro la PR `task/T-0021-fase-9-calibracion`.
