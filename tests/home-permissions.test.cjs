const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const compiler = require('vue-template-compiler')

function loadHome(routes) {
  const source = fs.readFileSync(path.join(__dirname, '../pages/index.vue'), 'utf8')
  const component = compiler.parseComponent(source)
  assert.deepEqual(compiler.compile(component.template.content).errors, [])
  const context = vm.createContext({ normalizeTarea: x => x, normalizeExpediente: x => x, console, Date })
  vm.runInContext(component.script.content.replace(/^import[\s\S]*?from ['"][^'"]+['"]/gm, '').replace('export default', 'this.component ='), context)
  const calls = []
  const state = { ...context.component.data(), $auth: { can: route => routes.includes(route) }, $firebaseApi: { list: async name => { calls.push(name); return [] } } }
  for (const [key, method] of Object.entries(context.component.methods)) state[key] = method.bind(state)
  for (const [key, getter] of Object.entries(context.component.computed)) Object.defineProperty(state, key, { get: () => getter.call(state) })
  return { state, calls }
}

test('control staff cannot see or load unassigned home modules', async () => {
  const { state, calls } = loadHome(['/control-aceptacion/graficos'])
  assert.equal(state.dashboardSections.length, 0)
  await state.refreshAll()
  assert.deepEqual(calls, [])
})

test('each home card and query requires its destination page permission', async () => {
  for (const [route, id, collection] of [
    ['/documentos/controlDeIngresos', 'pedidos', 'expedientes'],
    ['/documentos/cartas', 'cartas', 'cartas'],
    ['/inicio/tareas', 'tareas', 'tareas']
  ]) {
    const { state, calls } = loadHome([route])
    assert.deepEqual(Array.from(state.dashboardSections, s => s.id), [id])
    await state.refreshAll()
    assert.deepEqual(calls, [collection])
    assert.equal(state.loading, false)
  }
})

test('permission to operations orders does not grant document control data', async () => {
  const { state, calls } = loadHome(['/operaciones/pedidos-venta'])
  assert.equal(state.dashboardSections.length, 0)
  await state.getAllExpedientes()
  await state.getAllCartas()
  await state.loadOverdueTasks()
  assert.deepEqual(calls, [])
})
