const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const loadModel = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../models/tarea.js'),'utf8')).toString('base64'))

test('multiple recipients, legacy sharing, removal and visibility', async () => {
  const m = await loadModel()
  const user = { id: 'owner', nombres: 'Owner' }
  const form = m.createEmptyTareaForm()
  form.compartidos = [{id: 'a', nombres: 'Ana', correo: 'A@TEST.COM'}, {id: 'b', nombres: 'Bea'}, {id: 'a'}, user]
  const saved = m.normalizeTarea(m.toTareaPayload(form,user))
  assert.equal(saved.compartidos.length, 2)
  assert.equal(m.canViewTarea(saved,{id: 'a'}), true)
  assert.equal(m.canViewTarea(saved,{id: 'b'}), true)
  assert.equal(m.canViewTarea(saved,{id: 'owner'}), true)
  assert.equal(m.canViewTarea(saved,{id: 'other'}), false)
  assert.equal(m.canViewTarea(saved,{}), false)
  const legacy = m.normalizeTarea({compartidoConId:'a',compartidoConCorreo:'A@TEST.COM'})
  assert.equal(m.isTareaSharedWith(legacy,{correo:'a@test.com'}), true)
  legacy.compartidos = []
  const cleared = m.toTareaPayload(legacy,user)
  assert.equal(cleared.compartidoConId, '')
  assert.equal(m.isTareaSharedWith(cleared,{id:'a'}), false)
})

test('notifications persist one receipt per user/task and exclude own/read tasks', async () => {
  const m = await loadModel()
  const source = fs.readFileSync(path.join(__dirname,'../components/TaskNotifications.vue'),'utf8').split('<script>')[1].split('</script>')[0]
    .replace(/^import .*$/m,'').replace('export default','result =')
  const sandbox = { ...m, result:null }
  vm.createContext(sandbox); vm.runInContext(source,sandbox)
  const component = sandbox.result
  const shared = {id:'task1',creadorId:'owner',compartidos:[{id:'a'}]}
  const writes = []
  const ctx = { ...component.data(), ready:true,user:{id:'a'},tasks:[shared, {...shared,id:'own',creadorId:'a'}], receipts:[],
    $db:{ collection: name => ({doc: id => ({set: async payload => writes.push({name,id,payload})})}) },
    $route:{path:'/inicio/tareas',query:{}},$router:{push:async () => {}} }
  assert.equal(component.computed.notifications.call(ctx).length,1)
  await component.methods.readTask.call(ctx,shared)
  assert.equal(component.computed.notifications.call(ctx).length,0)
  const reloaded = {...ctx,receipts: writes.map(write => write.payload.tareaId)}
  assert.equal(component.computed.notifications.call(reloaded).length,0)
  await component.methods.readTask.call(ctx,shared)
  assert.equal(writes[0].id,writes[1].id)
  assert.equal(writes[0].payload.usuarioId,'a')
  ctx.generation++; ctx.tasks=[]
  assert.equal(component.computed.notifications.call(ctx).length,0)
})
