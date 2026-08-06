<template>
  <v-container fluid class="firmar-pdf-page">
    <v-card class="toolbar-card sticky-toolbar mb-4" elevation="2">
      <v-card-title class="toolbar-title">
        <v-icon left>mdi-file-sign</v-icon>
        Firmar PDF
      </v-card-title>
      <v-card-text>
        <v-row align="center" dense>
          <!-- PDF -->
          <v-col cols="12" md="3">
            <v-file-input v-model="pdfFileInput" accept="application/pdf" label="Seleccionar PDF"
              prepend-icon="mdi-file-pdf-box" outlined dense hide-details @change="handlePdfUpload" />
          </v-col>

          <!-- FIRMA PREDETERMINADA -->
          <v-col cols="12" sm="6" md="2">
            <v-btn block color="primary" depressed :disabled="!pdfLoaded || !defaultSignatureDataUrl"
              @click="addDefaultSignature">
              <v-icon left>mdi-draw</v-icon>
              Firma (predet.)
            </v-btn>
          </v-col>

          <!-- SUBIR FIRMA -->
          <v-col cols="12" sm="6" md="2">
            <v-btn block color="primary" depressed :disabled="!pdfLoaded" @click="$refs.signatureInput.click()">
              <v-icon left>mdi-upload</v-icon>
              Subir firma
            </v-btn>
            <input ref="signatureInput" type="file" accept="image/png,image/jpeg,image/jpg" style="display: none"
              @change="handleSignatureUpload" />
          </v-col>

          <!-- TEXTO -->
          <v-col cols="12" sm="6" md="2">
            <v-btn block color="secondary" depressed :disabled="!pdfLoaded" @click="addText">
              <v-icon left>mdi-format-text</v-icon>
              Texto
            </v-btn>
          </v-col>

          <!-- FECHA -->
          <v-col cols="12" sm="6" md="1">
            <v-btn block color="info" depressed :disabled="!pdfLoaded" @click="addDate">
              <v-icon left>mdi-calendar</v-icon>
              Fecha
            </v-btn>
          </v-col>

          <!-- GENERAR PDF -->
          <v-col cols="12" sm="6" md="2">
            <v-btn block color="success" depressed :disabled="!pdfLoaded || exporting" :loading="exporting"
              @click="generatePdf">
              <v-icon left>mdi-file-pdf-box</v-icon>
              Generar PDF
            </v-btn>
          </v-col>
        </v-row>

        <!-- NAVEGACIÓN -->
        <v-row v-if="pdfLoaded" align="center" justify="center" class="mt-3" dense>
          <v-col cols="auto">
            <v-btn icon :disabled="currentPage <= 1" @click="previousPage">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <div class="page-counter">Página {{ currentPage }} / {{ totalPages }}</div>
          </v-col>
          <v-col cols="auto">
            <v-btn icon :disabled="currentPage >= totalPages" @click="nextPage">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
          </v-col>
        </v-row>

      </v-card-text>
    </v-card>

    <!-- ========================================================= -->
    <!-- CONTENIDO PRINCIPAL -->
    <!-- ========================================================= -->
    <v-row>

      <!-- MINIATURAS -->
      <v-col v-if="pdfLoaded" cols="12" md="2" class="thumbnail-column">
        <v-card class="thumbnail-card" elevation="2">
          <v-card-title class="subtitle-1">Páginas</v-card-title>
          <v-divider />
          <div class="thumbnails-container">
            <div v-for="page in totalPages" :key="page" class="thumbnail-wrapper"
              :class="{ 'thumbnail-active': currentPage === page }" @click="goToPage(page)">
              <canvas :ref="'thumbnail-' + page" class="thumbnail-canvas" />
              <div class="thumbnail-number">{{ page }}</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- VISOR PDF -->
      <v-col cols="12" :md="pdfLoaded ? 10 : 12">
        <v-card class="pdf-card" elevation="2">

          <!-- SIN PDF -->
          <div v-if="!pdfLoaded" class="empty-pdf">
            <v-icon size="80" color="grey lighten-1">mdi-file-pdf-box</v-icon>
            <div class="empty-title">Selecciona un PDF</div>
            <div class="empty-description">
              Podrás colocar directamente tu firma, texto y fecha sobre el documento.
            </div>
          </div>

          <!-- PDF CARGADO -->
          <div v-else ref="pdfViewer" class="pdf-viewer">
            <div ref="pdfPageContainer" class="pdf-page-container" :style="{
              width: pageWidth + 'px',
              height: pageHeight + 'px'
            }">
              <!-- CANVAS -->
              <canvas ref="pdfCanvas" class="pdf-canvas" />

              <!-- ELEMENTOS -->
              <div v-for="element in currentPageElements" :key="element.id" class="pdf-element"
                :class="{ 'element-selected': selectedElementId === element.id }" :style="getElementStyle(element)"
                @mousedown.stop="startDrag($event, element)" @click.stop="selectElement(element)">
                <!-- TEXTO / FECHA -->
                <div v-if="element.type === 'text' || element.type === 'date'" class="element-text" :style="{
                  fontSize: (element.fontSize || 18) + 'px',
                  color: element.color || '#000000'
                }">
                  {{ element.content }}
                </div>

                <!-- FIRMA -->
                <img v-if="element.type === 'signature'" :src="element.src" class="signature-image" draggable="false"
                  @dragstart.prevent />

                <!-- BOTÓN ELIMINAR -->
                <button v-if="selectedElementId === element.id" class="delete-element-btn" title="Eliminar"
                  @mousedown.stop @click.stop="deleteElement(element.id)">
                  ×
                </button>
              </div>

            </div>
          </div>

        </v-card>
      </v-col>

    </v-row>

    <!-- ========================================================= -->
    <!-- PANEL DE EDICIÓN -->
    <!-- ========================================================= -->
    <v-card v-if="selectedElement" class="mt-4" elevation="2">
      <v-card-title class="subtitle-1">
        <v-icon left>mdi-format-edit</v-icon>
        Editar elemento
      </v-card-title>

      <v-card-text>
        <v-row dense>

          <!-- CONTENIDO -->
          <v-col v-if="selectedElement.type === 'text' || selectedElement.type === 'date'" cols="12" md="4">
            <v-text-field v-model="selectedElement.content" label="Texto" outlined dense hide-details />
          </v-col>

          <!-- TAMAÑO LETRA -->
          <v-col v-if="selectedElement.type === 'text' || selectedElement.type === 'date'" cols="12" sm="6" md="2">
            <v-text-field v-model.number="selectedElement.fontSize" type="number" min="6" max="100" label="Tamaño letra"
              suffix="px" outlined dense hide-details />
          </v-col>

          <!-- COLOR -->
          <v-col v-if="selectedElement.type === 'text' || selectedElement.type === 'date'" cols="12" sm="6" md="2">
            <div class="color-control">
              <label class="color-label">Color</label>
              <div class="color-row">
                <input v-model="selectedElement.color" type="color" class="color-input" />
                <span class="color-value">{{ selectedElement.color }}</span>
              </div>
            </div>
          </v-col>

          <!-- ANCHO -->
          <v-col cols="12" sm="6" md="1">
            <v-text-field v-model.number="selectedElement.width" type="number" min="20" label="Ancho" suffix="px"
              outlined dense hide-details />
          </v-col>

          <!-- ALTO -->
          <v-col cols="12" sm="6" md="1">
            <v-text-field v-model.number="selectedElement.height" type="number" min="20" label="Alto" suffix="px"
              outlined dense hide-details />
          </v-col>

          <!-- ELIMINAR -->
          <v-col cols="12" md="2">
            <v-btn block color="error" outlined @click="deleteSelectedElement">
              <v-icon left>mdi-delete</v-icon>
              Eliminar
            </v-btn>
          </v-col>

        </v-row>

        <!-- POSICIÓN -->
        <v-row v-if="selectedElement" dense class="mt-2">
          <v-col cols="12" sm="6" md="2">
            <v-text-field v-model.number="selectedElement.x" type="number" label="Posición X" suffix="px" outlined dense
              hide-details />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-text-field v-model.number="selectedElement.y" type="number" label="Posición Y" suffix="px" outlined dense
              hide-details />
          </v-col>
        </v-row>

      </v-card-text>
    </v-card>

  </v-container>
