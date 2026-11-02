// AM-26 (sin scroll horizontal, sin cortes), AM-40 (axe-core: contraste y reglas serias; texto ≥ 12 px), AM-41 (escala de grises), capturas de las pantallas de los recorridos.
const { iniciar, ok, informe } = require('./lib');
const fs = require('fs'), path = require('path');
const RUTAS = [['man', '#/inicio'], ['man', '#/inicio/equipo'], ['luc', '#/tarea/t01'], ['man', '#/clientes/personas'], ['vic', '#/clientes/nueva'], ['man', '#/persona/p01/resumen'], ['man', '#/persona/p01/comunicacion'], ['man', '#/persona/p03/vehiculos'],
  ['man', '#/empresa/e1/resumen'], ['man', '#/empresa/e3/contactos'], ['man', '#/empresa/e1/riesgos/matriz'], ['man', '#/empresa/e1/riesgos/matriz?v=b'], ['man', '#/empresa/e3/riesgos/matriz'], ['man', '#/empresa/e1/riesgos/plan'], ['man', '#/empresa/e1/riesgos/transferencia'], ['man', '#/empresa/e1/riesgos/layout?z=ZON-CL-1'], ['man', '#/empresa/e1/riesgos/solicitudes'], ['man', '#/empresa/e5/riesgos/matriz'],
  ['eva', '#/polizas?f=vence_mes'], ['man', '#/poliza/pol05'], ['man', '#/comunicacion/whatsapp'], ['man', '#/comunicacion/sinidentificar'], ['pil', '#/siniestro/sin1'], ['jim', '#/gestiones/facturacion'], ['man', '#/riesgos'],
  ['eva', '#/automatizaciones'], ['eva', '#/automatizaciones/EJ-REN-0102'], ['emi', '#/importacion/expediente/EXP-LB-1'], ['emi', '#/importacion/lote/LOTE-CL-2'], ['eva', '#/empresa/e1/riesgos/relevamiento'], ['man', '#/empresa/e1/riesgos/informe'], ['eva', '#/empresa/e1/riesgos/panel'], ['emi', '#/importacion/puentes'], ['man', '#/demo/acerca'], ['man', '#/demo/registro'],
  ['r1', '#/inicio'], ['r1', '#/empresa/e2/riesgos/matriz'], ['r1', '#/orden-previo/ORG-01HPD3K8'], ['pcl', '#/portal/e1/resumen'], ['pcl', '#/portal/e1/riesgos'], ['pcl', '#/portal/e1/solicitudes'], ['pqa', '#/portal/e3/resumen']];
