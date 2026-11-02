// Utilidades comunes de las pruebas §14.6 (Playwright + Chromium preinstalado).
// Uso: INDEX=/ruta/a/index.html node pruebas/<script>.js   (por defecto ../dist/index.html o ../prototipo/index.html)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const INDEX = process.env.INDEX || [path.join(__dirname, '..', 'dist', 'index.html'), path.join(__dirname, '..', 'prototipo', 'index.html')].find(f => fs.existsSync(f));
const EVID = process.env.EVID || path.join(__dirname, '..', 'evidencia');
const ESC = { w: 1366, h: 768 }, MOV = { w: 390, h: 844 };

// Envoltura literal del publicador de Artifacts (copiada de la página publicada leída con la herramienta Artifact):
// no agrega lang ni nada más; el idioma lo fija la propia página.
const ENVOLTURA_PRE = "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n";
const ENVOLTURA_POST = "\n</body></html>";
function pagina() { return ENVOLTURA_PRE + fs.readFileSync(INDEX, 'utf8') + ENVOLTURA_POST; }
function servir() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => { if (req.url.startsWith('/axe.js')) { r.writeHead(200, { 'content-type': 'text/javascript' }); r.end(fs.readFileSync(require.resolve('axe-core/axe.min.js', { paths: [path.join(__dirname, '..')] }))); return; } r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(pagina()); });
    srv.listen(0, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}
const resultados = [];
function ok(id, desc, cond, obs) { resultados.push({ id, desc, ok: !!cond, obs: obs == null ? '' : String(obs) }); if (!cond) console.log('  FALLA', id, desc, obs == null ? '' : '· ' + obs); return !!cond; }
async function iniciar(opts = {}) {
  const vp = opts.movil ? MOV : ESC;
  const { srv, url } = await servir();
  const browser = await chromium.launch(process.env.CON_RED && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1' } } : {});
  const ctx = await browser.newContext({ ignoreHTTPSErrors: !!process.env.CON_RED, viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, ...(opts.ctx || {}) });
  // Determinismo: sin red externa (las tipografías caen al respaldo del sistema si no cargan).
  if (!process.env.CON_RED) await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  await page.goto(url + '#/inicio'); await page.waitForSelector('#root > *');
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(url + '#/inicio'); await page.reload(); await page.waitForSelector('#root > *');
  const T = {
    page, url, errores, browser, ctx,
    async ir(hash) { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(30); },
    async perfil(p) { await page.evaluate(p => window.__brokeros.setPerfil(p), p); await page.waitForTimeout(30); },
    estado() { return page.evaluate(() => window.__brokeros.estado()); },
    act(n, p) { return page.evaluate(([n, p]) => window.__brokeros.act(n, p), [n, p || {}]); },
    texto(sel = '#root') { return page.locator(sel).first().innerText(); },
    async boton(nombre, dentro) { const b = (dentro ? page.locator(dentro) : page).getByRole('button', { name: nombre, exact: false }).first(); await b.click(); await page.waitForTimeout(40); },
    async enlace(nombre, dentro) { await (dentro ? page.locator(dentro) : page).getByRole('link', { name: nombre, exact: false }).first().click(); await page.waitForTimeout(60); },
    async llenar(sel, v) { await page.locator(sel).first().fill(v); },
    hash() { return page.evaluate(() => location.hash); },
    kpi(k, yo) { return page.evaluate(([k, yo]) => kpiValor(window.__brokeros.estado(), k, yo), [k, yo]); },
    async foto(nombre, completa = true) { const f = path.join(EVID, 'capturas', `${nombre}-${opts.movil ? '390' : '1366'}.png`); fs.mkdirSync(path.dirname(f), { recursive: true }); // Página completa: las barras fijas se vuelven estáticas para que no se dibujen a mitad de página tapando contenido (AV-13).
      let tag = null; if (completa) tag = await page.addStyleTag({ content: '.topbar, .registro, .sidebar, .panel-lateral { position: static !important; } .toast { display: none !important; }' });
      await page.screenshot({ path: f, fullPage: completa }); if (tag) await tag.evaluate(n => n.remove()); return f; },
    async cerrar() { await browser.close(); srv.close(); },
  };
  return T;
}
function informe(nombre) {
  const f = path.join(EVID, 'resultados', nombre + '.json'); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(resultados, null, 2));
  const fallas = resultados.filter(r => !r.ok).length;
  console.log(`${nombre}: ${resultados.length - fallas}/${resultados.length} aserciones en verde`);
  process.exitCode = fallas ? 1 : 0;
  return resultados;
}
module.exports = { iniciar, ok, informe, resultados, INDEX, EVID };
