// v13 · Pedido de Emiliano del 30/10: el equipo de Del Campo agrega y modifica filas de la lista de riesgos,
// del plan de acción y de la transferencia. Edición simulada; la empresa y R1 no editan.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
// Recalculo independiente de la banda (metodología v1: C = max_d P·I_d·V_d; 75 / 50 / 20).
const bandaInd = (P, I, V) => { const c = Math.max(...['eco', 'per', 'con', 'leg'].map(k => P * I[k] * V[k])); return c >= 75 ? 'critica' : c >= 50 ? 'alta' : c >= 20 ? 'media' : 'baja'; };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const activo = () => P.evaluate(() => document.activeElement && document.activeElement.id);
    const toast = () => P.locator('.toast').innerText().catch(() => '');
    const enviar = async () => { await P.locator('.modal button[type=submit]').click(); await P.waitForTimeout(120); };
    const ultimoEv = async () => (await T.estado()).eventos.slice(-1)[0];
    // B2 (auditoría v14): el formulario entero queda dentro del ancho de la pantalla.
    const dentro = () => P.evaluate(() => { const m = document.querySelector('.modal'); if (!m) return null; const r = m.getBoundingClientRect(); const fuera = [...m.querySelectorAll('input,select,textarea,button')].filter(x => { const q = x.getBoundingClientRect(); return q.width && (q.left < -0.5 || q.right > innerWidth + 0.5 || q.right > r.right + 0.5); }).map(x => x.id || x.name || x.textContent.trim().slice(0, 20)); return { ok: r.left >= -0.5 && r.right <= innerWidth + 0.5 && !fuera.length, l: Math.round(r.left), r: Math.round(r.right), w: innerWidth, fuera }; });

    // ---------- 1 · Agregar un riesgo sin evaluar (Manuel) ----------
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz');
    ok('V13-1.boton' + sfx, 'En la lista de riesgos hay «+ Agregar riesgo» para el equipo', await P.locator('#add-riesgoForm').count() === 1);
    await P.locator('#add-riesgoForm').click(); await P.waitForTimeout(80);
    ok('V13-1.modal' + sfx, 'Se abre el formulario con el rótulo «Edición simulada» y el foco en el nombre', await P.locator('[data-modal="riesgoForm"] [data-edicion-sim] .cap.sim').count() === 1 && await activo() === 'rf-tit');
    ok('V13-1.eval-man' + sfx, 'v22: Manuel también escribe evaluaciones; el formulario trae la evaluación inicial (la acepta otra persona)', await P.locator('[data-eval-inicial]').count() === 1);
    { const w = await dentro(); ok('V13-B2.ancho-riesgo' + sfx, 'El formulario (riesgo) y todos sus campos quedan dentro del ancho de la pantalla', w && w.ok, JSON.stringify(w)); }
    const v1 = await AXE(P); ok('V13-A11Y.modal-riesgo' + sfx, 'axe WCAG A/AA sin violaciones con el formulario de riesgo abierto', !v1.length, v1.join(' '));
    ok('V13-SCROLL.modal-riesgo' + sfx, 'Sin scroll horizontal con el formulario abierto', await sinScroll());
    await T.llenar('#rf-tit', 'Intoxicación con CO2 en tanques'); await enviar();
    ok('V13-1.valida' + sfx, 'Sin evaluación y sin «qué falta», no se guarda y el formulario sigue abierto', /qué falta para evaluarlo/.test(await toast()) && await P.locator('[data-modal="riesgoForm"]').count() === 1 && !(await T.estado()).riesgos.some(r => r.titulo === 'Intoxicación con CO2 en tanques'));
    ok('V13-1.conserva' + sfx, 'El rechazo no borra lo que se había escrito', await P.locator('#rf-tit').inputValue() === 'Intoxicación con CO2 en tanques');
    await T.llenar('#rf-desc', 'Acumulación de dióxido de carbono durante la fermentación.'); await T.llenar('#rf-mne', 'Falta la medición de CO2 en la sala.');
    await P.locator('#rf-zona').selectOption('ZON-CL-2'); await P.locator('#rf-safety').check(); await enviar();
    let d = await T.estado(); const r15 = d.riesgos.find(r => r.titulo === 'Intoxicación con CO2 en tanques');
    ok('V13-1.creado' + sfx, 'Se crea RSK-CL-15 (no pisa los IDs 10 a 12 del lote) en Cerro Liso, sin evaluar, con zona y seguridad de personas', r15 && r15.id === 'RSK-CL-15' && r15.org === 'ORG-01HCL7Q2' && !r15.evaluable && r15.zona === 'ZON-CL-2' && r15.safety && r15.evals.length === 0, JSON.stringify(r15));
    ok('V13-1.ruta' + sfx, 'Queda abierto en la lista, en el grupo «Sin evaluar», con el foco en su fila', /r=RSK-CL-15/.test(await T.hash()) && await P.locator('tr[data-riesgo="RSK-CL-15"][data-sin-evaluar]').count() === 1 && await activo() === 'ft-RSK-CL-15', await activo());
    const ev1 = await ultimoEv();
    ok('V13-1.evento' + sfx, 'Queda un evento de Manuel con origen «edición simulada»', ev1.actor === 'man' && /Agregó el riesgo/.test(ev1.accion) && /edición simulada/.test(ev1.origen) && !('foco' in ev1), JSON.stringify(ev1));
    ok('V13-1.linea' + sfx, 'El detalle dice quién lo agregó, marcado como simulado', /Agregado por Manuel/.test(await T.texto('[data-detalle-riesgo="RSK-CL-15"] [data-edicion]').catch(() => '')));

    // ---------- 2 · Modificar un riesgo evaluado (Emiliano) ----------
    await T.perfil('emi'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07');
    const bandaAntes = await P.locator('tr[data-riesgo="RSK-CL-07"] td[data-l="Banda"]').innerText();
    await P.locator('#ed-RSK-CL-07').click(); await P.waitForTimeout(80);
    ok('V13-2.factores' + sfx, 'En un riesgo evaluado, los factores no se tocan acá: remite a «Escribir reevaluación»', await P.locator('[data-modal="riesgoForm"] [data-sin-factores]').count() === 1 && await P.locator('#rf-p').count() === 0);
    ok('V13-2.precarga' + sfx, 'El formulario trae los datos actuales', await P.locator('#rf-tit').inputValue() === 'Robo en depósito de producto terminado');
    await P.keyboard.press('Escape'); await P.waitForTimeout(80);
    ok('V13-2.escape' + sfx, 'Escape cierra el formulario y el foco vuelve a «Modificar riesgo»', await P.locator('.modal').count() === 0 && await activo() === 'ed-RSK-CL-07', await activo());
    await P.locator('#ed-RSK-CL-07').click(); await P.waitForTimeout(80);
    await T.llenar('#rf-tit', 'Robo en depósito de expedición'); await P.locator('#rf-extrema').check(); await enviar();
    d = await T.estado(); const r07 = d.riesgos.find(r => r.id === 'RSK-CL-07');
    ok('V13-2.guardado' + sfx, 'Se guarda el nombre nuevo y la consecuencia extrema, con el cambio en el historial', r07.titulo === 'Robo en depósito de expedición' && r07.extrema && r07.ediciones.length === 1 && /Nombre/.test(r07.ediciones[0].cambios.join()) && /Consecuencia extrema: no → sí/.test(r07.ediciones[0].cambios.join()), JSON.stringify(r07.ediciones));
    ok('V13-2.lista' + sfx, 'La fila muestra el nombre nuevo y el símbolo, y la banda no cambia', /Robo en depósito de expedición/.test(await T.texto('tr[data-riesgo="RSK-CL-07"]')) && await P.locator('tr[data-riesgo="RSK-CL-07"] .ban-extrema').count() === 1 && await P.locator('tr[data-riesgo="RSK-CL-07"] td[data-l="Banda"]').innerText() === bandaAntes);
    ok('V13-2.foco' + sfx, 'Tras guardar, el foco vuelve a «Modificar riesgo»', await activo() === 'ed-RSK-CL-07', await activo());
    ok('V13-2.linea' + sfx, 'El detalle dice qué cambió y quién', /Modificado por Emiliano.*Nombre/.test(await T.texto('[data-detalle-riesgo="RSK-CL-07"] [data-edicion]')));
    await P.locator('#ed-RSK-CL-07').click(); await P.waitForTimeout(60); await enviar();
    ok('V13-2.sin-cambio' + sfx, 'Guardar sin cambios avisa y no deja evento', /No cambiaste nada/.test(await toast()) && (await T.estado()).riesgos.find(r => r.id === 'RSK-CL-07').ediciones.length === 1);
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);

    // ---------- 3 · Riesgo nuevo con evaluación inicial (Evangelina) y aceptación de otra persona ----------
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/matriz');
    await P.locator('#add-riesgoForm').click(); await P.waitForTimeout(80);
    ok('V13-3.form-eval' + sfx, 'Evangelina ve la evaluación inicial opcional', await P.locator('[data-eval-inicial]').count() === 1);
    { const w = await dentro(); ok('V13-B2.ancho-eval' + sfx, 'El formulario (eval) y todos sus campos quedan dentro del ancho de la pantalla', w && w.ok, JSON.stringify(w)); }
    const v3 = await AXE(P); ok('V13-A11Y.modal-eval' + sfx, 'axe WCAG A/AA sin violaciones con la evaluación inicial', !v3.length, v3.join(' '));
    ok('V13-SCROLL.modal-eval' + sfx, 'Sin scroll horizontal con la evaluación inicial', await sinScroll());
    const I = { eco: 4, per: 2, con: 5, leg: 2 }, V = { eco: 3, per: 2, con: 4, leg: 2 };
    await T.llenar('#rf-tit', 'Corte de agua en elaboración'); await P.locator('#rf-p').selectOption('3');
    for (const k of ['eco', 'per', 'con']) { await P.locator('#rf-i-' + k).selectOption(String(I[k])); await P.locator('#rf-v-' + k).selectOption(String(V[k])); }
    await enviar();
    ok('V13-3.incompleta' + sfx, 'Con una dimensión sin completar no se guarda', /Completá impacto y vulnerabilidad de «Legal»/.test(await toast()) && await P.locator('[data-modal="riesgoForm"]').count() === 1);
    await P.locator('#rf-i-leg').selectOption('2'); await P.locator('#rf-v-leg').selectOption('2'); await enviar();
    d = await T.estado(); const r16 = d.riesgos.find(r => r.titulo === 'Corte de agua en elaboración');
    ok('V13-3.pendiente' + sfx, 'RSK-CL-16 queda con la evaluación inicial pendiente, escrita por Evangelina', r16 && r16.id === 'RSK-CL-16' && r16.evals.length === 1 && r16.evals[0].estado === 'pendiente' && r16.evals[0].autor === 'eva');
    ok('V13-3.sin-evaluar' + sfx, 'Mientras tanto sigue en «Sin evaluar» y dice que la evaluación está pendiente', await P.locator('tr[data-riesgo="RSK-CL-16"][data-sin-evaluar] [data-eval-pendiente]').count() === 1 && await P.locator('[data-marcador="RSK-CL-16"]').count() === 0);
    ok('V13-3.aviso' + sfx, 'El detalle muestra «Evaluación inicial pendiente»', /Evaluación inicial pendiente/.test(await T.texto('[data-detalle-riesgo="RSK-CL-16"] [data-reeval-pendiente]')));
    const rech = await T.act('aceptarReeval', { riesgo: 'RSK-CL-16' });
    ok('V13-3.cuatro-ojos' + sfx, 'Evangelina no acepta su propia evaluación (AD-16)', !rech.ok);
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-16');
    await P.locator('[data-detalle-riesgo="RSK-CL-16"] [data-reeval-pendiente] button').click(); await P.waitForTimeout(100);
    const esperada = bandaInd(3, I, V);
    d = await T.estado();
    ok('V13-3.aceptada' + sfx, `Manuel la acepta y el riesgo entra a la lista con la banda recalculada (${esperada})`, d.riesgos.find(r => r.id === 'RSK-CL-16').evals[0].estado === 'aceptada' && await P.locator(`[data-grupo="${esperada}"]`).count() === 1 && await P.locator('tr[data-riesgo="RSK-CL-16"]:not([data-sin-evaluar]) td[data-pos]').count() === 1 && await P.locator('[data-marcador="RSK-CL-16"]').count() === 1);

    // Evaluar un riesgo que estaba sin evaluar (09) desde «Modificar riesgo»
    await T.perfil('emi'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-09');
    await P.locator('#ed-RSK-CL-09').click(); await P.waitForTimeout(80);
    ok('V13-3.eval-09' + sfx, 'Un riesgo sin evaluar ofrece la evaluación inicial al modificarlo', await P.locator('[data-eval-inicial]').count() === 1 && await P.locator('#rf-mne').inputValue() === 'Falta el permiso de vuelco y el informe de la planta de tratamiento.');
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);

    // ---------- 4 · Plan de acción ----------
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/plan');
    ok('V13-4.boton' + sfx, 'En el plan hay «+ Agregar acción»', await P.locator('#add-accionForm').count() === 1);
    await P.locator('#add-accionForm').click(); await P.waitForTimeout(80);
    ok('V13-4.modal' + sfx, 'Formulario de acción simulado con el foco en el título', await P.locator('[data-modal="accionForm"] [data-edicion-sim]').count() === 1 && await activo() === 'af-tit');
    { const w = await dentro(); ok('V13-B2.ancho-accion' + sfx, 'El formulario (accion) y todos sus campos quedan dentro del ancho de la pantalla', w && w.ok, JSON.stringify(w)); }
    const v4 = await AXE(P); ok('V13-A11Y.modal-accion' + sfx, 'axe WCAG A/AA sin violaciones con el formulario de acción', !v4.length, v4.join(' '));
    ok('V13-4.riesgos' + sfx, 'El selector de riesgo lista solo los de Cerro Liso', await P.$$eval('#af-rg option', os => os.every(o => o.value.startsWith('RSK-CL-'))));
    await T.llenar('#af-tit', 'Anclar estibas de barricas'); await P.locator('#af-rg').selectOption('RSK-CL-14'); await P.locator('#af-resp').selectOption('Bodega Cerro Liso (Laura Ferro)');
    await T.llenar('#af-vence', '2026-12-20'); await P.locator('#af-est').selectOption('en_curso'); await enviar();
    d = await T.estado(); const a7 = d.acciones.find(a => a.titulo === 'Anclar estibas de barricas');
    ok('V13-4.creada' + sfx, 'Se crea ACC-CL-07 para el sismo, en curso, con la zona del riesgo', a7 && a7.id === 'ACC-CL-07' && a7.riesgo === 'RSK-CL-14' && a7.estado === 'en_curso' && a7.zona === 'ZON-CL-1' && a7.vence === '2026-12-20', JSON.stringify(a7));
    ok('V13-4.abierta' + sfx, 'Queda abierta en el plan con el foco en su fila', /a=ACC-CL-07/.test(await T.hash()) && await P.locator('[data-accion="ACC-CL-07"].abierta').count() === 1 && await activo() === 'fa-ACC-CL-07', await activo());
    await T.ir('#/empresa/e1/riesgos/matriz');
    ok('V13-4.tratamiento' + sfx, 'En la lista, el sismo pasa a «Acción en curso»', /Acción en curso/.test(await P.locator('tr[data-riesgo="RSK-CL-14"] td[data-l="Tratamiento"]').innerText()));
    await T.ir('#/empresa/e1/riesgos/plan?a=ACC-CL-02');
    await P.locator('#ed-ACC-CL-02').click(); await P.waitForTimeout(80);
    ok('V13-4.precarga' + sfx, 'Modificar trae los datos de la acción', await P.locator('#af-tit').inputValue() === 'Línea de vida y arnés en pasarelas' && await P.locator('#af-est').inputValue() === 'pendiente' && await P.locator('#af-vence').inputValue() === '2026-11-30');
    await P.locator('#af-est').selectOption('en_curso'); await T.llenar('#af-vence', '2026-11-25'); await enviar();
    d = await T.estado(); const a2 = d.acciones.find(a => a.id === 'ACC-CL-02');
    ok('V13-4.modificada' + sfx, 'Se guarda el estado y el vencimiento, con el cambio legible en el historial', a2.estado === 'en_curso' && a2.vence === '2026-11-25' && /Estado: «Pendiente» → «En curso»/.test(a2.ediciones[0].cambios.join('; ')), JSON.stringify(a2.ediciones));
    ok('V13-4.fila' + sfx, 'La fila muestra «En curso» y el detalle dice quién la modificó; el foco vuelve a «Modificar acción»', /En curso/.test(await P.locator('[data-accion="ACC-CL-02"] [data-l="Estado"]').innerText()) && /Modificado por Manuel/.test(await T.texto('[data-accion="ACC-CL-02"] [data-edicion]')) && await activo() === 'ed-ACC-CL-02', await activo());
    ok('V13-4.no-decision' + sfx, 'El formulario no ofrece «Decisión de la dirección» (la registra Manuel aparte)', !(await T.act('guardarAccion', { id: 'ACC-CL-05', titulo: 'x y z', riesgo: 'RSK-CL-05', resp: 'Del Campo (Evangelina)', vence: '2026-11-20', estado: 'decision_direccion' })).ok);
    ok('V13-4.otro-org' + sfx, 'No se puede vincular una acción a un riesgo de otra empresa', !(await T.act('guardarAccion', { org: 'ORG-01HCL7Q2', titulo: 'Prueba', riesgo: 'RSK-QA-01', resp: 'Bodega Cerro Liso', vence: '2026-12-01', estado: 'pendiente' })).ok);

    // ---------- 5 · Transferencia ----------
    await T.ir('#/empresa/e1/riesgos/transferencia');
    ok('V13-5.boton' + sfx, 'En transferencia hay «+ Agregar transferencia»', await P.locator('#add-trfForm').count() === 1);
    await P.locator('#add-trfForm').click(); await P.waitForTimeout(80);
    { const w = await dentro(); ok('V13-B2.ancho-trf' + sfx, 'El formulario (trf) y todos sus campos quedan dentro del ancho de la pantalla', w && w.ok, JSON.stringify(w)); }
    const v5 = await AXE(P); ok('V13-A11Y.modal-trf' + sfx, 'axe WCAG A/AA sin violaciones con el formulario de transferencia', !v5.length, v5.join(' '));
    ok('V13-5.polizas' + sfx, 'El selector de póliza lista solo pólizas de Cerro Liso', (await P.$$eval('#tf-pol option', os => os.map(o => o.value).filter(Boolean))).sort().join() === 'pol05,pol06,pol07');
    ok('V13-5.sin-verificada' + sfx, 'Al agregar no se puede elegir «Verificada»', !(await P.$$eval('#tf-est option', os => os.map(o => o.value))).includes('verificada'));
    await P.locator('#tf-rg').selectOption('RSK-CL-03'); await P.locator('#tf-est').selectOption('en_poliza_sin_verificar'); await enviar();
    ok('V13-5.valida' + sfx, '«En póliza» sin póliza elegida no se guarda', /Elegí la póliza vinculada/.test(await toast()) && await P.locator('[data-modal="trfForm"]').count() === 1);
    await P.locator('#tf-pol').selectOption('pol06'); await T.llenar('#tf-inq', '¿La RC cubre a un operario contratista?'); await T.llenar('#tf-nota', 'Revisar la cláusula de contratistas.'); await enviar();
    d = await T.estado(); const t5 = d.transferencias.find(t => t.id === 'TRF-CL-05');
    ok('V13-5.creada' + sfx, 'Se crea TRF-CL-05 en póliza NEV-RC-41870, sin verificar', t5 && t5.riesgo === 'RSK-CL-03' && t5.estado === 'en_poliza_sin_verificar' && t5.poliza === 'pol06' && t5.polizaRef === 'NEV-RC-41870', JSON.stringify(t5));
    ok('V13-5.abierta' + sfx, 'Queda abierta con el foco en su fila y con el botón de verificar', /t=TRF-CL-05/.test(await T.hash()) && await activo() === 'ftr-TRF-CL-05' && /Marcar verificada en póliza/.test(await T.texto('[data-trf="TRF-CL-05"]')), await activo());
    // Una verificada que cambia de póliza pierde la verificación
    await T.ir('#/empresa/e1/riesgos/transferencia?t=TRF-CL-02');
    await P.locator('#ed-TRF-CL-02').click(); await P.waitForTimeout(80);
    { const w = await dentro(); ok('V13-B2.ancho-trf-mod' + sfx, 'Modificar transferencia también queda dentro del ancho de la pantalla', w && w.ok, JSON.stringify(w)); }
    ok('V13-5.verif-opcion' + sfx, 'En una verificada, «Verificada (se conserva)» es una opción', (await P.$$eval('#tf-est option', os => os.map(o => o.value))).includes('verificada'));
    await P.locator('#tf-pol').selectOption('pol06'); await enviar();
    ok('V13-5.verif-bloquea' + sfx, 'Cambiar la póliza de una cobertura verificada exige volver a «sin verificar»', /Marcar verificada en póliza/.test(await toast()) && (await T.estado()).transferencias.find(t => t.id === 'TRF-CL-02').poliza === 'pol05');
    await P.locator('#tf-est').selectOption('en_poliza_sin_verificar'); await enviar();
    d = await T.estado(); const t2 = d.transferencias.find(t => t.id === 'TRF-CL-02');
    ok('V13-5.verif-pierde' + sfx, 'Guardada como «En póliza, sin verificar» con la póliza nueva y sin revisor', t2.estado === 'en_poliza_sin_verificar' && t2.poliza === 'pol06' && !t2.revisadoPor && /En póliza, sin verificar/.test(t2.ediciones[0].cambios.join()) && /NEV-RC-41870/.test(t2.ediciones[0].cambios.join()), JSON.stringify(t2));
    ok('V13-5.no-verifica' + sfx, 'La edición no marca «verificada» por su cuenta', !(await T.act('guardarTransferencia', { id: 'TRF-CL-01', riesgo: 'RSK-CL-02', estado: 'verificada', poliza: 'pol05' })).ok);
    ok('V13-5.ref' + sfx, '«Referencia sin póliza» exige el número que cita la empresa', !(await T.act('guardarTransferencia', { org: 'ORG-01HCL7Q2', riesgo: 'RSK-CL-07', estado: 'referencia_sin_poliza' })).ok);
    ok('V13-5.pol-ajena' + sfx, 'No se vincula una póliza de otra empresa', !(await T.act('guardarTransferencia', { org: 'ORG-01HCL7Q2', riesgo: 'RSK-CL-07', estado: 'en_poliza_sin_verificar', poliza: 'pol09' })).ok);
    ok('V13-SCROLL.listas' + sfx, 'Sin scroll horizontal en transferencia', await sinScroll());

    // ---------- B1 (auditoría v14) · Ningún texto libre guarda datos de tarjeta ni bancarios ----------
    const TARJ = '4111 1111 1111 1111', CBU = '0170 0999 2000 0012 3456 78', T2 = '5555_5555_5555_4444';
    await T.perfil('emi');
    const rb = await T.act('guardarRiesgo', { org: 'ORG-01HCL7Q2', titulo: `Fraude con tarjeta ${TARJ}`, desc: `Le pasaron el CBU ${CBU}`, falta: `Saber si usaron ${T2}`, motivoNoEval: `Falta el extracto de ${TARJ}` });
    const idB = rb.ok && rb.ev.objeto;
    const ab = await T.act('guardarAccion', { org: 'ORG-01HCL7Q2', titulo: `Bloquear la tarjeta ${TARJ}`, riesgo: 'RSK-CL-07', resp: 'Bodega Cerro Liso', vence: '2026-12-01', estado: 'pendiente' });
    const tb = await T.act('guardarTransferencia', { org: 'ORG-01HCL7Q2', riesgo: 'RSK-CL-07', estado: 'referencia_sin_poliza', polizaRef: `NEV-RC-1 ${CBU}`, inquietud: `CBU ${CBU}`, nota: `tarjeta ${T2}` });
    await T.act('guardarRiesgo', { id: 'RSK-CL-07', titulo: `Robo con tarjeta ${T2}`, desc: 'Robo de cajas en el depósito de expedición.', zona: 'ZON-CL-4', extrema: true });
    const sinDatos = x => ![TARJ, CBU, T2].some(c => x.includes(c)) && !/4111\D?1111\D?1111\D?1111|5555\D?5555\D?5555\D?4444|0170\D?0999/.test(x);
    d = await T.estado();
    const json = JSON.stringify({ r: d.riesgos.filter(r => r.org === 'ORG-01HCL7Q2'), a: d.acciones, t: d.transferencias, e: d.eventos });
    ok('V13-B1.estado' + sfx, 'Riesgo, acción, transferencia, historial de cambios y registro no guardan tarjetas ni CBU', rb.ok && ab.ok && tb.ok && sinDatos(json), [rb.ok, ab.ok, tb.ok].join());
    ok('V13-B1.storage' + sfx, 'Tampoco quedan en el almacenamiento del navegador', sinDatos(await P.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('\n'))));
    ok('V13-B1.resto' + sfx, 'El resto del texto se conserva', /Fraude con tarjeta/.test(json) && /Bloquear la tarjeta/.test(json) && /NEV-RC-1/.test(json));
    await T.perfil('pcl');
    let vistoPortal = '';
    for (const s of [`matriz?r=${idB}`, 'plan', 'transferencia']) { await T.ir('#/portal/e1/riesgos/' + s); vistoPortal += await T.texto(); }
    ok('V13-B1.portal' + sfx, 'La empresa en su portal no ve tarjetas ni CBU', sinDatos(vistoPortal) && /Fraude con tarjeta/.test(vistoPortal));
    await T.perfil('man');

    // ---------- 6 · Permisos y aislamiento ----------
    await T.perfil('luc'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-01');
    ok('V13-6.lucia' + sfx, 'Lucía (lectura) no ve botones de agregar ni modificar', await P.locator('[id^="add-"], [id^="ed-"]').count() === 0);
    ok('V13-6.lucia-act' + sfx, 'Y la acción se rechaza aunque se llame directo', !(await T.act('guardarRiesgo', { org: 'ORG-01HCL7Q2', titulo: 'Prueba', motivoNoEval: 'x' })).ok);
    await T.perfil('pcl');
    for (const s of ['matriz?r=RSK-CL-01', 'plan?a=ACC-CL-01', 'transferencia?t=TRF-CL-01']) { await T.ir('#/portal/e1/riesgos/' + s); }
    await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-01'); const p1 = await P.locator('[id^="add-"], [id^="ed-"]').count();
    await T.ir('#/portal/e1/riesgos/plan?a=ACC-CL-01'); const p2 = await P.locator('[id^="add-"], [id^="ed-"]').count();
    await T.ir('#/portal/e1/riesgos/transferencia?t=TRF-CL-01'); const p3 = await P.locator('[id^="add-"], [id^="ed-"]').count();
    ok('V13-6.portal' + sfx, 'En el portal la empresa no ve agregar ni modificar en las tres listas', p1 + p2 + p3 === 0, `${p1} ${p2} ${p3}`);
    ok('V13-6.portal-act' + sfx, 'La empresa no puede agregar ni modificar filas', !(await T.act('guardarAccion', { id: 'ACC-CL-01', titulo: 'x y z', riesgo: 'RSK-CL-01', resp: 'Bodega Cerro Liso', vence: '2026-11-15', estado: 'hecha' })).ok && !(await T.act('guardarTransferencia', { org: 'ORG-01HCL7Q2', riesgo: 'RSK-CL-07', estado: 'propuesta' })).ok);
    ok('V13-6.portal-ve' + sfx, 'La empresa ve las filas que agregó el equipo (sismo con su acción)', /Anclar estibas de barricas/.test(await (async () => { await T.ir('#/portal/e1/riesgos/plan'); return T.texto('main, .portal'); })()));
    await T.perfil('pqa'); await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-15');
    ok('V13-6.aislamiento' + sfx, 'Hernán (Quebrada Azul) no ve el riesgo nuevo de Cerro Liso', await P.locator('[data-riesgo="RSK-CL-15"]').count() === 0 && !/Intoxicación con CO2/.test(await T.texto()));
    await T.perfil('r1'); await T.ir('#/empresa/e2/riesgos/matriz');
    ok('V13-6.r1' + sfx, 'El revisor (R1) sigue bloqueado antes de su orden previo y no tiene botones', await P.locator('[data-lista] tr[data-riesgo], [data-marcador], [id^="add-"]').count() === 0);
    ok('V13-6.r1-act' + sfx, 'R1 no puede agregar riesgos', !(await T.act('guardarRiesgo', { org: 'ORG-01HPD3K8', titulo: 'Prueba', motivoNoEval: 'x' })).ok);
    await T.perfil('emi'); await T.ir('#/empresa/e2/riesgos/matriz');
    ok('V13-6.validacion' + sfx, 'En la empresa histórica de la validación no se agregan riesgos (no se altera el experimento)', await P.locator('#add-riesgoForm').count() === 0 && !(await T.act('guardarRiesgo', { org: 'ORG-01HPD3K8', titulo: 'Prueba', motivoNoEval: 'x' })).ok);

    // ---------- 7 · Empresa sin riesgos y orden profesional ----------
    await T.perfil('eva'); await T.ir('#/empresa/e4/riesgos/plan');
    ok('V13-7.vacio-plan' + sfx, 'Con el plan vacío también se puede agregar', await P.locator('#add-accionForm').count() === 1);
    await P.locator('#add-accionForm').click(); await P.waitForTimeout(60);
    ok('V13-7.sin-riesgos' + sfx, 'Sin riesgos, el formulario pide agregar primero un riesgo', /Primero agregá un riesgo/.test(await T.texto('.modal')));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    const rLB = await T.act('guardarRiesgo', { org: 'ORG-01HLB9T4', titulo: 'Rayo sobre la subestación', motivoNoEval: 'Falta el estudio de puesta a tierra.' });
    d = await T.estado();
    ok('V13-7.id-lb' + sfx, 'En Lomas Blancas el código nuevo no choca con los candidatos del expediente (RSK-LB-07)', rLB.ok && d.riesgos.some(r => r.id === 'RSK-LB-07' && r.org === 'ORG-01HLB9T4'), JSON.stringify(rLB));
    // Quebrada Azul tiene orden profesional: un riesgo nuevo aceptado aparece al final de ese orden
    await T.act('guardarRiesgo', { org: 'ORG-01HQA5M1', titulo: 'Vuelco en carga de combustible', P: '2', I: { eco: 2, per: 3, con: 2, leg: 3 }, V: { eco: 2, per: 2, con: 2, leg: 2 } });
    await T.perfil('man'); await T.act('aceptarReeval', { riesgo: 'RSK-QA-05' });
    await T.ir('#/empresa/e3/riesgos/matriz');
    const ordQA = await P.$$eval('[data-lista="profesional"] tr[data-riesgo]', ts => ts.map(t => t.dataset.riesgo));
    ok('V13-7.reorden' + sfx, 'Con orden profesional, el riesgo agregado después aparece al final y no se pierde', ordQA[ordQA.length - 1] === 'RSK-QA-05' && ordQA.length === 5, ordQA.join(','));
    await P.locator('#add-riesgoForm').click(); await P.waitForTimeout(60); await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    ok('V13-7.escape-foco' + sfx, 'Escape en «Agregar riesgo» devuelve el foco al botón', await activo() === 'add-riesgoForm', await activo());

    // ---------- 8 · Panel y accesibilidad de las listas ----------
    await T.ir('#/empresa/e1/riesgos/panel');
    const tile = await T.texto('[data-pc-tile="riesgos"]');
    ok('V13-8.panel' + sfx, 'El panel cuenta los riesgos agregados: 11 evaluados (con el 16) y 3 sin evaluar (09, 15 y el de la prueba bancaria)', /\b11\b/.test(tile) && /3 sin evaluar/.test(tile), tile.replace(/\n/g, ' '));
    for (const s of ['matriz?r=RSK-CL-15', 'plan?a=ACC-CL-07', 'transferencia?t=TRF-CL-05']) {
      await T.ir('#/empresa/e1/riesgos/' + s); await P.waitForTimeout(60);
      const v = await AXE(P); ok('V13-A11Y.' + s.split('?')[0] + sfx, `axe WCAG A/AA sin violaciones en ${s.split('?')[0]} con la fila nueva abierta`, !v.length, v.join(' '));
      ok('V13-SCROLL.' + s.split('?')[0] + sfx, `Sin scroll horizontal en ${s.split('?')[0]}`, await sinScroll());
    }
    if (!movil) { await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07'); await P.locator('#ed-RSK-CL-07').click(); await P.waitForTimeout(80); await T.foto('V13-modificar-riesgo', false); await P.keyboard.press('Escape'); }
    else { await T.ir('#/empresa/e1/riesgos/plan'); await P.locator('#add-accionForm').click(); await P.waitForTimeout(80); await T.foto('V13-agregar-accion', false); await P.keyboard.press('Escape'); }

    // ---------- 9 · Layout: carpeta de fotos del sitio en Google Drive (simulada, como la carpeta del cliente) ----------
    const pedidos = []; P.on('request', q => { if (/drive\.google|www\.googleapis/.test(q.url())) pedidos.push(q.url()); });
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/layout'); await P.waitForTimeout(80);
    const fo = await P.evaluate(() => { const w = document.querySelector('[data-fotos-sitio]'); const b = w && w.querySelector('button'); return b ? { sitio: w.dataset.fotosSitio, txt: b.innerText, sr: (b.querySelector('.sr') || {}).textContent, sim: (w.querySelector('.cap.sim') || {}).textContent, enCab: !!w.closest('[data-mapa-wrap] header') } : null; });
    ok('V13-9.enlace' + sfx, 'El plano de la bodega tiene «Fotos del sitio en Google Drive (48)» en la cabecera, con el rótulo Simulado', fo && fo.sitio === 'SIT-CL-1' && /Fotos del sitio en Google Drive \(48\)/.test(fo.txt) && fo.sim === 'Simulado' && fo.enCab && /carpeta de demostración/.test(fo.sr), JSON.stringify(fo));
    await P.locator('#fotos-SIT-CL-1').click(); await P.waitForTimeout(80);
    const md = await T.texto('[data-modal="fotosSitio"]').catch(() => '');
    ok('V13-9.carpeta' + sfx, 'Abre la carpeta de demostración: ubicación dentro de la carpeta del cliente, dirección ficticia y fotos por zona', /Del Campo \/ Clientes \/ Empresas \/ Bodega Cerro Liso S\.A\. \/ Riesgos \/ Fotos · Bodega y planta/.test(md) && /drive\.google\.com\/drive\/folders\/demo-e1-fotos-sit-cl-1/.test(md) && /Sala de barricas\s+14 fotos/.test(md) && /Simulado/.test(md), md.replace(/\n/g, ' | '));
    const v9 = await AXE(P); ok('V13-A11Y.fotos' + sfx, 'axe WCAG A/AA sin violaciones con la carpeta de fotos abierta', !v9.length, v9.join(' '));
    ok('V13-SCROLL.fotos' + sfx, 'Sin scroll horizontal con la carpeta abierta', await sinScroll());
    await P.keyboard.press('Escape'); await P.waitForTimeout(60);
    ok('V13-9.foco' + sfx, 'Al cerrar, el foco vuelve al enlace de fotos', await activo() === 'fotos-SIT-CL-1', await activo());
    await T.ir('#/empresa/e1/riesgos/layout?s=SIT-CL-2'); await P.waitForTimeout(60);
    ok('V13-9.por-sitio' + sfx, 'Cada sitio tiene su carpeta (la finca, 22 fotos)', /\(22\)/.test(await T.texto('[data-fotos-sitio="SIT-CL-2"]').catch(() => '')));
    ok('V13-9.sin-red' + sfx, 'No hay pedidos de red a Google Drive', pedidos.length === 0, pedidos.join(' '));
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/layout'); await P.waitForTimeout(60);
    ok('V13-9.portal' + sfx, 'La empresa ve en su portal la carpeta de fotos de su sitio (como su carpeta de Drive, v14.1)', await P.locator('[data-fotos-sitio="SIT-CL-1"]').count() === 1);
    await P.evaluate(() => { UI_HANDLERS.modal({ tipo: 'fotosSitio', sitio: 'SIT-QA-1' }); render(); }); await P.waitForTimeout(40);
    ok('V13-9.portal-ajena' + sfx, 'Forzando el modal, Laura no ve la carpeta de fotos de Quebrada Azul', /Sin acceso/.test(await T.texto('.modal')) && !/Base logística|quebradaazul|e3-fotos/.test(await T.texto('.modal')));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    await T.perfil('r1'); await P.evaluate(() => { UI_HANDLERS.modal({ tipo: 'fotosSitio', sitio: 'SIT-CL-1' }); render(); }); await P.waitForTimeout(40);
    ok('V13-9.r1' + sfx, 'R1 no ve la carpeta de fotos', /Sin acceso/.test(await T.texto('.modal')));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    await T.perfil('luc'); await T.ir('#/empresa/e3/riesgos/layout'); await P.waitForTimeout(60);
    ok('V13-9.otra-empresa' + sfx, 'En Quebrada Azul muestra la carpeta de su base, no la de Cerro Liso', await P.locator('[data-fotos-sitio="SIT-QA-1"]').count() === 1 && await P.locator('[data-fotos-sitio^="SIT-CL"]').count() === 0);

    ok('V13.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v13');
})();
