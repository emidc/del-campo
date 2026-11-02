// v25 · Cierre: recorrido integral de Bodega Cerro Liso (12 pasos) sobre las pantallas existentes, en escritorio y celular.
// Relevamiento en seis pasos, cuestionario con validación, importación con revisión humana, brechas, verificación de póliza,
// informe anual aprobado y compartido, portal; consistencia de datos y reglas de revisión humana.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const s = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    let d = await T.estado();
    // 0 · Consistencia de la semilla: todo apunta a objetos de la misma empresa.
    const org = 'ORG-01HCL7Q2', x = d.expedientes.find(e => e.id === 'EXP-CL-1'), lote = d.lotes.find(l => l.id === 'LOTE-CL-2');
    const rOrg = id => { const r = d.riesgos.find(z => z.id === id); return r && r.org === org; };
    const enLote = id => lote.filas.some(f => f.id === id);
    ok('V25-0.cand' + s, 'Cada candidato confirmado, incierto o descubierto apunta a un riesgo de Cerro Liso o a una fila del lote', x.candidatos.filter(c => c.estado !== 'descartado').every(c => rOrg(c.riesgo) || enLote(c.riesgo)) && x.candidatos.filter(c => c.estado === 'descartado').every(c => !c.riesgo && c.motivo));
    ok('V25-0.preg' + s, 'Cada pregunta del cuestionario cita un riesgo de la empresa y a un contacto vigente', x.cuestionario.every(q => rOrg(q.riesgo) && d.membresias.some(m => m.persona === q.resp && m.empresa === 'e1' && !m.hasta)));
    ok('V25-0.bre' + s, 'Brechas: riesgo y póliza de la misma empresa, con fundamento y evidencia, sin puntaje', d.brechas.every(b => rOrg(b.riesgo) && (!b.poliza || d.polizas.find(p => p.id === b.poliza).tomador === 'e1') && b.fundamento && b.evidencia.length && !('puntaje' in b) && !('score' in b)));
    const v = d.verificaciones[0];
    ok('V25-0.ver' + s, 'La comparación usa la póliza de las transferencias que cita', v.transferencias.every(t => d.transferencias.find(z => z.id === t).poliza === v.poliza));
    ok('V25-0.q5' + s, 'La información pedida por la brecha de helada es una pregunta del cuestionario', x.cuestionario.some(q => q.brecha === 'BRE-CL-02') && d.brechas.find(b => b.id === 'BRE-CL-02').estado === 'info_pedida');

    // 1-5 · Relevamiento en la ficha de la empresa.
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/relevamiento'); let t = await T.texto('main');
    ok('V25-1.pasos' + s, 'Seis pasos con dónde ocurre cada uno (LLM externo en 1 y 3)', await P.locator('[data-relevamiento] [data-etapa]').count() === 6 && await P.locator('[data-etapa="identificacion"] [data-donde="ext"]').count() === 1 && await P.locator('[data-etapa="refinamiento"] [data-donde="ext"]').count() === 1);
    ok('V25-2.cand' + s, 'Candidatos con su destino: confirmados, descubiertos, inciertos y descartados con motivo', /Un candidato no es un riesgo/.test(t) && await P.locator('[data-cand="descartado"]').count() === 2 && await P.locator('[data-cand="descubierto"]').count() === 3 && /lejos de cauces/.test(t));
    ok('V25-3.insp' + s, 'Evidencia de la inspección: 4 fotos ficticias, observaciones y relatos', await P.locator('[data-relevamiento] .fotos figure').count() === 4 && /Relatos/.test(t) && /Presencial/.test(t));
    ok('V25-4.cuest' + s, 'Cuestionario con responsable, vencimiento y estados', await P.locator('[data-cuestionario] [data-pregunta]').count() === 5 && /Informada por la empresa · a validar/.test(t) && /vence 10\/11\/2026/.test(t));
    ok('V25-5.eval' + s, 'Evaluación profesional con supuestos, incertidumbres y revisor', /Supuestos/.test(t) && /Incertidumbres/.test(t) && /Revisó/.test(t));
    // La empresa responde en el portal; queda sin validar y no cambia ninguna evaluación.
    const evalsAntes = JSON.stringify(d.riesgos.find(r => r.id === 'RSK-CL-01').evals);
    await T.perfil('pcl'); await T.ir('#/portal/e1/resumen');
    ok('V25-4.portal' + s, 'El portal muestra las preguntas abiertas', await P.locator('[data-portal-preguntas] [data-pregunta]').count() === 4);
    await P.fill('#pq-Q3', 'El electricista viene el 05/11; mandamos el informe después.'); await P.locator('[data-pregunta="Q3"] button').click(); await P.waitForTimeout(40);
    d = await T.estado(); let q3 = d.expedientes.find(e => e.id === 'EXP-CL-1').cuestionario.find(q => q.id === 'Q3');
    ok('V25-4.resp' + s, 'La respuesta de la empresa queda «informada, a validar» y la evaluación no cambia', q3.estado === 'respondida' && /Laura Ferro/.test(q3.respondida.por) && JSON.stringify(d.riesgos.find(r => r.id === 'RSK-CL-01').evals) === evalsAntes);
    const otra = await T.act('cuestResponder', { exp: 'EXP-CL-1', preg: 'Q3', respuesta: 'x' });
    await T.perfil('pqa'); const ajena = await T.act('cuestResponder', { exp: 'EXP-CL-1', preg: 'Q4', respuesta: 'intruso' });
    ok('V25-4.aisl' + s, 'Otra empresa no responde el cuestionario de Cerro Liso', otra.ok && !ajena.ok);
    await T.perfil('eva'); const sinComo = await T.act('cuestValidar', { exp: 'EXP-CL-1', preg: 'Q2', como: ' ' });
    const conComo = await T.act('cuestValidar', { exp: 'EXP-CL-1', preg: 'Q2', como: 'Registro de visitas de octubre' });
    ok('V25-4.valida' + s, 'Validar exige decir cómo; después queda validada', !sinComo.ok && conComo.ok && (await T.estado()).expedientes.find(e => e.id === 'EXP-CL-1').cuestionario.find(q => q.id === 'Q2').estado === 'validada');
    await T.perfil('vic'); ok('V25-4.perm' + s, 'Victoria no valida respuestas', !(await T.act('cuestValidar', { exp: 'EXP-CL-1', preg: 'Q3', como: 'x' })).ok);

    // 6 · Importación del lote del relevamiento (Puente A · CSV) con revisión humana.
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/relevamiento'); await T.enlace('Revisar y confirmar la importación');
    ok('V25-6.lote' + s, 'Desde el relevamiento se llega a la vista previa del lote, con su origen CSV', /\/importacion\/lote\/LOTE-CL-2/.test(await T.hash()) && await P.locator('[data-origen-ext="csv"]').count() === 1);
    await P.fill('#cf-RSK-CL-12', '3'); await P.locator('[data-fila="RSK-CL-12"] form button').click(); await P.waitForTimeout(40);
    await T.boton('Conservar el avance'); await T.boton('Importar el lote');
    d = await T.estado();
    const nuevos = ['RSK-CL-10', 'RSK-CL-11', 'RSK-CL-12'].map(id => d.riesgos.find(r => r.id === id));
    ok('V25-6.pend' + s, 'Los riesgos nuevos quedan con la evaluación pendiente (no cuentan hasta que otra persona acepta)', nuevos.every(r => r && r.evals.length === 1 && r.evals[0].estado === 'pendiente' && r.evals[0].autor === 'eva'));
    ok('V25-6.paso' + s, 'El paso 6 del relevamiento queda hecho', d.expedientes.find(e => e.id === 'EXP-CL-1').etapas.find(e => e.id === 'registro').estado === 'hecha');
    ok('V25-6.propia' + s, 'Quien importó no acepta sus evaluaciones', !(await T.act('loteAceptarEvaluaciones', { lote: 'LOTE-CL-2' })).ok);
    await T.perfil('man'); const acc = await T.act('loteAceptarEvaluaciones', { lote: 'LOTE-CL-2' });
    d = await T.estado();
    ok('V25-6.acepta' + s, 'Manuel acepta y los riesgos nuevos pasan a contar', acc.ok && ['RSK-CL-10', 'RSK-CL-11', 'RSK-CL-12'].every(id => d.riesgos.find(r => r.id === id).evals[0].estado === 'aceptada'));
    // 7 · Riesgos registrados y gestionados en Broker OS.
    await T.ir('#/empresa/e1/riesgos/matriz'); t = await T.texto('main');
    ok('V25-7.lista' + s, 'La lista muestra los riesgos descubiertos en el relevamiento', /Granizo sobre viñedo/.test(t) && /Corte de ruta durante vendimia/.test(t));

    // 8 · Brechas de cobertura (Puente B · MCP, demostración).
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/transferencia'); t = await T.texto('main');
    ok('V25-8.vista' + s, 'Brechas con origen MCP rotulado como demostración y la diferencia entre ausente y confirmada', await P.locator('[data-brechas] [data-brecha]').count() === 4 && await P.locator('[data-brechas] [data-origen-ext="mcp"]').count() === 1 && /no es una brecha confirmada/.test(t) && !/puntaje:/i.test(t));
    await P.click('#bre-BRE-CL-01'); await P.waitForTimeout(40); t = await T.texto('[data-brecha="BRE-CL-01"]');
    ok('V25-8.campos' + s, 'La brecha muestra riesgo, cobertura existente, fundamento, evidencia, faltante, acción y revisión', ['Cobertura existente', 'Posible brecha', 'Fundamento', 'Evidencia', 'Información faltante', 'Acción recomendada', 'Revisión'].every(k => t.includes(k)));
    ok('V25-8.motivo' + s, 'Descartar y registrar el riesgo aceptado exigen motivo o constancia', !(await T.act('brechaRevisar', { id: 'BRE-CL-03', decision: 'descartada', motivo: '' })).ok && !(await T.act('brechaRevisar', { id: 'BRE-CL-03', decision: 'aceptada_cliente', motivo: ' ' })).ok);
    await P.locator('[data-brecha="BRE-CL-01"] button[type="submit"]').click(); await P.waitForTimeout(40);
    d = await T.estado(); ok('V25-8.confirma' + s, 'Confirmar desde el formulario registra quién revisó', d.brechas.find(b => b.id === 'BRE-CL-01').estado === 'confirmada' && d.brechas.find(b => b.id === 'BRE-CL-01').revision.por === 'eva');
    const info = await T.act('brechaRevisar', { id: 'BRE-CL-03', decision: 'info_pedida' }); d = await T.estado();
    const q6 = d.expedientes.find(e => e.id === 'EXP-CL-1').cuestionario.find(q => q.brecha === 'BRE-CL-03');
    ok('V25-8.info' + s, 'Pedir información agrega la pregunta al cuestionario de la empresa', info.ok && q6 && q6.estado === 'pendiente' && q6.resp === 'p05');
    ok('V25-8.final' + s, 'Una brecha decidida no se vuelve a decidir', !(await T.act('brechaRevisar', { id: 'BRE-CL-01', decision: 'descartada', motivo: 'x' })).ok);
    await T.perfil('mat'); ok('V25-8.perm' + s, 'Matías (lectura) no revisa brechas', !(await T.act('brechaRevisar', { id: 'BRE-CL-03', decision: 'confirmada' })).ok);
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/transferencia');
    ok('V25-8.portal' + s, 'La empresa no ve las posibles brechas en su portal', await P.locator('[data-brechas]').count() === 0);

    // 9 · Comparación de la póliza emitida.
    await T.perfil('eva'); await T.ir('#/poliza/pol05'); t = await T.texto('main');
    ok('V25-9.vista' + s, 'La ficha de póliza muestra pedido, propuesta, emitida, necesidad, resultado y evidencia', await P.locator('[data-verificacion] [data-item]').count() === 7 && await P.locator('[data-res="difiere"]').count() === 3 && await P.locator('[data-res="incierto"]').count() === 1 && /Evidencia: Cond. particulares, cláusula 4.2/.test(t));
    ok('V25-9.ia' + s, 'Sin decidir las diferencias, nadie marca la transferencia como verificada', !(await T.act('verificarTransferencia', { id: 'TRF-CL-01' })).ok && await P.locator('[data-ver-bloqueo]').count() === 1);
    ok('V25-9.just' + s, 'Aceptar una diferencia exige justificación', !(await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V6', decision: 'aceptada', motivo: '' })).ok);
    await P.selectOption('#vd-V4', 'reclamo'); await P.fill('#vm-V4', 'Se pidió cubierta y la emitieron excluida.'); await P.locator('[data-item="V4"] form button').click(); await P.waitForTimeout(40);
    d = await T.estado(); const g = (d.gestionesManuales || []).find(z => z.tipo === 'reclamo');
    ok('V25-9.reclamo' + s, 'Reclamar crea una gestión de reclamo a la compañía en la empresa', !!g && g.obj.id === 'e1' && g.estado === 'en_curso' && g.poliza === 'pol05');
    await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V5', decision: 'aceptada', motivo: 'La empresa aceptó la franquicia del 5 % a cambio de menor prima (correo del 25/06).' });
    await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V6', decision: 'aceptada', motivo: 'El sublímite ya estaba en la propuesta firmada.' });
    await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V7', decision: 'aclaracion', motivo: 'Pedimos a Altomira el endoso del acreedor.' });
    ok('V25-9.abierta' + s, 'Con un reclamo o una aclaración abiertos, la transferencia sigue sin verificar', !(await T.act('verificarTransferencia', { id: 'TRF-CL-01' })).ok);
    await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V7', decision: 'resuelta', motivo: 'Altomira envió el endoso 1 con el acreedor.' });
    await T.act('verDecidir', { ver: 'VER-CL-1', item: 'V4', decision: 'resuelta', motivo: 'Altomira emitió el endoso de avería de maquinaria con contenido.' });
    const ver = await T.act('verificarTransferencia', { id: 'TRF-CL-01' }); d = await T.estado();
    ok('V25-9.verifica' + s, 'Con todo decidido, una persona verifica y queda la evidencia', ver.ok && d.transferencias.find(z => z.id === 'TRF-CL-01').estado === 'verificada' && d.transferencias.find(z => z.id === 'TRF-CL-01').revisadoPor === 'eva' && (d.gestionesManuales || []).find(z => z.tipo === 'reclamo').estado === 'cerrada');

    // 10 · Acción de mitigación o transferencia: la brecha confirmada genera una tarea y el plan registra un avance.
    const tarea = await T.act('crearTarea', { titulo: 'Pedir a Altomira la cotización del endoso', resp: 'eva', vence: '2026-11-10', obj: { tipo: 'empresa', id: 'e1' } });
    const avance = await T.act('registrarAvance', { accion: 'ACC-CL-02', texto: 'Se compró la línea de vida; se instala el 20/11.', estadoNuevo: 'en_curso' });
    d = await T.estado(); ok('V25-10.accion' + s, 'Tarea creada y avance del plan de acción registrado', tarea.ok && avance.ok && d.acciones.find(a => a.id === 'ACC-CL-02').estado === 'en_curso');

    // 11 · Informe anual: borrador del LLM, datos de Broker OS, aprobación por otra persona.
    await T.ir('#/empresa/e1/riesgos/informe'); t = await T.texto('main');
    ok('V25-11.borrador' + s, 'Borrador con las ocho secciones y sin puntaje ni índice', await P.locator('[data-inf-sec]').count() === 8 && /Borrador del LLM/.test(t) && !/puntaje de riesgo|índice de riesgo/i.test(t.replace(/sin puntaje ni índice/g, '')));
    ok('V25-11.datos' + s, 'Las secciones salen de los datos: brecha confirmada, transferencia verificada y riesgos nuevos', /Pérdida de vino en tanques: La falla/.test(t) && /✓ Pérdida de vino en tanques/.test(t) && /Granizo sobre viñedo/.test(t));
    ok('V25-11.propio' + s, 'Quien registró el borrador (Evangelina) no lo aprueba', !(await T.act('informeAprobar', { id: 'INF-CL-2026' })).ok);
    ok('V25-11.editar' + s, 'Revisar el texto exige resumen y recomendaciones', !(await T.act('informeEditar', { id: 'INF-CL-2026', resumen: '', recomendaciones: '' })).ok && (await T.act('informeEditar', { id: 'INF-CL-2026', resumen: 'Resumen revisado por Evangelina.', recomendaciones: 'Uno\nDos' })).ok);
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/informe');
    ok('V25-11.oculto' + s, 'Antes de compartirlo la empresa no lo ve', await P.locator('[data-informe]').count() === 0 && await P.locator('a[href="#/portal/e1/riesgos/informe"]').count() === 0);
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/informe'); await T.boton('Aprobar el informe');
    d = await T.estado(); const inf = d.informes[0];
    ok('V25-11.aprueba' + s, 'Manuel aprueba y los datos quedan congelados', inf.estado === 'aprobado' && inf.aprobado.por === 'man' && inf.instantanea && inf.instantanea.verificadas.length === 2);
    await T.act('brechaRevisar', { id: 'BRE-CL-03', decision: 'confirmada' });
    ok('V25-11.congelado' + s, 'Un cambio posterior no altera el informe aprobado', (await T.estado()).informes[0].instantanea.brechas.length === 1);
    await T.boton('Compartir en el portal');
    // 12 · Portal de la empresa.
    await T.perfil('pcl'); await T.ir('#/portal/e1/resumen');
    ok('V25-12.card' + s, 'El portal ofrece el informe compartido', await P.locator('[data-portal-informe]').count() === 1);
    await T.enlace('Ver el informe'); t = await T.texto('main');
    ok('V25-12.vista' + s, 'La empresa ve el informe sin el origen técnico ni las brechas en revisión', await P.locator('[data-informe]').count() === 1 && await P.locator('[data-origen-ext]').count() === 0 && !/Solo equipo/.test(t) && /Recomendaciones para el próximo período/.test(t));
    await T.perfil('pqa'); await T.ir('#/portal/e1/riesgos/informe');
    ok('V25-12.aisl' + s, 'Otra empresa no lo ve', /Sin acceso a esta empresa/.test(await T.texto('main')));

    // Transversales: puntaje solo para el equipo (decisión de Emiliano, 02/11), puentes y rótulos.
    await T.perfil('eva'); await T.ir('#/empresa/e1/riesgos/panel'); t = await T.texto('main');
    ok('V25-X.panel-equipo' + s, 'El equipo ve el puntaje con el aviso «solo para el equipo»', /puntaje de riesgo/i.test(t) && /solo para el equipo/i.test(t));
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/panel'); t = await T.texto('main');
    ok('V25-X.panel' + s, 'En el portal el panel no muestra un puntaje ni un índice de la empresa', !/puntaje/i.test(t) && /críticos y altos/i.test(t));
    await T.perfil('eva');
    await T.perfil('emi'); await T.ir('#/importacion/puentes'); t = await T.texto('main');
    ok('V25-X.puentes' + s, 'Puentes: CSV funciona; MCP es demostración; lo que la IA nunca hace', /Funciona en el prototipo/.test(t) && /Demostración: sin servidor MCP/.test(t) && /Lo que la IA nunca hace/.test(t) && await P.locator('[data-borradores] tbody tr').count() === 6);
    ok('V25-X.err' + s, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.foto('V25-puentes');
    await T.cerrar();
  }
  informe('cierre-v25');
})();
