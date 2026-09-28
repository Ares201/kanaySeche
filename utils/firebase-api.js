// Las escrituras y su historial se confirman en el mismo lote de Firestore.
export function createFirebaseApi({ db, config, timestamp, getContext, canReadHistory }) {
  const serialize = doc => ({ id: doc.id, ...doc.data() })
  const isAnulado = record => record.anulado === true || record.estado === 'Anulado' || record.estadoProceso === 'Anulado'
  const apiConfig = name => {
    if (!config[name]) throw new Error(`No existe configuracion Firebase para "${name}"`)
    return config[name]
  }

  function historyEntry(context, accion, collection, id, detalle = '') {
    return {
      fecha: timestamp(),
      usuarioId: context.usuarioId || '',
      usuario: context.usuario || 'Sin sesión',
      modulo: context.modulo || 'General',
      pagina: context.pagina || 'Sistema',
      ruta: context.ruta || '/',
      accion,
      coleccion: collection,
      registroId: id,
      detalle
    }
  }

  function appendHistory(batch, context, accion, collection, id, detalle) {
    batch.set(db.collection('historial').doc(), historyEntry(context, accion, collection, id, detalle))
  }

  return {
    config,
    async commentTask(id, texto) {
      const context = { ...getContext() }
      const text = String(texto || '').trim()
      if (!context.usuarioId) throw new Error('Inicia sesión para comentar.')
      if (!text || text.length > 2000) throw new Error('Escribe un comentario de entre 1 y 2000 caracteres.')
      const { collection } = apiConfig('tareas')
      const ref = db.collection(collection).doc(id)
      const comment = { id: db.collection(collection).doc().id, texto: text, autorId: context.usuarioId, autorNombre: context.usuario || 'Usuario', fecha: new Date() }
      await db.runTransaction(async transaction => {
        const doc = await transaction.get(ref)
        if (!doc.exists || isAnulado(doc.data())) throw new Error('La tarea ya no está disponible.')
        const task = doc.data()
        const recipients = Array.isArray(task.compartidos) ? task.compartidos : [{ id: task.compartidoConId, correo: task.compartidoConCorreo }]
        const email = String(context.usuarioCorreo || '').trim().toLowerCase()
        const allowed = task.creadorId === context.usuarioId || recipients.some(person => person && (
          person.id === context.usuarioId || (email && String(person.correo || '').trim().toLowerCase() === email)
        ))
        if (!allowed) throw new Error('Ya no tienes acceso a esta tarea.')
        const comments = Array.isArray(task.comentarios) ? task.comentarios : []
        if (comments.length >= 100) throw new Error('La tarea alcanzó el límite de 100 comentarios.')
        transaction.update(ref, { comentarios: [...comments, comment], fechaActualizacion: timestamp() })
        appendHistory(transaction, context, 'Comentar', collection, id)
      })
      return comment
    },
    async list(name, options = {}) {
      const settings = apiConfig(name)
      let query = db.collection(settings.collection)
      if (settings.orderBy) query = query.orderBy(settings.orderBy, settings.orderDirection || 'asc')
      const snapshot = await query.get()
      const records = snapshot.docs.map(serialize)
      return options.includeAnulados ? records : records.filter(record => !isAnulado(record))
    },

    async create(name, payload, options = {}) {
      const context = { ...getContext() }
      const { collection } = apiConfig(name)
      const ref = db.collection(collection).doc()
      const now = timestamp()
      const batch = db.batch()
      batch.set(ref, { ...payload, fechaCreacion: payload.fechaCreacion || now, fechaActualizacion: now })
      appendHistory(batch, context, options.accion || 'Registrar', collection, ref.id)
      await batch.commit()
      return serialize(await ref.get())
    },

    async update(name, id, payload) {
      const context = { ...getContext() }
      const { collection } = apiConfig(name)
      const ref = db.collection(collection).doc(id)
      // Leer dentro de la transacción permite identificar cambios de estado reales.
      await db.runTransaction(async transaction => {
        const doc = await transaction.get(ref)
        if (!doc.exists) throw new Error('El registro ya no existe.')
        const before = doc.data()
        let accion = 'Editar'
        let detalle = ''
        const field = ['estadoProceso', 'estado'].find(key =>
          Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== before[key]
        )
        if (payload.anulado === true || (field && payload[field] === 'Anulado')) accion = 'Eliminar'
        else if (field) {
          accion = typeof payload[field] === 'boolean' ? (payload[field] ? 'Activar' : 'Desactivar') : 'Mover'
          detalle = `${before[field] == null ? 'Sin estado' : before[field]} → ${payload[field]}`
        }
        transaction.update(ref, { ...payload, fechaActualizacion: timestamp() })
        appendHistory(transaction, context, accion, collection, id, detalle)
      })
      return serialize(await ref.get())
    },

    async remove(name, id) {
      const context = { ...getContext() }
      const { collection } = apiConfig(name)
      const batch = db.batch()
      batch.update(db.collection(collection).doc(id), {
        anulado: true, estado: 'Anulado', fechaAnulacion: timestamp(), fechaActualizacion: timestamp()
      })
      appendHistory(batch, context, 'Eliminar', collection, id)
      await batch.commit()
      return id
    },

    async listHistory({ cursor = null, limit = 100 } = {}) {
      if (!canReadHistory()) throw new Error('No tienes permiso para consultar el historial.')
      const pageSize = Math.max(1, Math.min(Number(limit) || 100, 200))
      let query = db.collection('historial').orderBy('fecha', 'desc')
      if (cursor) query = query.startAfter(cursor)
      const snapshot = await query.limit(pageSize).get()
      return {
        records: snapshot.docs.map(serialize),
        cursor: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      }
    }
  }
}
