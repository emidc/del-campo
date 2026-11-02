// R1 · Manuel (§6.1): tareas trabadas, empresa, matriz y lista, solicitudes con reevaluación y «sin cambio», plan, transferencia, layout, cambio de actividad.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('man'); await T.ir('#/inicio/equipo');
    ok('R1.1a' + sfx, 'K-01 muestra 2 trabadas', (await P.locator('[data-kpi="K-01"] .v').innerText()).trim() === '2');
    await T.foto('R1-1-equipo' + (movil ? '' : ''), true);
    await P.fill('#com-t01', 'Lo pido yo a la empresa'); await P.selectOption('#a-t01', 'man');
    await P.locator('[data-trabada="t01"] button[type=submit]').click(); await P.waitForTimeout(50);
    let d = await T.estado(); const t01 = d.tareas.find(t => t.id === 't01');
    ok('R1.1b' + sfx, 'La tarea pasa a Manuel con el comentario', t01.resp === 'man' && t01.comentarios.some(c => c.texto === 'Lo pido yo a la empresa'));
    ok('R1.1c' + sfx, 'K-01 baja a 1 y la tarea queda en curso', (await P.locator('[data-kpi="K-01"] .v').innerText()).trim() === '1' && t01.estado === 'en_curso');
    ok('R1.1d' + sfx, 'Evento registrado', d.eventos.some(e => /Reasignó «Certificado de cobertura/.test(e.accion)));
    ok('R1.1e' + sfx, 'Lucía recibe aviso', d.notificaciones.some(n => n.para === 'luc' && /se reasignó/.test(n.titulo)));
    await T.ir('#/empresa/e2/tareas'); ok('R1.1f' + sfx, 'Ficha de la empresa muestra a Manuel como responsable', /Certificado de cobertura[\s\S]*Manuel/.test(await T.texto('main')));
    // 2 búsqueda
    await P.keyboard.press('/'); await P.fill('#q-global', 'Cerro Liso'); await P.waitForTimeout(50);
    ok('R1.2a' + sfx, 'La búsqueda encuentra la empresa', (await P.locator('[data-resultados]').innerText()).includes('Bodega Cerro Liso S.A.'));
    await P.locator('[data-resultados] a', { hasText: 'Bodega Cerro Liso S.A.' }).first().click(); await P.waitForTimeout(60);
    ok('R1.2b' + sfx, 'Abre la ficha y cierra la búsqueda', (await T.hash()) === '#/empresa/e1/resumen' && !(await P.locator('[data-resultados]').count()));
    const res = await T.texto('main'); ok('R1.2c' + sfx, 'Resumen con vínculo a la organización', /ORG-01HCL7Q2/.test(res) && /Evangelina/.test(res));
    // 3 matriz y lista
    await T.ir('#/empresa/e1/riesgos/matriz'); await T.foto('R1-3-matriz' + sfx.replace('-movil', ''));
    const txt = await T.texto('main');
    ok('R1.3a' + sfx, 'Matriz antes que la lista', (await P.locator('[data-matriz]').boundingBox()).y < (await P.locator('[data-lista]').boundingBox()).y);
    ok('R1.3b' + sfx, 'Grupo «Sin evaluar» con 1 riesgo al final de la lista (v8)', await P.locator('[data-lista] tr[data-sin-evaluar]').count() === 1 && /Sin evaluar/.test(txt));
    ok('R1.3c' + sfx, 'Riesgo con impacto desconocido: valor en recuadro punteado (v11: sin «≥») y provisional', await P.locator('tr[data-riesgo="RSK-CL-05"] [data-falta]').count() === 1 && !/≥/.test(txt) && /provisional/.test(txt));
    ok('R1.3d' + sfx, 'Bloque de seguridad de personas', await P.locator('[data-seguridad]').count() > 0);
    ok('R1.3e' + sfx, 'Qué lo hace grave y qué falta saber', (await P.locator('td[data-l="Qué lo hace grave"]').count()) > 0 && (await P.locator('td[data-l="Qué falta saber"]').count()) > 0);
    // 4 solicitudes
    await T.ir('#/empresa/e1/riesgos/solicitudes?s=SOL-CL-1');
    await P.fill('#rs-SOL-CL-1', 'Aceptamos revisar; la detección cambia la contención, no la probabilidad');
    await P.locator('form:has(#rs-SOL-CL-1) button[type=submit]').click(); await P.waitForTimeout(50);
    d = await T.estado(); let s1 = d.solicitudes.find(s => s.id === 'SOL-CL-1');
    ok('R1.4a' + sfx, 'Solicitud en revisión con respuesta', s1.estado === 'en_revision' && s1.respuestas.length === 1);
    const bandaAntes = await P.evaluate(() => calcRiesgo(S.d, S.d.riesgos.find(r => r.id === 'RSK-CL-01')).banda);
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/solicitudes?s=SOL-CL-1');
    await T.boton('Escribir reevaluación', 'article:has(#rs-SOL-CL-1)');
    await P.selectOption('#re-v-eco', '3'); await P.selectOption('#re-v-con', '3');
    await P.fill('#re-mot', 'Detección temprana instalada en la sala de barricas'); await P.fill('#re-ev', 'Foto de los detectores (31/10, ficticia)');
    await P.locator('form[data-form="escribirReeval"] button[type=submit]').click(); await P.waitForTimeout(50);
    const bandaPend = await P.evaluate(() => calcRiesgo(S.d, S.d.riesgos.find(r => r.id === 'RSK-CL-01')).banda);
    ok('R1.4b' + sfx, 'La banda no cambia al escribir la reevaluación', bandaAntes === bandaPend && bandaAntes === 'alta', bandaAntes + '→' + bandaPend);
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/solicitudes?s=SOL-CL-1');
    await T.boton('Aceptar reevaluación', '[data-solicitud="SOL-CL-1"]');
    d = await T.estado(); s1 = d.solicitudes.find(s => s.id === 'SOL-CL-1');
    const bandaDesp = await P.evaluate(() => calcRiesgo(S.d, S.d.riesgos.find(r => r.id === 'RSK-CL-01')).banda);
    ok('R1.4c' + sfx, 'Aceptada: banda Alta → Media y revisión cerrada', bandaDesp === 'media' && s1.estado === 'cerrada' && d.revisiones.find(r => r.id === 'REV-CL-1').estado === 'cerrada', bandaDesp + ' ' + s1.estado);
    await T.ir('#/empresa/e1/riesgos/solicitudes?s=SOL-CL-2'); await T.boton('Cerrar «sin cambio»', 'article:has(#rs-SOL-CL-2)');
    await P.fill('#sc-f', 'El seguro transfiere parte de la pérdida, no cambia el riesgo; queda en Transferencia');
    await P.locator('form[data-form="cerrarSinCambio"] button[type=submit]').click(); await P.waitForTimeout(50);
    d = await T.estado(); const s2 = d.solicitudes.find(s => s.id === 'SOL-CL-2');
    ok('R1.4d' + sfx, 'Segunda solicitud cerrada «sin cambio» con fundamento', s2.estado === 'cerrada' && s2.cierre.tipo === 'sin_cambio');
    await T.perfil('pcl'); await T.ir('#/portal/e1/solicitudes');
    const ptxt = await T.texto('#root');
    ok('R1.4e' + sfx, 'La empresa ve la respuesta y el fundamento en el portal', ptxt.includes('Aceptamos revisar') && ptxt.includes('el seguro transfiere parte de la pérdida'.replace('el', 'El')));
    await T.foto('R1-4-portal-solicitudes' + sfx.replace('-movil', ''));
    // usuario sin permisos
    await T.perfil('jim'); await T.ir('#/empresa/e1/riesgos/solicitudes?s=SOL-CL-1');
    const jtxt = await T.texto('main');
    ok('R1.adv-perm' + sfx, 'Jimena no ve Riesgos en la navegación ni puede aceptar', !(await P.locator('[data-nav="riesgos"]').count()) && !(await P.getByRole('button', { name: 'Responder solicitud' }).count()), jtxt.slice(0, 200));
    // 5 plan
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/plan?a=ACC-CL-01'); let plan = await T.texto('main');
    // v4: el plan es una lista; cada acción se abre en su fila.
    await T.ir('#/empresa/e1/riesgos/plan?a=ACC-CL-03'); plan += await T.texto('main');
    ok('R1.5a' + sfx, 'Dos avances de la empresa con autor y evidencia', plan.includes('Instalamos los detectores') && plan.includes('Se hizo el service') && /foto-detectores/.test(plan));
    const hist = await P.locator('[data-accion="ACC-CL-03"] [data-historial]').innerText();
    ok('R1.5b' + sfx, 'Comentarios concurrentes conservados en orden', hist.indexOf('¿Les sirve el informe') >= 0 && hist.indexOf('CM-2') === -1 && (hist.match(/\n/g) || []).length >= 2, hist.slice(0, 300));
    // 6 transferencia
    await T.ir('#/empresa/e1/riesgos/transferencia'); const trf = await T.texto('main');
    ok('R1.6a' + sfx, 'Estados de transferencia visibles', /En póliza, sin verificar/.test(trf) && /Referencia sin póliza en Broker OS/.test(trf) && /Verificada en póliza/.test(trf) && /Propuesta/.test(trf));
    await T.ir('#/empresa/e1/riesgos/transferencia?t=TRF-CL-01'); await T.boton('Crear tarea «Verificar cobertura»'); await P.locator('form[data-form="crearTarea"] button[type=submit]').click(); await P.waitForTimeout(50);
    d = await T.estado(); ok('R1.6b' + sfx, 'Tarea «Verificar cobertura de contenido en tanques» para Evangelina', d.tareas.some(t => t.titulo === 'Verificar cobertura de contenido en tanques' && t.resp === 'eva'));
    // 7 layout
    await T.ir('#/empresa/e1/riesgos/layout?z=ZON-CL-1'); const lay = await T.texto('main');
    ok('R1.7a' + sfx, 'Zona con actividades, almacenamiento, prevención y riesgos', /Sala de barricas/.test(lay) && /Barricas de roble/.test(lay) && /Detección temprana/.test(lay) && /Incendio en sala de barricas/.test(lay));
    const colores = await P.$$eval('[data-zona]', zs => zs.map(z => getComputedStyle(z).backgroundColor));
    ok('R1.7b' + sfx, 'Las zonas no tienen color de gravedad (todas el mismo fondo)', new Set(colores).size <= 2, [...new Set(colores)].join(' '));
    await T.foto('R1-7-layout' + sfx.replace('-movil', ''));
    // 8 cambio de actividad
    await T.ir('#/inicio'); await T.boton('Abrir revisión de riesgos');
    d = await T.estado(); const na = d.novedadesActividad.find(n => n.id === 'NA-1');
    ok('R1.8a' + sfx, 'Revisión abierta desde la novedad', !!na.revision && d.revisiones.find(r => r.id === na.revision).estado === 'abierta');
    await T.ir('#/empresa/e1/riesgos/solicitudes'); ok('R1.8b' + sfx, 'La revisión se ve en la empresa', /visitas guiadas/i.test(await T.texto('main')));
    await T.ir('#/riesgos'); const cart = await T.texto('main');
    ok('R1.adv-x01' + sfx, 'Cartera con conteos por banda, sin índice', !/índice|score|puntaje/i.test(cart) && (await P.locator(`td[data-l="Crítica"]`).count()) > 0);
    ok('R1.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('r1-manuel');
})();
