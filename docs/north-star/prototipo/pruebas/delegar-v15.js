// v15 · Pedido de Emiliano del 30/10: quien atiende a un cliente delega la conversación a otro integrante; el delegado
// la termina con un botón cuando completa el pedido. Simulado.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const dl = async () => (await T.estado()).delegaciones || [];

    // 1 · Victoria atiende a Natalia Díaz (p17) y ve «Delegar conversación» en Comunicación y en el resumen, con rótulo Simulado
    await T.perfil('vic'); await T.ir('#/persona/p17/comunicacion');
    { const t = await T.texto('[aria-labelledby="h-atc"]');
      ok('V15-1.com' + sfx, 'Comunicación muestra la tarjeta Atención con «Delegar conversación» y Simulado', /Atiende\s+Victoria/.test(t) && /Delegar conversación/.test(t) && /Simulado/.test(t), t);
      const v = await AXE(P); ok('V15-A11Y.com' + sfx, 'axe WCAG 2.2 sin violaciones en Comunicación', !v.length, v.join(' '));
      ok('V15-SCROLL.com' + sfx, 'Sin desplazamiento horizontal en Comunicación', await sinScroll()); }
    await T.ir('#/persona/p17/resumen');
    ok('V15-1.resumen' + sfx, 'El resumen también ofrece delegar', /Delegar conversación/.test(await T.texto('[aria-labelledby="h-at"]')));

    // 2 · Quien no atiende no ve el botón; la acción lo rechaza
    for (const p of ['man', 'eva', 'emi']) {
      await T.perfil(p); await T.ir('#/persona/p17/comunicacion');
      ok(`V15-2.boton.${p}${sfx}`, `${p} no atiende a Natalia: no ve «Delegar conversación»`, (await P.getByRole('button', { name: 'Delegar conversación' }).count()) === 0);
      const r = await T.act('delegarConversacion', { persona: 'p17', a: 'luc', pedido: 'x' });
      ok(`V15-2.accion.${p}${sfx}`, `${p} no puede delegar una conversación que no atiende`, !r.ok, r.error);
    }
    await T.perfil('vic');
    { const r = await T.act('delegarConversacion', { persona: 'p03', a: 'eva', pedido: 'x' }); ok('V15-2.sinAtencion' + sfx, 'No se delega una conversación sin atención vigente', !r.ok, r.error); }

    // 3 · El modal: elegir integrante y pedido; validaciones
    await T.ir('#/persona/p17/comunicacion'); await T.boton('Delegar conversación');
    { const t = await T.texto('[data-modal="delegar"]');
      ok('V15-3.modal' + sfx, 'El modal explica la delegación y está marcado como simulado', /Delegar la conversación/.test(t) && /Simulado/.test(t) && /vuelve a vos/.test(t), t);
      const ops = await P.locator('#dl-a option').evaluateAll(o => o.map(x => x.value));
      ok('V15-3.opciones' + sfx, 'Se puede elegir a cualquier integrante que atiende clientes, menos a Victoria y a Emiliano', !ops.includes('vic') && !ops.includes('emi') && ['man', 'eva', 'luc', 'jim', 'pil', 'mat'].every(x => ops.includes(x)), ops.join(','));
      const v = await AXE(P); ok('V15-A11Y.modal' + sfx, 'axe sin violaciones con el modal abierto', !v.length, v.join(' '));
      ok('V15-SCROLL.modal' + sfx, 'Sin desplazamiento horizontal con el modal abierto', await sinScroll());
      await T.foto('V15-delegar-modal', false); }
    await P.locator('[data-modal="delegar"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V15-3.requerido' + sfx, 'Sin pedido no se delega', (await dl()).length === 0 && (await P.locator('[data-modal="delegar"]').count()) === 1);
    await P.selectOption('#dl-a', 'eva'); await T.llenar('#dl-ped', 'Confirmar si la póliza de vida cubre a los hijos');
    await P.locator('[data-modal="delegar"] button[type="submit"]').click(); await P.waitForTimeout(80);
    { const ds = await dl(); const d = await T.estado();
      ok('V15-3.creada' + sfx, 'Queda una delegación vigente de Victoria a Evangelina con el pedido', ds.length === 1 && ds[0].de === 'vic' && ds[0].a === 'eva' && !ds[0].hasta && /cubre a los hijos/.test(ds[0].pedido), JSON.stringify(ds));
      ok('V15-3.atencion' + sfx, 'La atención sigue siendo de Victoria', d.atenciones.find(a => a.persona === 'p17' && !a.hasta).integrante === 'vic');
      ok('V15-3.aviso' + sfx, 'Evangelina recibe un aviso', d.notificaciones.some(n => n.para === 'eva' && /te delegó la conversación con Natalia Díaz/.test(n.titulo)));
      ok('V15-3.evento' + sfx, 'Queda un evento', d.eventos.some(e => /Delegó la conversación con Natalia Díaz a Evangelina/.test(e.accion)));
      ok('V15-3.cerro' + sfx, 'El modal se cierra', (await P.locator('[data-modal="delegar"]').count()) === 0);
      const head = await T.texto('.contenido header, .contenido');
      ok('V15-3.chip' + sfx, 'El encabezado muestra «Delegada a Evangelina»', (await P.locator('[data-flag-delegada]').count()) === 1 && /Delegada a Evangelina/.test(head));
      const t = await T.texto('[aria-labelledby="h-atc"]');
      ok('V15-3.tarjeta' + sfx, 'Victoria ve la delegación, el pedido y «Retirar delegación», no «Terminar»', /Delegada a Evangelina/.test(t) && /cubre a los hijos/.test(t) && /Retirar delegación/.test(t) && !/Terminar delegación/.test(t) && !/Delegar conversación/.test(t), t);
      const r = await T.act('delegarConversacion', { persona: 'p17', a: 'luc', pedido: 'otro' }); ok('V15-3.doble' + sfx, 'No se puede delegar dos veces a la vez', !r.ok, r.error);
      const v = await AXE(P); ok('V15-A11Y.vigente' + sfx, 'axe sin violaciones con la delegación vigente', !v.length, v.join(' '));
      ok('V15-SCROLL.vigente' + sfx, 'Sin desplazamiento horizontal con la delegación vigente', await sinScroll());
      await T.foto('V15-delegada-victoria'); }

    // 4 · Un mensaje nuevo notifica a Evangelina, no a Victoria
    { const nA = (await T.estado()).notificaciones.length;
      await T.act('entrante', { canal: 'whatsapp', persona: 'p17', texto: '¿Pudieron ver lo de mis hijos?' });
      const d = await T.estado(); const nuevas = d.notificaciones.slice(nA);
      ok('V15-4.ruteo' + sfx, 'El mensaje nuevo notifica solo a Evangelina', nuevas.length === 1 && nuevas[0].para === 'eva' && nuevas[0].delegada && d.ultimoRuteo.notificados.join() === 'eva', JSON.stringify(nuevas));
      ok('V15-4.destino' + sfx, 'El destino explica la delegación', /Delegada a Evangelina \(atiende Victoria\)/.test(d.ultimoRuteo.destino), d.ultimoRuteo.destino); }

    // 5 · Evangelina: la ve en «Atendidas por mí», responde y termina la delegación con un botón
    await T.perfil('eva'); await T.ir('#/comunicacion/whatsapp?f=mias');
    { const t = await T.texto('.contenido'); ok('V15-5.bandeja' + sfx, 'Evangelina ve la conversación de Natalia en «Atendidas por mí», marcada como delegada a ella', /Natalia Díaz/.test(t) && /Delegada a vos/.test(t), t.slice(0, 400)); }
    await T.ir('#/persona/p17/resumen');
    ok('V15-5.motivo' + sfx, 'El resumen avisa que los mensajes notifican a Evangelina', /notifican solo a Evangelina, a quien se delegó/.test(await T.texto('[aria-labelledby="h-at"]')));
    await T.ir('#/persona/p17/comunicacion');
    { const t = await T.texto('[aria-labelledby="h-atc"]'); ok('V15-5.tarjeta' + sfx, 'Evangelina ve «Te la delegó Victoria», el pedido y «Terminar delegación»', /Te la delegó/.test(t) && /Victoria/.test(t) && /cubre a los hijos/.test(t) && /Terminar delegación/.test(t), t); }
    await T.llenar('#resp-txt', 'Sí, cubre a tus hijos. Te paso el detalle.'); await P.locator('form[data-form="responder"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V15-5.responde' + sfx, 'Evangelina puede responder', (await T.estado()).conversaciones.find(c => c.persona === 'p17' && c.canal === 'whatsapp').mensajes.some(m => m.autor === 'eva'));
    await T.foto('V15-delegada-evangelina');
    await T.boton('Terminar delegación');
    { const d = await T.estado(); const x = d.delegaciones[0];
      ok('V15-5.termina' + sfx, 'La delegación termina y queda registrado que la completó Evangelina', x.hasta && /Terminada por Evangelina/.test(x.cierre), JSON.stringify(x));
      ok('V15-5.aviso' + sfx, 'Victoria recibe el aviso de que terminó', d.notificaciones.some(n => n.para === 'vic' && /terminó la delegación de Natalia Díaz/.test(n.titulo)));
      ok('V15-5.toast' + sfx, 'El mensaje de confirmación dice que vuelve a Victoria', /vuelve a Victoria/.test(await T.texto('#root')));
      ok('V15-5.sinBoton' + sfx, 'Evangelina ya no ve la delegación ni el chip', (await P.locator('[data-flag-delegada]').count()) === 0 && !/Terminar delegación/.test(await T.texto('.contenido')));
      const nA = d.notificaciones.length; await T.act('entrante', { canal: 'whatsapp', persona: 'p17', texto: 'Gracias' });
      const n = (await T.estado()).notificaciones.slice(nA); ok('V15-5.vuelve' + sfx, 'El siguiente mensaje vuelve a notificar a Victoria', n.length === 1 && n[0].para === 'vic' && !n[0].delegada, JSON.stringify(n)); }
    await T.ir('#/persona/p17/historial');
    ok('V15-5.historial' + sfx, 'El historial lista la delegación terminada', /Victoria → Evangelina/.test(await T.texto('[data-hist-delegaciones]')) && /Terminada por Evangelina/.test(await T.texto('[data-hist-delegaciones]')));

    // 6 · Retirar, transferir y cerrar terminan la delegación; un tercero no puede terminarla
    await T.perfil('vic');
    await T.act('delegarConversacion', { persona: 'p17', a: 'luc', pedido: 'Mandar la constancia' });
    await T.perfil('man'); { const r = await T.act('terminarDelegacion', { persona: 'p17' }); ok('V15-6.tercero' + sfx, 'Un tercero no puede terminar la delegación', !r.ok, r.error); }
    await T.perfil('vic'); await T.ir('#/persona/p17/comunicacion'); await T.boton('Retirar delegación');
    ok('V15-6.retira' + sfx, 'Victoria puede retirar la delegación', /Retirada por Victoria/.test((await dl()).find(x => x.a === 'luc').cierre || ''));
    await T.act('delegarConversacion', { persona: 'p17', a: 'jim', pedido: 'Revisar beneficiarios' });
    await T.act('transferirAtencion', { persona: 'p17', a: 'pil', motivo: 'Cambio de cartera' });
    ok('V15-6.transferir' + sfx, 'Transferir la atención termina la delegación', /se transfirió/.test((await dl()).find(x => x.a === 'jim').cierre || ''));
    await T.perfil('pil'); await T.act('delegarConversacion', { persona: 'p17', a: 'mat', pedido: 'Llamar' }); await T.act('cerrarAtencion', { persona: 'p17' });
    ok('V15-6.cerrar' + sfx, 'Cerrar la atención termina la delegación', /se cerró/.test((await dl()).find(x => x.a === 'mat').cierre || ''));
    await T.ir('#/persona/p17/comunicacion');
    ok('V15-6.sinAtencion' + sfx, 'Sin atención no se ofrece delegar', (await P.getByRole('button', { name: 'Delegar conversación' }).count()) === 0 && /primero alguien tiene que tomarla/.test(await T.texto('[aria-labelledby="h-atc"]')));

    // 6b · Correcciones de la auditoría v14: historial sin scroll con pedidos largos, la delegada no cierra la atención ajena,
    // aviso a la delegada al transferir, pedido sin datos bancarios, sin destinatario preseleccionado
    await T.perfil('eva');
    await T.act('delegarConversacion', { persona: 'p06', a: 'vic', pedido: 'Revisar https://drive.google.com/drive/folders/demo-una-carpeta-con-un-nombre-muy-largo-sin-espacios-para-probar-el-corte CBU 0170099220000067797370' });
    { const x = (await dl()).find(y => y.persona === 'p06' && !y.hasta); ok('V15-6b.bancarios' + sfx, 'El pedido guardado omite el CBU', x && !/0170099220000067797370/.test(x.pedido), x && x.pedido); }
    await T.perfil('vic'); await T.ir('#/persona/p06/resumen');
    { const t = await T.texto('[aria-labelledby="h-at"]'); ok('V15-6b.cerrar' + sfx, 'La delegada no ve «Transferir» ni «Cerrar atención» de la atención ajena', !/Cerrar atención/.test(t) && !/Transferir/.test(t) && /Terminar delegación/.test(t), t); }
    { const t = await T.texto('[aria-labelledby="h-at"]'); ok('V15-6b.sinNoPermiso' + sfx, 'La tarjeta de la delegada no muestra un aviso de permiso', (await P.locator('[aria-labelledby="h-at"] .no-permiso').count()) === 0 && !/Emiliano/.test(t), t); }
    { const r = await T.act('cerrarAtencion', { persona: 'p06' }); ok('V15-6b.cerrarAct' + sfx, 'La delegada tampoco puede cerrar la atención por acción directa', !r.ok, r.error); }
    ok('V15-6b.chip' + sfx, 'El encabezado le dice a la delegada «Delegada a vos»', /Delegada a vos/.test(await T.texto('[data-flag-delegada]')));
    await T.ir('#/persona/p06/historial');
    ok('V15-6b.scroll' + sfx, 'El historial no se desplaza en horizontal con un pedido largo', await sinScroll());
    await T.perfil('eva'); await T.ir('#/persona/p06/comunicacion'); await T.boton('Retirar delegación'); await T.boton('Delegar conversación');
    ok('V15-6b.default' + sfx, 'El modal no preselecciona a nadie', (await P.locator('#dl-a').inputValue()) === '');
    ok('V15-6b.focoAbre' + sfx, 'Al abrir, el foco va a «A quién»', await P.evaluate(() => document.activeElement && document.activeElement.id === 'dl-a'));
    await P.selectOption('#dl-a', 'luc'); await T.llenar('#dl-ped', '   '); await P.locator('[data-modal="delegar"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V15-6b.borrador' + sfx, 'Un rechazo conserva a quién se eligió', (await P.locator('#dl-a').inputValue()) === 'luc');
    await P.selectOption('#dl-a', 'luc'); await T.llenar('#dl-ped', 'Revisar'); await P.locator('[data-modal="delegar"] button[type="submit"]').click(); await P.waitForTimeout(80);
    ok('V15-6b.focoVuelve' + sfx, 'Después de delegar, el foco queda en «Retirar delegación»', await P.evaluate(() => document.activeElement && document.activeElement.id === 'btn-retirar-deleg'));
    await T.boton('Retirar delegación'); await T.boton('Delegar conversación');
    await P.keyboard.press('Escape'); await P.waitForTimeout(60);
    ok('V15-6b.focoEsc' + sfx, 'Escape devuelve el foco a «Delegar conversación»', await P.evaluate(() => document.activeElement && document.activeElement.id === 'btn-delegar'));
    await T.boton('Delegar conversación');
    await T.llenar('#dl-ped', 'Algo'); await P.locator('[data-modal="delegar"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V15-6b.requiereA' + sfx, 'Sin elegir a quién no se delega', !(await dl()).some(y => y.persona === 'p06' && !y.hasta));
    await P.keyboard.press('Escape');
    { await T.act('delegarConversacion', { persona: 'p06', a: 'jim', pedido: 'Cotizar' }); const nA = (await T.estado()).notificaciones.length;
      await T.act('transferirAtencion', { persona: 'p06', a: 'luc', motivo: 'Vacaciones' }); const n = (await T.estado()).notificaciones.slice(nA);
      ok('V15-6b.avisoTransf' + sfx, 'Al transferir, la delegada recibe aviso de que terminó su delegación', n.some(x => x.para === 'jim' && /Terminó tu delegación/.test(x.titulo)), JSON.stringify(n)); }

    // 7 · Estado guardado antes de la v14 (sin «delegaciones») no rompe nada
    await P.evaluate(() => { const k = window.__brokeros.clave; const o = JSON.parse(localStorage.getItem(k)); delete o.d.delegaciones; localStorage.setItem(k, JSON.stringify(o)); });
    await P.reload(); await P.waitForSelector('#root > *'); await T.perfil('eva'); await T.ir('#/persona/p05/comunicacion');
    ok('V15-7.legado' + sfx, 'Con un estado sin delegaciones la ficha carga y ofrece delegar', /Delegar conversación/.test(await T.texto('.contenido')));
    { const r = await T.act('delegarConversacion', { persona: 'p05', a: 'man', pedido: 'Cotizar' }); ok('V15-7.legadoAct' + sfx, 'Y delegar funciona', r.ok, r.error); }

    ok('V15-ERR' + sfx, 'Sin errores de JavaScript', !T.errores.length, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('delegar-v15');
})();