</template>

<script>
import firebase from 'firebase/app'
import 'firebase/firestore'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export default {
  name: 'FirmarPdf',

  data() {
    return {
      // PDF
      pdfFileInput: null,
      pdfFile: null,
      pdfFileName: '',
      pdfData: null,
      pdfDocument: null,
      pdfLoaded: false,
      loading: false,
      exporting: false,

      // Páginas
      currentPage: 1,
      totalPages: 0,
      pageWidth: 0,
      pageHeight: 0,
      renderScale: 1.5,

      // Elementos
      elements: [],
      elementCounter: 0,
      selectedElementId: null,

      // Drag
      dragging: false,
      dragElement: null,
      dragOffsetX: 0,
      dragOffsetY: 0,

      // Firma predeterminada
      defaultSignatureDataUrl: null,     // para visualización
      defaultSignatureUint8Array: null,  // bytes para incrustar
      defaultSignatureMimeType: null,    // 'image/png' o 'image/jpeg'
    }
  },

  computed: {
    currentPageElements() {
      return this.elements.filter(el => el.page === this.currentPage)
    },
    selectedElement() {
      return this.elements.find(el => el.id === this.selectedElementId) || null
    }
  },

  mounted() {
    // Worker de pdf.js
    if (process.client) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
    }

    // Eventos globales de drag
    window.addEventListener('mousemove', this.handleDrag)
    window.addEventListener('mouseup', this.stopDrag)

    // Cargar firma predeterminada desde /firma_solo.png
    this.loadDefaultSignature()
  },

  beforeDestroy() {
    window.removeEventListener('mousemove', this.handleDrag)
    window.removeEventListener('mouseup', this.stopDrag)
  },

  methods: {
    async actualizarContador() {
      try {
        await this.$db.collection('firmarPdf').add({
          contador: 1,  // o cualquier valor, pero realmente solo necesitas la fecha
          fecha: firebase.firestore.FieldValue.serverTimestamp()
        })
        console.log('📄 Evento registrado')
      } catch (error) {
        console.error('❌ Error al registrar evento:', error)
      }
    },
    // async actualizarContador() {
    //   try {
    //     const docRef = this.$db.collection('firmarPdf').doc('contador')
    //     const docSnap = await docRef.get()

    //     if (!docSnap.exists) {
    //       await docRef.set({
    //         contador: 1,
    //         fecha: firebase.firestore.FieldValue.serverTimestamp()
    //       })
    //     } else {
    //       await docRef.update({
    //         contador: firebase.firestore.FieldValue.increment(1),
    //         fecha: firebase.firestore.FieldValue.serverTimestamp()
    //       })
    //       console.log('🔄 Contador incrementado y timestamp actualizado')
    //     }
    //   } catch (error) {
    //     console.error('❌ Error al actualizar contador:', error)
    //   }
    // },
    // ----------------------------------------------------------------
    // UTILIDADES
    // ----------------------------------------------------------------
    hexToRgb(hex) {
      if (!hex) hex = '#000000'
      hex = hex.replace('#', '')
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('')
      }
      const value = parseInt(hex, 16)
      return {
        r: ((value >> 16) & 255) / 255,
        g: ((value >> 8) & 255) / 255,
        b: (value & 255) / 255,
      }
    },

    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
        reader.readAsDataURL(file)
      })
    },

    // Convierte un Uint8Array a data URL
    uint8ArrayToDataUrl(uint8Array, mimeType = 'image/png') {
      const base64 = btoa(
        String.fromCharCode(...uint8Array)
      )
      return `data:${mimeType};base64,${base64}`
    },

    // Detección de tipo de imagen por magic bytes
    detectImageType(uint8Array) {
      if (uint8Array.length >= 4 &&
        uint8Array[0] === 0x89 &&
        uint8Array[1] === 0x50 &&
        uint8Array[2] === 0x4E &&
        uint8Array[3] === 0x47) {
        return 'png'
      }
      if (uint8Array.length >= 3 &&
        uint8Array[0] === 0xFF &&
        uint8Array[1] === 0xD8 &&
        uint8Array[2] === 0xFF) {
        return 'jpg'
      }
      return null
    },

    // ----------------------------------------------------------------
    // CARGA DE FIRMA PREDETERMINADA (CORREGIDA)
    // ----------------------------------------------------------------
    async loadDefaultSignature() {
      try {
        console.log('Cargando firma predeterminada desde /firma_solo.png...')
        const response = await fetch('/firma_solo.png')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        this.defaultSignatureUint8Array = uint8Array

        // Detectar tipo de imagen
        const type = this.detectImageType(uint8Array)
        if (!type) {
          throw new Error('Formato de imagen no reconocido (debe ser PNG o JPG)')
        }
        this.defaultSignatureMimeType = type === 'png' ? 'image/png' : 'image/jpeg'
        console.log(`Tipo de imagen detectado: ${this.defaultSignatureMimeType}`)

        // Generar data URL para visualización
        this.defaultSignatureDataUrl = this.uint8ArrayToDataUrl(
          uint8Array,
          this.defaultSignatureMimeType
        )
        console.log('Firma predeterminada cargada correctamente')
      } catch (error) {
        console.error('Error cargando firma predeterminada:', error)
        alert('No se pudo cargar la firma predeterminada. Verifica que el archivo exista y sea PNG/JPG válido.')
      }
    },

    // ----------------------------------------------------------------
    // CARGAR PDF
    // ----------------------------------------------------------------
    async handlePdfUpload(file) {
      if (!file) return
      if (file.type !== 'application/pdf') {
        alert('Selecciona un archivo PDF.')
        this.pdfFileInput = null
        return
      }

      try {
        this.loading = true
        this.pdfFile = file
        this.pdfFileName = file.name

        const arrayBuffer = await file.arrayBuffer()
        this.pdfData = new Uint8Array(arrayBuffer)

        this.pdfDocument = await pdfjsLib.getDocument({ data: this.pdfData }).promise
        this.totalPages = this.pdfDocument.numPages
        this.currentPage = 1

        // Limpiar elementos anteriores
        this.elements = []
        this.elementCounter = 0
        this.selectedElementId = null

        this.pdfLoaded = true
        await this.$nextTick()
        await this.renderCurrentPage()
        await this.renderThumbnails()

      } catch (error) {
        console.error('Error cargando PDF:', error)
        alert('No se pudo cargar el PDF.\n\n' + error.message)
        this.pdfLoaded = false
      } finally {
        this.loading = false
      }
    },

    // ----------------------------------------------------------------
    // RENDER PÁGINA ACTUAL
    // ----------------------------------------------------------------
    async renderCurrentPage() {
      if (!this.pdfDocument) return
      const page = await this.pdfDocument.getPage(this.currentPage)
      const viewport = page.getViewport({ scale: this.renderScale })
      this.pageWidth = viewport.width
      this.pageHeight = viewport.height

      await this.$nextTick()
      const canvas = this.$refs.pdfCanvas
      if (!canvas) return

      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = viewport.width + 'px'
      canvas.style.height = viewport.height + 'px'

      await page.render({ canvasContext: context, viewport }).promise
    },

    // ----------------------------------------------------------------
    // MINIATURAS
    // ----------------------------------------------------------------
    async renderThumbnails() {
      if (!this.pdfDocument) return
      for (let pageNumber = 1; pageNumber <= this.totalPages; pageNumber++) {
        try {
          const page = await this.pdfDocument.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 0.18 })
          const ref = this.$refs['thumbnail-' + pageNumber]
          if (!ref) continue
          const canvas = Array.isArray(ref) ? ref[0] : ref
          if (!canvas) continue

          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: context, viewport }).promise
        } catch (error) {
          console.error('Error renderizando miniatura:', error)
        }
      }
    },

    // ----------------------------------------------------------------
    // NAVEGACIÓN
    // ----------------------------------------------------------------
    async goToPage(pageNumber) {
      if (pageNumber < 1 || pageNumber > this.totalPages) return
      this.currentPage = pageNumber
      this.selectedElementId = null
      await this.$nextTick()
      await this.renderCurrentPage()
    },

    async previousPage() {
      if (this.currentPage > 1) await this.goToPage(this.currentPage - 1)
    },

    async nextPage() {
      if (this.currentPage < this.totalPages) await this.goToPage(this.currentPage + 1)
    },

    // ----------------------------------------------------------------
    // ELEMENTOS: TEXTO, FECHA, FIRMA  -  Medidas y posiciones según diseño
    // ----------------------------------------------------------------
    // IMAGEN
    // ANCHO: 285
    // ALTO: 105
    // X: 110
    // Y: 1080

    // FECHA

    // TAMAÑO: 9
    // ANCHO: 150
    // ALTO: 40
    // X: 260
    // Y: 1158
    // COLOR RGB 877 - #080707
    addText() {
      const element = {
        id: ++this.elementCounter,
        type: 'text',
        page: this.currentPage,
        content: 'Texto',
        x: 100,
        y: 1080,
        width: 180,
        height: 45,
        fontSize: 18,
        color: '#000000',
      }
      this.elements.push(element)
      this.selectedElementId = element.id
    },

    addDate() {
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = now.getFullYear()
      const element = {
        id: ++this.elementCounter,
        type: 'date',
        page: this.currentPage,
        content: `${day}/${month}/${year}`,
        x: 260,
        y: 1158,
        width: 150,
        height: 40,
        fontSize: 9,
        color: '#080707',
      }
      this.elements.push(element)
      this.selectedElementId = element.id
    },

    addSignature(src) {
      if (!src) {
        alert('No se encontró la imagen de la firma.')
        return
      }
      const element = {
        id: ++this.elementCounter,
        type: 'signature',
        page: this.currentPage,
        src: src, // data URL
        x: 110,
        y: 1080,
        width: 285,
        height: 105,
      }
      this.elements.push(element)
      this.selectedElementId = element.id
      console.log('Firma agregada, src tipo:', typeof src, src.substring(0, 30) + '...')
    },

    addDefaultSignature() {
      if (!this.defaultSignatureDataUrl) {
        alert('La firma predeterminada aún no se ha cargado. Intenta de nuevo.')
        return
      }
      this.addSignature(this.defaultSignatureDataUrl)
    },

    async handleSignatureUpload(event) {
      const file = event.target.files[0]
      if (!file) return

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        alert('La firma debe ser PNG o JPG.')
        event.target.value = ''
        return
      }

      try {
        const src = await this.fileToDataUrl(file)
        this.addSignature(src)
      } catch (error) {
        console.error('Error cargando firma:', error)
        alert('No se pudo cargar la firma.')
      }
      event.target.value = ''
    },

    // ----------------------------------------------------------------
    // SELECCIÓN Y DRAG
    // ----------------------------------------------------------------
    selectElement(element) {
      this.selectedElementId = element.id
    },

    getElementStyle(element) {
      const style = {
        left: element.x + 'px',
        top: element.y + 'px',
        width: element.width + 'px',
        height: element.height + 'px',
      }
      if (element.type === 'text' || element.type === 'date') {
        style.fontSize = (element.fontSize || 18) + 'px'
        style.color = element.color || '#000000'
      }
      return style
    },

    startDrag(event, element) {
      if (event.button !== 0) return
      this.selectedElementId = element.id
      this.dragging = true
      this.dragElement = element

      const container = this.$refs.pdfPageContainer
      if (!container) return

      const rect = container.getBoundingClientRect()
      this.dragOffsetX = event.clientX - rect.left - element.x
      this.dragOffsetY = event.clientY - rect.top - element.y
      event.preventDefault()
    },

    handleDrag(event) {
      if (!this.dragging || !this.dragElement) return
      const container = this.$refs.pdfPageContainer
      if (!container) return

      const rect = container.getBoundingClientRect()
      let x = event.clientX - rect.left - this.dragOffsetX
      let y = event.clientY - rect.top - this.dragOffsetY

      const maxX = this.pageWidth - this.dragElement.width
      const maxY = this.pageHeight - this.dragElement.height
      x = Math.max(0, Math.min(x, maxX))
      y = Math.max(0, Math.min(y, maxY))

      this.dragElement.x = x
      this.dragElement.y = y
    },

    stopDrag() {
      this.dragging = false
      this.dragElement = null
    },

    // ----------------------------------------------------------------
    // ELIMINAR ELEMENTOS
    // ----------------------------------------------------------------
    deleteElement(id) {
      const index = this.elements.findIndex(el => el.id === id)
      if (index === -1) return
      this.elements.splice(index, 1)
      if (this.selectedElementId === id) this.selectedElementId = null
    },

    deleteSelectedElement() {
      if (!this.selectedElementId) return
      this.deleteElement(this.selectedElementId)
    },

    async generatePdf() {
      if (!this.pdfData) {
        alert('Primero selecciona un PDF.')
        return
      }

      try {
        this.exporting = true
        this._signatureError = false

        const pdfDoc = await PDFDocument.load(this.pdfData)
        const pages = pdfDoc.getPages()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        console.log('Generando PDF con', this.elements.length, 'elementos')

        for (const element of this.elements) {
          const page = pages[element.page - 1]
          if (!page) {
            console.warn('Página no encontrada para elemento', element.id)
            continue
          }

          const pageWidthPdf = page.getWidth()
          const pageHeightPdf = page.getHeight()
          const scaleX = pageWidthPdf / this.pageWidth
          const scaleY = pageHeightPdf / this.pageHeight

          // ----- TEXTO / FECHA -----
          if (element.type === 'text' || element.type === 'date') {
            const fontSize = (element.fontSize || 18) * scaleX
            const x = element.x * scaleX
            const y = pageHeightPdf - (element.y + (element.fontSize || 18)) * scaleY
            const textColor = this.hexToRgb(element.color || '#000000')

            page.drawText(element.content || '', {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(textColor.r, textColor.g, textColor.b),
            })
            console.log(`Texto "${element.content}" dibujado en página ${element.page}`)
          }

          // ----- FIRMA -----
          if (element.type === 'signature') {
            try {
              console.log('Procesando firma...')

              let imageBytes
              let mimeType = this.defaultSignatureMimeType || 'image/png'

              if (element.src && element.src.startsWith('data:')) {
                const match = element.src.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/)
                if (match) {
                  mimeType = match[1]
                  const base64 = match[2]
                  const binary = atob(base64)
                  imageBytes = new Uint8Array(binary.length)
                  for (let i = 0; i < binary.length; i++) {
                    imageBytes[i] = binary.charCodeAt(i)
                  }
                } else {
                  throw new Error('Data URL inválida')
                }
              } else if (this.defaultSignatureUint8Array) {
                imageBytes = this.defaultSignatureUint8Array
                mimeType = this.defaultSignatureMimeType || 'image/png'
              } else {
                throw new Error('No hay imagen de firma disponible')
              }

              console.log(`Tipo MIME: ${mimeType}, tamaño: ${imageBytes.length} bytes`)

              let image
              try {
                if (mimeType === 'image/png') {
                  image = await pdfDoc.embedPng(imageBytes)
                } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
                  image = await pdfDoc.embedJpg(imageBytes)
                } else {
                  try {
                    image = await pdfDoc.embedPng(imageBytes)
                  } catch {
                    image = await pdfDoc.embedJpg(imageBytes)
                  }
                }
              } catch (embedError) {
                console.warn('Fallo al incrustar con tipo', mimeType, 'intentando el otro formato...')
                if (mimeType === 'image/png') {
                  image = await pdfDoc.embedJpg(imageBytes)
                } else {
                  image = await pdfDoc.embedPng(imageBytes)
                }
              }

              const width = element.width * scaleX
              const height = element.height * scaleY
              const x = element.x * scaleX
              const y = pageHeightPdf - (element.y + element.height) * scaleY

              page.drawImage(image, { x, y, width, height })
              console.log(`Firma dibujada en página ${element.page} en (${x}, ${y}) con tamaño ${width}x${height}`)

            } catch (error) {
              console.error('Error al incrustar la firma:', error)
              this._signatureError = true
            }
          }
        }

        if (this._signatureError) {
          alert('Hubo un problema al incrustar una o más firmas. El PDF se generó pero sin esas firmas.')
          this._signatureError = false
        }

        // Guardar PDF
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = this.getOutputFileName()
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        console.log('PDF generado exitosamente')

        // ✅ REGISTRAR EL CLIC EN FIREBASE
        await this.actualizarContador()

      } catch (error) {
        console.error('Error generando PDF:', error)
        alert('No se pudo generar el PDF.\n\n' + error.message)
      } finally {
        this.exporting = false
      }
    },

    getOutputFileName() {
      if (!this.pdfFileName) return 'documento_firmado.pdf'
      const name = this.pdfFileName.replace(/\.pdf$/i, '')
      return name + '_firmado.pdf'
    },
  }
}
</script>

