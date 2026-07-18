<template>
  <v-dialog v-model="visible" fullscreen hide-overlay transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="#6eb49c" dark flat>
        <v-btn icon @click="close"><v-icon>mdi-close</v-icon></v-btn>
        <v-toolbar-title>Confirmación de recepción</v-toolbar-title>
      </v-toolbar>

      <v-container class="py-8" style="max-width: 1100px">
        <h2 class="mb-1">Confirmación de recepción</h2>
        <p class="text-subtitle-1 mb-6">Cliente: {{ clienteNombre }}</p>

        <v-card outlined class="mb-6">
          <v-card-title>Documentos enviados</v-card-title>
          <v-data-table :headers="headers" :items="carta.detalles || []" hide-default-footer>
            <template #item.codigo="{ item }">{{ item.numeroTexto || item.numero || '-' }}</template>
            <template #item.documento="{ item }">{{ item.descripcion || '-' }}</template>
          </v-data-table>
        </v-card>

        <v-row>
          <v-col cols="12" md="6">
            <v-card outlined class="fill-height">
              <v-card-title>Estado de la confirmación</v-card-title>
              <v-card-text>
                <v-chip :color="confirmado ? '#6eb49c' : 'warning'" dark class="mb-4">
                  {{ confirmado ? 'Confirmado' : 'Pendiente' }}
                </v-chip>
                <div v-if="confirmado">
                  <p class="mb-1"><strong>Nombre del receptor:</strong> {{ carta.confirmacion.nombre }}</p>
                  <p class="mb-1"><strong>Código ingresado:</strong> {{ carta.confirmacion.codigo }}</p>
                  <p class="mb-0"><strong>Fecha de confirmación:</strong> {{ formatDate(carta.confirmacion.fechaConfirmacion) }}</p>
                </div>
                <p v-else class="mb-0">El cliente aún no ha confirmado la recepción.</p>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card outlined class="fill-height">
              <v-card-title>Enlace para el cliente</v-card-title>
              <v-card-text>
                <v-text-field :value="confirmationUrl" outlined readonly hide-details class="mb-4" />
                <v-btn color="#6eb49c" dark class="mr-2" @click="copyLink"><v-icon left>mdi-content-copy</v-icon>Copiar enlace</v-btn>
                <v-btn outlined color="#6eb49c" @click="openLink"><v-icon left>mdi-open-in-new</v-icon>Abrir enlace</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card outlined class="mt-6">
          <v-card-title>Flujo de entrega</v-card-title>
          <v-card-text>
            <v-stepper :value="step" alt-labels flat class="confirmacion-stepper">
              <v-stepper-header>
                <v-stepper-step color="#6eb49c" :complete="step > 1" step="1">Emitido</v-stepper-step>
                <v-divider />
                <v-stepper-step color="#6eb49c" :complete="step > 2" step="2">Enviado</v-stepper-step>
                <v-divider />
                <v-stepper-step color="#6eb49c" :complete="step > 3" step="3">Pendiente de Confirmación</v-stepper-step>
                <v-divider />
                <v-stepper-step color="#6eb49c" step="4">Entregado</v-stepper-step>
              </v-stepper-header>
            </v-stepper>
          </v-card-text>
        </v-card>

        <v-card outlined class="mt-6">
          <v-card-title>Cargo escaneado</v-card-title>
          <v-card-text>
            <v-text-field v-model.trim="cargoLink" label="Link del cargo escaneado" outlined required :rules="[v => !!v || 'El link del cargo es obligatorio']" />
            <v-btn color="#6eb49c" dark :loading="savingCargo" @click="saveCargo">Guardar cargo</v-btn>
          </v-card-text>
        </v-card>

        <div class="d-flex justify-end mt-6">
          <v-btn text class="mr-2" @click="close">Cerrar</v-btn>
          <v-btn color="#6eb49c" dark :disabled="!canMarkDelivered" :loading="markingDelivered" @click="markDelivered">
            Marcar como Entregado
          </v-btn>
        </div>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ConfirmacionDialog',
  props: {
    value: { type: Boolean, default: false },
    carta: { type: Object, required: true }
  },
  data() {
    return {
      cargoLink: '',
      savingCargo: false,
      markingDelivered: false,
      headers: [
        { text: 'Código', value: 'codigo' },
        { text: 'Documento', value: 'documento' }
      ]
    }
  },
  computed: {
    visible: {
      get() { return this.value },
      set(value) { this.$emit('input', value) }
    },
    clienteNombre() { return (this.carta.cliente || {}).nombre || '-' },
    confirmado() { return !!(this.carta.confirmacion || {}).confirmado },
    confirmationUrl() {
      if (!this.carta.tokenConfirmacion || !process.client) return ''
      return `${window.location.origin}/confirmacion/${this.carta.tokenConfirmacion}`
    },
    step() {
      const steps = { Emitido: 1, Enviado: 2, 'Pendiente de Confirmación': 3, Entregado: 4 }
      return steps[this.carta.estadoProceso] || 3
    },
    canMarkDelivered() { return this.confirmado && !!((this.carta.cargo || {}).link) }
  },
  watch: {
    carta: {
      immediate: true,
      handler(value) { this.cargoLink = ((value || {}).cargo || {}).link || '' }
    }
  },
  methods: {
    close() { this.visible = false },
    formatDate(value) {
      if (!value) return '-'
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value.seconds ? value.seconds * 1000 : value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-PE')
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.confirmationUrl)
        this.$emit('message', 'Enlace copiado')
      } catch (error) {
        this.$emit('message', 'No se pudo copiar el enlace')
      }
    },
    openLink() { window.open(this.confirmationUrl, '_blank', 'noopener') },
    async saveCargo() {
      if (!this.cargoLink) return
      this.savingCargo = true
      try {
        await this.$emit('save-cargo', { link: this.cargoLink, fechaCarga: new Date() })
      } finally { this.savingCargo = false }
    },
    async markDelivered() {
      this.markingDelivered = true
      try { await this.$emit('mark-delivered') } finally { this.markingDelivered = false }
    }
  }
}
</script>

<style scoped>
::v-deep .confirmacion-stepper .v-stepper__step--complete .v-stepper__step__step,
::v-deep .confirmacion-stepper .v-stepper__step--active .v-stepper__step__step {
  background-color: #6eb49c !important;
}

::v-deep .confirmacion-stepper .v-stepper__step--complete + .v-divider {
  border-color: #6eb49c !important;
}
</style>
