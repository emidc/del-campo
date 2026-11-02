// v20: retratos del equipo en el perfil y junto a sus interacciones (pedido de Emiliano, 31/10).
const fs = require('fs'), path = require('path');
const { iniciar, ok, informe } = require('./lib');
const EQ = ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi'];
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..')] }), 'utf8');

(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '@390' : '@1366';
    const T = await iniciar({ movil }); const P = T.page;
    // Revisa que los retratos visibles en un contenedor estén cargados, sean decorativos y del integrante correcto.
    const fotos = (sel = '#root') => P.evaluate(sel => [...document.querySelectorAll(sel + ' [data-av]')].map(n => { const i = n.querySelector('img'); return { id: n.dataset.av, ok: !!i && i.complete && i.naturalWidth === 128 && i.getAttribute('alt') === '' && !!n.closest('[aria-hidden="true"]'), src: i && i.src === FOTOS_EQUIPO[n.dataset.av] }; }), sel);
    const sinMarcado = async () => { const t = await T.texto('#root'); return !/<span|<img|&lt;|&gt;|data:image/.test(t); };
    const axe = async () => { if (!(await P.evaluate(() => !!window.axe))) await P.addScriptTag({ content: axeSrc }); return P.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id + ' ' + x.nodes[0].target.join(' '))); };
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

    const claves = await P.evaluate(() => Object.keys(FOTOS_EQUIPO).sort().join());
    ok('V20-1.ocho' + sfx, 'Hay un retrato por cada integrante del equipo', claves === EQ.slice().sort().join(), claves);
    const dims = await P.evaluate(() => Promise.all(Object.entries(FOTOS_EQUIPO).map(([k, s]) => new Promise(r => { const i = new Image(); i.onload = () => r(k + ':' + i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => r(k + ':error'); i.src = s; }))));
    ok('V20-1.cargan' + sfx, 'Los 8 retratos son imágenes JPEG embebidas de 128×128', dims.every(x => /:128x128$/.test(x)), dims.join(' '));

    // Perfil: la barra superior (escritorio) y el encabezado del inicio muestran el retrato de quien está en el perfil.
    for (const p of EQ) {
      await T.perfil(p); await T.ir('#/inicio'); await P.waitForTimeout(40);
      const enc = await fotos('.encabezado'); const top = await fotos('.topbar');
      ok(`V20-2.inicio.${p}` + sfx, `Inicio de ${p}: el encabezado muestra su retrato`, enc.length === 1 && enc[0].id === p && enc[0].ok && enc[0].src, JSON.stringify(enc));
      const visibleTop = await P.locator('.topbar [data-perfil-foto]').isVisible().catch(() => false);
      ok(`V20-2.barra.${p}` + sfx, movil ? 'A 390 la barra no agrega el retrato (el selector va en el menú)' : `La barra superior muestra el retrato de ${p}`, movil ? !visibleTop : (top.length === 1 && top[0].id === p && top[0].ok && visibleTop), JSON.stringify(top));
    }
    for (const p of ['r1', 'pcl', 'pqa']) {
      await T.perfil(p); await T.ir(p === 'r1' ? '#/inicio' : `#/portal/${p === 'pcl' ? 'e1' : 'e3'}/inicio`); await P.waitForTimeout(40);
      ok(`V20-2.sin-foto.${p}` + sfx, `${p} no tiene retrato propio en la barra ni en el encabezado`, (await P.locator('.topbar [data-av], .encabezado-perfil').count()) === 0);
    }

    // Equipo (Manuel): fichas con los 8 retratos, rol y la descripción de la grilla.
    await T.perfil('man'); await T.ir('#/inicio/equipo'); await P.waitForTimeout(40);
    const fichas = await fotos('[data-equipo-fichas]');
    ok('V20-3.fichas' + sfx, 'La vista Equipo muestra las 8 fichas con su retrato', fichas.length === 8 && fichas.every(f => f.ok && f.src) && EQ.every(id => fichas.some(f => f.id === id)), JSON.stringify(fichas.map(f => f.id)));
    const txtF = await T.texto('[data-equipo-fichas]');
    ok('V20-3.texto' + sfx, 'Cada ficha dice nombre, rol y qué hace', /Lucía[\s\S]*Cauciones[\s\S]*Lidera el proceso de cauciones/.test(txtF) && /Emiliano[\s\S]*Desarrolla y sostiene/.test(txtF), txtF.slice(0, 200));
    const carga = await fotos('table');
    ok('V20-3.carga' + sfx, 'La tabla «Carga del equipo» lleva el retrato de cada persona', carga.length >= 8 && carga.every(f => f.ok));
    ok('V20-3.axe' + sfx, 'Equipo: axe sin violaciones serias', (await axe()).length === 0, (await axe()).join(' | '));
    ok('V20-3.scroll' + sfx, 'Equipo: sin scroll horizontal', await sinScroll());
    await T.foto('v20-equipo');

    // Interacciones: tarea con comentarios, mensajes enviados, historial de la persona, registro de eventos.
    await T.ir('#/tarea/t01'); await P.waitForTimeout(40);
    let f = await fotos('.contenido');
    ok('V20-4.tarea' + sfx, 'La tarea muestra el retrato de la responsable y de quien comentó', f.filter(x => x.id === 'luc').length >= 2 && f.every(x => x.ok && x.src), JSON.stringify(f));
    await T.ir('#/inicio/tareas?todas=1'); await P.waitForTimeout(40);
    f = await fotos('table');
    ok('V20-4.lista-tareas' + sfx, 'La lista de tareas muestra el retrato del responsable', f.length > 3 && f.every(x => x.ok));
    const d = await T.estado(); const conv = d.conversaciones.find(c => c.mensajes.some(m => m.autor === 'vic'));
    await T.ir(`#/persona/${conv.persona}/comunicacion`); await P.waitForTimeout(60);
    f = await fotos('.contenido');
    ok('V20-4.mensajes' + sfx, 'Los mensajes enviados muestran el retrato de quien los mandó', f.some(x => x.id === 'vic') && f.every(x => x.ok), JSON.stringify(f));
    ok('V20-4.mensajes-texto' + sfx, 'Sin marcado escapado en la conversación', await sinMarcado());
    ok('V20-4.mensajes-axe' + sfx, 'Conversación: axe sin violaciones serias', (await axe()).length === 0, (await axe()).join(' | '));
    await T.foto('v20-conversacion');
    // Delegar desde la conversación y ver los retratos en el historial y el registro.
    const at = d.atenciones.find(a => a.persona === conv.persona && !a.hasta);
    await T.perfil(at ? at.integrante : 'vic');
    if (!at) await T.act('tomarAtencion', { persona: conv.persona, motivo: 'Prueba v19' });
    const r = await T.act('delegarConversacion', { persona: conv.persona, a: 'pil', pedido: 'Mirá el siniestro, por favor' });
    await T.ir(`#/persona/${conv.persona}/historial`); await P.waitForTimeout(60);
    f = await fotos('.contenido');
    ok('V20-4.historial' + sfx, 'El historial muestra retratos en atenciones, delegaciones y eventos', f.length >= 2 && f.every(x => x.ok && x.src) && (await P.locator('.contenido [data-hist-delegaciones] [data-av]').count()) >= 1, JSON.stringify(r) + ' ' + JSON.stringify(f));
    ok('V20-4.historial-texto' + sfx, 'Sin marcado escapado en el historial', await sinMarcado());
    await T.foto('v20-historial');
    await P.evaluate(() => { const r = document.querySelector('[data-registro]'); r.open = true; });
    f = await fotos('[data-registro]');
    ok('V20-4.registro' + sfx, 'El registro de eventos muestra el retrato de quien hizo cada acción del equipo', f.length >= 1 && f.every(x => x.ok), f.length);
    const regTxt = await P.locator('[data-registro]').innerText();
    ok('V20-4.registro-texto' + sfx, 'Sin marcado escapado en el registro', !/<span|&lt;|data:image/.test(regTxt));

    // Gestiones con avances, prospectos y comentarios de riesgos.
    await T.perfil('luc'); await T.ir('#/empresa/e1/gestiones'); await P.waitForTimeout(60);
    await T.ir('#/clientes/prospectos'); await P.waitForTimeout(60);
    f = await fotos('table');
    ok('V20-5.prospectos' + sfx, 'La lista de prospectos muestra el retrato de quien lo sigue', f.length >= 1 && f.every(x => x.ok));
    ok('V20-5.prospectos-texto' + sfx, 'Sin marcado escapado en prospectos', await sinMarcado());
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/transferencia'); await P.locator('[data-trf="TRF-CL-01"] .fx-fila').click(); await P.waitForTimeout(80);
    const cm = await P.evaluate(() => [...document.querySelectorAll('[data-trf="TRF-CL-01"] .cm')].map(li => ({ emp: !!li.querySelector('.cm-av.emp'), foto: !!li.querySelector('.cm-av.foto img'), ok: [...li.querySelectorAll('.cm-av.foto img')].every(i => i.complete && i.naturalWidth === 128) })));
    ok('V20-5.comentarios' + sfx, 'En los comentarios de riesgos, el equipo lleva retrato y la empresa sus iniciales', cm.length >= 2 && cm.every(c => c.emp ? !c.foto : (c.foto && c.ok)) && cm.some(c => c.emp) && cm.some(c => !c.emp), JSON.stringify(cm));
    ok('V20-5.comentarios-axe' + sfx, 'Riesgos: axe sin violaciones serias', (await axe()).length === 0, (await axe()).join(' | '));
    ok('V20-5.scroll' + sfx, 'Riesgos: sin scroll horizontal', await sinScroll());
    await T.foto('v20-riesgos-comentarios');
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/transferencia?t=TRF-CL-01'); await P.waitForTimeout(80);
    f = await fotos('.contenido');
    ok('V20-5.portal' + sfx, 'En el portal, los comentarios del equipo también llevan el retrato', (await P.locator('.cm-av.foto img').count()) >= 1);

    // Personas y empresas (no son del equipo) siguen con iniciales.
    await T.perfil('man'); await T.ir('#/comunicacion/whatsapp?f=todas'); await P.waitForTimeout(60);
    const ext = await P.evaluate(() => [...document.querySelectorAll('.contenido .av')].map(a => ({ foto: !!a.querySelector('img'), ext: a.classList.contains('ext'), txt: a.textContent.trim() })));
    ok('V20-6.clientes-iniciales' + sfx, 'Las personas clientes siguen con iniciales (sin retrato)', ext.length > 0 && ext.filter(a => a.ext).every(a => !a.foto && a.txt.length >= 1), JSON.stringify(ext.slice(0, 4)));
    ok('V20-6.atiende' + sfx, 'La bandeja muestra el retrato de quien atiende', (await fotos('.contenido')).length >= 1);
    ok('V20-6.texto' + sfx, 'Sin marcado escapado en la bandeja', await sinMarcado());
    ok('V20-6.axe' + sfx, 'Bandeja: axe sin violaciones serias', (await axe()).length === 0, (await axe()).join(' | '));
    await T.foto('v20-bandeja');
    await T.perfil('emi'); await T.ir('#/inicio'); await T.foto('v20-inicio-emi');
    ok('V20-6.inicio-axe' + sfx, 'Inicio: axe sin violaciones serias', (await axe()).length === 0, (await axe()).join(' | '));
    ok('V20-6.inicio-scroll' + sfx, 'Inicio: sin scroll horizontal', await sinScroll());
    // Correcciones de la auditoría v20 (N1, N2, N5).
    await T.perfil('man'); await T.ir('#/demo/registro'); await P.waitForTimeout(60);
    f = await fotos('.contenido');
    ok('V20-8.registro-completo' + sfx, 'El registro completo muestra el retrato del actor del equipo', f.length >= 1 && f.every(x => x.ok && x.src), f.length);
    ok('V20-8.registro-completo-texto' + sfx, 'Sin marcado escapado en el registro completo', await sinMarcado());
    await T.ir('#/clientes/personas'); await P.waitForTimeout(60);
    f = await fotos('table');
    ok('V20-8.clientes-atiende' + sfx, 'La columna «Atiende» de Clientes lleva el retrato', f.length >= 1 && f.every(x => x.ok));
    await T.ir('#/importacion/lotes'); await P.waitForTimeout(60);
    const lote = await P.evaluate(() => (window.__brokeros.estado().lotes.find(l => !Array.isArray(l.filas)) || window.__brokeros.estado().lotes[0]).id);
    await T.ir('#/importacion/lote/' + lote); await P.waitForTimeout(60);
    f = await fotos('.contenido');
    ok('V20-8.lote' + sfx, 'El detalle del lote muestra el retrato de quien lo importó o preparó', f.length >= 1 && f.every(x => x.ok), lote);
    ok('V20-8.lote-texto' + sfx, 'Sin marcado escapado en el lote', await sinMarcado());
    await T.ir('#/empresa/e1/resumen'); await P.waitForTimeout(60);
    ok('V20-8.vinculo' + sfx, 'El vínculo con Risk OS muestra el retrato de quien lo hizo', (await fotos('.contenido')).length >= 1 && await sinMarcado());
    ok('V20-8.hasown' + sfx, 'fotoDe no devuelve claves heredadas', await P.evaluate(() => fotoDe('constructor') === null && fotoDe('toString') === null && fotoDe('p01') === null && /^data:image\/jpeg/.test(fotoDe('man'))));
    ok('V20-7.errores' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('fotos-v20');
})();