<style scoped>
/* ========================================================= */
/* PÁGINA */
/* ========================================================= */
.firmar-pdf-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 30px;
}

/* ========================================================= */
/* TOOLBAR ESTÁTICA */
/* ========================================================= */
.sticky-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  border-radius: 10px;
}

.toolbar-title {
  font-weight: 600;
}

/* ========================================================= */
/* CONTADOR */
/* ========================================================= */
.page-counter {
  font-weight: 600;
  font-size: 14px;
}

/* ========================================================= */
/* MINIATURAS */
/* ========================================================= */
.thumbnail-card {
  border-radius: 10px;
  overflow: hidden;
}

.thumbnails-container {
  max-height: 75vh;
  overflow-y: auto;
  padding: 12px;
}

.thumbnail-wrapper {
  position: relative;
  padding: 5px;
  margin-bottom: 12px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}

.thumbnail-wrapper:hover {
  border-color: #bdbdbd;
}

.thumbnail-active {
  border-color: #1976d2;
  background: #e3f2fd;
}

.thumbnail-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}

.thumbnail-number {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

/* ========================================================= */
/* PDF VISOR */
/* ========================================================= */
.pdf-card {
  min-height: 600px;
  overflow: hidden;
  border-radius: 10px;
}

.pdf-viewer {
  width: 100%;
  overflow: auto;
  padding: 30px;
  background: #eeeeee;
  min-height: 650px;
}

.pdf-page-container {
  position: relative;
  margin: 0 auto;
  background: white;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.25);
}

