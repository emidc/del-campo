// R3 · Victoria (§6.3): alta de persona y vehículo con skill de Gemini (simulado), duplicados, dato dudoso y confirmación.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('vic'); await T.ir('#/inicio');
    // v6: el inicio muestra la tarea en una línea; el correo con el carnet y la tarjeta verde es su origen.
    { const d0 = await T.estado(), t = d0.tareas.find(x => x.resp === 'vic' && /Diego Funes/.test(x.titulo)), c = t && t.origen && d0.conversaciones.find(x => x.id === t.origen.conv), m = c && c.mensajes.find(x => x.id === t.origen.msg);
      ok('R3.1a' + sfx, 'El inicio muestra la tarea que nace del correo con el carnet y la tarjeta verde', !!t && (await P.locator(`[data-tarea="${t.id}"]`).count()) === 1 && /carnet y tarjeta verde de Diego Funes/.test(m ? m.texto : ''), t && t.id); }
    ok('R3.k15a' + sfx, 'K-15 = 1 al empezar', (await T.kpi('K-15', 'vic')) === 1);
    await P.keyboard.press('/'); await P.fill('#q-global', 'Diego Funes'); await P.waitForTimeout(40);
    const rb = await T.texto('[data-resultados]');
    ok('R3.1b' + sfx, 'La búsqueda muestra «Diego A. Funes» con otro DNI', /Diego A\. Funes/.test(rb) && /27\.903\.551/.test(rb));
    await P.keyboard.press('Escape');
    await P.locator('.top-acciones button', { hasText: '' }).filter({ has: P.locator('svg') }).first().click(); await P.waitForTimeout(40);
    ok('R3.2a' + sfx, 'Panel Gemini abierto por defecto para Victoria, con aviso R-19', (await P.locator('[data-gemini]').count()) === 1 && /R-19/.test(await T.texto('[data-gemini]')));
    await T.boton('Iniciar /ingresar cliente', '[data-gemini]');
    ok('R3.2b' + sfx, 'Imágenes ficticias rotuladas FICTICIO', (await P.locator('[data-gemini] svg text', { hasText: 'FICTICIO' }).count()) === 2);
    await T.boton('Adjuntar', '[data-gemini] figure:nth-child(1)'); await T.boton('Adjuntar', '[data-gemini] figure:nth-child(2)');
    await T.boton('Ejecutar la skill', '[data-gemini]');
    const g = await T.texto('[data-gemini]');
    ok('R3.3' + sfx, 'Pasos: lectura → buscar_persona (sin resultado por DNI) → buscar_vehiculo → coincidencia con Rosa Funes', /Lectura de imágenes/.test(g) && /buscar_persona/.test(g) && /sin resultado por DNI/.test(g) && /buscar_vehiculo/.test(g) && /Rosa Funes/.test(g));
    ok('R3.k15b' + sfx, 'La propuesta queda «a confirmar» (K-15 = 2)', (await T.kpi('K-15', 'vic')) === 2);
    ok('R3.4a' + sfx, 'El año se leyó «2O19» y está marcado dudoso', (await P.inputValue('#r3-anio')) === '2O19' && /dudoso/.test(await T.texto('[data-campo="anio"]')));
    const rSin = await T.act('r3Confirmar');
    ok('R3.adv-sin-decision' + sfx, 'Sin decidir el duplicado, «Confirmar» está deshabilitado y la acción se rechaza', (await P.locator('[data-gemini] [data-act="r3Confirmar"]').getAttribute('aria-disabled')) === 'true' && !rSin.ok && /Decidí qué hacer con el duplicado/.test(rSin.error));
    await P.check('input[name=opcion][value=crear]'); await P.locator('form[data-form="r3Decision"] button[type=submit]').click(); await P.waitForTimeout(40);
    ok('R3.5a' + sfx, '«Crear igual» sin motivo se rechaza', /exige un motivo/.test(await P.evaluate(() => UI.toast && UI.toast.msg)));
    await P.check('input[name=opcion][value=vincular]'); await P.fill('#r3-mot', 'compra del vehículo a un familiar'); await P.locator('form[data-form="r3Decision"] button[type=submit]').click(); await P.waitForTimeout(40);
    await T.boton('Confirmar alta', '[data-gemini]');
    ok('R3.4b' + sfx, 'Con el año dudoso no deja confirmar', /no es válido/.test(await P.evaluate(() => UI.toast && UI.toast.msg)) && !(await T.estado()).personas.some(p => p.id === 'p20'));
    await P.fill('#r3-anio', '2019'); await P.locator('[data-campo="anio"] button[type=submit]').click(); await P.waitForTimeout(40);
    await T.boton('Confirmar alta', '[data-gemini]');
    const d = await T.estado(); const v01 = d.vehiculos.find(v => v.id === 'v01'); const pa = d.propuestasAgente.find(p => p.skill === '/ingresar cliente y automotor' && p.id !== 'PA-0');
    ok('R3.6a' + sfx, 'Persona creada, vehículo vinculado con nuevo titular e historial', d.personas.some(p => p.id === 'p20' && p.nombre === 'Diego Funes') && v01.titular === 'p20' && v01.anio === 2019 && v01.historial.some(h => h.motivo === 'compra del vehículo a un familiar'));
    ok('R3.6b' + sfx, 'La escritura pasa de «a confirmar» a «confirmada por Victoria»; K-15 baja a 1', pa.estado === 'confirmada' && pa.por === 'vic' && (await T.kpi('K-15', 'vic')) === 1);
    { const ds = await T.estado(); const t5 = ds.tareas.find(x => x.id === 't05'); const err = await P.locator('.toast.error').count();
      ok('R3.6e' + sfx, 'La tarea de origen «Dar de alta a Diego Funes y su auto» queda hecha con comentario, y no queda un error viejo a la vista', t5.estado === 'hecha' && t5.comentarios.some(c => /confirmada/.test(c.texto)) && err === 0, `${t5.estado} · toasts de error: ${err}`); }
    await T.foto('R3-6-confirmada');
    await P.keyboard.press('/'); await P.fill('#q-global', 'AE123CD'); await P.waitForTimeout(40);
    ok('R3.6c' + sfx, 'La búsqueda por patente encuentra el vehículo con el nuevo titular', /AE123CD[\s\S]*Diego Funes/.test(await T.texto('[data-resultados]')));
    await P.fill('#q-global', 'Diego Funes'); await P.waitForTimeout(40);
    ok('R3.6d' + sfx, 'La búsqueda encuentra a Diego Funes', /DNI 34\.512\.889/.test(await T.texto('[data-resultados]')));
    await P.keyboard.press('Escape');
    await P.keyboard.press('Escape');
    // Contacto de empresa por DNI: alta manual ofrece vincular
    await T.ir('#/clientes/nueva'); await P.fill('#ap-nombre', 'Hernán Ríos'); await P.fill('#ap-dni', (await T.estado()).personas.find(p => p.id === 'p06').dni);
    await T.boton('Buscar duplicados y crear'); const dup = await T.texto('[data-duplicado]');
    ok('R3.adv-contacto' + sfx, 'DNI de un contacto de Transportes Quebrada Azul ofrece «vincular»', /Transportes Quebrada Azul/.test(dup) && (await P.locator('input[name=decision][value=vincular]').count()) === 1);
    await T.boton('Confirmar decisión');
    ok('R3.adv-contacto-b' + sfx, 'Vincular abre la persona existente sin duplicar', (await T.hash()) === '#/persona/p06/resumen' && (await T.estado()).personas.filter(p => p.nombre === 'Hernán Ríos').length === 1);
    ok('R3.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('r3-victoria');
})();
