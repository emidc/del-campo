// v12 · Pedido de Emiliano del 29/10: pestaña «Panel de control» en Riesgos, con indicadores, contadores y gráficos del estado
// actual y de la progresión del puntaje de riesgo. v25 (decisión de Emiliano, 02/11): el puntaje queda solo para el equipo; el portal muestra conteos por banda. Los valores se recalculan aquí, de forma independiente, desde el estado.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const bandaDe = c => c >= 75 ? 'critica' : c >= 50 ? 'alta' : c >= 20 ? 'media' : 'baja';
const lo = v => typeof v === 'object' ? v.min : v;
function esperado(d, org) {
  const ev = d.riesgos.filter(r => r.org === org).map(r => { const e = r.evaluable && r.evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; return e ? { r, c: Math.max(...['eco', 'per', 'con', 'leg'].map(k => e.P * lo(e.I[k]) * e.V[k])) } : null; }).filter(Boolean);
  const bandas = { critica: 0, alta: 0, media: 0, baja: 0 }; ev.forEach(x => bandas[bandaDe(x.c)]++);
  const acc = d.acciones.filter(a => a.org === org), trf = d.transferencias.filter(t => t.org === org);
  return { puntaje: ev.reduce((s, x) => s + x.c, 0), n: ev.length, sinEval: d.riesgos.filter(r => r.org === org).length - ev.length, seg: ev.filter(x => x.r.safety).length, bandas,
    porRiesgo: ev.slice().sort((a, b) => b.c - a.c).map(x => x.c), ids: ev.map(x => x.r.id).sort(),
    acc: { total: acc.length, hecha: acc.filter(a => a.estado === 'hecha').length, en_curso: acc.filter(a => a.estado === 'en_curso').length, pendiente: acc.filter(a => a.estado === 'pendiente').length },
    trf: { total: trf.length, verificada: trf.filter(t => t.estado === 'verificada').length },
    prox: acc.filter(a => a.estado !== 'hecha').sort((a, b) => a.vence.localeCompare(b.vence)).slice(0, 3).map(a => a.id) };
}
const leerPanel = P => P.evaluate(() => {
  const n = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
  const filasDatos = [...document.querySelectorAll('[data-pc-evolucion] .g-tabla tbody tr')].map(r => +r.cells[1].textContent.replace(/\D/g, ''));
  const trim = [...document.querySelectorAll('[data-pc-bandas] .g-tabla tbody tr')].map(r => [r.cells[0].textContent, ...[...r.cells].slice(1).map(c => +c.textContent)]);
  return { tBandas: n('[data-pc-tile="bandas"]'), tPuntaje: n('[data-pc-tile="puntaje"] .pc-tile-v'), tRiesgos: n('[data-pc-tile="riesgos"]'), tPlan: n('[data-pc-tile="plan"]'), tTrf: n('[data-pc-tile="transferencia"]'),
    serie: filasDatos, trim, barras: [...document.querySelectorAll('[data-pc-por-riesgo] li')].map(li => ({ id: li.dataset.pcRiesgo, v: +li.querySelector('.pc-barra-v').firstChild.nextSibling.textContent, href: li.querySelector('a').getAttribute('href') })),
    plan: (document.querySelector('[data-pc-prog="plan"] .pc-prog-b') || { getAttribute: () => '' }).getAttribute('aria-label'),
    prox: [...document.querySelectorAll('.pc-prox a')].map(a => new URLSearchParams(a.getAttribute('href').split('?')[1]).get('a')),
    hitos: [...document.querySelectorAll('[data-pc-hito]')].map(g => g.dataset.pcHito) };
});
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('man');
    await T.ir('#/empresa/e1/riesgos/matriz');
    const tabs = await P.$$eval('.subpestanas a', as => as.map(a => [a.textContent.trim(), a.getAttribute('href')]));
    ok('V12-0.pestana' + sfx, 'Riesgos tiene la pestaña «Panel de control», la primera', /^Panel de control/.test(tabs[0][0]) && /riesgos\/panel$/.test(tabs[0][1]), JSON.stringify(tabs.map(t => t[0])));
    await P.locator('.subpestanas a', { hasText: 'Panel de control' }).click(); await P.waitForTimeout(150);
    ok('V12-0.abre' + sfx, 'Al elegirla se ve el panel', await P.locator('[data-panel-riesgos]').count() === 1 && await P.locator('.subpestanas a[aria-current="page"]', { hasText: 'Panel de control' }).count() === 1);
    let d = await T.estado(), E = esperado(d, 'ORG-01HCL7Q2'), V = await leerPanel(P);
    // 1 · Indicadores coherentes con los datos
    ok('V12-1.puntaje' + sfx, 'El puntaje de riesgo es la suma de las criticidades de los riesgos evaluados', V.tPuntaje.replace(/\D/g, '') === String(E.puntaje), `${V.tPuntaje} vs ${E.puntaje}`);
    ok('V12-1.solo-equipo' + sfx, 'v25: el panel del equipo avisa que el puntaje es solo para el equipo', await P.locator('[data-pc-solo-equipo]').count() === 1);
    ok('V12-1.riesgos' + sfx, 'Riesgos evaluados, sin evaluar y de seguridad de personas', V.tRiesgos.includes(String(E.n)) && V.tRiesgos.includes(`${E.sinEval} sin evaluar`) && V.tRiesgos.includes(`${E.seg} de seguridad`), V.tRiesgos);
    ok('V12-1.plan' + sfx, 'Plan de acción: en marcha o hechas, de un total, con hechas y en curso', V.tPlan.includes(`${E.acc.hecha + E.acc.en_curso} de ${E.acc.total}`) && V.tPlan.includes(`${E.acc.hecha} hecha`) && V.tPlan.includes(`${E.acc.en_curso} en curso`), V.tPlan);
    ok('V12-1.transferencia' + sfx, 'Coberturas verificadas de un total', V.tTrf.includes(`${E.trf.verificada} de ${E.trf.total}`), V.tTrf);
    // 2 · Progresión
    ok('V12-2.serie-hoy' + sfx, 'La evolución va de diciembre a hoy (12 puntos) y termina en el puntaje de hoy', V.serie.length === 12 && V.serie[11] === E.puntaje, V.serie.join(','));
    ok('V12-2.mejora' + sfx, 'La serie muestra la mejora: nunca sube de un mes al siguiente y el primer mes es más alto que hoy', V.serie.every((v, i) => !i || v <= V.serie[i - 1]) && V.serie[0] > V.serie[11]);
    const delta = Math.round((E.puntaje - V.serie[0]) / V.serie[0] * 100);
    ok('V12-2.delta' + sfx, 'El indicador muestra la variación de 12 meses que sale de la serie', (await P.locator('[data-pc-delta]').innerText()).includes(`${Math.abs(delta)} %`), `${await P.locator('[data-pc-delta]').innerText()} vs ${delta}`);
    ok('V12-2.hito' + sfx, 'La acción hecha (ampliar riego antihelada, septiembre) se marca en su mes', V.hitos.join() === 'ACC-CL-04' && /Ampliar riego antihelada \(sep 26\)/.test(await P.locator('[data-pc-evolucion] svg').getAttribute('aria-label')));
    const hoyT = V.trim.find(t => t[0] === 'Hoy');
    ok('V12-2.bandas-hoy' + sfx, 'Riesgos por banda: la fila de hoy coincide con las bandas actuales', hoyT && hoyT.slice(1).join() === [E.bandas.critica, E.bandas.alta, E.bandas.media, E.bandas.baja].join(), JSON.stringify(V.trim));
    ok('V12-2.bandas-total' + sfx, 'Cada trimestre suma los mismos riesgos, y antes había más riesgos en bandas altas', V.trim.length === 4 && V.trim.every(t => t.slice(1).reduce((a, b) => a + b, 0) === E.n) && V.trim[0][1] + V.trim[0][2] > hoyT[1] + hoyT[2]);
    // 3 · Estado actual por riesgo y trabajo de mejora
    ok('V12-3.por-riesgo' + sfx, 'Cada riesgo evaluado aparece con su criticidad, de mayor a menor, y enlaza a su detalle', V.barras.map(b => b.v).join() === E.porRiesgo.join() && V.barras.map(b => b.id).sort().join() === E.ids.join() && V.barras.every(b => b.href === `#/empresa/e1/riesgos/matriz?r=${b.id}`), JSON.stringify(V.barras.map(b => b.id + ':' + b.v)));
    ok('V12-3.plan-barra' + sfx, 'La barra del plan describe hechas, en curso y pendientes', new RegExp(`${E.acc.hecha} hechas`).test(V.plan) && new RegExp(`${E.acc.en_curso} en curso`).test(V.plan) && new RegExp(`${E.acc.pendiente} pendientes`).test(V.plan), V.plan);
    ok('V12-3.vencimientos' + sfx, 'Próximos vencimientos: las tres acciones no hechas que vencen primero', V.prox.join() === E.prox.join(), V.prox.join());
    await T.foto('V12-panel', true);
    // 4 · Estilo: sin alertas en rojo ni texto de alarma
    ok('V12-4.zen' + sfx, 'El panel no usa avisos de error ni la palabra «alerta»', await P.locator('[data-panel-riesgos] .nota.error, [data-panel-riesgos] .g-alerta').count() === 0 && !/alerta|urgente/i.test(await P.locator('[data-panel-riesgos]').innerText()));
    ok('V12-4.simulado' + sfx, 'La historia ficticia está rotulada', /Historia ficticia/.test(await P.locator('[data-panel-riesgos] .pc-cab').innerText()));
    const v1 = await AXE(P); ok('V12-A11Y' + sfx, 'axe WCAG A/AA sin violaciones en el panel', !v1.length, v1.join(' '));
    ok('V12-SCROLL' + sfx, 'Sin scroll horizontal', await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (!movil) {
      await P.locator('[data-pc-evolucion] .g-hit').nth(9).hover(); await P.waitForTimeout(60);
      ok('V12-4.tooltip', 'Al pasar el mouse por un mes se ve su valor y la acción hecha', /sep 26 · [\d.]+ · hecha: Ampliar riego antihelada/.test(await P.locator('[data-pc-evolucion] .g-tip').innerText()), await P.locator('[data-pc-evolucion] .g-tip').innerText());
      for (const w of [1024, 768]) { await P.setViewportSize({ width: w, height: 800 }); await P.waitForTimeout(60); ok(`V12-SCROLL.${w}`, `Sin scroll horizontal a ${w} px`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
      await P.setViewportSize({ width: 1366, height: 768 });
    }
    // 5 · En vivo: una reevaluación aceptada baja el puntaje y mueve la banda
    await T.perfil('eva'); await T.act('escribirReeval', { riesgo: 'RSK-CL-03', V: { per: 4 }, motivo: 'Se instaló la línea de vida en la pasarela norte', evidencia: 'Foto del 01/11 (ficticia)' });
    await T.perfil('emi'); await T.act('aceptarReeval', { riesgo: 'RSK-CL-03' });
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/panel');
    d = await T.estado(); const E2 = esperado(d, 'ORG-01HCL7Q2'), V2 = await leerPanel(P);
    ok('V12-5.vivo' + sfx, 'Tras aceptar la reevaluación del 03 el puntaje baja 15 y la serie termina en el nuevo valor', E2.puntaje === E.puntaje - 15 && V2.tPuntaje.replace(/\D/g, '') === String(E2.puntaje) && V2.serie[11] === E2.puntaje, `${E.puntaje} → ${E2.puntaje} · ${V2.tPuntaje} · ${V2.serie[11]}`);
    ok('V12-5.pasado-fijo' + sfx, 'La historia no cambia con la reevaluación: los 11 meses anteriores y los 3 trimestres quedan iguales', V2.serie.slice(0, 11).join() === V.serie.slice(0, 11).join() && JSON.stringify(V2.trim.slice(0, 3)) === JSON.stringify(V.trim.slice(0, 3)), V2.serie.join(','));
    const delta2 = Math.round((E2.puntaje - V2.serie[0]) / V2.serie[0] * 100);
    ok('V12-5.variacion' + sfx, 'La variación sí cambia: se recalcula con el nuevo valor de hoy', delta2 !== delta && (await P.locator('[data-pc-delta]').innerText()).includes(`${Math.abs(delta2)} %`), `${delta} → ${delta2}: ${await P.locator('[data-pc-delta]').innerText()}`);
    // Una acción que se marca hecha hoy aparece en el punto «hoy»
    await T.perfil('pcl'); await T.act('registrarAvance', { accion: 'ACC-CL-01', texto: 'Quedó conectada la central de detección.', evidencia: '', estadoNuevo: 'hecha' });
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/panel');
    const hitos3 = await P.$$eval('[data-pc-hito]', gs => gs.map(g => g.dataset.pcHito));
    ok('V12-5.hito-hoy' + sfx, 'Una acción hecha hoy se marca en «hoy», y la de la semilla sigue en septiembre', hitos3.sort().join() === 'ACC-CL-01,ACC-CL-04' && /Instalar detección temprana de humo \(hoy\)/.test(await P.locator('[data-pc-evolucion] svg').getAttribute('aria-label')), hitos3.join());
    ok('V12-5.vivo-bandas' + sfx, 'Y la fila «Hoy» de bandas refleja el cambio (el 03 pasa de crítica a alta)', V2.trim[3].slice(1).join() === [E2.bandas.critica, E2.bandas.alta, E2.bandas.media, E2.bandas.baja].join() && E2.bandas.critica === E.bandas.critica - 1, JSON.stringify(V2.trim[3]));
    // Portal, aislamiento y R1
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/panel');
    const Vp = await leerPanel(P);
    ok('V12-portal' + sfx, 'La empresa ve su panel en el portal, con enlaces a su propia lista', await P.locator('[data-panel-riesgos]').count() === 1 && Vp.barras.length === E2.n && Vp.barras.every(b => b.href.startsWith('#/portal/e1/riesgos/matriz?r=')));
    ok('V12-portal-sin-puntaje' + sfx, 'v25: en el portal no hay puntaje ni su curva; la empresa ve críticos y altos con el conteo por banda', !Vp.tPuntaje && await P.locator('[data-pc-evolucion]').count() === 0 && !/puntaje/i.test(await P.locator('[data-panel-riesgos]').innerText()) && Vp.tBandas.includes(`${E2.bandas.critica + E2.bandas.alta} de ${E2.n}`), Vp.tBandas);
    const v2 = await AXE(P); ok('V12-A11Y.portal' + sfx, 'axe WCAG A/AA sin violaciones en el panel del portal', !v2.length, v2.join(' '));
    await T.perfil('pqa'); await T.ir('#/portal/e1/riesgos/panel');
    ok('V12-aislamiento' + sfx, 'Hernán (Quebrada Azul) no ve el panel de Cerro Liso', await P.locator('[data-panel-riesgos]').count() === 0);
    await T.ir('#/portal/e3/riesgos/panel');
    const E3 = esperado(await T.estado(), 'ORG-01HQA5M1'), V3 = await leerPanel(P);
    ok('V12-portal-propio' + sfx, 'Y en su propio portal ve el panel de su empresa', await P.locator('[data-panel-riesgos]').count() === 1 && !V3.tPuntaje && V3.tBandas.includes(`${E3.bandas.critica + E3.bandas.alta} de ${E3.n}`) && V3.barras.length === E3.n);
    // Cartera e inicio del portal siguen contando los «Sin evaluar» (v12.1: el panel ya no redefine conteoBandas)
    await T.perfil('man'); await T.ir('#/riesgos');
    const sinEvCartera = await P.evaluate(() => { const t = document.querySelector('[data-cartera]'); const i = [...t.querySelectorAll('thead th')].findIndex(th => /Sin evaluar/i.test(th.textContent)); const f = t.querySelector('tr[data-empresa="e1"]'); return i >= 0 && f ? f.cells[i].textContent.trim() : null; });
    ok('V12-6.cartera' + sfx, 'La cartera muestra 1 «Sin evaluar» en Cerro Liso', sinEvCartera === '1', String(sinEvCartera));
    // Empresa sin riesgos evaluados: estado vacío, sin errores
    await T.ir('#/empresa/e4/riesgos/panel');
    const e4 = await P.evaluate(() => ({ vacio: !!document.querySelector('[data-panel-vacio]'), nan: /NaN/.test(document.querySelector('main').innerHTML), svg: document.querySelectorAll('[data-panel-riesgos] svg').length }));
    ok('V12-6.vacio' + sfx, 'En una empresa sin riesgos evaluados el panel muestra un estado vacío, sin gráficos rotos', (e4.vacio || await P.locator('[data-panel-riesgos]').count() === 0) && !e4.nan && e4.svg === 0, JSON.stringify(e4));
    await T.perfil('r1'); await T.ir('#/empresa/e2/riesgos/panel');
    ok('V12-r1' + sfx, 'El revisor (R1) no ve el panel antes de su orden previo', await P.locator('[data-panel-riesgos], [data-pc-tile]').count() === 0);
    ok('V12.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v12');
})();
