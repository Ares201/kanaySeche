const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../utils/presence.js'), 'utf8')).toString('base64'))
const flush = () => new Promise(resolve => setImmediate(resolve))

test('deduplica pestañas y elimina señales vencidas o inválidas', async () => {
  const { onlineUsers, EXPIRY_MS } = await load()
  const now = 1000000
  const row = (userId, seen, nombres = userId) => ({ userId, nombres, lastSeen: { toMillis: () => seen } })
  const records = [row('ana', now), row('ana', now - 1000), row('bob', now), row('old', now - EXPIRY_MS), row('future', now + EXPIRY_MS + 1), { userId: 'pending' }]
  assert.deepEqual(onlineUsers(records, now).map(user => user.id), ['ana', 'bob'])
  assert.equal(onlineUsers(records.slice(0, 4), now + EXPIRY_MS + 1).length, 0)
})

test('confirma presencia con servidor, limpia caché, vence, reconecta y protege sesiones nuevas', async () => {
  const { createPresence, EXPIRY_MS } = await load()
  let time = 1000000
  const callbacks = []
  const writes = []
  const removed = []
  const listeners = []
  let sequence = 0
  let rejectWrites = false
  const db = { collection(name) {
    assert.equal(name, 'presencia')
    return {
      doc() {
        const id = ++sequence
        return {
          async set(value) { if (rejectWrites) throw new Error('denied'); writes.push({ id, value }) },
          async delete() { removed.push(id) }
        }
      },
      where(field, op, value) {
        assert.equal(field, 'lastSeen'); assert.equal(op, '>')
        return { onSnapshot(options, next, error) {
          const entry = { next, error, stopped: false }
          listeners.push(entry)
          return () => { entry.stopped = true }
        } }
      }
    }
  } }
  const state = { status: 'idle', users: [] }
  const presence = createPresence({ db, state, now: () => time, timestamp: () => 'SERVER_TIMESTAMP', cutoff: value => value,
    timers: { setInterval: callback => { callbacks.push(callback); return callbacks.length }, clearInterval: () => {} } })
  const snapshot = (cached = false, pending = false) => ({ metadata: { fromCache: cached }, docs: [
    { metadata: { hasPendingWrites: pending }, data: () => ({ userId: 'ana', nombres: 'Ana', lastSeen: { toMillis: () => 1000000 } }) }
  ] })
  presence.login({ id: 'ana', nombres: 'Ana', password: 'never-copy' })
  await flush()
  assert.equal(writes.length, 1)
  assert.deepEqual(Object.keys(writes[0].value).sort(), ['lastSeen', 'nombres', 'userId'])
  listeners[0].next(snapshot(true))
  assert.equal(state.users.length, 0)
  listeners[0].next(snapshot())
  assert.equal(state.status, 'connected')
  assert.equal(state.users.length, 1)
  presence.login({ id: 'ana' })
  presence.refresh()
  assert.equal(writes.length, 1)
  rejectWrites = true
  time += EXPIRY_MS + 1
  callbacks[0]()
  await flush()
  assert.equal(state.users.length, 0)
  assert.equal(state.status, 'unavailable')
  rejectWrites = false
  presence.retry()
  await flush()
  assert.equal(writes.length, 2)
  assert.equal(removed.includes(1), true)
  assert.equal(listeners[0].stopped, true)
  presence.logout()
  listeners[0].next(snapshot())
  assert.equal(state.status, 'idle')
  assert.equal(state.users.length, 0)
  assert.equal(removed.includes(2), true)
})
