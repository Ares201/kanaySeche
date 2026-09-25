const { createHmac, timingSafeEqual } = require('node:crypto')
const { Server } = require('socket.io')

const TOKEN_TTL = 24 * 60 * 60 * 1000
const digest = (secret, value) => createHmac('sha256', secret).update(value).digest('base64url')
const equal = (a, b) => {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

function createPresenceServer(httpServer, { secret, origins, findUser }) {
  if (!secret || secret.length < 32) throw new Error('PRESENCE_SECRET requiere al menos 32 caracteres.')
  const io = new Server(httpServer, {
    cors: { origin: origins },
    allowRequest: (req, done) => done(null, origins.includes(req.headers.origin)),
    maxHttpBufferSize: 8192,
    pingInterval: 10000,
    pingTimeout: 10000
  })
  const connections = new Map()
  const attempts = new Map()
  const sweep = setInterval(() => {
    for (const [ip, entry] of attempts) if (entry.until <= Date.now()) attempts.delete(ip)
  }, 60000)
  sweep.unref()
  io.engine.on('close', () => clearInterval(sweep))

  io.use(async (socket, next) => {
    try {
      const ip = socket.handshake.address
      const now = Date.now()
      let limit = attempts.get(ip)
      if (!limit || limit.until <= now) {
        if (attempts.size >= 10000) throw new Error('limit')
        limit = { count: 0, until: now + 60000 }
        attempts.set(ip, limit)
      }
      if (++limit.count > 60) {
        const error = new Error('Demasiados intentos. Espera un minuto.')
        error.data = { code: 'RATE_LIMIT' }
        return next(error)
      }
      const auth = socket.handshake.auth || {}
      let id = auth.userId
      let claims
      if (auth.token) {
        if (typeof auth.token !== 'string' || auth.token.length > 2048) throw new Error('token')
        const [body, signature, extra] = auth.token.split('.')
        if (extra || !body || !signature || !equal(signature, digest(secret, body))) throw new Error('token')
        claims = JSON.parse(Buffer.from(body, 'base64url').toString())
        if (!Number.isFinite(claims.exp) || claims.exp <= now) throw new Error('expired')
        id = claims.id
      }
      if (typeof id !== 'string' || !id || id.includes('/') || id.length > 256) throw new Error('id')
      let user
      try {
        user = await findUser(id)
      } catch (_) {
        const error = new Error('Servicio de presencia no disponible.')
        error.data = { code: 'SERVICE_UNAVAILABLE' }
        return next(error)
      }
      if (!user || user.estado === false || user.anulado === true || !user.password) throw new Error('user')
      const passwordVersion = digest(secret, String(user.password))
      if (claims) {
        if (!equal(claims.version, passwordVersion)) throw new Error('password changed')
      } else if (typeof auth.password !== 'string' || !equal(auth.password, user.password)) {
        throw new Error('password')
      }
      const exp = claims ? claims.exp : now + TOKEN_TTL
      const body = Buffer.from(JSON.stringify({ id, exp, version: passwordVersion })).toString('base64url')
      socket.data.token = `${body}.${digest(secret, body)}`
      socket.data.expiresAt = exp
      socket.data.user = { id, nombres: String(user.nombres || 'Usuario') }
      // No conservar la contraseña en el handshake después de validarla.
      socket.handshake.auth = {}
      next()
    } catch (_) {
      const error = new Error('Vuelve a iniciar sesión para ver los usuarios en línea.')
      error.data = { code: 'AUTH_REQUIRED' }
      next(error)
    }
  })

  function broadcast() {
    const unique = new Map()
    for (const user of connections.values()) unique.set(user.id, user)
    io.emit('presence:users', [...unique.values()].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es')))
  }
  io.on('connection', socket => {
    connections.set(socket.id, socket.data.user)
    socket.emit('presence:session', { token: socket.data.token })
    broadcast()
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()))
    expiry.unref()
    socket.on('disconnect', () => {
      clearTimeout(expiry)
      connections.delete(socket.id)
      broadcast()
    })
  })
  return io
}

module.exports = { createPresenceServer }
