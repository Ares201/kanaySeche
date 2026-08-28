import Vue from 'vue'
import { ADMIN_ROLE, SYSTEM_PAGES, canAccessRoute } from '~/utils/access-control'

const SESSION_KEY = 'kanay_session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch (_) {
    return null
  }
}

export default ({ app, $firebaseApi }, inject) => {
  const state = Vue.observable({ session: readSession(), ready: true })

  const auth = {
    state,
    get user() { return state.session },
    get isAuthenticated() { return Boolean(state.session) },
    get isAdmin() { return state.session?.rolNombre === ADMIN_ROLE },
    can(route) { return canAccessRoute(state.session, route) },

    async canBootstrap() {
      const users = await $firebaseApi.list('personal')
      return !users.some(user => Boolean(user.password))
    },

    async createInitialAdmin({ nombres, correo, password }) {
      if (!(await this.canBootstrap())) throw new Error('El administrador inicial ya fue configurado.')
      let roles = await $firebaseApi.list('roles')
      const initialRoles = [ADMIN_ROLE, 'Gestión Documentaria', 'Operaciones', 'Laboratorio', 'Seguridad']
      for (const roleName of initialRoles) {
        if (!roles.some(role => role.nombre === roleName)) await $firebaseApi.create('roles', { nombre: roleName, estado: true })
      }
      roles = await $firebaseApi.list('roles')
      const adminRole = roles.find(role => role.nombre === ADMIN_ROLE)
      const existingPages = await $firebaseApi.list('paginas')
      for (const page of SYSTEM_PAGES) {
        if (!existingPages.some(item => item.ruta === page.ruta)) {
          await $firebaseApi.create('paginas', { ...page, estado: true })
        }
      }
      const pages = await $firebaseApi.list('paginas')
      const existingRelations = await $firebaseApi.list('rolPaginas')
      const defaults = {
        'Gestión Documentaria': ['/documentos/expedientes', '/documentos/cartas'],
        Operaciones: ['/operaciones/graficos', '/operaciones/pedidos-venta', '/operaciones/recepcion-cisterna']
      }
      for (const [roleName, routes] of Object.entries(defaults)) {
        const role = roles.find(item => item.nombre === roleName)
        for (const page of pages.filter(item => routes.includes(item.ruta))) {
          if (!existingRelations.some(item => item.rolId === role.id && item.paginaId === page.id)) {
            await $firebaseApi.create('rolPaginas', { rolId: role.id, paginaId: page.id })
          }
        }
      }
      await $firebaseApi.create('personal', {
        nombres: nombres.trim(), correo: correo.trim().toLowerCase(), telefono: '', password,
        rolId: adminRole.id, rolNombre: ADMIN_ROLE, estado: true
      })
      return this.login(correo, password)
    },

    async login(correo, password) {
      const users = await $firebaseApi.list('personal')
      const normalizedEmail = String(correo || '').trim().toLowerCase()
      const user = users.find(item => String(item.correo || '').trim().toLowerCase() === normalizedEmail)
      if (!user) throw new Error('Correo o contraseña incorrectos.')
      if (user.estado === false) throw new Error('El usuario se encuentra inactivo.')
      if (!user.password || user.password !== password) throw new Error('Correo o contraseña incorrectos.')

      let rolNombre = user.rolNombre || user.rol || ''
      let rutasPermitidas = []
      if (rolNombre !== ADMIN_ROLE) {
        const roles = await $firebaseApi.list('roles')
        const role = roles.find(item => item.id === user.rolId || item.nombre === rolNombre)
        if (!role || role.estado === false) throw new Error('El rol del usuario está inactivo o no existe.')
        rolNombre = role.nombre
        const relations = await $firebaseApi.list('rolPaginas')
        const pages = await $firebaseApi.list('paginas')
        const pageIds = relations.filter(item => item.rolId === role.id).map(item => item.paginaId)
        rutasPermitidas = pages.filter(item => item.estado !== false && pageIds.includes(item.id)).map(item => item.ruta)
      }

      state.session = { id: user.id, nombres: user.nombres, correo: user.correo, rolId: user.rolId || null, rolNombre, rutasPermitidas }
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.session))
      return state.session
    },

    logout() {
      state.session = null
      localStorage.removeItem(SESSION_KEY)
      app.router.push('/login')
    }
  }

  inject('auth', auth)
}
