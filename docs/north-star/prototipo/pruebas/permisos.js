// AM-44 / AM-18: matriz de permisos §8.2 ejercida acción por acción con cada perfil (estado limpio en cada intento),
// más aislamiento del portal, del revisor y explicación visible cuando una acción no está permitida.
const { iniciar, ok, informe } = require('./lib');
const TODOS = ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi', 'r1', 'pcl', 'pqa'];
const CASOS = [
  ['Reasignar tareas de otros', 'tareaReasignar', { id: 't02', a: 'man', comentario: 'x' }, ['man']],
  ['Editar tareas (propias o Manuel)', 'tareaEstado', { id: 't01', estado: 'en_curso' }, ['man', 'luc']],
  ['Responder comunicación', 'responder', { conv: 'c01', texto: 'Hola, te escribo por tu póliza.', plantilla: true }, ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat']],
  ['Tomar una atención', 'tomarAtencion', { persona: 'p03' }, ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat']],
  ['Asignar un mensaje de «Sin asignar»', 'asignarSinAsignar', { id: '@sa', a: 'vic' }, ['man'], async T => { await T.perfil('man'); await T.act('entrante', { canal: 'whatsapp', persona: 'p03', texto: 'Hola' }); }],
  ['Responder solicitudes', 'responderSolicitud', { sol: 'SOL-CL-1', texto: 'Respuesta' }, ['man', 'eva', 'emi']],
  ['Escribir una reevaluación (v22: también Manuel)', 'escribirReeval', { riesgo: 'RSK-CL-07', P: 3, motivo: 'm', evidencia: 'e' }, ['man', 'eva', 'emi']],
  ['Aceptar una reevaluación (escrita por Evangelina; quien la escribe no la acepta, AD-16)', 'aceptarReeval', { riesgo: 'RSK-CL-07' }, ['man', 'emi'], async T => { await T.perfil('eva'); await T.act('escribirReeval', { riesgo: 'RSK-CL-07', P: 3, motivo: 'm', evidencia: 'e' }); }],
  ['Registrar reordenamiento profesional', 'reordenar', { org: 'ORG-01HQA5M1', orden: ['RSK-QA-03', 'RSK-QA-01', 'RSK-QA-02', 'RSK-QA-04'], causa: 'c', fundamento: 'f' }, ['eva', 'emi']],
  ['Registrar avances (Cerro Liso)', 'registrarAvance', { accion: 'ACC-CL-02', texto: 'Avance' }, ['man', 'eva', 'emi', 'pcl']],
  ['Comentar en el plan (Cerro Liso)', 'comentarAccion', { accion: 'ACC-CL-02', texto: 'Comentario' }, ['man', 'eva', 'emi', 'pcl']],
  ['Registrar orden previo', 'ordenPrevio', { org: 'ORG-01HPD3K8', orden: ['RSK-PD-01', 'RSK-PD-02', 'RSK-PD-03', 'RSK-PD-04'] }, ['r1']],
  ['Importar y reimportar', 'loteResolverConflicto', { lote: 'LOTE-CL-2', fila: 'ACC-CL-01', opcion: 'conservar' }, ['man', 'eva', 'emi']], // v19: Manuel también importa (pedido de Emiliano, 31/10)
  ['Confirmar altas propuestas por skills', 'paConfirmar', { id: 'PA-0' }, ['man', 'eva', 'vic', 'luc', 'pil']],
  ['Confirmar cotizaciones', 'r4Guardar', {}, ['man', 'luc'], async T => { await T.perfil('luc'); await T.act('r4Ejecutar'); await T.act('r4Monto', { monto: '1000000' }); await T.act('r4Compania', {}); }],
  ['Confirmar facturas (emitir)', 'r5Emitir', {}, ['jim'], async T => { await T.perfil('jim'); await T.act('r5Ejecutar'); const d = await T.estado(); await T.act('r5Duplicado', { id: d.facturas.find(f => f.duplicada).id, opcion: 'omitir' }); }],
  ['Gestionar siniestros', 'avanzarEtapa', { sin: 'sin1' }, ['man', 'pil'], async T => { await T.perfil('pil'); await T.act('simularPresupuesto', { sin: 'sin1' }); }],
  ['Resolver excepciones de automatización', 'resolverPaso', { ej: 'EJ-REN-0102', poliza: 'pol06', paso: 3, modo: 'correo' }, ['man', 'eva', 'emi']],
  ['Decisión de la dirección', 'decisionDireccion', { riesgo: 'RSK-CL-03', texto: 'Decisión' }, ['man']],
  ['Verificar transferencia', 'verificarTransferencia', { id: 'TRF-QA-01' }, ['man', 'eva', 'emi']],
  ['Vincular empresa con Risk OS', 'vincularOrg', { empresa: 'e5' }, ['eva', 'emi']],
  ['Crear solicitud (portal), solo sobre riesgos de su empresa', 'crearSolicitud', { titulo: 'Pedido', texto: 'Texto', destino: 'RSK-CL-02' }, ['pcl']],
];
(async () => {
  const T = await iniciar(); const P = T.page;
  for (const [nombre, accion, params, permitidos, prep] of CASOS) {
    const obtenidos = [];
    for (const p of TODOS) {
      await P.evaluate(() => window.__brokeros.reiniciar());
      if (prep) await prep(T);
      const pr = { ...params }; if (pr.id === '@sa') pr.id = (await T.estado()).sinAsignar[0].id;
      await T.perfil(p);
      const r = await T.act(accion, pr);
      if (r.ok) obtenidos.push(p);
    }
    ok(`AM-44.${accion}`, nombre, JSON.stringify(obtenidos) === JSON.stringify(permitidos), `permitidos: ${obtenidos.join(', ')} · esperado: ${permitidos.join(', ')}`);
  }
  // Aislamiento y explicación
  await P.evaluate(() => window.__brokeros.reiniciar());
  await T.perfil('pcl'); await T.ir('#/portal/e3/resumen');
  ok('AM-18.portal', 'Portal de Cerro Liso en una ruta de Quebrada Azul: «Sin acceso»', /Sin acceso a esta empresa/.test(await T.texto('#root')) && !/Hernán Ríos/.test(await T.texto('main')));
  await T.ir('#/empresa/e3/resumen'); ok('AM-18.portal-equipo', 'Portal en una ruta del equipo: vuelve a su portal', /Bodega Cerro Liso/.test(await T.texto('#root')) && !/Quebrada Azul/.test(await T.texto('main')));
  ok('AM-18.selector', 'Selector rotulado «Simulación de roles · no es autenticación»', /no es autenticación/i.test(await T.texto('#root')));
  await T.perfil('r1'); await T.ir('#/empresa/e1/resumen');
  ok('AM-18.r1', 'El revisor no ve empresas no asignadas', /Sin acceso|no existe|asignad/i.test(await T.texto('main')), (await T.texto('main')).slice(0, 120));
  await T.perfil('jim'); await T.ir('#/gestiones/siniestros');
  ok('AM-18.explica', 'Acción o vista no permitida: se explica quién puede', /Siniestros: Pilar y Manuel/.test(await T.texto('main')));
  await T.perfil('mat'); await T.ir('#/empresa/e1/riesgos/solicitudes');
  ok('AM-18.lectura', 'Matías ve riesgos en lectura, sin botones de respuesta', !(await P.getByRole('button', { name: 'Responder solicitud' }).count()) && /Solo Manuel, Evangelina o Emiliano/.test(await T.texto('main')));
  await T.perfil('emi'); await T.ir('#/persona/p01/comunicacion');
  ok('AM-18.emi', 'Emiliano ve comunicación en lectura', /Emiliano tiene comunicación en lectura/.test(await T.texto('main')));
  await T.perfil('eva'); await T.ir('#/inicio/equipo');
  ok('AM-18.equipo', 'Evangelina no tiene vista de equipo', !(await P.locator('[data-trabada]').count()));
  ok('PERM.err', 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
  await T.cerrar();
  informe('permisos');
})();
