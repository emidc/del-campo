// v7 · Pedido de Emiliano del 29/10 sobre el detalle del riesgo: banderas como símbolos en la fila (se explican al desplegar),
// sin la etiqueta «define la banda» (queda el tono de la fila) y justificación desplegable de los valores elegidos.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await T.perfil('man');

    // 1 · Banderas como símbolos en la fila
    await T.ir('#/empresa/e1/riesgos/matriz');
    const fila = await P.evaluate(() => { const td = document.querySelector('tr[data-riesgo="RSK-CL-03"] td'); return { txt: td.innerText, sims: [...td.querySelectorAll('.ban-sim')].map(s => ({ t: s.textContent.trim(), l: s.getAttribute('aria-label'), ti: s.getAttribute('title'), r: s.getAttribute('role') })) }; });
    ok('V7-1.sin-texto' + sfx, 'Cerrada, la fila no escribe «Seguridad de personas» ni «Consecuencia extrema»', !/Seguridad de personas|Consecuencia extrema/.test(fila.txt), fila.txt.replace(/\n/g, ' '));
    ok('V7-1.simbolos' + sfx, 'La fila muestra los dos símbolos (👤 y !)', fila.sims.length === 2 && /👤/.test(fila.sims[0].t) && fila.sims[1].t === '!', JSON.stringify(fila.sims));
    ok('V7-1.nombre-accesible' + sfx, 'Cada símbolo tiene nombre accesible y título con su significado', fila.sims.every(s => s.r === 'img' && s.l && s.l === s.ti) && fila.sims.map(s => s.l).join('|') === 'Seguridad de personas|Consecuencia extrema');
    const otros = await P.evaluate(() => ({ cl01: document.querySelectorAll('tr[data-riesgo="RSK-CL-01"] .ban-sim').length }));
    ok('V7-1.solo-con-bandera' + sfx, 'Un riesgo sin banderas no muestra símbolos', otros.cl01 === 0);

    // 1b · Al desplegar, se explican
    await P.locator('tr[data-riesgo="RSK-CL-03"] a.fila-tit').click(); await P.waitForTimeout(80);
    const exp = await P.evaluate(() => { const u = document.querySelector('[data-detalle-riesgo="RSK-CL-03"] [data-banderas-detalle]'); return u ? { n: u.querySelectorAll('li').length, txt: u.innerText } : null; });
    ok('V7-1.explicadas' + sfx, 'El detalle explica cada símbolo con su nombre y qué significa', exp && exp.n === 2 && /Seguridad de personas\./.test(exp.txt) && /lesiones graves/.test(exp.txt) && /Consecuencia extrema\./.test(exp.txt) && /supera lo que la empresa puede absorber/.test(exp.txt), exp && exp.txt.replace(/\n/g, ' '));
    ok('V7-1.sin-flags-viejos' + sfx, 'Ya no hay etiquetas de texto de las banderas en la fila ni en el detalle', await P.locator('.t-riesgos .flag', { hasText: /Seguridad de personas|Consecuencia extrema/ }).count() === 0);

    // 2 · Sin «define la banda»; la fila conserva el tono
    const det = await P.evaluate(() => { const t = document.querySelector('[data-tabla-impacto]'); const f = t.querySelector('tr.det-fila'), o = t.querySelector('tr[data-dim]:not(.det-fila)'); const c = t.cloneNode(true); c.querySelectorAll('.sr').forEach(x => x.remove()); const srs = [...t.querySelectorAll('.sr')].every(x => x.getBoundingClientRect().width <= 1); return { visible: c.textContent + (srs ? '' : ' [sr visible]'), filas: t.querySelectorAll('tr.det-fila').length, dim: f && f.dataset.dim, fondo: f && getComputedStyle(f.querySelector('td')).backgroundColor, fondoOtra: o && getComputedStyle(o.querySelector('td')).backgroundColor, sr: f && f.querySelector('.sr') && f.querySelector('.sr').textContent }; });
    ok('V7-2.sin-etiqueta' + sfx, 'La tabla no muestra «define la banda»', !/define la banda/i.test(det.visible), det.visible.replace(/\n/g, ' '));
    ok('V7-2.tono' + sfx, 'La fila que define la banda (Personas) mantiene un tono distinto', det.filas === 1 && det.dim === 'per' && det.fondo !== det.fondoOtra, `${det.fondo} vs ${det.fondoOtra}`);
    ok('V7-2.lector' + sfx, 'Para lectores de pantalla la fila sigue diciendo que define la banda (texto oculto)', /define la banda/.test(det.sr || ''));

    // 3 · Justificación desplegable
    const btn = P.locator('[data-detalle-riesgo="RSK-CL-03"] .just-btn');
    ok('V7-3.cerrada' + sfx, 'Con el detalle abierto, la justificación empieza plegada', await P.locator('tr.just-fila').count() === 0 && (await btn.getAttribute('aria-expanded')) === 'false' && /Ver justificación/.test(await btn.innerText()));
    await btn.click(); await P.waitForTimeout(80);
    const j = await P.evaluate(() => [...document.querySelectorAll('[data-tabla-impacto] tr.just-fila')].map(r => ({ dim: r.dataset.justif, prev: r.dataset.dim, celdas: r.querySelectorAll('td.jv-c').length, txt: r.innerText })));
    ok('V7-3.abre' + sfx, 'Al pulsar se despliega la justificación de cada tipo de daño (v10: dentro de sus celdas de impacto y vulnerabilidad)', j.length === 4 && j.every(x => x.dim === x.prev && x.celdas === 2) && (await P.locator('[data-detalle-riesgo="RSK-CL-03"] .just-btn').getAttribute('aria-expanded')) === 'true', JSON.stringify(j.map(x => x.dim + ':' + x.celdas)));
    const per = (j.find(x => x.dim === 'per') || {}).txt || '';
    ok('V7-3.criterio' + sfx, 'Explica cada valor con el criterio de la escala (Personas: impacto 5 y vulnerabilidad 5)', /Impacto 5/.test(per) && /Muerte o incapacidad permanente/.test(per) && /Vulnerabilidad 5/.test(per) && /Sin controles/.test(per), per.replace(/\n/g, ' '));
    ok('V7-3.observacion' + sfx, 'Y con la observación concreta de la evaluación', /6 m de altura/.test(per) && /línea de vida/.test(per));
    ok('V7-3.todas' + sfx, 'Las cuatro dimensiones explican impacto y vulnerabilidad', j.every(x => /Impacto \d/.test(x.txt) && /Vulnerabilidad \d/.test(x.txt)));
    await T.foto('V7-justificacion-RSK-CL-03', true);
    const v1 = await AXE(P); ok('V7-A11Y.abierta' + sfx, 'axe WCAG A/AA sin violaciones con detalle y justificación abiertos', !v1.length, v1.join(' '));
    ok('V7-SCROLL.abierta' + sfx, 'Sin scroll horizontal con la justificación abierta', await sinScroll());
    const tabla = await P.evaluate(() => { const w = document.querySelector('[data-tabla-impacto]').closest('.tabla-wrap'); return [w.scrollWidth, w.clientWidth]; });
    ok('V7-SCROLL.tabla' + sfx, 'La tabla de impacto entra entera, sin desplazamiento interno', tabla[0] <= tabla[1] + 1, tabla.join('/'));
    ok('V7-3.simulado' + sfx, 'La justificación abierta lleva el rótulo de Simulado', /Simulado|ficticios/i.test(await P.locator('[data-detalle-riesgo="RSK-CL-03"] [data-justif-sim]').innerText().catch(() => '')));
    ok('V7-3.foco-clic' + sfx, 'Tras el clic, el foco queda en el botón', await P.evaluate(() => document.activeElement && document.activeElement.id === 'jb-RSK-CL-03'));
    await P.locator('[data-detalle-riesgo="RSK-CL-03"] .just-btn').click(); await P.waitForTimeout(60);
    ok('V7-3.cierra' + sfx, 'Se vuelve a plegar con el mismo botón', await P.locator('tr.just-fila').count() === 0);
    // Teclado: Enter abre, el foco se queda en el botón y un segundo Enter cierra
    await P.locator('#jb-RSK-CL-03').focus(); await P.keyboard.press('Enter'); await P.waitForTimeout(60);
    const k1 = await P.evaluate(() => ({ id: document.activeElement && document.activeElement.id, exp: document.getElementById('jb-RSK-CL-03').getAttribute('aria-expanded'), n: document.querySelectorAll('tr.just-fila').length }));
    ok('V7-3.foco-enter' + sfx, 'Con Enter se despliega y el foco sigue en el botón', k1.id === 'jb-RSK-CL-03' && k1.exp === 'true' && k1.n === 4, JSON.stringify(k1));
    await P.keyboard.press('Enter'); await P.waitForTimeout(60);
    const k2 = await P.evaluate(() => ({ id: document.activeElement && document.activeElement.id, exp: document.getElementById('jb-RSK-CL-03').getAttribute('aria-expanded'), n: document.querySelectorAll('tr.just-fila').length }));
    ok('V7-3.segundo-enter' + sfx, 'Un segundo Enter la pliega y el foco sigue en el botón', k2.id === 'jb-RSK-CL-03' && k2.exp === 'false' && k2.n === 0, JSON.stringify(k2));
    await P.keyboard.press('Tab');
    ok('V7-3.tab-sigue' + sfx, 'El Tab siguiente avanza dentro del detalle, no vuelve al logo', await P.evaluate(() => !!document.activeElement.closest('[data-detalle-riesgo="RSK-CL-03"]')));
    ok('V7-1.sin-alerta' + sfx, 'La explicación de Seguridad de personas no habla de «alerta»', !/alerta/i.test(await P.locator('[data-detalle-riesgo="RSK-CL-03"] [data-banderas-detalle]').innerText()));

    // 3b · Valor desconocido (≥) y el sismo (v8: ya no hay riesgos padre)
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-05'); await T.boton('Ver justificación', '[data-detalle-riesgo="RSK-CL-05"]');
    const j5 = await P.locator('tr.just-fila[data-justif="per"]').innerText().catch(() => '');
    ok('V7-3.desconocido' + sfx, 'Un impacto sin dato se justifica como «falta un dato, podría ser mayor» (v11: sin «≥»)', /Impacto\s+3/.test(j5) && !/≥/.test(j5) && /Falta un dato: por lo que se sabe es 3/.test(j5), j5.replace(/\n/g, ' '));
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-14'); await T.boton('Ver justificación', '[data-detalle-riesgo="RSK-CL-14"]');
    const j8 = await P.locator('tr.just-fila[data-justif="eco"]').innerText().catch(() => '');
    ok('V7-3.sismo' + sfx, 'El sismo, ahora riesgo propio, justifica sus valores', /Impacto 5/.test(j8) && /estibas/.test(j8) && /Vulnerabilidad 4/.test(j8), j8.replace(/\n/g, ' '));

    // 3c · Tras una reevaluación aceptada, la justificación no muestra la observación vieja
    await T.perfil('eva'); await T.act('escribirReeval', { riesgo: 'RSK-CL-03', V: { per: 4 }, motivo: 'Se instaló la línea de vida en la pasarela norte', evidencia: 'Foto del 01/11 (ficticia)' });
    await T.perfil('emi'); await T.act('aceptarReeval', { riesgo: 'RSK-CL-03' });
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-03'); await T.boton('Ver justificación', '[data-detalle-riesgo="RSK-CL-03"]');
    const jr = await P.locator('tr.just-fila[data-justif="per"]').innerText().catch(() => '');
    const jl = await P.locator('tr.just-fila[data-justif="leg"]').innerText().catch(() => '');
    ok('V7-3.motivo-solo-cambio' + sfx, 'El motivo de la reevaluación aparece solo en la dimensión que cambió (Personas), no en Legal', !/Reevaluación|línea de vida en la pasarela norte/.test(jl) && /Impacto 4/.test(jl), jl.replace(/\n/g, ' '));
    ok('V7-3.reevaluada' + sfx, 'Con un valor reevaluado muestra el criterio nuevo y el motivo, no la observación anterior', /Vulnerabilidad 4/.test(jr) && /Controles débiles o informales/.test(jr) && /línea de vida en la pasarela norte/.test(jr) && !/No hay línea de vida/.test(jr), jr.replace(/\n/g, ' '));

    // El «!» queda solo para Consecuencia extrema: el plan ya no lo usa para Seguridad sin tratamiento
    await T.ir('#/empresa/e1/riesgos/plan');
    ok('V7-1.plan-sin-signo' + sfx, 'En el plan, Seguridad sin tratamiento no usa el «!»', await P.evaluate(() => ![...document.querySelectorAll('.flag')].some(f => /^\s*!/.test(f.textContent))));

    // Portal y aislamiento
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/matriz');
    ok('V7-portal.simbolos' + sfx, 'La empresa ve los mismos símbolos en su portal', await P.locator('tr[data-riesgo="RSK-CL-03"] .ban-sim').count() === 2);
    await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-01'); await T.boton('Ver justificación', '[data-detalle-riesgo="RSK-CL-01"]');
    ok('V7-portal.justif' + sfx, 'Y puede desplegar la justificación', await P.locator('tr.just-fila').count() === 4);
    const v2 = await AXE(P); ok('V7-A11Y.portal' + sfx, 'axe WCAG A/AA sin violaciones en el portal con la justificación abierta', !v2.length, v2.join(' '));
    await T.perfil('pqa'); await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-03');
    ok('V7-aislamiento' + sfx, 'Hernán (Quebrada Azul) no ve la justificación de un riesgo de Cerro Liso', await P.locator('[data-detalle-riesgo="RSK-CL-03"], tr.just-fila').count() === 0);
    await T.perfil('r1'); await T.ir('#/empresa/e2/riesgos/matriz?r=RSK-PD-01');
    ok('V7-r1' + sfx, 'El revisor (R1) no ve símbolos ni justificación antes de su orden previo', await P.locator('.ban-sim, tr.just-fila, [data-tabla-impacto]').count() === 0);

    ok('V7.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v7');
})();
