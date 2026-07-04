<template>
  <section class="pdf-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Documentos</p>
        <h1>Visualizador PDF</h1>
      </div>
    </div>

    <v-row dense>
      <!-- IZQUIERDA -->
      <v-col cols="12" lg="5">
        <PdfDropzone @files-selected="addPdfFiles" />

        <v-card class="mt-4" outlined>
          <v-card-title>PDFs cargados</v-card-title>
          <v-divider />

          <v-list v-if="pdfItems.length" dense>
            <v-list-item v-for="item in pdfItems" :key="item.id" @click="selectPdf(item.id)">
              <v-list-item-avatar tile>
                <v-icon color="red">mdi-file-pdf-box</v-icon>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title>
                  {{ item.file.name }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  {{ formatFileSize(item.file.size) }}
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-action>
                <v-btn icon @click.stop="removePdf(item.id)">
                  <v-icon>mdi-delete</v-icon>
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
      </v-col>

      <!-- DERECHA -->
      <v-col cols="12" lg="7">

        <v-card v-if="selectedPdf" outlined class="preview-card">
          <v-card-title class="d-flex justify-space-between">
            <span>{{ selectedPdf.file.name }}</span>

            <v-btn small color="primary" :loading="loadingConvert" @click="convertToWord(selectedPdf)">
              Convertir a Word
            </v-btn>
          </v-card-title>

          <iframe :src="selectedPdf.previewUrl" class="pdf-frame" />
        </v-card>

        <v-card v-else outlined class="empty-preview">
          <v-card-text class="text-center py-12">
            <v-icon size="70" color="grey">
              mdi-file-pdf-box
            </v-icon>

            <h3 class="mt-4">
              Arrastra un PDF para visualizarlo
            </h3>
          </v-card-text>
        </v-card>

      </v-col>
    </v-row>
  </section>
</template>

<script>
import PdfDropzone from '~/components/documentos/PdfDropzone.vue'
import { createPdfObjectUrl } from '~/services/pdf.service'

export default {
  name: 'VisualizadorPdf',

  components: { PdfDropzone },

  data() {
    return {
      pdfItems: [],
      selectedPdfId: '',
      loadingConvert: false
    }
  },

  computed: {
    selectedPdf() {
      return (
        this.pdfItems.find(i => i.id === this.selectedPdfId) ||
        this.pdfItems[0] ||
        null
      )
    }
  },

  methods: {

    addPdfFiles(files) {
      const nuevos = files.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: createPdfObjectUrl(file)
      }))

      this.pdfItems = [...nuevos, ...this.pdfItems]

      if (!this.selectedPdfId && nuevos.length) {
        this.selectedPdfId = nuevos[0].id
      }
    },

    selectPdf(id) {
      this.selectedPdfId = id
    },

    removePdf(id) {
      const pdf = this.pdfItems.find(i => i.id === id)

      if (pdf) {
        URL.revokeObjectURL(pdf.previewUrl)
      }

      this.pdfItems = this.pdfItems.filter(i => i.id !== id)

      if (this.selectedPdfId === id) {
        this.selectedPdfId = this.pdfItems[0]?.id || ''
      }
    },

    formatFileSize(size) {
      if (!size) return '0 KB'

      const units = ['B', 'KB', 'MB', 'GB']
      const exp = Math.min(
        Math.floor(Math.log(size) / Math.log(1024)),
        units.length - 1
      )

      const value = size / Math.pow(1024, exp)
      return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exp]}`
    },

    // 🔥 PDF → WORD + DESCARGA
    async convertToWord(pdf) {
      this.loadingConvert = true

      try {
        const formData = new FormData()
        formData.append('file', pdf.file)

        const res = await this.$axios.$post(
          '/api/pdf-to-docx',
          formData,
          {
            responseType: 'blob'
          }
        )

        const url = window.URL.createObjectURL(new Blob([res]))

        const link = document.createElement('a')
        link.href = url
        link.setAttribute(
          'download',
          pdf.file.name.replace('.pdf', '.docx')
        )

        document.body.appendChild(link)
        link.click()
        link.remove()

        window.URL.revokeObjectURL(url)

      } catch (err) {
        console.error('Error convirtiendo PDF a DOCX:', err)
      } finally {
        this.loadingConvert = false
      }
    }
  },

  beforeDestroy() {
    this.pdfItems.forEach(p => {
      URL.revokeObjectURL(p.previewUrl)
    })
  }
}
</script>

<style scoped>
.pdf-page {
  width: min(1180px, calc(100% - 32px));
  margin: auto;
  padding: 30px 0;
}

.preview-card {
  overflow: hidden;
}

.pdf-frame {
  width: 100%;
  height: 700px;
  border: none;
}

.empty-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #64748b;
}
</style>