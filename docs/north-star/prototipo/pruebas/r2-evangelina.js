// R2 · Evangelina (§6.2): K-07 → pólizas; ejecución de renovaciones (Futuro) con evidencia y excepciones recuperables.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('eva'); await T.ir('#/inicio');
    ok('R2.1a' + sfx, 'K-07 = 6', (await P.locator('[data-kpi="K-07"] .v').innerText()).trim() === '6');
    await P.locator('[data-kpi="K-07"]').click(); await P.waitForTimeout(40);
    const def = await T.texto('[data-modal="kpi"]');
    ok('R2.1b' + sfx, 'El KPI muestra definición, período, origen y acción', /Definición/i.test(def) && /Período/i.test(def) && /Origen/i.test(def) && /Ver lista de pólizas/.test(def));
    await T.enlace('Ver lista de pólizas', '[data-modal]');
    ok('R2.1c' + sfx, 'Lista filtrada con 6 pólizas', (await T.hash()) === '#/polizas?f=vence_mes' && (await P.locator('main table tbody tr').count()) === 6);
    await T.ir('#/automatizaciones'); await T.enlace('Renovaciones automáticas');
    ok('R2.2a' + sfx, 'Ejecución rotulada Futuro con 6 pólizas y 4 pasos cada una', (await T.texto('main')).includes('Futuro') && (await P.locator('[data-item]').count()) === 6 && (await P.locator('[data-item="pol14"] [data-paso]').count()) === 4);
    const t = await T.texto('main');
    ok('R2.3' + sfx, 'Renovaciones completas con evidencia (captura, documento, entregado)', /Captura del portal \(ficticia\)/.test(t) && /Estado: entregado/.test(t) && (await P.locator('[data-item="pol14"] button', { hasText: 'Abrir documento' }).count()) === 1);
    await P.locator('[data-item="pol14"] button', { hasText: 'Abrir documento' }).click();
    ok('R2.3b' + sfx, 'Documento de demo con la leyenda de Drive', /en producción se abre el archivo en Google Drive/.test(await T.texto('[data-modal]')));
    await T.boton('Cerrar', '[data-modal]');
    await T.foto('R2-2-ejecucion');
    ok('R2.4a' + sfx, 'Excepción por ventana de 24 h visible con dos recuperaciones', /Ventana de 24 h cerrada: hace falta una plantilla aprobada/.test(t) && (await P.locator('[data-item="pol06"] button', { hasText: 'Enviar plantilla de aviso' }).count()) === 1 && (await P.locator('[data-item="pol06"] button', { hasText: 'Avisar por correo' }).count()) === 1);
    ok('R2.adv-sin-numero' + sfx, 'Cliente sin número: el agente no envía y lo dice', /no tiene número de WhatsApp cargado: el agente no envía/.test(t));
    ok('R2.4b' + sfx, 'K-08 = 1 antes de resolver', (await T.kpi('K-08', 'eva')) === 1);
    await T.boton('Enviar plantilla de aviso', '[data-item="pol06"]');
    let d = await T.estado(); let ps = d.ejecuciones[0].items.find(i => i.poliza === 'pol06').pasos[3];
    ok('R2.4c' + sfx, 'Paso resuelto a mano por Evangelina; evento registrado', ps.resuelto && /Resuelto a mano por Evangelina/.test(ps.resuelto.texto) && d.eventos.some(e => /Resolvió una excepción/.test(e.accion)));
    await T.boton('Crear tarea de seguimiento', '[data-item="pol11"]');
    d = await T.estado();
    ok('R2.5' + sfx, 'Tarea de seguimiento en el inicio de Evangelina', d.tareas.some(x => x.titulo === 'Seguimiento de renovación ALT-TRC-33150' && x.resp === 'eva'));
    await T.boton('Avisar por correo', '[data-item="pol15"]');
    ok('R2.4d' + sfx, 'Estado general «Completa con intervención» y K-08 = 0', /Completa con intervención/.test(await T.texto('[data-estado-ejecucion]')) && (await T.kpi('K-08', 'eva')) === 0);
    await T.ir('#/inicio'); ok('R2.5b' + sfx, 'La tarea aparece en el inicio de Evangelina', /Seguimiento de renovación ALT-TRC-33150/.test(await T.texto('main')));
    await T.perfil('vic'); await T.ir('#/automatizaciones/EJ-REN-0102');
    ok('R2.perm' + sfx, 'Victoria ve la ejecución sin poder resolver', /Resuelven excepciones/.test(await T.texto('main')) || !(await P.getByRole('button', { name: 'Enviar plantilla' }).count()));
    ok('R2.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('r2-evangelina');
})();
