<template>
  <v-dialog v-model="visible" max-width="900" persistent>
    <v-card>
      <v-toolbar color="#6eb49c" dark flat>
        <v-toolbar-title>Cargo digital - {{ carta.correlativo }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="close"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>

      <v-card-text class="pt-6">
        <v-text-field v-model.trim="link" label="Link del cargo escaneado" outlined required />
        <div class="mb-5">
          <v-btn color="#6eb49c" dark class="mr-2" :loading="saving" @click="save">Guardar cambios</v-btn>
          <v-btn outlined color="#6eb49c" class="mr-2" :disabled="!link" @click="copyLink">
            <v-icon left>mdi-content-copy</v-icon>Copiar enlace
          </v-btn>
          <v-btn outlined color="#6eb49c" :disabled="!link" @click="openLink">
            <v-icon left>mdi-open-in-new</v-icon>Abrir cargo
          </v-btn>
        </div>

        <v-card v-if="confirmado" outlined class="mb-5">
          <v-card-title>Datos de la confirmación digital</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6"><strong>Firmado por:</strong> {{ confirmacion.nombre }}</v-col>
              <v-col cols="12" sm="6"><strong>Código de confirmación:</strong> {{ confirmacion.codigo }}</v-col>
              <v-col cols="12" sm="6"><strong>Fecha de confirmación:</strong> {{ formatDate(confirmacion.fechaConfirmacion) }}</v-col>
              <v-col v-if="confirmacion.ip" cols="12" sm="6"><strong>IP:</strong> {{ confirmacion.ip }}</v-col>
              <v-col v-if="confirmacion.userAgent" cols="12"><strong>Dispositivo/Navegador:</strong> {{ confirmacion.userAgent }}</v-col>
            </v-row>
            <v-btn color="#6eb49c" dark class="mt-4" :loading="downloading" @click="downloadReceipt">
              <v-icon left>mdi-file-pdf-box</v-icon>Descargar constancia PDF
            </v-btn>
          </v-card-text>
        </v-card>
        <v-alert v-else type="warning" outlined class="mb-5">
          Aún no existe una confirmación digital registrada para esta carta.
        </v-alert>

        <v-alert v-if="!link" type="warning" outlined>
          Esta carta todavía no tiene un cargo digital registrado.
        </v-alert>
        <iframe v-else class="cargo-preview" :src="link" title="Vista previa del cargo digital" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'CargoDigitalDialog',
  props: {
    value: { type: Boolean, default: false },
    carta: { type: Object, required: true }
  },
  data() { return { link: '', saving: false, downloading: false } },
  computed: {
    visible: {
      get() { return this.value },
      set(value) { this.$emit('input', value) }
    },
    confirmacion() { return this.carta.confirmacion || {} },
    confirmado() { return !!this.confirmacion.confirmado }
  },
  watch: {
    carta: {
      immediate: true,
      handler(carta) { this.link = ((carta || {}).cargo || {}).link || '' }
    }
  },
  methods: {
    close() { this.visible = false },
    async save() {
      if (!this.link) return
      this.saving = true
      this.$emit('save', { link: this.link, fechaCarga: new Date() })
      this.saving = false
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.link)
        this.$emit('message', 'Enlace del cargo copiado')
      } catch (error) { this.$emit('message', 'No se pudo copiar el enlace') }
    },
    openLink() { window.open(this.link, '_blank', 'noopener') },
    formatDate(value) {
      if (!value) return '-'
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value.seconds ? value.seconds * 1000 : value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-PE')
    },
    escapeHtml(value) {
      return String(value || '-')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    },
    async downloadReceipt() {
      if (!process.client || !this.confirmado) return
      this.downloading = true
      const confirmation = this.confirmacion
      const cliente = this.carta.cliente || {}
      const row = (label, value) => `<tr><th>${this.escapeHtml(label)}</th><td>${this.escapeHtml(value)}</td></tr>`
      const receipt = document.createElement('div')
      receipt.className = 'cargo-receipt'
      receipt.innerHTML = `
        <div style="font-family:Arial,sans-serif;padding:32px;color:#17352c">
          <h1 style="margin:0 0 6px;color:#6eb49c">Constancia de recepción digital</h1>
          <p style="margin:0 0 24px">Carta: <strong>${this.escapeHtml(this.carta.correlativo)}</strong></p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            ${row('Cliente', cliente.nombre)}
            ${row('Receptor', confirmation.nombre)}
            ${row('Código de confirmación', confirmation.codigo)}
            ${row('Fecha de confirmación', this.formatDate(confirmation.fechaConfirmacion))}
            ${confirmation.ip ? row('IP registrada', confirmation.ip) : ''}
            ${confirmation.userAgent ? row('Dispositivo/Navegador', confirmation.userAgent) : ''}
            ${row('Link del cargo digital', this.link)}
          </table>
          <p style="margin-top:28px;color:#475569">Esta constancia registra la confirmación digital realizada por el receptor indicado.</p>
        </div>`
      receipt.style.position = 'fixed'
      receipt.style.left = '-9999px'
      document.body.appendChild(receipt)
      try {
        const html2pdfModule = await import('html2pdf.js')
        const html2pdf = html2pdfModule.default || html2pdfModule
        await html2pdf().set({
          margin: 10,
          filename: `constancia-${this.carta.correlativo || 'cargo'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(receipt).save()
      } finally {
        document.body.removeChild(receipt)
        this.downloading = false
      }
    }
  }
}
</script>

<style scoped>
.cargo-preview {
  width: 100%;
  min-height: 460px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}
</style>
