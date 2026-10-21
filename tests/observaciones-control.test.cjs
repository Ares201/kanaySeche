const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../utils/observaciones-control.js'), 'utf8')).toString('base64'))

test('observations require all three matching filters and ignore case, accents and container', async () => {
  const { coincideObservacion } = await load()
  const record = { generador: ' Generador ', transportista: 'TRANSPORTISTA', producto_cliente: 'L\u00edquido' }
  const filters = { generador: 'generador', transportista: 'transportista', producto_cliente: 'liquido', tipo_contenedor: 'Cilindro' }
  assert.equal(coincideObservacion(record, filters), true)
  for (const field of ['generador', 'transportista', 'producto_cliente']) {
    assert.equal(coincideObservacion(record, { ...filters, [field]: '' }), false)
    assert.equal(coincideObservacion(record, { ...filters, [field]: 'Otro' }), false)
  }
})

test('three explicit states preserve pastel colors and legacy records remain unclassified', async () => {
  const { estadosObservacion, obtenerEstadoObservacion } = await load()
  assert.equal(estadosObservacion.length, 3)
  assert.deepEqual(estadosObservacion.map(s => s.fondo), ['#DCFCE7', '#FEF3C7', '#FEE2E2'])
  for (const estado of estadosObservacion) assert.equal(obtenerEstadoObservacion(estado.value), estado)
  assert.equal(obtenerEstadoObservacion(undefined).value, '')
  assert.equal(obtenerEstadoObservacion('unknown').value, '')
})

test('observation date validates calendar days and formats without timezone shifts', async () => {
  const { fechaObservacionValida, formatearFechaObservacion } = await load()
  assert.equal(fechaObservacionValida('2026-10-20'), true)
  assert.equal(fechaObservacionValida('2024-02-29'), true)
  for (const value of ['', undefined, '2026-02-29', '2026-04-31', '20/10/2026']) assert.equal(fechaObservacionValida(value), false)
  assert.equal(formatearFechaObservacion('2026-10-20'), '20/10/2026')
  assert.equal(formatearFechaObservacion(undefined), 'Sin fecha registrada')
})
