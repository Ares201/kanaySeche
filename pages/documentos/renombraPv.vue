<template>
  <section class="renombrar-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Herramientas</p>
        <h1>Renombrar PDFs</h1>
        <p class="subtitle">
          Sube tus PDFs de órdenes PV y obtén los archivos renombrados con fecha y número de orden.
        </p>
      </div>
    </div>

    <div class="content">
      <div class="upload-area" :class="{ 'upload-area--dragging': isDragging }" @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
        <v-icon size="48" color="#0f766e">mdi-cloud-upload</v-icon>
        <h3>Arrastra tus PDFs aquí</h3>
        <p>o</p>
        <v-btn color="#0f766e" dark @click="$refs.fileInput.click()">
          Seleccionar archivos
        </v-btn>
        <input ref="fileInput" type="file" multiple accept=".pdf" style="display:none" @change="handleFileSelect">
        <p v-if="files.length" class="file-count">
          {{ files.length }} archivo(s) seleccionado(s)
        </p>
      </div>

      <div v-if="files.length" class="file-list">
        <v-list>
          <v-list-item v-for="(file, index) in files" :key="index">
            <v-list-item-icon>
              <v-icon>mdi-file-pdf</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ file.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ (file.size / 1024).toFixed(1) }} KB</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-btn icon small @click="removeFile(index)">
                <v-icon color="red">mdi-close</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </div>

      <div class="actions">
        <v-btn color="grey" dark outlined :disabled="!files.length || processing" @click="clearFiles">
          Limpiar
        </v-btn>
        <v-btn color="#0f766e" dark :loading="processing" :disabled="!files.length || processing" @click="renombrar">
          <v-icon left>mdi-content-save</v-icon>
          Renombrar
        </v-btn>
      </div>

      <!-- Barra de progreso -->
      <v-progress-linear v-if="processing" indeterminate color="#0f766e" class="mt-4" />

      <!-- Mensajes de estado -->
      <v-alert v-if="mensaje" :type="tipoMensaje" class="mt-4" dismissible @input="mensaje = ''">
        {{ mensaje }}
      </v-alert>

      <!-- Resultado: descargar ZIP -->
      <v-btn v-if="downloadUrl" color="success" dark class="mt-4" :href="downloadUrl" download="renombrados.zip"
        @click="descargar">
        <v-icon left>mdi-download</v-icon>
        Descargar ZIP con PDFs renombrados
      </v-btn>
    </div>
  </section>
</template>

<script>
export default {
  name: 'RenombrarPvPage',
  data() {
    return {
      files: [],
      processing: false,
      isDragging: false,
      downloadUrl: null,
      mensaje: '',
      tipoMensaje: 'success'
    }
  },
  methods: {
    handleFileSelect(event) {
      const selected = Array.from(event.target.files)
      this.files = [...this.files, ...selected]
      this.limpiarInput()
    },
    handleDrop(event) {
      this.isDragging = false
      const dropped = Array.from(event.dataTransfer.files).filter(f => f.type === 'application/pdf')
      this.files = [...this.files, ...dropped]
    },
    limpiarInput() {
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },
    removeFile(index) {
      this.files.splice(index, 1)
      this.downloadUrl = null
      this.mensaje = ''
    },
    clearFiles() {
      this.files = []
      this.downloadUrl = null
      this.mensaje = ''
      this.limpiarInput()
    },
    async renombrar() {
      if (!this.files.length) {
        this.mensaje = 'Selecciona al menos un archivo PDF.'
        this.tipoMensaje = 'warning'
        return
      }

      // Validar que todos sean PDF
      const invalid = this.files.some(f => f.type !== 'application/pdf')
      if (invalid) {
        this.mensaje = 'Todos los archivos deben ser PDF.'
        this.tipoMensaje = 'error'
        return
      }

      this.processing = true
      this.mensaje = ''
      this.downloadUrl = null

      const formData = new FormData()
      this.files.forEach(file => {
        formData.append('files', file)
      })

      // Servidor Rendel
      // try {
      //   const response = await this.$axios.post(
      //     'https://renombrador-pv-api.onrender.com/renombrar',
      //     formData,
      //     {
      //       responseType: 'blob'
      //     }
      //   )

      // Servidor Ares
      try {
        const response = await this.$axios.post(
          'http://localhost:8000/renombrar',
          formData,
          {
            responseType: 'blob'
          }
        )

        // Leer estadísticas desde los headers
        const renombrados = response.headers['x-renombrados'] || '?'
        const omitidos = response.headers['x-omitidos'] || '?'

        // Crear URL para descargar el ZIP
        const blob = new Blob([response.data], { type: 'application/zip' })
        this.downloadUrl = window.URL.createObjectURL(blob)

        this.mensaje = `Procesamiento completado. Renombrados: ${renombrados}, Omitidos/Sin datos: ${omitidos}.`
        this.tipoMensaje = 'success'

      } catch (error) {
        console.error('Error al renombrar:', error)
        this.mensaje = 'Error al procesar los archivos. Intenta nuevamente.'
        this.tipoMensaje = 'error'
      } finally {
        this.processing = false
      }
    },
    descargar() {
      // Limpiar la URL después de descargar para liberar memoria (opcional)
      // setTimeout(() => { this.downloadUrl = null }, 5000)
    }
  },
  beforeDestroy() {
    // Liberar memoria al cerrar la página
    if (this.downloadUrl) {
      window.URL.revokeObjectURL(this.downloadUrl)
    }
  }
}
</script>

<style scoped>
.renombrar-page {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 32px;
}

.subtitle {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 16px;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  padding: 24px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}

.upload-area--dragging {
  border-color: #0f766e;
  background: #f0fdfa;
}

.upload-area h3 {
  margin: 0;
  color: #1e293b;
}

.upload-area p {
  margin: 0;
  color: #64748b;
}

.file-count {
  margin-top: 8px !important;
  font-weight: 700;
  color: #0f766e !important;
}

.file-list {
  margin-top: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>