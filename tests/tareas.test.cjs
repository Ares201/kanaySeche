const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const loadModel = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../models/tarea.js'),'utf8')).toString('base64'))

test('subtareas conservan checks al insertar, guardar y reabrir', async () => {
  const m = await loadModel()
  const legacy = m.normalizeTarea({ descripcionFormato: 'lista', descripcion: '1. Uno\n2. Dos' })
  legacy.subtareas[1].completada = true
  const source = fs.readFileSync(path.join(__dirname, '../pages/inicio/tareas.vue'), 'utf8').split('<script>')[1].split('</script>')[0]
    .replace(/^import .*$/gm, '').replace('export default', 'result =')
  const sandbox = { ...m, draggable: {}, result: null, console, alert: message => { throw new Error(message) } }
  vm.createContext(sandbox); vm.runInContext(source, sandbox)
  const component = sandbox.result
  const writes = []
  const ctx = { ...component.data(), form: { ...legacy, titulo: 'Entrega' }, currentUser: { id: 'owner' },
    $db: { collection: () => ({ doc: () => ({ id: 'new-item' }) }) },
    $firebaseApi: { config: { tareas: { collection: 'tareas' } }, update: async (name, id, payload) => writes.push(payload) },
    $nextTick: callback => callback(), $refs: {}, loadData: async () => {} }
  ctx.addSubtask = index => component.methods.addSubtask.call(ctx, index)
  let prevented = false
  component.methods.onSubtaskEnter.call(ctx, { preventDefault: () => { prevented = true } }, 0)
  assert.equal(prevented, true)
  ctx.form.subtareas[1].texto = 'Nuevo'
  const saved = m.normalizeTarea(m.toTareaPayload(ctx.form, ctx.currentUser))
  assert.equal(saved.descripcion, '1. Uno\n2. Nuevo\n3. Dos')
  assert.equal(saved.subtareas[2].completada, true)
  assert.equal(saved.subtareas[1].completada, false)
  saved.subtareas[2].completada = false
  assert.equal(ctx.form.subtareas[2].completada, true)
  ctx.readOnly = true; ctx.editingId = 'task-1'
  await component.methods.saveTask.call(ctx)
  assert.equal(writes[0].subtareas[2].completada, true)
  assert.equal(Object.hasOwn(writes[0], 'creadorId'), false)
  assert.equal(Object.hasOwn(writes[0], 'descripcion'), false)
  component.methods.onSubtaskEnter.call(ctx, { preventDefault: () => { throw new Error('Solo lectura') } }, 0)
  ctx.readOnly = false
  component.methods.changeDescriptionFormat.call(ctx, 'parrafo')
  assert.equal(ctx.form.descripcion, 'Uno\nNuevo\nDos')
  assert.equal(m.toTareaPayload(ctx.form, ctx.currentUser).subtareas.length, 0)
})

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

test('crear tarea guarda el comentario inicial y publicar respuesta no actualiza campos', async () => {
  const m = await loadModel()
  const source = fs.readFileSync(path.join(__dirname, '../pages/inicio/tareas.vue'), 'utf8').split('<script>')[1].split('</script>')[0]
    .replace(/^import .*$/gm, '').replace('export default', 'result =')
  const sandbox = { ...m, draggable: {}, result: null, alert: () => {}, console }
  vm.createContext(sandbox); vm.runInContext(source, sandbox)
  const component = sandbox.result
  const writes = []
  const ctx = { ...component.data(), currentUser: { id: 'owner', nombres: 'Creador' },
    $db: { collection: () => ({ doc: () => ({ id: 'comment-1' }) }) },
    $firebaseApi: { config: { tareas: { collection: 'tareas' } },
      create: async (name, payload) => writes.push({ name, payload }),
      update: async () => { throw new Error('No debe actualizar el contenido') },
      commentTask: async (id, text) => writes.push({ id, text }) },
    loadData: async () => {} }
  ctx.form.titulo = 'Entrega'
  ctx.form.compartidos = [{ id: 'recipient', nombres: 'Ana' }]
  ctx.commentDraft = 'Por favor confirmar la fecha.'
  await component.methods.saveTask.call(ctx)
  assert.equal(writes[0].payload.comentarios[0].texto, ctx.commentDraft)
  assert.equal(writes[0].payload.comentarios[0].autorId, 'owner')
  assert.equal(m.normalizeTarea(writes[0].payload).comentarios.length, 1)
  assert.equal(Object.hasOwn(m.toTareaPayload({ ...ctx.form, comentarios: [{ texto: 'old' }] }, ctx.currentUser), 'comentarios'), false)
  ctx.readOnly = true; ctx.editingId = 'task-1'; ctx.commentDraft = 'Tengo una duda.'
  await component.methods.sendComment.call(ctx)
  assert.equal(writes[1].id, 'task-1')
  assert.equal(writes[1].text, 'Tengo una duda.')
  assert.equal(ctx.commentDraft, '')
})

test('un destinatario guarda participantes sin sobrescribir el creador ni el contenido', async () => {
  const m = await loadModel()
  const source = fs.readFileSync(path.join(__dirname, '../pages/inicio/tareas.vue'), 'utf8').split('<script>')[1].split('</script>')[0]
    .replace(/^import .*$/gm, '').replace('export default', 'result =')
  const sandbox = { ...m, draggable: {}, result: null, alert: () => {}, console }
  vm.createContext(sandbox); vm.runInContext(source, sandbox)
  const component = sandbox.result
  const writes = []
  const ctx = { ...component.data(), readOnly: true, editingId: 'task-1', currentUser: { id: 'a' },
    form: m.normalizeTarea({ titulo: 'Entrega', creadorId: 'owner', compartidos: [{ id: 'a', nombres: 'Ana' }, { id: 'b', nombres: 'Bea' }] }),
    personal: [{ id: 'owner', estado: true }, { id: 'a', estado: true }, { id: 'b', estado: true }],
    $firebaseApi: { update: async (name, id, payload) => writes.push({ name, id, payload }) },
    loadData: async () => {} }
  assert.deepEqual(component.computed.personalDisponible.call(ctx).map(person => person.id), ['a', 'b'])
  await component.methods.saveTask.call(ctx)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].id, 'task-1')
  assert.deepEqual(writes[0].payload.compartidos.map(person => person.id), ['a', 'b'])
  assert.equal(writes[0].payload.compartidoConNombre, 'Ana, Bea')
  assert.deepEqual(Object.keys(writes[0].payload).sort(), ['compartidoConCorreo', 'compartidoConId', 'compartidoConNombre', 'compartidos'])
  ctx.form.compartidos = []
  await component.methods.saveTask.call(ctx)
  assert.equal(writes[1].payload.compartidoConId, '')
  assert.equal(writes[1].payload.compartidos.length, 0)
  ctx.commentAllowed = false
  await component.methods.saveTask.call(ctx)
  assert.equal(writes.length, 2)
})
