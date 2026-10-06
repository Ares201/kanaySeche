<template>
  <v-container class="py-10" style="max-width: 760px">
    <v-card v-if="loading" outlined><v-card-text>Cargando confirmación...</v-card-text></v-card>
    <v-card v-else-if="!carta" outlined><v-card-title>Enlace inválido</v-card-title><v-card-text>Este enlace no corresponde a una carta disponible.</v-card-text></v-card>
    <template v-else>
      <v-card outlined>
        <v-card-title class="confirmacion-title">Confirmación de recepción - {{ carta.correlativo }}</v-card-title>
        <v-card-text>
          <p><strong>Cliente:</strong> {{ (carta.cliente || {}).nombre || '-' }}</p>
          <p><strong>Fecha de emisión:</strong> {{ formatDate(carta.fecha) }}</p>
          <p><strong>Estado:</strong> <v-chip small :color="confirmado ? '#6eb49c' : 'warning'" dark>{{ confirmado ? 'Confirmado' : 'Pendiente' }}</v-chip></p>
          <v-data-table :headers="headers" :items="carta.detalles || []" hide-default-footer>
            <template #item.codigo="{ item }">{{ item.numeroTexto || item.numero || '-' }}</template>
            <template #item.documento="{ item }">{{ item.descripcion || '-' }}</template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-card v-if="confirmado" outlined class="mt-6">
        <v-card-title class="confirmacion-title">Documento confirmado correctamente</v-card-title>
        <v-card-text><p v-if="carta.confirmacion.observacion"><strong>Nota:</strong> {{ carta.confirmacion.observacion }}</p><p class="mb-0"><strong>Fecha:</strong> {{ formatDate(carta.confirmacion.fechaConfirmacion) }}</p></v-card-text>
      </v-card>
      <v-card v-else outlined class="mt-6">
        <v-card-title>Confirmar recepción</v-card-title>
        <v-card-text><v-form @submit.prevent="confirmar">
          <v-textarea v-model.trim="form.observacion" label="Observacion o nota (opcional)" outlined rows="3" maxlength="2000" counter="2000" :disabled="saving" />
          <v-btn type="submit" color="#6eb49c" dark :loading="saving">Confirmar recepción</v-btn>
        </v-form></v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script>
export default {
  name: 'ConfirmacionPublicaPage',
  layout: 'public',
  data() { return { loading: true, carta: null, saving: false, form: { observacion: '' }, headers: [{ text: 'Código', value: 'codigo' }, { text: 'Documento', value: 'documento' }] } },
  computed: { confirmado() { return !!((this.carta || {}).confirmacion || {}).confirmado } },
  mounted() { this.loadCarta() },
  methods: {
    async loadCarta() {
      this.loading = true
      try {
        const snapshot = await this.$db.collection('cartas').where('tokenConfirmacion', '==', this.$route.params.token).limit(1).get()
        if (!snapshot.empty && !snapshot.docs[0].data().anulado && snapshot.docs[0].data().estadoProceso !== 'Anulado') this.carta = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      } catch (error) { console.error(error) } finally { this.loading = false }
    },
    formatDate(value) {
      if (!value) return '-'
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value.seconds ? value.seconds * 1000 : value)
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('es-PE')
    },
    async confirmar() {
      if (!this.carta || this.saving || this.confirmado) return
      this.saving = true
      try {
        const observacion = String(this.form.observacion || '').trim()
        if (observacion.length > 2000) throw new Error('La nota excede el limite permitido.')
        const ref = this.$db.collection('cartas').doc(this.carta.id)
        let result
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          const current = snapshot.exists ? snapshot.data() : null
          if (!current || current.anulado || current.estadoProceso === 'Anulado' || current.estado === 'Anulado' || current.tokenConfirmacion !== this.$route.params.token) throw new Error('La carta ya no esta disponible.')
          if (current.confirmacion?.confirmado) { result = current; return }
          const now = new Date()
          const payload = { confirmacion: { confirmado: true, observacion, fechaConfirmacion: now }, estadoProceso: 'Entregado', estado: 'Entregado', fechaActualizacion: now }
          transaction.update(ref, payload)
          result = { ...current, ...payload }
        })
        this.carta = { ...result, id: this.carta.id }
      } catch (error) { alert('No se pudo guardar la confirmación. Inténtalo nuevamente.') } finally { this.saving = false }
    }
  }
}
</script>

<style scoped>
.confirmacion-title {
  color: var(--ui-text-6eb49c, #6eb49c);
}
</style>
