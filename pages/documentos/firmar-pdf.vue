<template>
  <section class="firmar-pdf-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Documentos</p>
        <h1>Firmar PDF</h1>
      </div>

      <v-btn
        color="#0f766e"
        dark
        depressed
        :disabled="!canSign"
        :loading="isSigning"
        @click="signAllPdfs"
      >
        <v-icon left>
          mdi-draw-pen
        </v-icon>
        Firmar PDFs
      </v-btn>
    </div>

    <v-row dense>
      <v-col cols="12" lg="5">
        <PdfDropzone @files-selected="addPdfFiles" />

        <v-card class="mt-4 signature-card" outlined>
          <v-card-title>
            <v-icon left color="#0f766e">
              mdi-signature-freehand
            </v-icon>
            Firma PNG
          </v-card-title>
          <v-card-text>
            <v-file-input
              v-model="signatureFile"
              accept="image/png,.png"
              dense
              outlined
              prepend-icon=""
              prepend-inner-icon="mdi-image-plus"
              label="Cargar o reemplazar firma PNG"
              @change="saveSignature"
            />

            <div v-if="signaturePreviewUrl" class="signature-preview">
              <span>Vista previa</span>
              <img :src="signaturePreviewUrl" alt="Firma PNG seleccionada">
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="7">
        <v-card outlined>
          <v-card-title class="list-title">
            <span>PDFs cargados</span>
            <v-chip small color="#e0f2fe" text-color="#075985">
              {{ pdfItems.length }} archivos
            </v-chip>
          </v-card-title>

          <v-divider />

          <v-list v-if="pdfItems.length" two-line class="pdf-list">
            <v-list-item
              v-for="item in pdfItems"
              :key="item.id"
              class="pdf-list-item"
              @click="selectedPdfId = item.id"
            >
              <v-list-item-avatar tile class="pdf-avatar">
                <v-icon color="#dc2626">
                  mdi-file-pdf-box
                </v-icon>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title>{{ item.file.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatFileSize(item.file.size) }}
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action class="item-actions">
                <v-chip small :color="getStatusColor(item.status)" :text-color="getStatusTextColor(item.status)">
                  {{ item.status }}
                </v-chip>

                <v-btn
                  v-if="item.signedUrl"
                  small
                  color="#0f766e"
                  dark
                  depressed
                  :href="item.signedUrl"
                  :download="item.signedName"
                  target="_blank"
                  @click.stop
                >
                  <v-icon left small>
                    mdi-download
                  </v-icon>
                  Descargar
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>

          <div v-else class="empty-state">
            <v-icon size="42" color="#94a3b8">
              mdi-file-document-outline
            </v-icon>
            <p>No hay PDFs cargados.</p>
          </div>
        </v-card>

        <v-card v-if="selectedPdf" class="mt-4 preview-card" outlined>
          <v-card-title class="preview-title">
            <span>{{ selectedPdf.file.name }}</span>
            <v-btn icon small title="Quitar PDF" @click="removePdf(selectedPdf.id)">
              <v-icon small>
                mdi-close
              </v-icon>
            </v-btn>
          </v-card-title>
          <iframe :src="selectedPdf.previewUrl" title="Vista previa de PDF" />
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4200">
      {{ snackbar.message }}
    </v-snackbar>
  </section>
</template>

<script>
import PdfDropzone from '~/components/documentos/PdfDropzone.vue'
import {
  createPdfObjectUrl,
  getStoredSignatureBase64,
  setStoredSignatureBase64,
  signPdf,
  fileToBase64
} from '~/services/pdf.service'