.pdf-canvas {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

/* ========================================================= */
/* SIN PDF */
/* ========================================================= */
.empty-pdf {
  min-height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-title {
  font-size: 22px;
  font-weight: 600;
  margin-top: 15px;
}

.empty-description {
  max-width: 500px;
  margin-top: 8px;
  color: #757575;
}

/* ========================================================= */
/* ELEMENTOS */
/* ========================================================= */
.pdf-element {
  position: absolute;
  z-index: 10;
  cursor: move;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-element.element-selected {
  outline: 2px dashed #1976d2;
  outline-offset: 2px;
}

.element-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 4px;
  white-space: nowrap;
  overflow: hidden;
}

.signature-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

/* ========================================================= */
/* BOTÓN ELIMINAR */
/* ========================================================= */
.delete-element-btn {
  position: absolute;
  top: -13px;
  right: -13px;
  z-index: 50;
  width: 25px;
  height: 25px;
  border: none;
  border-radius: 50%;
  background: #f44336;
  color: white;
  font-size: 18px;
  line-height: 25px;
  cursor: pointer;
  padding: 0;
}

.delete-element-btn:hover {
  background: #d32f2f;
}

/* ========================================================= */
/* COLOR PICKER */
/* ========================================================= */
.color-control {
  width: 100%;
}

.color-label {
  display: block;
  font-size: 12px;
  color: #757575;
  margin-bottom: 4px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 42px;
  height: 36px;
  padding: 2px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

.color-value {
  font-size: 12px;
  color: #616161;
  font-family: monospace;
}

/* ========================================================= */
/* RESPONSIVE */
/* ========================================================= */
@media (max-width: 960px) {
  .pdf-viewer {
    padding: 15px;
  }

  .pdf-page-container {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>