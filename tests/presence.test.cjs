const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createServer } = require('node:http')
const { io: client } = require('socket.io-client')
const { createPresenceServer } = require('../server/presence/service.cjs')

function event(socket, name, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout: ${name}`)) }, 3000)
    function handler(value) {
      if (!predicate(value)) return
      clearTimeout(timer)
      socket.off(name, handler)
      resolve(value)
    }
    socket.on(name, handler)
  })
}

test('presencia autenticada, múltiples pestañas, reconexión y bajas', async t => {
  const records = {
    ana: { nombres: 'Ana', password: 'test-password', estado: true, correo: 'private@example.test' },
    bob: { nombres: 'Bob', password: 'test-password', estado: true },
    disabled: { nombres: 'Inactivo', password: 'test-password', estado: false }
  }
  const server = createServer()
  const io = createPresenceServer(server, {
    secret: 'test-secret-with-at-least-32-characters', origins: ['http://localhost:3000'],
    findUser: async id => records[id]
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const clients = []
  t.after(async () => { clients.forEach(socket => socket.disconnect()); await new Promise(resolve => io.close(resolve)) })
  const make = auth => {
    const socket = client(`http://127.0.0.1:${server.address().port}`, {
      auth, autoConnect: false, reconnection: false, transports: ['websocket'],
      extraHeaders: { Origin: 'http://localhost:3000' }
    })
    clients.push(socket)
    return socket
  }
  for (const auth of [{ userId: 'ana' }, { userId: 'ana', password: 'wrong' }, { userId: 'disabled', password: 'test-password' }, { token: 'forged.token' }]) {
    const rejected = make(auth)
    const error = event(rejected, 'connect_error')
    rejected.connect()
    assert.equal((await error).data.code, 'AUTH_REQUIRED')
  }
  const ana = make({ userId: 'ana', password: 'test-password', nombres: 'Spoofed' })
  const tokenEvent = event(ana, 'presence:session')
  const first = event(ana, 'presence:users')
  ana.connect()
  const { token } = await tokenEvent
  assert.deepEqual(await first, [{ id: 'ana', nombres: 'Ana' }])
  const tab = make({ token })
  const same = event(ana, 'presence:users')
  tab.connect()
  assert.equal((await same).length, 1)
  const bob = make({ userId: 'bob', password: 'test-password' })
  const both = event(ana, 'presence:users', users => users.length === 2)
  bob.connect()
  assert.deepEqual((await both).map(user => user.id), ['ana', 'bob'])
  const stillOnline = event(bob, 'presence:users')
  ana.disconnect()
  assert.equal((await stillOnline).length, 2)
  const gone = event(bob, 'presence:users', users => users.length === 1)
  tab.io.engine.close()
  assert.deepEqual(await gone, [{ id: 'bob', nombres: 'Bob' }])
  const back = event(bob, 'presence:users', users => users.length === 2)
  tab.connect()
  await back
  tab.disconnect()
  records.ana.password = 'changed'
  const expired = make({ token })
  const denied = event(expired, 'connect_error')
  expired.connect()
  assert.equal((await denied).data.code, 'AUTH_REQUIRED')
})

test('cliente restaura token, limpia la lista sin red y elimina sesión al salir', () => {
  const fs = require('node:fs')
  const vm = require('node:vm')
  const { EventEmitter } = require('node:events')
  const source = fs.readFileSync(require('node:path').join(__dirname, '../plugins/presence.client.js'), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default', 'plugin =')
  const storage = new Map([['kanay_presence_token', JSON.stringify({ userId: 'ana', token: 'saved-token' })]])
  const sockets = []
  const context = {
    Vue: { observable: value => value }, module: {}, plugin: null,
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    io(url, options) {
      const socket = new EventEmitter()
      socket.auth = options.auth
      socket.connect = () => { socket.active = true }
      socket.disconnect = () => { socket.active = false }
      sockets.push(socket)
      return socket
    }
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  let presence
  context.plugin({ app: { $auth: { user: { id: 'ana' } } }, $config: { presenceUrl: 'http://localhost:3001' } }, (_, value) => { presence = value })
  assert.equal(sockets[0].auth.token, 'saved-token')
  sockets[0].emit('presence:users', [{ id: 'ana', nombres: 'Ana' }])
  assert.equal(presence.state.status, 'connected')
  sockets[0].emit('disconnect', 'transport close')
  assert.equal(presence.state.users.length, 0)
  assert.equal(presence.state.status, 'connecting')
  sockets[0].emit('presence:users', [{ id: 'ana', nombres: 'Ana' }])
  presence.logout()
  assert.equal(sockets[0].active, false)
  assert.equal(sockets[0].listenerCount('presence:users'), 0)
  assert.equal(storage.size, 0)
  assert.equal(presence.state.users.length, 0)
  presence.login('ana', 'temporary-password')
  sockets[1].emit('presence:session', { token: 'new-token' })
  assert.equal(sockets[1].auth.password, undefined)
  assert.equal(sockets[1].auth.token, 'new-token')
  assert.equal(storage.get('kanay_presence_token').includes('temporary-password'), false)
  sockets[1].emit('connect_error', { data: { code: 'AUTH_REQUIRED' } })
  assert.equal(presence.state.status, 'auth-required')
  assert.equal(storage.size, 0)
})