export default {
  name: 'FirmarPdfPage',
  components: {
    PdfDropzone
  },
  data() {
    return {
      pdfItems: [],
      selectedPdfId: '',
      signatureFile: null,
      signaturePreviewUrl: '',
      isSigning: false,
      snackbar: {
        show: false,
        color: '#0f766e',
        message: ''
      }
    }
  },
  computed: {
    selectedPdf() {
      return this.pdfItems.find(item => item.id === this.selectedPdfId) || this.pdfItems[0]
    },
    canSign() {
      return this.pdfItems.length > 0 && Boolean(this.signatureFile || getStoredSignatureBase64()) && !this.isSigning
    }
  },
  mounted() {
  },
  beforeDestroy() {
    this.pdfItems.forEach(item => URL.revokeObjectURL(item.previewUrl))
    this.revokeSignaturePreview()
  },
  methods: {
    addPdfFiles(files) {
      const newItems = files.map(file => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl: createPdfObjectUrl(file),
        status: 'Pendiente',
        originalUrl: '',
        signedUrl: '',
        signedName: '',
        error: ''
      }))

      this.pdfItems = [...newItems, ...this.pdfItems]

      if (!this.selectedPdfId && newItems.length) {
        this.selectedPdfId = newItems[0].id
      }
    },
    async saveSignature(file) {
      if (!file) return

      if (file.type && file.type !== 'image/png') {
        this.signatureFile = null
        this.showMessage('Selecciona una firma en formato PNG.', '#dc2626')
        return
      }

      try {
        this.revokeSignaturePreview()
        this.signaturePreviewUrl = URL.createObjectURL(file)
        setStoredSignatureBase64(await fileToBase64(file))
        this.showMessage('Firma PNG lista para usar.', '#0f766e')
      } catch (error) {
        this.showMessage('No se pudo leer la firma PNG.', '#dc2626')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async signAllPdfs() {
      if (!this.canSign) return

      this.isSigning = true

      try {
        const signatureBase64 = await this.getSignatureBase64()

        for (const item of this.pdfItems) {
          if (item.status === 'Firmado') continue
          await this.signSinglePdf(item, signatureBase64)
        }

        this.showMessage('PDFs firmados correctamente.', '#0f766e')
      } catch (error) {
        this.showMessage(error.message || 'No se pudieron firmar los PDFs.', '#dc2626')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.isSigning = false
      }
    },
    async signSinglePdf(item, signatureBase64) {
      this.updatePdfItem(item.id, { status: 'Pendiente', error: '' })

      try {
        const signedBlob = await signPdf({
          pdfFile: item.file,
          signatureBase64
        })
        const signedPreviewUrl = URL.createObjectURL(signedBlob)
        const signedName = item.file.name.replace(/\.pdf$/i, '-firmado.pdf')
        URL.revokeObjectURL(item.previewUrl)

        this.updatePdfItem(item.id, {
          status: 'Firmado',
          signedUrl: signedPreviewUrl,
          signedName,
          previewUrl: signedPreviewUrl
        })
      } catch (error) {
        this.updatePdfItem(item.id, {
          status: 'Error',
          error: error.message || 'Error al firmar'
        })
      }
    },
    async getSignatureBase64() {
      if (this.signatureFile) {
        return fileToBase64(this.signatureFile)
      }

      const storedSignature = getStoredSignatureBase64()
      if (storedSignature) return storedSignature

      throw new Error('Selecciona una firma PNG antes de firmar.')
    },
    updatePdfItem(id, payload) {
      this.pdfItems = this.pdfItems.map(item => {
        return item.id === id ? { ...item, ...payload } : item
      })
    },
    removePdf(id) {
      const item = this.pdfItems.find(currentItem => currentItem.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)

      this.pdfItems = this.pdfItems.filter(currentItem => currentItem.id !== id)
      this.selectedPdfId = this.pdfItems[0] ? this.pdfItems[0].id : ''
    },
    getStatusColor(status) {
      const colors = {
        Pendiente: '#f1f5f9',
        Firmado: '#dcfce7',
        Error: '#fee2e2'
      }

      return colors[status] || colors.Pendiente
    },
    getStatusTextColor(status) {
      const colors = {
        Pendiente: '#475569',
        Firmado: '#166534',
        Error: '#991b1b'
      }

      return colors[status] || colors.Pendiente
    },
    formatFileSize(size) {
      if (!size) return '0 KB'

      const units = ['B', 'KB', 'MB', 'GB']
      const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
      const value = size / Math.pow(1024, exponent)

      return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`
    },
    showMessage(message, color) {
      this.snackbar = {
        show: true,
        color,
        message
      }
    },
    revokeSignaturePreview() {
      if (this.signaturePreviewUrl && this.signaturePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.signaturePreviewUrl)
      }
    }
  }
}
</script>

<style scoped>
.firmar-pdf-page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.page-header,
.list-title,
.preview-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.signature-card {
  border-radius: 8px;
}

.signature-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.signature-preview img {
  width: 180px;
  max-width: 100%;
  height: 90px;
  object-fit: contain;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  background: #ffffff;
}

.pdf-list {
  padding: 0;
}

.pdf-list-item {
  border-bottom: 1px solid #edf2f7;
  cursor: pointer;
}

.pdf-avatar {
  background: #fee2e2;
}

.item-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 190px;
  color: #64748b;
}

.empty-state p {
  margin: 10px 0 0;
}

.preview-card {
  overflow: hidden;
  border-radius: 8px;
}

.preview-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-card iframe {
  width: 100%;
  height: 620px;
  border: 0;
  background: #f8fafc;
}

@media (max-width: 640px) {
  .page-header,
  .item-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header .v-btn,
  .item-actions .v-btn {
    width: 100%;
  }

  .preview-card iframe {
    height: 460px;
  }
}
</style>
