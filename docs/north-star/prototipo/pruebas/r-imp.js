// R-IMP (§6.9): expediente de investigación, reimportación con diferencias, conflicto y error de validación; gestión tras importar.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('emi'); await T.ir('#/importacion/expedientes'); await T.enlace('Energía Lomas Blancas');
    let t = await T.texto('main');
    ok('RIMP.1a' + sfx, 'Etapas con estado y candidatos con fuente', (await P.locator('[data-etapa]').count()) === 6 && /Sesión de IA, 12\/10/.test(t));
    ok('RIMP.1b' + sfx, 'Candidatos con factores vacíos o «no sé»', /no sé todavía/.test(t));
    ok('RIMP.1c' + sfx, 'La prioridad de investigación se explica como no-criticidad', /no es una banda ni una criticidad y no se importa/.test(t));
    await P.selectOption('#pr-CAN-4', 'descartar'); await P.locator('[data-candidato="CAN-4"] button').click(); await P.waitForTimeout(40);
    ok('RIMP.1d' + sfx, 'Descartar sin motivo se rechaza', /exige un motivo/.test(await P.evaluate(() => UI.toast && UI.toast.msg)));
    await P.selectOption('#pr-CAN-4', 'investigar_primero'); await P.locator('[data-candidato="CAN-4"] button').click(); await P.waitForTimeout(40);
    ok('RIMP.1e' + sfx, 'Cambiar prioridad registra evento', (await T.estado()).expedientes[0].candidatos.find(c => c.id === 'CAN-4').prioridad === 'investigar_primero');
    ok('RIMP.1f' + sfx, 'Pedidos (balance recibido, pólizas pendiente) y 3 fotos ficticias por zona', /Balance 2025[\s\S]*Recibido/.test(t) && /Pendiente/.test(t) && (await P.locator('.fotos figure').count()) === 3);
    await T.boton('Generar CSV de síntesis');
    let d = await T.estado(); const csv = d.expedientes[0].csv;
    ok('RIMP.1g' + sfx, 'CSV con fuente e incertidumbre por fila, sin descartados', csv.filas.length === 5 && csv.filas.every(f => f.fuente && f.certeza) && (await P.locator('[data-csv] tbody tr').count()) === 5);
    await T.boton('Registrar revisión humana');
    ok('RIMP.1h' + sfx, 'Revisión humana de Emiliano registrada', !!(await T.estado()).expedientes[0].csv.revisado);
    await T.foto('RIMP-1-expediente');
    // Reimportación
    await T.ir('#/importacion/lote/LOTE-CL-2'); t = await T.texto('main');
    const res = await T.texto('[data-resumen-lote]');
    ok('RIMP.2a' + sfx, 'Vista previa: 2 nuevas, 3 cambiadas, 1 conflicto, 1 error', /2\s*Nuevas/.test(res) && /3\s*Cambiadas/.test(res) && /1\s*En conflicto/.test(res) && /1\s*Con error/.test(res), res.replace(/\n/g, ' '));
    ok('RIMP.2b' + sfx, 'El conflicto muestra los dos valores', /Valor actual:[\s\S]*En curso[\s\S]*avance de la empresa/.test(t) && /Valor del lote:[\s\S]*Pendiente/.test(t));
    ok('RIMP.3a' + sfx, 'Error en su fila con la regla citada', /RV-FAC-03/.test(t) && (await P.locator('[data-tipo="error"]').count()) === 1);
    const rimp = await T.act('loteImportar', { lote: 'LOTE-CL-2' });
    ok('RIMP.3b' + sfx, 'Nada se escribe con errores (atómico)', !rimp.ok && !(await T.estado()).riesgos.some(r => r.id === 'RSK-CL-10'));
    await P.fill('#cf-RSK-CL-12', '9'); await P.locator('[data-fila="RSK-CL-12"] form button').click(); await P.waitForTimeout(40);
    ok('RIMP.3c' + sfx, 'Corrección inválida rechazada', (await P.locator('[data-tipo="error"]').count()) === 1);
    await P.fill('#cf-RSK-CL-12', '3'); await P.locator('[data-fila="RSK-CL-12"] form button').click(); await P.waitForTimeout(40);
    ok('RIMP.3d' + sfx, 'Fila corregida pasa', (await P.locator('[data-tipo="error"]').count()) === 0);
    const rimp2 = await T.act('loteImportar', { lote: 'LOTE-CL-2' }); ok('RIMP.2c' + sfx, 'Con conflicto sin resolver no importa', !rimp2.ok);
    await T.boton('Conservar el avance');
    await T.boton('Importar el lote');
    d = await T.estado();
    ok('RIMP.2d' + sfx, 'Importado: IDs estables, nuevas filas, avances y comentarios conservados', d.lotes[1].estado === 'importado' && d.riesgos.some(r => r.id === 'RSK-CL-10') && d.riesgos.some(r => r.id === 'RSK-CL-12') && d.acciones.find(a => a.id === 'ACC-CL-01').estado === 'en_curso' && d.avances.length >= 2 && d.comentarios.length >= 2 && d.acciones.find(a => a.id === 'ACC-CL-05').vence === '2026-12-05');
    await T.foto('RIMP-2-lote');
    await T.enlace('ver el plan de acción');
    ok('RIMP.4' + sfx, 'Tras importar, el avance del portal aparece en el plan', /Instalamos los detectores/.test(await T.texto('main')));
    // v19: Manuel también importa (pedido de Emiliano, 31/10); quien no tiene el permiso no ve Importación
    await T.perfil('man'); await T.ir('#/importacion/lotes');
    ok('RIMP.perm' + sfx, 'Manuel importa: ve la carga de CSV y no el aviso de lectura', await T.page.locator('[data-carga-csv]').count() === 1 && !/Tu perfil ve en lectura/.test(await T.texto('main')));
    await T.perfil('vic'); await T.ir('#/importacion/lotes');
    ok('RIMP.perm-vic' + sfx, 'Victoria (sin permiso) no ve Importación', await T.page.locator('[data-carga-csv], [data-lotes]').count() === 0);
    // Empresa sin vínculo (AM-39)
    await T.perfil('eva'); await T.ir('#/empresa/e5/riesgos/matriz'); t = await T.texto('main');
    ok('AM-39.a' + sfx, 'Metalúrgica Andes Sur sin vínculo: estado vacío y acción', /Abrir relevamiento/.test(t));
    await T.boton('Abrir relevamiento');
    d = await T.estado(); ok('AM-39.b' + sfx, 'Se crea el vínculo y el expediente', d.vinculosOrg.some(v => v.empresa === 'e5') && d.expedientes.some(x => x.empresa === 'e5'));
    await T.ir('#/empresa/e1/resumen'); ok('AM-39.c' + sfx, 'Vínculo Empresa ↔ Organización visible', /ORG-01HCL7Q2/.test(await T.texto('main')));
    ok('RIMP.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('r-imp');
})();
