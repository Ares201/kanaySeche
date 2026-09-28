const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const loadModule = relative => import('data:text/javascript;base64,' + Buffer.from(
  fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
).toString('base64'))

async function setup() {
  const { createFirebaseApi } = await loadModule('utils/firebase-api.js')
  const records = new Map()
  let nextId = 0
  let failCommit = false
  let allowed = true
  let context = { usuarioId: 'u1', usuario: 'Ana', modulo: 'Documentos', pagina: 'Cartas', ruta: '/documentos/cartas' }
  const queryCalls = []
  const snapshot = ref => ({ id: ref.id, exists: records.has(ref.key), data: () => records.get(ref.key) })
  const db = {
    collection(collection) {
      return {
        doc(id = String(++nextId)) {
          const ref = { id, key: `${collection}/${id}` }
          ref.get = async () => snapshot(ref)
          return ref
        },
        orderBy(...args) { queryCalls.push(['orderBy', ...args]); return this },
        startAfter(cursor) { queryCalls.push(['startAfter', cursor]); return this },
        limit(size) { queryCalls.push(['limit', size]); return this },
        async get() {
          return { docs: [...records.entries()].filter(([key]) => key.startsWith(collection + '/'))
            .map(([key]) => snapshot({ key, id: key.split('/')[1] })) }
        }
      }
    },
    batch() {
      const writes = []
      return {
        set(ref, data) { writes.push({ ref, data }) },
        update(ref, data) { writes.push({ ref, data, update: true }) },
        async get(ref) { return snapshot(ref) },
        async commit() {
          if (failCommit || writes.some(write => write.update && !records.has(write.ref.key))) throw new Error('Write rejected')
          for (const write of writes) records.set(write.ref.key, { ...(write.update ? records.get(write.ref.key) : {}), ...write.data })
        }
      }
    },
    async runTransaction(callback) {
      const transaction = this.batch()
      await callback(transaction)
      await transaction.commit()
    }
  }
  const api = createFirebaseApi({
    db, config: { cartas: { collection: 'cartas' }, tareas: { collection: 'tareas' } }, timestamp: () => 'SERVER_TIMESTAMP',
    getContext: () => context, canReadHistory: () => allowed
  })
  return {
    api, records, queryCalls,
    history: () => [...records.entries()].filter(([key]) => key.startsWith('historial/')).map(([, value]) => value),
    setContext: value => { context = value },
    fail: () => { failCommit = true },
    deny: () => { allowed = false }
  }
}

test('registrar conserva el usuario y origen sin copiar datos sensibles', async () => {
  const fixture = await setup()
  const result = await fixture.api.create('cartas', { password: 'secret', estado: 'Emitido' })
  const [entry] = fixture.history()
  assert.equal(entry.usuario, 'Ana')
  assert.equal(entry.usuarioId, 'u1')
  assert.equal(entry.pagina, 'Cartas')
  assert.equal(entry.modulo, 'Documentos')
  assert.equal(entry.registroId, result.id)
  assert.equal(entry.fecha, 'SERVER_TIMESTAMP')
  assert.equal(entry.accion, 'Registrar')
  assert.ok(!JSON.stringify(entry).includes('secret'))
})

test('distingue edición, movimiento, activación y eliminación', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('cartas', { estado: 'Emitido', estadoProceso: 'Emitido' })
  await fixture.api.update('cartas', record.id, { asunto: 'Nuevo', estado: 'Emitido', estadoProceso: 'Emitido' })
  await fixture.api.update('cartas', record.id, { estado: 'Enviado', estadoProceso: 'Enviado' })
  await fixture.api.update('cartas', record.id, { estado: false })
  await fixture.api.update('cartas', record.id, { estado: true })
  await fixture.api.remove('cartas', record.id)
  assert.deepEqual(fixture.history().map(item => item.accion), ['Registrar', 'Editar', 'Mover', 'Desactivar', 'Activar', 'Eliminar'])
  assert.equal(fixture.history()[2].detalle, 'Emitido → Enviado')
  assert.equal((await fixture.api.list('cartas')).length, 0)
  assert.equal((await fixture.api.list('cartas', { includeAnulados: true })).length, 1)
})

test('un rechazo no deja cambios ni historial parcial', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('cartas', { estado: 'Emitido' })
  fixture.fail()
  await assert.rejects(fixture.api.create('cartas', {}))
  await assert.rejects(fixture.api.update('cartas', record.id, { estado: 'Enviado' }))
  await assert.rejects(fixture.api.remove('cartas', record.id))
  assert.equal(fixture.history().length, 1)
  assert.equal(fixture.records.get('cartas/' + record.id).estado, 'Emitido')
  assert.equal(fixture.records.size, 2)
})

