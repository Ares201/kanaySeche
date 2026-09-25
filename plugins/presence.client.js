import Vue from 'vue'
import firebase from 'firebase/app'
import { createPresence } from '~/utils/presence'

export default ({ app, $db }, inject) => {
  const presence = createPresence({
    db: $db,
    state: Vue.observable({ status: 'idle', users: [] }),
    timestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
    cutoff: milliseconds => firebase.firestore.Timestamp.fromMillis(milliseconds)
  })
  inject('presence', presence)
  sessionStorage.removeItem('kanay_presence_token')
  const resume = () => { if (app.$auth.user) presence.login(app.$auth.user) }
  const offline = () => presence.suspend()
  const visible = () => { if (document.visibilityState === 'visible') presence.refresh() }
  window.addEventListener('online', resume)
  window.addEventListener('offline', offline)
  window.addEventListener('pagehide', offline)
  window.addEventListener('pageshow', resume)
  document.addEventListener('visibilitychange', visible)
  resume()
  if (module.hot) module.hot.dispose(() => {
    presence.logout()
    window.removeEventListener('online', resume)
    window.removeEventListener('offline', offline)
    window.removeEventListener('pagehide', offline)
    window.removeEventListener('pageshow', resume)
    document.removeEventListener('visibilitychange', visible)
  })
}
