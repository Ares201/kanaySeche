const { createServer } = require('node:http')
const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { createPresenceServer } = require('./service.cjs')

const origins = (process.env.PRESENCE_ORIGINS || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean)
initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || 'kanaybd' })
const db = getFirestore()
const server = createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'text/plain' })
  res.end(req.url === '/health' ? 'ok' : 'Not found')
})
const io = createPresenceServer(server, {
  secret: process.env.PRESENCE_SECRET,
  origins,
  async findUser(id) {
    const doc = await db.collection('personal').doc(id).get()
    if (!doc.exists) return null
    const user = doc.data()
    if (user.rolId) {
      const role = await db.collection('roles').doc(user.rolId).get()
      if (!role.exists || role.data().estado === false) return null
    }
    return user
  }
})
server.listen(Number(process.env.PORT || 3001), () => console.log('Servicio de presencia iniciado.'))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => io.close())
