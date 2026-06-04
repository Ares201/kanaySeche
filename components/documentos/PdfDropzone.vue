<template>
  <div
    class="pdf-dropzone"
    :class="{ 'pdf-dropzone--dragging': isDragging }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="input"
      class="pdf-dropzone__input"
      type="file"
      accept="application/pdf,.pdf"
      multiple
      @change="handleInput"
    >

    <v-icon class="pdf-dropzone__icon" size="44">
      mdi-file-pdf-box
    </v-icon>
    <h2>Arrastra tus PDFs aqui</h2>
    <p>Tambien puedes seleccionarlos desde tu equipo.</p>

    <v-btn color="#0f766e" dark depressed type="button" @click="$refs.input.click()">
      <v-icon left>
        mdi-upload
      </v-icon>
      Seleccionar PDFs
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'PdfDropzone',
  data() {
    return {
      isDragging: false
    }
  },
  methods: {
    handleDrop(event) {
      this.isDragging = false
      this.emitPdfFiles(event.dataTransfer.files)
    },
    handleInput(event) {
      this.emitPdfFiles(event.target.files)
      event.target.value = ''
    },
    emitPdfFiles(fileList) {
      const files = Array.from(fileList || []).filter(file => {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      })

      if (files.length) {
        this.$emit('files-selected', files)
      }
    }
  }
}
</script>

<style scoped>
.pdf-dropzone {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 250px;
  border: 2px dashed #9ccfbd;
  border-radius: 8px;
  padding: 28px;
  text-align: center;
  background: #f4fbf8;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.pdf-dropzone--dragging {
  border-color: #0f766e;
  background: #e7f7f1;
}

.pdf-dropzone__input {
  display: none;
}

.pdf-dropzone__icon {
  color: #0f766e;
}

.pdf-dropzone h2 {
  margin: 12px 0 6px;
  font-size: 20px;
}

.pdf-dropzone p {
  margin: 0 0 18px;
  color: #64748b;
}
</style>
