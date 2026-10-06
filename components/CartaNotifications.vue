<template>
  <v-menu v-if="user.id && $auth.can('/documentos/cartas')" v-model="open" bottom left offset-y :close-on-content-click="false" max-width="380">
    <template #activator="{ on, attrs }">
      <v-btn icon aria-label="Confirmaciones de cartas" v-bind="attrs" v-on="on">
        <v-badge :value="notifications.length > 0" :content="notifications.length" color="error" overlap>
          <v-icon>mdi-email-check-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>
    <v-card width="360" max-width="90vw">
      <v-card-title class="text-subtitle-1">Recepciones confirmadas</v-card-title>
      <v-progress-linear v-if="!ready && !error" indeterminate />
      <v-alert v-if="error" type="error" dense text class="ma-2">{{ error }}</v-alert>
      <v-list class="notification-list" two-line>
        <v-list-item v-for="task in notifications" :key="task.id" :disabled="!!reading" @click="readTask(task)">
          <v-list-item-icon><v-icon color="primary">mdi-email-check-outline</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="notification-title">{{ task.correlativo || 'Carta' }}</v-list-item-title>
            <v-list-item-subtitle>{{ (task.cliente || {}).nombre || 'El cliente' }} confirm&oacute; la recepci&oacute;n.</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="ready && !notifications.length && !error"><v-list-item-content>No tienes notificaciones pendientes.</v-list-item-content></v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script>


export default {
  data() {
    return { open: false, tasks: [], receipts: [], ready: false, error: '', reading: '', generation: 0 }
  },
  computed: {
    user() { return this.$auth?.user || {} },
    identity() { return JSON.stringify([this.user.id, this.user.correo, this.$auth?.can('/documentos/cartas')]) },
    notifications() {
      if (!this.ready) return []
      if (!this.$auth.can('/documentos/cartas')) return []
      return this.tasks.filter(task => !this.receipts.includes(task.id))
        .sort((a, b) => this.confirmationTime(b) - this.confirmationTime(a))
    }
  },
  watch: { identity() { this.subscribe() } },
  mounted() { this.subscribe() },
  beforeDestroy() { this.stop() },
  methods: {
    confirmationTime(carta) {
      const date = carta.confirmacion?.fechaConfirmacion
      return date?.toMillis ? date.toMillis() : date?.seconds ? date.seconds * 1000 : new Date(date || 0).getTime()
    },
    stop() {
      this.generation++
      if (this.stopTasks) this.stopTasks()
      if (this.stopReceipts) this.stopReceipts()
      this.stopTasks = null
      this.stopReceipts = null
    },
    subscribe() {
      this.stop()
      this.tasks = []; this.receipts = []; this.ready = false; this.error = ''; this.open = false
      if (!this.user.id || !this.$db || !this.$auth.can('/documentos/cartas')) return
      const generation = this.generation
      let tasksReady = false
      let receiptsReady = false
      const fail = error => {
        if (generation !== this.generation) return
        console.error('No se pudieron cargar las notificaciones', error)
        this.error = 'No se pudieron cargar las notificaciones.'
        this.ready = false
      }
      this.stopTasks = this.$db.collection('cartas').where('confirmacion.confirmado', '==', true).onSnapshot(snapshot => {
        if (generation !== this.generation) return
        this.tasks = snapshot.docs.filter(doc => !doc.data().anulado && doc.data().estado !== 'Anulado').map(doc => ({ ...doc.data(), id: doc.id }))
        tasksReady = true
        this.ready = tasksReady && receiptsReady
      }, fail)
      this.stopReceipts = this.$db.collection('cartasNotificacionesLeidas').where('usuarioId', '==', this.user.id).onSnapshot(snapshot => {
        if (generation !== this.generation) return
        this.receipts = snapshot.docs.map(doc => doc.data().cartaId)
        receiptsReady = true
        this.ready = tasksReady && receiptsReady
      }, fail)
    },
    async readTask(task) {
      if (this.reading || !this.$auth.can('/documentos/cartas')) return
      const usuarioId = this.user.id
      const generation = this.generation
      this.reading = task.id
      this.error = ''
      try {
        // Stable receipt per user/task: edits and reloads never create a new notification.
        const id = encodeURIComponent(JSON.stringify([usuarioId, task.id]))
        await this.$db.collection('cartasNotificacionesLeidas').doc(id).set({ usuarioId, cartaId: task.id })
        if (generation !== this.generation) return
        if (!this.receipts.includes(task.id)) this.receipts.push(task.id)
        this.open = false
        if (this.$route.path !== '/documentos/cartas' || this.$route.query.cartaId !== task.id) {
          await this.$router.push({ path: '/documentos/cartas', query: { cartaId: task.id } })
        }
      } catch (error) {
        console.error(error)
        if (generation === this.generation) this.error = 'No se pudo abrir la carta. Intenta nuevamente.'
      } finally { this.reading = '' }
    }
  }
}
</script>

<style scoped>
.notification-list { max-height: 360px; overflow-y: auto; }
.notification-title { white-space: normal; overflow-wrap: anywhere; }
</style>
