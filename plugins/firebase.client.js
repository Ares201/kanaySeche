import firebase from 'firebase/app'
import 'firebase/firestore'
import 'firebase/storage'
import crudConfig from '~/api/firebase-crud.json'
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

function getApiConfig(apiName) {
  const apiConfig = crudConfig.apis[apiName]

  if (!apiConfig) {
    throw new Error(`No existe configuracion Firebase para "${apiName}"`)
  }

  return apiConfig
}

function serializeDoc(doc) {
  return {
    id: doc.id,
    ...doc.data()
  }
}

function createFirebaseApi(db) {
  return {
    config: crudConfig.apis,

    async list(apiName) {
      const apiConfig = getApiConfig(apiName)
      let query = db.collection(apiConfig.collection)

      if (apiConfig.orderBy) {
        query = query.orderBy(
          apiConfig.orderBy,
          apiConfig.orderDirection || 'asc'
        )
      }

      const snapshot = await query.get()

      return snapshot.docs.map(serializeDoc)
    },

    async create(apiName, payload) {
      const apiConfig = getApiConfig(apiName)
      const now = firebase.firestore.FieldValue.serverTimestamp()
      const docRef = await db.collection(apiConfig.collection).add({
        ...payload,
        fechaCreacion: payload.fechaCreacion || now,
        fechaActualizacion: now
      })
      const doc = await docRef.get()

      return serializeDoc(doc)
    },

    async update(apiName, id, payload) {
      const apiConfig = getApiConfig(apiName)
      const docRef = db.collection(apiConfig.collection).doc(id)

      await docRef.update({
        ...payload,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
      })

      const doc = await docRef.get()

      return serializeDoc(doc)
    },

    async remove(apiName, id) {
      const apiConfig = getApiConfig(apiName)

      await db.collection(apiConfig.collection).doc(id).delete()

      return id
    }
  }
}

const firebaseApi = createFirebaseApi(db)

export { db, storage, firebaseApi }

export default (_context, inject) => {
  inject('db', db)
  inject('storage', storage)
  inject('firebaseApi', firebaseApi)
}
