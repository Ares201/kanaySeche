import firebase from 'firebase/app'
import 'firebase/firestore'
import 'firebase/storage'
import crudConfig from '~/api/firebase-crud.json'
import { createFirebaseApi } from '~/utils/firebase-api'
import { SYSTEM_PAGES } from '~/utils/access-control'
// import 'firebase/auth' (si luego usas login)


const firebaseConfig = {
  apiKey: "AIzaSyDUboJJeLrNQXESLgUX5bPGY6WHufyZC_c",
  authDomain: "kanaybd.firebaseapp.com",
  projectId: "kanaybd",
  storageBucket: "kanaybd.firebasestorage.app",
  messagingSenderId: "1070871253845",
  appId: "1:1070871253845:web:f621cc84162a645c1d55dc"
}

// Inicializar
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

// Firestore
const db = firebase.firestore()
const storage = firebase.storage()

let appContext = null

const firebaseApi = createFirebaseApi({
  db,
  config: crudConfig.apis,
  timestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
  getContext: () => {
    const ruta = appContext?.router?.currentRoute?.path || '/'
    const page = SYSTEM_PAGES.find(item => item.ruta === ruta)
    const isPublicConfirmation = ruta.startsWith('/confirmacion/')
    const user = isPublicConfirmation ? null : appContext?.$auth?.user
    return {
      usuarioId: user?.id || '',
      usuario: isPublicConfirmation ? 'Confirmaci\u00f3n externa' : user?.nombres || user?.correo || 'Sin sesi\u00f3n',
      ruta: isPublicConfirmation ? '/confirmacion' : ruta,
      pagina: isPublicConfirmation ? 'Confirmaci\u00f3n de carta' : page?.nombre || (ruta === '/login' ? 'Acceso al sistema' : ruta),
      modulo: isPublicConfirmation ? 'Documentos' : page?.modulo || 'General'
    }
  },
  canReadHistory: () => Boolean(appContext?.$auth?.can('/configuracion/historial'))
})

export { db, storage, firebaseApi }

export default ({ app }, inject) => {
  appContext = app
  inject('db', db)
  inject('storage', storage)
  inject('firebaseApi', firebaseApi)
}
