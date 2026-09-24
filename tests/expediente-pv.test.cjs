const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../models/expediente.js'), 'utf8')).toString('base64'))
test('pending PV preserves open/closed on read and save, including imported records', async () => {
  const m = await load()
  for (const estado of ['Pendiente','Notificado']) {
    for (const estadoPV of ['Abierto','Cerrado']) {
      const form = {...m.createEmptyExpedienteForm(), estado, estadoPV}
      assert.equal(m.normalizeExpediente(form).estadoPV, estadoPV)
      assert.equal(m.toExpedientePayload(form).estadoPV, estadoPV)
      assert.equal(m.getEstadoPV(estado, estadoPV), estadoPV)
    }
  }
  assert.equal(m.normalizeExpediente({estado:'Pendiente'}).estadoPV, 'Abierto')
  assert.equal(m.getEstadoPV('Pendiente','Invalid'), 'Abierto')
  for (const estado of ['Regularizado','Cerrado']) assert.equal(m.getEstadoPV(estado,'Abierto'), 'Cerrado')
})
