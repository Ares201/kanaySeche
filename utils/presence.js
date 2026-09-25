// Presencia aproximada: una señal por minuto y vencimiento tras tres minutos.
export const HEARTBEAT_MS = 60000
export const EXPIRY_MS = 180000

export function onlineUsers(records, now) {
  const users = new Map()
  for (const record of records) {
    const seen = record.lastSeen?.toMillis?.()
    if (!record.userId || !Number.isFinite(seen) || seen <= now - EXPIRY_MS || seen > now + EXPIRY_MS) continue
    users.set(record.userId, { id: record.userId, nombres: record.nombres || 'Usuario' })
  }
  return [...users.values()].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'))
}

export function createPresence({ db, state, timestamp, cutoff, now = Date.now, timers = { setInterval, clearInterval } }) {
  const collection = db.collection('presencia')
  let user = null
  let session = null
  let unsubscribe = null
  let interval = null
  let records = []
  let generation = 0
  let pending = false
  let lastAck = 0
  let lastWrite = 0
  let lastQuery = 0
  let serverSnapshot = false

  function render() {
    if (!session) return
    const current = serverSnapshot && lastAck > now() - EXPIRY_MS
    state.status = current ? 'connected' : 'connecting'
    state.users = current ? onlineUsers(records, now()) : []
  }
  function listen(run) {
    if (unsubscribe) unsubscribe()
    lastQuery = now()
    unsubscribe = collection.where('lastSeen', '>', cutoff(now() - EXPIRY_MS))
      .onSnapshot({ includeMetadataChanges: true }, snapshot => {
        if (run !== generation) return
        serverSnapshot = !snapshot.metadata.fromCache
        // Nunca presentar las escrituras locales pendientes como presencia confirmada.
        records = snapshot.docs.filter(doc => !doc.metadata.hasPendingWrites).map(doc => doc.data())
        render()
      }, () => {
        if (run !== generation) return
        serverSnapshot = false
        state.users = []
        state.status = 'unavailable'
      })
  }
  async function heartbeat() {
    if (!session || pending || now() - lastWrite < HEARTBEAT_MS) return
    const run = generation
    const ref = session
    pending = true
    lastWrite = now()
    try {
      await ref.set({ userId: user.id, nombres: user.nombres || 'Usuario', lastSeen: timestamp() })
      if (run !== generation) return
      lastAck = now()
      if (!unsubscribe || !serverSnapshot || now() - lastQuery >= 600000) listen(run)
      render()
    } catch (_) {
      if (run !== generation) return
      state.status = 'unavailable'
      state.users = []
    } finally {
      if (run === generation) pending = false
    }
  }
  function stop() {
    generation++
    if (unsubscribe) unsubscribe()
    if (interval !== null) timers.clearInterval(interval)
    const previous = session
    session = null
    unsubscribe = null
    interval = null
    pending = false
    records = []
    serverSnapshot = false
    lastAck = 0
    lastWrite = -Infinity
    state.users = []
    // La baja es best effort; si se cierra el navegador, se aplica el vencimiento.
    if (previous) previous.delete().catch(() => {})
  }
  const presence = {
    state,
    login(currentUser) {
      if (session && user?.id === currentUser?.id) return
      stop()
      user = currentUser
      if (!user?.id) { state.status = 'idle'; return }
      session = collection.doc() // Independiente por pestaña, sin sobrescribir otras sesiones.
      state.status = 'connecting'
      heartbeat()
      interval = timers.setInterval(() => {
        if (state.status !== 'unavailable') render()
        heartbeat()
      }, 10000)
    },
    logout() { stop(); user = null; state.status = 'idle' },
    suspend() { stop(); state.status = 'unavailable' },
    refresh() { if (session) { render(); heartbeat() } },
    retry() { const current = user; stop(); presence.login(current) }
  }
  return presence
}
