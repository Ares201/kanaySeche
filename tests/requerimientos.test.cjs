const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
function setup(remoteItems) {
  const source = fs.readFileSync(path.join(__dirname, '../pages/inventario/requerimientos.vue'), 'utf8').split('<script>')[1].split('</script>')[0].replace('export default', 'result =')
  const sandbox = { result: null }
  vm.runInNewContext(source, sandbox)
  const writes = []
  const ctx = { ...sandbox.result.data(), editingRequestId: 'r1', editingRequestStatus: 'Pendiente',
    originalItems: [{ productoId: 'p1', codigo: 'P1', nombre: 'Papel', cantidad: 1 }],
    requestForm: { items: [{ productoId: 'p1', cantidad: 2 }] }, products: [{ id: 'p1', codigo: 'P1', nombre: 'Papel' }],
    $refs: { requestForm: { validate: () => true } }, $auth: { user: { id: 'u1' } },
    $db: { collection: name => ({ doc: id => ({ name, id }) }), runTransaction: async callback => callback({
      get: async () => ({ exists: true, data: () => ({ estado: 'Pendiente', items: remoteItems }) }),
      update: (ref, payload) => writes.push(payload), set: () => {} }) },
    $firebaseApi: { create: async (name, payload) => writes.push(payload) },
    fail(message) { this.error = message }, loadAll: async () => {} }
  return { ctx, writes, save: () => sandbox.result.methods.saveRequest.call(ctx) }
}
test('editar admite campos de Firestore en distinto orden', async () => {
  const f = setup([{ cantidad: 1, nombre: 'Papel', codigo: 'P1', productoId: 'p1' }])
  await f.save()
  assert.equal(f.ctx.error, '')
  assert.equal(f.writes[0].items[0].cantidad, 2)
  assert.equal(f.ctx.busy, false)
})
test('editar rechaza un cambio real concurrente sin escribir', async () => {
  const f = setup([{ cantidad: 3, nombre: 'Papel', codigo: 'P1', productoId: 'p1' }])
  await f.save()
  assert.match(f.ctx.error, /Otro usuario/)
  assert.equal(f.writes.length, 0)
})
test('nuevo requerimiento no aplica la comprobacion de edicion', async () => {
  const f = setup([])
  f.ctx.editingRequestId = ''
  await f.save()
  assert.equal(f.ctx.error, '')
  assert.equal(f.writes.length, 1)
  assert.equal(f.writes[0].estado, 'Pendiente')
})
