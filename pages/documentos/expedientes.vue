<template>
  <div class="contenedor">
    <h2>Procesador de Expedientes Escaneados</h2>

    <div class="card">
      <input 
        type="file" 
        ref="fileInput"
        accept=".pdf, .zip" 
        @change="seleccionarArchivo" 
      />

      <button 
        :disabled="!archivoSeleccionado || cargando" 
        @click="procesarExpedientes"
      >
        {{ cargando ? 'Procesando (OCR)...' : 'Procesar y Descargar ZIP' }}
      </button>

      <p v-if="mensajeError" class="error">{{ mensajeError }}</p>
      <p v-if="mensajeExito" class="exito">{{ mensajeExito }}</p>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/firestore'

export default {
  name: 'ProcesadorExpedientesPage',
  data() {
    return {
      archivoSeleccionado: null,
      cargando: false,
      mensajeError: '',
      mensajeExito: ''
    }
  },
  methods: {
    async registrarExpedientesProcesados() {
      try {
        await this.$db.collection('procesarExpedientes').add({
          contador: 1,
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        })
      } catch (error) {
        // La estadística no debe impedir que el usuario reciba su archivo.
        console.error('Error al registrar el procesamiento de expedientes:', error)
      }
    },
    seleccionarArchivo(event) {
      const files = event.target.files
      if (files.length > 0) {
        this.archivoSeleccionado = files[0]
        this.mensajeError = ''
        this.mensajeExito = ''
      }
    },
    async procesarExpedientes() {
      if (!this.archivoSeleccionado) return

      this.cargando = true
      this.mensajeError = ''
      this.mensajeExito = ''

      const formData = new FormData()
      formData.append('file', this.archivoSeleccionado)

      try {
        const urlAPI = 'https://api-query-control-pesaje.vercel.app/api/procesar-expedientes'

        const response = await fetch(urlAPI, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `Error en el servidor (${response.status})`)
        }

        // Obtener el blob del ZIP devuelto
        const blob = await response.blob()

        // Crear enlace temporal para forzar la descarga en el navegador
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = 'expedientes_renombrados.zip'
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(downloadUrl)

        await this.registrarExpedientesProcesados()

        this.mensajeExito = '¡Expediente(s) procesado(s) y descargado(s) con éxito!'
        
        // Limpiar input
        this.archivoSeleccionado = null
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''

      } catch (error) {
        this.mensajeError = error.message || 'Ocurrió un error al procesar el archivo.'
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
.contenedor {
  max-width: 500px;
  margin: 40px auto;
  font-family: sans-serif;
}
.card {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
button {
  padding: 10px 15px;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error {
  color: #d32f2f;
  font-size: 14px;
}
.exito {
  color: #2e7d32;
  font-size: 14px;
}
</style>