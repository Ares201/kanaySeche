const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../utils/certificados.js'), 'utf8')).toString('base64'))
const response = (status = 200, body = 'zip', headers = { 'Content-Type': 'application/zip', 'X-Archivos-Procesados': '2' }) => new Response(body, { status, headers })

test('validacion de PDFs, vacios, limite y contador estricto', async () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/firebase-crud.json'), 'utf8'))
  assert.equal(config.apis.procesarCertificados.collection, 'procesarCertificados')
  const m = await load()
  const pdf = { name: 'a.PDF', size: 4000000 }
  assert.equal(m.validarArchivos([pdf], 4000000), '')
  assert.match(m.validarArchivos([], 4000000), /Selecciona/)
  assert.match(m.validarArchivos([{ ...pdf, name: 'a.txt' }], 4000000), /extensión/)
  assert.match(m.validarArchivos([{ ...pdf, size: 0 }], 4000000), /vacío/)
  assert.match(m.validarArchivos([pdf, pdf], 4000000), /límite/)
  for (const value of [null, '', '-1', '2.5', '2abc', '1e2', '9007199254740992']) assert.equal(m.cantidadProcesada(value), null)
  assert.equal(m.cantidadProcesada('0'), 0)
  assert.equal(m.cantidadProcesada('2'), 2)
  assert.equal(m.maxTotalBytes('bad'), 4000000)
  assert.equal(m.maxTotalBytes('100'), 100)
})

test('POST multipart repetido, ZIP y contador real', async () => {
  const m = await load()
  const files = [new Blob(['fake']), new Blob(['fake2'])]
  const result = await m.solicitarCertificados(files, 'http://localhost:8000/', { fetchImpl: async (url, options) => {
    assert.equal(url, 'http://localhost:8000/api/procesar-certificados')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers, undefined)
    assert.equal(options.body.getAll('files').length, 2)
    return response(200, 'zip', { 'Content-Type': 'application/zip; charset=binary', 'X-Archivos-Procesados': '3' })
  } })
  assert.equal(result.cantidad, 3)
  assert.equal(await result.blob.text(), 'zip')
})

for (const status of [400, 413, 422, 500]) {
  test(`error ${status} JSON y no JSON`, async () => {
    const m = await load()
    for (const detail of ['Detalle concreto', [{ msg: 'Detalle concreto', loc: ['body', 'files'] }]]) {
      await assert.rejects(m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => response(status, JSON.stringify({ detail }), { 'Content-Type': 'application/json' }) }), /Detalle concreto/)
    }
    await assert.rejects(m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => response(status, '<html>Vercel error</html>') }), /lote|tamaño/)
  })
}

test('respuesta no ZIP, ZIP vacio, header ausente, red y timeout', async () => {
  const m = await load()
  await assert.rejects(m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => response(200, '{}', { 'Content-Type': 'application/json' }) }), /ZIP válido/)
  await assert.rejects(m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => response(200, '') }), /ZIP vacío/)
  const result = await m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => response(200, 'zip', { 'Content-Type': 'application/zip' }) })
  assert.equal(result.cantidad, null)
  await assert.rejects(m.solicitarCertificados([], 'http://mock', { fetchImpl: async () => { throw new TypeError('Failed to fetch') } }), /red.*CORS/)
  await assert.rejects(m.solicitarCertificados([], 'http://mock', { timeoutMs: 5, fetchImpl: (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }), /no cancela necesariamente/)
})

test('pagina: descarga exitosa, contador ausente, fallo Firebase y bloqueo de duplicados', async () => {
  const m = await load()
  const source = fs.readFileSync(path.join(__dirname, '../pages/documentos/certificados.vue'), 'utf8').split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm, '').replace('export default', 'result =')
  for (const scenario of ['success', 'missing', 'firebase']) {
    let sends = 0, downloads = 0
    const writes = []
    let release
    const pending = new Promise(resolve => { release = resolve })
    const sandbox = { ...m, result: null, process: { client: true }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'timestamp' } } },
      solicitarCertificados: async () => { sends++; await pending; return { blob: 'zip', cantidad: scenario === 'missing' ? null : 3 } },
      descargarZip: () => { downloads++ } }
    vm.runInNewContext(source, sandbox)
    const component = sandbox.result
    const ctx = { ...component.data(), limiteBytes: 4000000, $config: { certificadosApiBaseURL: 'http://mock' }, $refs: { fileInput: { value: 'selected' } },
      $firebaseApi: { create: async (...args) => { writes.push(args); if (scenario === 'firebase') throw new Error('offline') } } }
    for (const [name, method] of Object.entries(component.methods)) ctx[name] = method.bind(ctx)
    ctx.archivosSeleccionados = [{ name: 'a.pdf', size: 10 }]
    const work = ctx.procesarCertificados()
    await ctx.procesarCertificados()
    ctx.quitarArchivo(0)
    ctx.seleccionarArchivos({ target: { files: [] } })
    assert.equal(ctx.archivosSeleccionados.length, 1)
    release(); await work
    assert.equal(sends, 1)
    assert.equal(downloads, 1)
    assert.equal(ctx.mensajeError, '')
    assert.match(ctx.mensajeExito, /descargado/)
    assert.equal(ctx.cargando, false)
    assert.equal(ctx.archivosSeleccionados.length, 0)
    assert.equal(writes.length, scenario === 'missing' ? 0 : 1)
    if (writes.length) { assert.equal(writes[0][0], 'procesarCertificados'); assert.equal(writes[0][1].contador, 3) }
    assert.equal(Boolean(ctx.mensajeAviso), scenario !== 'success')
    await ctx.procesarCertificados()
    assert.equal(sends, 1)
  }
})

test('descarga libera enlace y URL temporal en navegador', () => {
  const source = fs.readFileSync(path.join(__dirname, '../utils/certificados.js'), 'utf8').replace(/export /g, '')
  const calls = []
  const link = { click: () => calls.push('click'), remove: () => calls.push('remove') }
  let cleanup
  const sandbox = { window: { URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: url => calls.push(url) } }, document: { createElement: () => link, body: { appendChild: () => calls.push('append') } }, setTimeout: fn => { cleanup = fn } }
  vm.runInNewContext(source, sandbox)
  sandbox.descargarZip('mock')
  assert.deepEqual(calls, ['append', 'click', 'remove'])
  cleanup()
  assert.equal(calls.at(-1), 'blob:mock')
  assert.equal(link.download, 'certificados_procesados.zip')
})
