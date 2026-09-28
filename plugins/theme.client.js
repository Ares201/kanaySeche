import Vue from 'vue'

const STORAGE_KEY = 'kanay_theme'

export default ({ app }) => {
  const theme = app.vuetify.framework.theme
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') theme.dark = saved === 'dark'
  } catch (_) { /* El tema funciona también cuando el almacenamiento está bloqueado. */ }

  const observer = new Vue({ computed: { dark: () => theme.dark } })
  const stop = observer.$watch('dark', dark => {
    const value = dark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch (_) {}
    window.dispatchEvent(new Event('kanay-theme-change'))
  }, { immediate: true })
  const sync = event => {
    if (event.key === STORAGE_KEY && ['dark', 'light'].includes(event.newValue)) {
      theme.dark = event.newValue === 'dark'
    }
  }
  window.addEventListener('storage', sync)
  if (module.hot) module.hot.dispose(() => {
    stop()
    observer.$destroy()
    window.removeEventListener('storage', sync)
  })
}