const EXTRA = [['eva', '#/empresa/e1/riesgos/transferencia', "UI_HANDLERS.abrirBrecha({id:'BRE-CL-01'});render()", 'brecha-abierta'], ['vic', '#/inicio', "UI_HANDLERS.panel({p:'gemini'});render()", 'panel-gemini'], ['man', '#/inicio', "UI_HANDLERS.panel({p:'telefono'});render()", 'panel-telefono'], ['man', '#/persona/p01/comunicacion', "UI_HANDLERS.modal({tipo:'extraer',persona:'p01'});render()", 'modal-extraer'], ['man', '#/inicio', "UI_HANDLERS.modal({tipo:'kpi',k:'K-10'});render()", 'modal-kpi'], ['man', '#/inicio', "UI_HANDLERS.buscar();UI.buscar.q='fun';render()", 'busqueda']];
(async () => {
  const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..')] }), 'utf8');
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const revisar = async (p, r, nombre) => {
      const ancho = await P.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      ok(`AM-26.${nombre}${sfx}`, `${p} ${r}: sin scroll horizontal`, ancho[0] <= ancho[1], ancho.join(' > '));
      const chicos = await P.evaluate(() => { const out = []; const w = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const el = n.parentElement; if (el.closest('svg')) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.sr')) continue; const r = el.getBoundingClientRect(); if (!r.width) continue; if (parseFloat(cs.fontSize) < 12) out.push(cs.fontSize + ' ' + n.textContent.trim().slice(0, 30)); } return out; });
      ok(`AM-40.tam.${nombre}${sfx}`, `${p} ${r}: ningún texto menor de 12 px`, chicos.length === 0, chicos.slice(0, 3).join(' | '));
      // AV-05: nada cortado dentro de un componente (marcadores dentro de su celda; texto recortado por overflow sin elipsis).
      const cortes = await P.evaluate(() => {
        const out = [];
        document.querySelectorAll('.celda').forEach(c => { const rc = c.getBoundingClientRect(); c.querySelectorAll('.marcador').forEach(m => { const r = m.getBoundingClientRect(); if (r.right > rc.right + 0.5 || r.left < rc.left - 0.5 || r.bottom > rc.bottom + 0.5) out.push('marcador «' + m.textContent.trim() + '» sale de su celda ' + Math.round(r.right - rc.right) + ' px'); }); });
        document.querySelectorAll('#root *').forEach(e => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return; const cs = getComputedStyle(e); if (!['hidden', 'clip'].includes(cs.overflowX) || cs.textOverflow === 'ellipsis' || e.closest('.sr')) return; if (e.scrollWidth > e.clientWidth + 1 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) out.push('texto recortado en ' + e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ': «' + e.textContent.trim().slice(0, 30) + '»'); });
        return out;
      });
      ok(`AM-26.recorte.${nombre}${sfx}`, `${p} ${r}: nada cortado dentro de los componentes`, cortes.length === 0, cortes.slice(0, 3).join(' | '));
      // AV-06 y AV-07: las barras fijas no tapan el pie de la barra lateral ni ocupan demasiado alto en celular.
      const fijos = await P.evaluate(() => { const reg = document.querySelector('.registro summary'), pie = document.querySelector('.sidebar .pie'), top = document.querySelector('.topbar'); const vis = el => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
        return { pie: vis(pie) && reg ? Math.round(pie.getBoundingClientRect().bottom - reg.getBoundingClientRect().top) : null, top: top && getComputedStyle(top).position === 'sticky' ? top.offsetHeight : 0, reg: reg ? reg.getBoundingClientRect().height : 0, h: innerHeight }; });
      ok(`AM-26.pie.${nombre}${sfx}`, `${p} ${r}: el registro de eventos no tapa el pie «Datos ficticios…»`, fijos.pie == null || fijos.pie <= 0, `superposición ${fijos.pie} px`);
      const tope = movil ? 0.15 : 0.2;
      ok(`AM-26.fijos.${nombre}${sfx}`, `${p} ${r}: las barras fijas ocupan como mucho el ${tope * 100} % del alto`, (fijos.top + fijos.reg) / fijos.h <= tope, `${fijos.top} + ${fijos.reg} de ${fijos.h} px`);
      if (!(await P.evaluate(() => !!window.axe))) await P.addScriptTag({ content: axe });
      const v = await P.evaluate(async () => { const r = await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }); return r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(' ')} ${(x.nodes[0].failureSummary || '').split('\n')[1] || ''}`); });
      ok(`AM-40.axe.${nombre}${sfx}`, `${p} ${r}: axe sin violaciones serias (incluye contraste)`, v.length === 0, v.join(' || ').slice(0, 600));
    };
    for (const [p, r] of RUTAS) {
      await T.perfil(p); await T.ir(r); await P.waitForTimeout(80);
      const nombre = (p + r).replace(/[#/?=&]+/g, '_');
      await revisar(p, r, nombre);
      await T.foto('pantalla-' + nombre, !movil);
    }
    for (const [p, r, js, nombre] of EXTRA) { await T.perfil(p); await T.ir(r); await P.evaluate(js); await P.waitForTimeout(80); await revisar(p, r + ' · ' + nombre, nombre); await T.foto('pantalla-' + nombre, !movil); await P.evaluate(() => { UI.panel = null; UI.modal = null; UI.buscar = null; render(); }); }
    // AV-07 / VD-01: en celular la matriz empieza dentro de la primera pantalla, sin desplazarse.
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz'); await P.evaluate(() => scrollTo(0, 0)); await P.waitForTimeout(40);
    const yMat = await P.evaluate(() => [document.querySelector('[data-matriz]').getBoundingClientRect().top, innerHeight]);
    ok('VD-01.matriz' + sfx, 'La matriz empieza dentro de la primera pantalla', yMat[0] < yMat[1] - 120, yMat.join(' de '));
    ok('AV-04.lang' + sfx, 'La página fija su idioma (lang="es") sin depender de la envoltura', await P.evaluate(() => document.documentElement.lang === 'es'));
    if (!movil) {
      await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz'); await P.addStyleTag({ content: 'html{filter:grayscale(1)}' }); await P.waitForTimeout(80);
      await T.foto('AM41-matriz-grises'); await T.ir('#/empresa/e1/riesgos/transferencia'); await P.waitForTimeout(60); await T.foto('AM41-transferencia-grises'); await T.ir('#/inicio/tareas?todas=1'); await P.waitForTimeout(60); await T.foto('AM41-tareas-grises');
    }
    ok('VIS.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  // AV2-01 / AV2-04: la barra superior queda en una fila (≤ 90 px) de 768 a 1600 px de ancho.
  { const altos = [];
    for (const w of [768, 1024, 1199, 1200, 1300, 1366, 1400, 1600]) { const T = await iniciar({ ctx: { viewport: { width: w, height: 800 } } }); await T.perfil('man'); await T.ir('#/inicio'); await T.page.waitForTimeout(100); altos.push([w, await T.page.evaluate(() => document.querySelector('.topbar').offsetHeight)]); await T.cerrar(); }
    ok('AV2-01.una-fila', 'Barra superior en una fila (≤ 90 px) de 768 a 1600 px', altos.every(([, a]) => a <= 90), altos.map(([w, a]) => `${w}: ${a}`).join(' · ')); }
  informe('visual-a11y');
})();
