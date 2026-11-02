// v4 · Pedido de Emiliano del 28/10 sobre las vistas de riesgos de una empresa (7 puntos), con aislamiento, persistencia,
// datos bancarios y accesibilidad de los estados abiertos. Los valores esperados salen de la semilla, no del código de las vistas.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await T.perfil('man');

    // 1 · Menos texto
    await T.ir('#/empresa/e1/riesgos/matriz'); let t = await T.texto('main');
    ok('V4-1.rangos' + sfx, 'La matriz no muestra rangos («75 o más», «50 a 74»…)', !/75 o más|50 a 74|20 a 49|menos de 20/.test(t));
    ok('V4-1.nota-plegada' + sfx, 'La explicación larga queda plegada («Cómo se lee»)', !/toma el peor/.test(t) && await P.locator('details[data-nota-matriz]:not([open])').count() === 1);
    ok('V4-1.sin-parrafo-orden' + sfx, 'Sin el párrafo sobre el orden calculado bajo el título de la lista', !/La posición va al final porque/.test(t));
    ok('V4-1.pendiente-plegado' + sfx, 'La propuesta pendiente AD-13 no ocupa la pantalla de riesgos (v8: queda en «Decisiones pendientes del owner»)', await P.locator('details.pend-mini').count() === 0 && !/cambia RO01 §2 y requiere/.test(t));

    // 6 · El detalle se abre dentro de la lista
    await P.locator('tr[data-riesgo="RSK-CL-01"] a.fila-tit').click(); await P.waitForTimeout(80);
    ok('V4-6.hash' + sfx, 'Pulsar la fila abre el detalle (estado en la URL)', /matriz\?r=RSK-CL-01$/.test(await T.hash()));
    const enLista = await P.evaluate(() => { const tr = document.querySelector('tr[data-riesgo="RSK-CL-01"]'); const sig = tr && tr.nextElementSibling; return !!(sig && sig.matches('tr.fila-det') && sig.querySelector('[data-detalle-riesgo="RSK-CL-01"]')) && document.querySelectorAll('[data-detalle-riesgo]').length === 1; });
    ok('V4-6.en-la-lista' + sfx, 'El detalle es la fila siguiente de la misma tabla (no un panel aparte)', enLista);
    ok('V4-6.expandido' + sfx, 'La fila abierta anuncia aria-expanded="true"', (await P.locator('tr[data-riesgo="RSK-CL-01"] a.fila-tit').getAttribute('aria-expanded')) === 'true');
    // 2 · Probabilidad arriba y destacada, con justificación y referencias simuladas
    const geo = await P.evaluate(() => { const p = document.querySelector('[data-prob]'), tb = document.querySelector('[data-tabla-impacto]'), n = p.querySelector('.prob-val strong'); const cs = getComputedStyle(n); return { arriba: p.getBoundingClientRect().bottom <= tb.getBoundingClientRect().top + 1, peso: +cs.fontWeight, tam: parseFloat(cs.fontSize), txt: p.innerText }; });
    ok('V4-2.arriba' + sfx, 'La probabilidad está por encima de la tabla de impacto', geo.arriba);
    ok('V4-2.bold' + sfx, 'La probabilidad se ve grande y en negrita', geo.peso >= 700 && geo.tam >= 30, `${geo.peso} ${geo.tam}px`);
    ok('V4-2.valor' + sfx, 'Muestra el valor de la evaluación vigente (3, Posible) sin «de 5»', /3/.test(geo.txt) && !/de 5/.test(geo.txt) && /Posible/.test(geo.txt), geo.txt);
    const tipOculto = await P.locator('#tip-RSK-CL-01').isVisible();
    if (movil) await P.locator('.tip-btn').first().focus(); else await P.locator('.tip-btn').first().hover();
    await P.waitForTimeout(60);
    const tip = await P.locator('#tip-RSK-CL-01').isVisible(), tipTxt = await P.locator('#tip-RSK-CL-01').innerText().catch(() => '');
    ok('V4-2.tooltip' + sfx, 'El tooltip aparece al pasar o enfocar y explica la probabilidad', !tipOculto && tip && /40 establecimientos/.test(tipTxt), tipTxt.slice(0, 120));
    const tipGeo = await P.evaluate(() => { const t = document.getElementById('tip-RSK-CL-01'); const b = t.getBoundingClientRect(); const dentro = b.left >= 0 && b.right <= innerWidth + 0.5 && b.width > 150; let tapa = true; for (const [fx, fy] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.5]]) { const x = b.left + b.width * fx, y = b.top + b.height * fy; if (y < 0 || y > innerHeight) continue; const el = document.elementFromPoint(x, y); if (!el || !t.contains(el) && el !== t) tapa = false; } const fijo = getComputedStyle(t).position === 'fixed'; let anc = fijo ? null : t.parentElement, recorte = false; while (anc && anc !== document.body) { const cs = getComputedStyle(anc); if (/(auto|hidden|scroll|clip)/.test(cs.overflowX + cs.overflowY)) { const a = anc.getBoundingClientRect(); if (b.left < a.left - 0.5 || b.right > a.right + 0.5 || b.bottom > a.bottom + 0.5) recorte = true; } anc = anc.parentElement; } return { dentro, tapa, recorte, w: Math.round(b.width), x: Math.round(b.left) }; });
    ok('V4-2.tooltip-legible' + sfx, 'El tooltip abierto queda dentro de la pantalla, sin recorte de un contenedor y sin nada encima', tipGeo.dentro && tipGeo.tapa && !tipGeo.recorte, JSON.stringify(tipGeo));
    ok('V4-2.tooltip-simulada' + sfx, 'El tooltip cita la fuente externa y la rotula como ficticia y simulada', /Observatorio Vitivinícola Andino/.test(tipTxt) && /ficticia, simulada/.test(tipTxt));
    ok('V4-2.tooltip-a11y' + sfx, 'El botón del tooltip está descrito por él (aria-describedby)', (await P.locator('.tip-btn').first().getAttribute('aria-describedby')) === 'tip-RSK-CL-01');
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    ok('V4-2.tooltip-escape' + sfx, 'Escape oculta el tooltip', !(await P.locator('#tip-RSK-CL-01').isVisible()));
    await P.locator('[data-prob] .link-btn').click(); await P.waitForTimeout(400);
    const refs = await P.evaluate(() => { const r = document.getElementById('refs-RSK-CL-01'); const b = r.getBoundingClientRect(); return { foco: document.activeElement === r, visible: b.top >= 0 && b.top < innerHeight, n: r.querySelectorAll('li').length, txt: r.innerText }; });
    ok('V4-2.referencias' + sfx, '«Ver referencias» lleva a la lista de referencias (foco y a la vista)', refs.foco && refs.visible && refs.n === 2, JSON.stringify(refs).slice(0, 160));
    ok('V4-2.referencias-simuladas' + sfx, 'Las referencias se rotulan como fuentes ficticias y simuladas', /Fuentes ficticias/.test(refs.txt) && /\.ejemplo\//.test(refs.txt));
    // 3 · Vulnerabilidad
    const th = await P.locator('[data-tabla-impacto] thead').innerText();
    ok('V4-3.vulnerabilidad' + sfx, 'La tabla dice «Vulnerabilidad» y no «Preparación»', /Vulnerabilidad/i.test(th) && !/Preparaci/i.test(th), th.replace(/\n/g, ' '));
    let todo = '';
    for (const h of ['#/empresa/e1/riesgos/matriz', '#/empresa/e1/riesgos/matriz?r=RSK-CL-05', '#/empresa/e3/riesgos/matriz?r=RSK-QA-01', '#/importacion/expediente/EXP-LB-1']) { await T.ir(h); todo += await T.texto('main'); }
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07'); await T.boton('Escribir reevaluación'); todo += await P.locator('[aria-modal="true"]').innerText(); await P.keyboard.press('Escape');
    ok('V4-3.sin-preparacion' + sfx, 'Ninguna vista de riesgos ni la reevaluación dicen «Preparación»', !/Preparaci/i.test(todo) && /Vulnerabilidad/.test(todo));
    await T.perfil('man');

    // 4 · Plan como lista; formularios solo al pulsar
    await T.ir('#/empresa/e1/riesgos/plan');
    const nAcc = (await T.estado()).acciones.filter(a => a.org === 'ORG-01HCL7Q2').length;
    ok('V4-4.lista' + sfx, 'El plan es una lista con una fila por acción, todas cerradas', await P.locator('[data-plan-lista] > li').count() === nAcc && await P.locator('[data-plan-lista] [aria-expanded="true"]').count() === 0);
    ok('V4-4.sin-cajas' + sfx, 'Sin cajas de texto a la vista con todo cerrado', await P.locator('main textarea').count() === 0);
    await P.locator('[data-accion="ACC-CL-02"] .fx-fila').click(); await P.waitForTimeout(80);
    ok('V4-4.expande' + sfx, 'Pulsar una fila amplía su detalle en la lista', await P.locator('[data-accion="ACC-CL-02"] .fx-det').count() === 1 && await P.locator('.fx-det').count() === 1);
    const camposVisibles = () => P.evaluate(() => [...document.querySelectorAll('[data-plan-lista] input, [data-plan-lista] textarea, [data-plan-lista] select')].filter(x => x.offsetParent !== null && x.type !== 'hidden').length);
    ok('V4-4.sin-cajas-abierta' + sfx, 'Abierta, ningún campo (input, textarea, select) hasta pulsar un botón', await camposVisibles() === 0);
    ok('V4-4.decision-boton' + sfx, 'La decisión de la dirección es un botón que despliega su caja', await P.locator('[data-accion="ACC-CL-02"]').getByRole('button', { name: 'Registrar decisión de la dirección' }).count() === 1);
    await P.locator('[data-accion="ACC-CL-02"]').getByRole('button', { name: 'Registrar decisión de la dirección' }).click(); await P.waitForTimeout(60);
    ok('V4-4.decision-caja' + sfx, '«Registrar decisión» muestra una sola caja con el foco puesto', await camposVisibles() === 1 && await P.evaluate(() => document.activeElement && document.activeElement.closest('form[data-form="decisionDireccion"]') !== null));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    ok('V4-4.decision-escape' + sfx, 'Escape la vuelve a cerrar', await camposVisibles() === 0);
    await P.locator('[data-accion="ACC-CL-02"]').getByRole('button', { name: 'Comentar' }).click(); await P.waitForTimeout(60);
    ok('V4-4.comentar' + sfx, '«Comentar» muestra la caja con el foco puesto', await P.locator('main textarea').count() === 1 && await P.evaluate(() => document.activeElement && document.activeElement.tagName === 'TEXTAREA'));
    await P.keyboard.type('Confirmamos la compra del arnés.'); await P.locator('form[data-form="comentarAccion"] button[type=submit]').click(); await P.waitForTimeout(60);
    let d = await T.estado();
    ok('V4-4.guardado' + sfx, 'El comentario se agrega al plan, con autor, y la caja se cierra', d.comentarios.some(c => c.accion === 'ACC-CL-02' && c.texto === 'Confirmamos la compra del arnés.' && c.autorPerfil === 'man') && await P.locator('main textarea').count() === 0 && /Confirmamos la compra/.test(await T.texto('[data-accion="ACC-CL-02"]')));
    await P.locator('[data-accion="ACC-CL-02"]').getByRole('button', { name: 'Registrar avance' }).click(); await P.waitForTimeout(60);
    ok('V4-4.avance' + sfx, '«Registrar avance» muestra su formulario (texto, evidencia y estado)', await P.locator('form[data-form="registrarAvance"] textarea').count() === 1 && await P.locator('form[data-form="registrarAvance"] select').count() === 2);
    await T.boton('Cancelar'); ok('V4-4.cancelar' + sfx, '«Cancelar» vuelve a ocultar la caja', await P.locator('main textarea').count() === 0);

    // 5 · Transferencia como lista con incisos y comentarios; indicador de nuevos
    await T.ir('#/empresa/e1/riesgos/transferencia');
    ok('V4-5.lista' + sfx, 'La transferencia es una lista cerrada por defecto', await P.locator('[data-trf-lista] > li').count() === 4 && await P.locator('.fx-det').count() === 0);
    const filaTrf = await T.texto('[data-trf="TRF-CL-03"]');
    ok('V4-5.indicador' + sfx, 'La fila con un comentario nuevo de la empresa lo indica', /1\s+nuevo/.test(filaTrf), filaTrf.replace(/\n/g, ' '));
    await P.locator('[data-trf="TRF-CL-01"] .fx-fila').click(); await P.waitForTimeout(80);
    const inc = await T.texto('[data-trf="TRF-CL-01"] [data-incisos]');
    ok('V4-5.incisos' + sfx, 'El detalle cita los incisos clave con su referencia a la póliza', /Fermentación descontrolada/.test(inc) && /cláusula 4\.2/.test(inc) && /ALT-TRO-20931/.test(inc) && /Excluye/.test(inc), inc.slice(0, 160));
    ok('V4-5.incisos-ficticios' + sfx, 'Los incisos se rotulan como texto ficticio', /Texto ficticio/.test(inc));
    ok('V4-5.comentarios' + sfx, 'El detalle tiene comentarios de la empresa y del equipo', /Empresa/.test(await T.texto('[data-trf="TRF-CL-01"] .hilo-c')) && /Del Campo/.test(await T.texto('[data-trf="TRF-CL-01"] .hilo-c')));
    // La empresa comenta desde su portal (con una tarjeta que no debe guardarse) y el equipo ve el indicador.
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/transferencia?t=TRF-CL-01');
    ok('V4-5.portal-nuevo' + sfx, 'En el portal, el comentario del equipo aparece como nuevo al abrir', await P.locator('[data-trf="TRF-CL-01"] .cm-es-nuevo').count() === 1);
    await P.locator('[data-trf="TRF-CL-01"]').getByRole('button', { name: 'Comentar' }).click(); await P.waitForTimeout(40);
    await P.keyboard.type('Perfecto. Si hace falta, pago con la tarjeta 5555 5555 5555 4444.'); await P.locator('form[data-form="comentarObjeto"] button[type=submit]').click(); await P.waitForTimeout(60);
    d = await T.estado(); const nuevoC = d.comentariosObj.filter(c => c.obj.id === 'TRF-CL-01').pop();
    ok('V4-5.portal-comenta' + sfx, 'La empresa comenta en su portal y queda como «Empresa»', nuevoC && nuevoC.autorPerfil === 'pcl' && nuevoC.autorTipo === 'empresa' && /^Perfecto/.test(nuevoC.texto));
    ok('V4-5.sin-tarjeta' + sfx, 'El comentario no guarda el número de tarjeta', nuevoC && !/5555\s?5555\s?5555\s?4444/.test(JSON.stringify(d)), nuevoC && nuevoC.texto);
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/transferencia');
    ok('V4-5.equipo-ve' + sfx, 'Evangelina ve «1 nuevo» en la fila y en la pestaña', /1\s+nuevo/.test(await T.texto('[data-trf="TRF-CL-01"]')) && await P.locator('[data-sp-nuevos="transferencia"]').count() === 1);
    ok('V4-5.notificacion' + sfx, 'Evangelina y Manuel reciben un aviso del comentario de la empresa', d.notificaciones.filter(n => n.obj && n.obj.id === 'TRF-CL-01').map(n => n.para).sort().join() === 'eva,man');
    await P.locator('[data-trf="TRF-CL-01"] .fx-fila').click(); await P.waitForTimeout(80);
    ok('V4-5.resaltado' + sfx, 'Al abrir, el comentario nuevo se resalta', await P.locator('[data-trf="TRF-CL-01"] .cm-es-nuevo').count() === 1);
    await T.ir('#/empresa/e1/riesgos/transferencia');
    ok('V4-5.leido' + sfx, 'Después de abrirlo, la fila ya no indica nuevos', !/nuevo/.test(await T.texto('[data-trf="TRF-CL-01"]')));
    await P.reload(); await P.waitForSelector('#root > *'); await T.ir('#/empresa/e1/riesgos/transferencia?t=TRF-CL-01');
    ok('V4-5.persiste' + sfx, 'Tras recargar, el comentario y la lectura siguen (estado local)', /Perfecto/.test(await T.texto('[data-trf="TRF-CL-01"]')) && await P.locator('[data-trf="TRF-CL-01"] .cm-es-nuevo').count() === 0);
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/transferencia');
    ok('V4-5.por-persona' + sfx, 'Las lecturas son por persona: Manuel todavía lo ve como nuevo', /nuevo/.test(await T.texto('[data-trf="TRF-CL-01"]')));

    // 6 · Comentarios en riesgos, en los dos sentidos
    await T.perfil('emi'); await T.ir('#/empresa/e1/riesgos/matriz'); // Emiliano todavía no abrió ese riesgo
    ok('V4-6.indicador' + sfx, 'La fila del riesgo indica el comentario nuevo de la empresa', /1\s+nuevo/.test(await T.texto('tr[data-riesgo="RSK-CL-01"]')), await T.texto('tr[data-riesgo="RSK-CL-01"]'));
    await T.perfil('man');
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-03'); await P.locator('[data-detalle-riesgo="RSK-CL-03"]').getByRole('button', { name: 'Comentar' }).click();
    await P.keyboard.type('Laura, ¿cuándo llega la línea de vida?'); await P.locator('form[data-form="comentarObjeto"] button[type=submit]').click(); await P.waitForTimeout(60);
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/matriz');
    ok('V4-6.portal-indicador' + sfx, 'La empresa ve en su lista los comentarios nuevos del equipo', /2\s+nuevos/.test(await T.texto('tr[data-riesgo="RSK-CL-03"]')), await T.texto('tr[data-riesgo="RSK-CL-03"]'));
    await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-03');
    ok('V4-6.portal-lee' + sfx, 'Y los lee dentro de la lista, marcados como nuevos', /cuándo llega la línea de vida/.test(await T.texto('[data-detalle-riesgo="RSK-CL-03"]')) && await P.locator('[data-detalle-riesgo="RSK-CL-03"] .cm-es-nuevo').count() === 2);

    // Permisos y aislamiento de los comentarios
    let rr = await T.act('comentarObjeto', { tipo: 'transferencia', id: 'TRF-QA-01', texto: 'Hola' });
    ok('V4-P.portal-ajeno' + sfx, 'El portal de Cerro Liso no puede comentar en Quebrada Azul', rr.ok === false);
    await T.perfil('pqa');
    const ajenos = ['Ya instalamos los detectores', 'El electricista viene', 'cuándo llega la línea de vida', 'Tenemos una cotización de seguro agrícola', 'Perfecto. Si hace falta'];
    let vistoPqa = '';
    for (const h of ['#/portal/e3/riesgos/matriz', '#/portal/e3/riesgos/matriz?r=RSK-QA-01', '#/portal/e3/riesgos/plan', '#/portal/e3/riesgos/transferencia?t=TRF-QA-01', '#/portal/e3/riesgos/layout', '#/portal/e1/riesgos/matriz?r=RSK-CL-01', '#/portal/e1/riesgos/transferencia?t=TRF-CL-01', '#/demo/registro']) { await T.ir(h); vistoPqa += await T.texto('#root'); }
    ok('V4-P.aislamiento-portal' + sfx, 'El portal de Quebrada Azul no ve comentarios de Cerro Liso', !ajenos.some(x => vistoPqa.includes(x)) && /Sin acceso a esta empresa/.test(vistoPqa));
    ok('V4-P.portal-propio' + sfx, 'Y sí ve los suyos (comentario del equipo sobre su flota)', /rastreo satelital/.test(vistoPqa));
    await T.perfil('r1'); let vistoR1 = '';
    for (const h of ['#/empresa/e1/riesgos/matriz?r=RSK-CL-01', '#/empresa/e1/riesgos/transferencia?t=TRF-CL-01', '#/empresa/e3/riesgos/plan?a=ACC-QA-01', '#/empresa/e2/riesgos/layout', '#/empresa/e2/riesgos/matriz']) { await T.ir(h); vistoR1 += await T.texto('#root'); }
    ok('V4-P.aislamiento-r1' + sfx, 'El revisor externo (R1) no ve comentarios ni planos de otros clientes', ![...ajenos, 'rastreo satelital', 'Sala de barricas', 'Base logística'].some(x => vistoR1.includes(x)) && /orden previo/i.test(vistoR1), vistoR1.slice(0, 120));
    rr = await T.act('comentarObjeto', { tipo: 'riesgo', id: 'RSK-PD-01', texto: 'Hola' });
    ok('V4-P.r1-no-comenta' + sfx, 'R1 no comenta riesgos', rr.ok === false);
    await T.perfil('luc'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-01');
    rr = await T.act('comentarObjeto', { tipo: 'riesgo', id: 'RSK-CL-01', texto: 'Hola' });
    ok('V4-P.lectura' + sfx, 'Lucía (lectura) ve los comentarios pero no puede comentar', /Solo lectura/.test(await T.texto('[data-detalle-riesgo]')) && !(await P.locator('[data-detalle-riesgo]').getByRole('button', { name: 'Comentar' }).count()) && rr.ok === false);
    await T.perfil('jim'); await T.ir('#/empresa/e1/riesgos/transferencia?t=TRF-CL-01');
    ok('V4-P.sin-riesgos' + sfx, 'Jimena (sin acceso a Riesgos) no ve la transferencia ni sus comentarios', !/Fermentación descontrolada|Si se rompe un tanque/.test(await T.texto('main')));

    // 7 · Layout: plano navegable por sitio, pines vinculados a la lista
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/layout'); await P.waitForTimeout(60);
    d = await T.estado();
    const sitiosE1 = d.sitios.filter(s => s.org === 'ORG-01HCL7Q2'), zS1 = d.zonas.filter(z => z.sitio === sitiosE1[0].id).map(z => z.id);
    const pinesEsp = d.riesgos.filter(r => r.org === 'ORG-01HCL7Q2' && r.tipo !== 'sub' && zS1.includes(r.zona)).map(r => r.id).sort();
    const pines = (await P.$$eval('svg[data-mapa] [data-pin]', ps => ps.map(p => p.dataset.pin))).sort();
    ok('V4-7.mapa' + sfx, 'El layout es un plano SVG con un pin por riesgo de las zonas del sitio', await P.locator('svg[data-mapa]').count() === 1 && JSON.stringify(pines) === JSON.stringify(pinesEsp), pines.join(','));
    ok('V4-7.sitios' + sfx, 'Cada sitio de operación tiene su plano (selector de sitios)', await P.locator('.sitios a').count() === sitiosE1.length && sitiosE1.length === 2);
    ok('V4-7.forma' + sfx, 'Los pines muestran la banda con forma, no solo color', (await P.$$eval('[data-pin] .pin-s', s => s.map(x => x.textContent))).every(x => /[◆▲■●?]/.test(x)));
    ok('V4-7.ficticio' + sfx, 'El plano se rotula como ficticio y simulado', /Plano ficticio/.test(await T.texto('[data-mapa-wrap]')));
    const centrar = () => P.locator('[data-mapa-wrap]').evaluate(n => n.scrollIntoView({ block: 'center' }));
    await centrar(); const tr0 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform');
    await T.boton('Acercar'); await P.waitForTimeout(40);
    const tr1 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform');
    ok('V4-7.zoom-boton' + sfx, 'El botón «Acercar» hace zoom (150 %)', tr1 !== tr0 && /scale\(1\.50*\)/.test(tr1) && /150 %/.test(await T.texto('[data-zoom-nivel]')), tr1);
    await P.locator('svg[data-mapa]').evaluate(n => n.scrollIntoView({ block: 'center' })); const box = await P.locator('svg[data-mapa]').boundingBox();
    await P.mouse.move(box.x + box.width * .3, box.y + box.height * .5); await P.mouse.down(); await P.mouse.move(box.x + box.width * .5, box.y + box.height * .6, { steps: 6 }); await P.mouse.up(); await P.waitForTimeout(40);
    const tr2 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform');
    ok('V4-7.arrastre' + sfx, 'Arrastrar desplaza el plano sin cambiar de pantalla', tr2 !== tr1 && /layout$/.test(await T.hash()), tr2);
    if (!movil) { await P.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await P.mouse.wheel(0, -400); await P.waitForTimeout(60); }
    const tr3 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform');
    ok('V4-7.rueda' + sfx, 'La rueda acerca el plano (en escritorio)', movil || (+tr3.match(/scale\(([\d.]+)\)/)[1] > 1.6), tr3);
    await P.locator('svg[data-mapa]').focus(); await P.keyboard.press('0'); await P.waitForTimeout(30);
    const tr4 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform'); await P.keyboard.press('+'); await P.keyboard.press('ArrowRight'); await P.waitForTimeout(30);
    const tr5 = await P.getAttribute('svg[data-mapa] [data-cam]', 'transform');
    ok('V4-7.teclado' + sfx, 'Con el plano enfocado: 0 encuadra, + acerca, flechas desplazan', /scale\(1(\.0*)?\)/.test(tr4) && /scale\(1\.50*\)/.test(tr5) && tr5 !== tr4, `${tr4} → ${tr5}`);
    const tabPines = await P.evaluate(() => { const svg = document.querySelector('svg[data-mapa]'), m = svg.getBoundingClientRect(); return [...svg.querySelectorAll('[data-pin]')].map(a => { const b = a.querySelector('.pin-f').getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.bottom; return { id: a.dataset.pin, enfocable: a.getAttribute('tabindex') !== '-1', visto: cx >= m.left && cx <= m.right && cy >= m.top && cy <= m.bottom }; }); });
    ok('V4-7.tab-visibles' + sfx, 'Con zoom, Tab solo pasa por los pines que se ven en el plano', tabPines.every(x => x.enfocable === x.visto) && tabPines.some(x => x.enfocable), JSON.stringify(tabPines.filter(x => x.enfocable !== x.visto)));
    await centrar(); await T.boton('Encuadrar');
    await P.locator('[data-pin="RSK-CL-03"]').click(); await P.waitForTimeout(80);
    ok('V4-7.pin' + sfx, 'Pulsar un pin lo selecciona, resalta su zona y muestra el riesgo', /r=RSK-CL-03/.test(await T.hash()) && (await P.getAttribute('[data-pin="RSK-CL-03"]', 'aria-current')) === 'true' && (await P.getAttribute('[data-zona="ZON-CL-2"]', 'aria-current')) === 'true' && /Caída o atrapamiento/.test(await T.texto('[data-riesgo-sel]')));
    await P.locator('[data-ver-lista]').click(); await P.waitForTimeout(80);
    ok('V4-7.a-la-lista' + sfx, '«Ver en la lista» abre ese riesgo expandido en la lista', /matriz\?r=RSK-CL-03$/.test(await T.hash()) && await P.locator('tr.fila-det [data-detalle-riesgo="RSK-CL-03"]').count() === 1);
    await P.locator('[data-detalle-riesgo="RSK-CL-03"] [data-ver-zona]').click(); await P.waitForTimeout(80);
    ok('V4-7.desde-lista' + sfx, 'Y desde el detalle se vuelve al pin en el plano', /layout\?r=RSK-CL-03$/.test(await T.hash()) && (await P.getAttribute('[data-pin="RSK-CL-03"]', 'aria-current')) === 'true');
    await T.ir('#/empresa/e1/riesgos/layout?r=RSK-CL-04');
    ok('V4-7.otro-sitio' + sfx, 'Un riesgo de otro sitio abre el plano de ese sitio', (await P.getAttribute('.sitios a[aria-current="page"]', 'data-sitio')) === 'SIT-CL-2' && await P.locator('[data-pin="RSK-CL-04"][aria-current="true"]').count() === 1);
    // Arrastrar sobre un pin no navega
    await T.ir('#/empresa/e1/riesgos/layout?s=SIT-CL-1'); await P.waitForTimeout(40); await P.locator('svg[data-mapa]').evaluate(n => n.scrollIntoView({ block: 'center' }));
    const pb = await P.locator('[data-pin="RSK-CL-07"] .pin-f').boundingBox();
    await P.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await P.mouse.down(); await P.mouse.move(pb.x + 80, pb.y + 40, { steps: 6 }); await P.mouse.up(); await P.waitForTimeout(60);
    ok('V4-7.arrastre-pin' + sfx, 'Un arrastre que empieza sobre un pin no lo selecciona', !/r=RSK-CL-07/.test(await T.hash()), await T.hash());
    await T.ir('#/empresa/e2/riesgos/layout');
    ok('V4-7.sin-plano' + sfx, 'Una empresa sin plano muestra un estado vacío claro', /Sin plano cargado/.test(await T.texto('main')));
    await T.perfil('pqa'); await T.ir('#/portal/e3/riesgos/layout');
    ok('V4-7.portal' + sfx, 'El plano también está en el portal de la empresa', await P.locator('svg[data-mapa] [data-pin]').count() === 2 && await P.locator('.sitios a').count() === 2);

    // Accesibilidad y celular en los estados abiertos
    for (const [p, h] of [['man', '#/empresa/e1/riesgos/matriz?r=RSK-CL-01'], ['man', '#/empresa/e1/riesgos/plan?a=ACC-CL-03'], ['man', '#/empresa/e1/riesgos/transferencia?t=TRF-CL-01'], ['man', '#/empresa/e1/riesgos/layout?r=RSK-CL-03'], ['pcl', '#/portal/e1/riesgos/matriz?r=RSK-CL-01'], ['pqa', '#/portal/e3/riesgos/layout?s=SIT-QA-2']]) {
      await T.perfil(p); await T.ir(h); await P.waitForTimeout(80);
      const v = await AXE(P); ok('V4-A11Y.' + p + h.replace(/[^a-z0-9]+/gi, '_') + sfx, `axe WCAG A/AA sin violaciones en ${h}`, !v.length, v.join(' '));
      ok('V4-SCROLL.' + p + h.replace(/[^a-z0-9]+/gi, '_') + sfx, `Sin scroll horizontal en ${h}`, await sinScroll());
      if (/r=RSK-CL-01/.test(h) || /a=ACC/.test(h) || /t=TRF/.test(h)) await T.foto('V4' + h.replace(/[^a-z0-9]+/gi, '-'), true);
    }
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/layout?r=RSK-CL-03'); await T.foto('V4-layout-bodega'); await T.ir('#/empresa/e3/riesgos/layout?s=SIT-QA-2'); await T.foto('V4-layout-corredor');
    ok('V4.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v4');
})();
