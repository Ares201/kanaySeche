export default {
  target: 'static', // Aprovecha para corregir la advertencia inicial del log
  generate: {
    exclude: [
      /^\/planificacion\/components\/.*/, // Excluye todo lo que esté dentro de una carpeta components en planificacion
      /^\/planificacion\/Calendar.*/,
      /^\/planificacion\/AgendamientoModal/
    ]
  },
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'kanaySeche',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '~/assets/css/global.css'
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    { src: '~/plugins/firebase.client.js', mode: 'client' },
    { src: '~/plugins/auth.client.js', mode: 'client' }
  ],

  router: {
    middleware: ['auth']
  },

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/vuetify'
  ],

  vuetify: {
    treeShake: true
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/axios'
  ],

  axios: {
    baseURL: process.env.API_URL || 'https://renombrador-pv-api.onrender.com',
    timeout: 60000
  },

  // Middleware del servidor (APIs internas de Nuxt)
  serverMiddleware: [
    { path: '/api/pdf/sign', handler: '~/server/api/pdf/sign.js' },
    { path: '/api/bigquery/movimientos', handler: '~/services/bigQuery/movimientos.js' }
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    transpile: [
      'chart.js',
      'vue-chartjs'
    ]
  }
}