<template>
  <div class="contenedor">
    <h2>Procesador de Expedientes Escaneados</h2>

    <div class="card">
      <input type="file" ref="fileInput" accept=".pdf, image/*" multiple @change="seleccionarArchivos" />

      <button :disabled="!archivosSeleccionados.length || cargando" @click="procesarExpedientes">
        {{ cargando ? 'Procesando con Gemini IA...' : 'Procesar y Descargar ZIP' }}
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
      archivosSeleccionados: [],
      cargando: false,
      mensajeError: '',
      mensajeExito: ''
    }
  },
  methods: {
    async registrarExpedientesProcesados(cantidad) {
      try {
        await this.$firebaseApi.create('procesarExpedientes', {
          contador: cantidad,
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        }, { accion: 'Procesar expedientes' })
      } catch (error) {
        // La estadística no debe impedir que el usuario reciba su archivo.
        console.error('Error al registrar el procesamiento de expedientes:', error)
      }
    },
    seleccionarArchivos(event) {
      const files = event.target.files
      if (files && files.length > 0) {
        this.archivosSeleccionados = Array.from(files)
        this.mensajeError = ''
        this.mensajeExito = ''
      } else {
        this.archivosSeleccionados = []
      }
    },
    async procesarExpedientes() {
      if (!this.archivosSeleccionados.length) return

      this.cargando = true
      this.mensajeError = ''
      this.mensajeExito = ''

      try {
        const urlAPI = 'https://api-query-control-pesaje.vercel.app/api/procesar-expedientes'

        // JSZip para unir los ZIPs parciales si el lote es muy grande
        // O procesar los archivos en bloques pequeños de a 5
        const TAMANO_LOTE = 5
        const totalArchivos = this.archivosSeleccionados.length

        for (let i = 0; i < totalArchivos; i += TAMANO_LOTE) {
          const lote = this.archivosSeleccionados.slice(i, i + TAMANO_LOTE)
          const formData = new FormData()

          lote.forEach(archivo => {
            formData.append('files', archivo)
          })

          // Actualizar mensaje visual de avance
          this.mensajeExito = `Procesando lote ${Math.floor(i / TAMANO_LOTE) + 1} de ${Math.ceil(totalArchivos / TAMANO_LOTE)}...`

          const response = await fetch(urlAPI, {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || `Error en el servidor (${response.status})`)
          }

          // Descargar el ZIP correspondiente a este lote
          const blob = await response.blob()
          const downloadUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = `expedientes_renombrados_lote_${Math.floor(i / TAMANO_LOTE) + 1}.zip`
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(downloadUrl)
        }

        await this.registrarExpedientesProcesados(totalArchivos)
        this.mensajeExito = `¡${totalArchivos} expediente(s) procesado(s) correctamente!`

        // Limpiar input
        this.archivosSeleccionados = []
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''

      } catch (error) {
        if (error.message.includes('413')) {
          this.mensajeError = 'El lote de archivos supera el peso permitido por Vercel. Intenta seleccionando menos archivos a la vez.'
        } else {
          this.mensajeError = error.message || 'Ocurrió un error al procesar los archivos.'
        }
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
  border: 1px solid var(--ui-border-e0e0e0, #e0e0e0);
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
  background-color: var(--ui-surface-cccccc, #ccc);
  cursor: not-allowed;
}

.error {
  color: var(--ui-text-d32f2f, #d32f2f);
  font-size: 14px;
}

.exito {
  color: var(--ui-text-2e7d32, #2e7d32);
  font-size: 14px;
}
</style>