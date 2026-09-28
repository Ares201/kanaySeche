<template>
  <div class="contenedor">
    <h2>Procesador de Certificados PDF</h2>
    <div class="card">
      <input ref="fileInput" type="file" accept=".pdf" multiple :disabled="cargando" aria-label="Seleccionar certificados PDF" @change="seleccionarArchivos" />
      <p class="info">
        Límite preventivo del lote: {{ formatoTamano(limiteBytes) }}. Vercel limita la solicitud completa y la respuesta a 4,5 MB;
        este límite no garantiza que el ZIP resultante quepa.
      </p>
      <p v-if="archivosSeleccionados.length" class="info">
        {{ archivosSeleccionados.length }} archivo(s) seleccionado(s) · {{ formatoTamano(totalBytes) }}
      </p>
      <ul v-if="archivosSeleccionados.length" class="archivos">
        <li v-for="(archivo, index) in archivosSeleccionados" :key="index">
          <span>{{ archivo.name }} ({{ formatoTamano(archivo.size) }})</span>
          <button type="button" :disabled="cargando" :aria-label="`Quitar ${archivo.name}`" @click="quitarArchivo(index)">Quitar</button>
        </li>
      </ul>
      <p v-if="errorValidacion" class="error" role="alert">{{ errorValidacion }}</p>
      <button type="button" :disabled="!archivosSeleccionados.length || !!errorValidacion || cargando" @click="procesarCertificados">
        {{ cargando ? 'Procesando...' : 'Procesar y Descargar ZIP' }}
      </button>
      <p class="info">Un PDF inválido rechaza todo el lote. La API no hace OCR: revisa los archivos llamados otro_cert_N.pdf, que pueden carecer de texto o campos completos. El ZIP incluye manifest.json con los datos extraídos.</p>
      <p class="info">La espera se cancela después de 60 segundos; esto no cancela necesariamente el procesamiento en el servidor.</p>
      <p v-if="mensajeError" class="error" role="alert">{{ mensajeError }}</p>
      <p v-if="mensajeExito" class="exito" role="status">{{ mensajeExito }}</p>
      <p v-if="mensajeAviso" class="aviso" role="status">{{ mensajeAviso }}</p>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/firestore'
import { maxTotalBytes, validarArchivos, solicitarCertificados, descargarZip } from '~/utils/certificados'

export default {
  name: 'ProcesadorCertificadosPage',
  data() {
    return { archivosSeleccionados: [], cargando: false, mensajeError: '', mensajeExito: '', mensajeAviso: '' }
  },
  computed: {
    limiteBytes() { return maxTotalBytes(this.$config.certificadosMaxTotalBytes) },
    totalBytes() { return this.archivosSeleccionados.reduce((total, file) => total + file.size, 0) },
    errorValidacion() { return this.archivosSeleccionados.length ? validarArchivos(this.archivosSeleccionados, this.limiteBytes) : '' }
  },
  methods: {
    formatoTamano(bytes) { return `${(bytes / 1000000).toFixed(2)} MB` },
    limpiarMensajes() {
      this.mensajeError = ''
      this.mensajeExito = ''
      this.mensajeAviso = ''
    },
    seleccionarArchivos(event) {
      if (this.cargando) return
      this.archivosSeleccionados = Array.from(event.target.files || [])
      this.limpiarMensajes()
    },
    quitarArchivo(index) {
      if (this.cargando) return
      this.archivosSeleccionados.splice(index, 1)
      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
      this.limpiarMensajes()
    },
    async registrarCertificadosProcesados(cantidad) {
      try {
        await this.$firebaseApi.create('procesarCertificados', {
          contador: cantidad,
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        }, { accion: 'Procesar certificados' })
      } catch (_) {
        this.mensajeAviso = 'El ZIP se descargó, pero no se pudo registrar la estadística. No vuelvas a procesar el lote para registrarla.'
      }
    },
    async procesarCertificados() {
      if (!process.client || this.cargando) return
      this.limpiarMensajes()
      const error = validarArchivos(this.archivosSeleccionados, this.limiteBytes)
      if (error) { this.mensajeError = error; return }
      this.cargando = true
      try {
        const { blob, cantidad } = await solicitarCertificados(this.archivosSeleccionados, this.$config.certificadosApiBaseURL)
        descargarZip(blob)
        this.mensajeExito = 'ZIP de certificados descargado. Revisa manifest.json y los archivos otro_cert_N.pdf si aparecen.'
        this.archivosSeleccionados = []
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''
        if (cantidad === null) {
          this.mensajeAviso = 'El ZIP se descargó, pero X-Archivos-Procesados falta o no es válido. No se registró la estadística; revisa también que CORS exponga ese header.'
        } else {
          await this.registrarCertificadosProcesados(cantidad)
        }
      } catch (error) {
        this.mensajeError = error.message || 'Ocurrió un error al procesar los archivos.'
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
.contenedor { max-width: 700px; margin: 40px auto; padding: 0 16px; }
.card { padding: 20px; border: 1px solid var(--ui-border-e0e0e0, #e0e0e0); border-radius: 8px; display: flex; flex-direction: column; gap: 15px; }
.archivos { padding-left: 20px; }
.archivos li { margin-bottom: 8px; overflow-wrap: anywhere; }
.archivos button { margin-left: 8px; }
button { padding: 10px 15px; background-color: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
button:disabled { background-color: var(--ui-surface-cccccc, #ccc); cursor: not-allowed; }
.info { font-size: 14px; }
.error { color: var(--ui-text-d32f2f, #d32f2f); font-size: 14px; }
.exito { color: var(--ui-text-2e7d32, #2e7d32); font-size: 14px; }
.aviso { color: var(--color-text); font-size: 14px; }
</style>
