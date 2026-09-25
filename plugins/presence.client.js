import Vue from 'vue'
import { io } from 'socket.io-client'

const TOKEN_KEY = 'kanay_presence_token'

export default ({ app, $config }, inject) => {
  const state = Vue.observable({ status: 'idle', users: [] })
  let socket = null
  function disconnect() {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }
    state.users = []
  }
  function connect(auth) {
    disconnect()
    if (!$config.presenceUrl) {
      state.status = 'unavailable'
      return
    }
    state.status = 'connecting'
    socket = io($config.presenceUrl, { auth, autoConnect: false, timeout: 10000, reconnectionDelayMax: 10000 })
    socket.on('presence:session', ({ token }) => {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ userId: app.$auth.user.id, token }))
      socket.auth = { token }
    })
    socket.on('presence:users', users => {
      state.users = users
      state.status = 'connected'
    })
    socket.on('disconnect', reason => {
      state.users = []
      state.status = reason === 'io server disconnect' ? 'auth-required' : 'connecting'
    })
    socket.on('connect_error', error => {
      state.users = []
      state.status = error.data?.code === 'AUTH_REQUIRED' ? 'auth-required' : 'unavailable'
      if (state.status === 'auth-required') {
        sessionStorage.removeItem(TOKEN_KEY)
        socket.auth = {}
      }
    })
    socket.connect()
  }
  const presence = {
    state,
    login(userId, password) {
      sessionStorage.removeItem(TOKEN_KEY)
      connect({ userId, password })
    },
    logout() {
      disconnect()
      sessionStorage.removeItem(TOKEN_KEY)
      state.status = 'idle'
    },
    retry() {
      if (socket && state.status !== 'auth-required') {
        state.status = 'connecting'
        socket.connect()
      }
    }
  }
  inject('presence', presence)
  if (app.$auth.user) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY))
      if (saved?.userId === app.$auth.user.id && saved.token) connect({ token: saved.token })
      else state.status = $config.presenceUrl ? 'auth-required' : 'unavailable'
    } catch (_) { state.status = 'auth-required' }
  }
  if (module.hot) module.hot.dispose(disconnect)
}