test('un registro inexistente no produce historial', async () => {
  const fixture = await setup()
  await assert.rejects(fixture.api.update('cartas', 'missing', { estado: 'Enviado' }))
  await assert.rejects(fixture.api.remove('cartas', 'missing'))
  assert.equal(fixture.history().length, 0)
})

test('captura la sesión antes de esperar la escritura', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('cartas', { estado: 'Emitido' })
  const pending = fixture.api.update('cartas', record.id, { estado: 'Enviado' })
  fixture.setContext({ usuario: 'Otra persona', pagina: 'Otra página' })
  await pending
  assert.equal(fixture.history()[1].usuario, 'Ana')
  assert.equal(fixture.history()[1].pagina, 'Cartas')
})

test('soporta acciones de procesamiento y lectura paginada con permisos', async () => {
  const fixture = await setup()
  await fixture.api.create('cartas', {}, { accion: 'Procesar expedientes' })
  const result = await fixture.api.listHistory({ limit: 1, cursor: 'previous' })
  assert.equal(result.records[0].accion, 'Procesar expedientes')
  assert.equal(result.hasMore, true)
  assert.deepEqual(fixture.queryCalls, [['orderBy', 'fecha', 'desc'], ['startAfter', 'previous'], ['limit', 1]])
  fixture.deny()
  await assert.rejects(fixture.api.listHistory(), /permiso/)
  await assert.rejects(fixture.api.create('historial', {}), /configuracion/)
})

test('la ruta de historial queda restringida al administrador', async () => {
  const { canAccessRoute } = await loadModule('utils/access-control.js')
  const route = '/configuracion/historial'
  assert.equal(canAccessRoute(null, route), false)
  assert.equal(canAccessRoute({ rolNombre: 'Operaciones', rutasPermitidas: [route] }, route), false)
  assert.equal(canAccessRoute({ rolNombre: 'Administrador' }, route), true)
})

test('el destinatario comenta sin modificar campos y la edición conserva los comentarios', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('tareas', { titulo: 'Revisar entrega', creadorId: 'owner', estado: 'Pendiente', compartidos: [{ id: 'u1' }] })
  const first = await fixture.api.commentTask(record.id, '  Falta el documento de respaldo.  ')
  assert.equal(first.texto, 'Falta el documento de respaldo.')
  assert.equal(first.autorId, 'u1')
  assert.equal(first.autorNombre, 'Ana')
  assert.ok(first.fecha instanceof Date)
  fixture.setContext({ usuarioId: 'owner', usuario: 'Creador' })
  await fixture.api.commentTask(record.id, 'Lo adjunto por correo.')
  await fixture.api.update('tareas', record.id, { titulo: 'Revisar entrega hoy' })
  const task = fixture.records.get('tareas/' + record.id)
  assert.equal(task.estado, 'Pendiente')
  assert.equal(task.creadorId, 'owner')
  assert.equal(task.comentarios.length, 2)
  assert.notEqual(task.comentarios[0].id, task.comentarios[1].id)
  assert.deepEqual(fixture.history().map(entry => entry.accion), ['Registrar', 'Comentar', 'Comentar', 'Editar'])
})

test('comentarios rechazan accesos retirados, tareas eliminadas y textos inválidos', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('tareas', { creadorId: 'owner', compartidos: [] })
  await assert.rejects(fixture.api.commentTask(record.id, 'No autorizado'), /acceso/)
  await assert.rejects(fixture.api.commentTask(record.id, '  '), /caracteres/)
  await assert.rejects(fixture.api.commentTask(record.id, 'a'.repeat(2001)), /caracteres/)
  await assert.rejects(fixture.api.commentTask('missing', 'Hola'), /disponible/)
  fixture.setContext({ usuarioId: 'owner', usuario: 'Creador' })
  await fixture.api.remove('tareas', record.id)
  await assert.rejects(fixture.api.commentTask(record.id, 'Hola'), /disponible/)
  assert.equal(fixture.records.get('tareas/' + record.id).comentarios, undefined)
})

test('admite destinatarios antiguos por correo y no deja comentarios parciales al fallar', async () => {
  const fixture = await setup()
  const record = await fixture.api.create('tareas', { creadorId: 'owner', compartidoConCorreo: 'ANA@EXAMPLE.COM' })
  fixture.setContext({ usuarioId: 'ana', usuario: 'Ana', usuarioCorreo: 'ana@example.com' })
  await fixture.api.commentTask(record.id, 'Recibido')
  fixture.fail()
  await assert.rejects(fixture.api.commentTask(record.id, 'No debe guardarse'))
  assert.equal(fixture.records.get('tareas/' + record.id).comentarios.length, 1)
  assert.equal(fixture.history().length, 2)
})
