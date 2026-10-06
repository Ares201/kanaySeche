<template>
  <v-menu v-if="user.id && ($auth.can('/inicio/tareas') || $auth.can('/documentos/cartas'))" v-model="open" bottom left offset-y :close-on-content-click="false" max-width="380">
    <template #activator="{ on, attrs }">
      <v-btn icon aria-label="Notificaciones" v-bind="attrs" v-on="on">
        <v-badge :value="notifications.length > 0" :content="notifications.length" color="error" overlap>
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>
    <v-card width="360" max-width="90vw">
      <v-card-title class="text-subtitle-1">Notificaciones</v-card-title>
      <v-card-actions><v-btn small text color="primary" :disabled="!notifications.length || !!reading" @click="readAll">Marcar todas como le&iacute;das</v-btn></v-card-actions>
      <v-progress-linear v-if="!ready && !error" indeterminate />
      <v-alert v-if="error" type="error" dense text class="ma-2">{{ error }}</v-alert>
      <v-list class="notification-list" two-line>
        <v-list-item v-for="task in notifications" :key="task.kind + task.id" :disabled="!!reading" @click="readTask(task)">
          <v-list-item-icon><v-icon color="primary">{{ task.kind === 'carta' ? 'mdi-email-check-outline' : 'mdi-account-multiple-plus' }}</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="notification-title">{{ task.titulo }}</v-list-item-title>
            <v-list-item-subtitle>{{ task.kind === 'carta' ? ((task.cliente || {}).nombre || 'El cliente') + ' confirmó la recepción.' : (task.creadorNombre || 'Un usuario') + ' compartió esta tarea contigo.' }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <v-list-item v-if="ready && !notifications.length && !error"><v-list-item-content>No tienes notificaciones pendientes.</v-list-item-content></v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script>
import { normalizeTarea, isTareaSharedWith } from '~/models/tarea'

export default {
  data() {
    return { open: false, tasks: [], receipts: [], cartas: [], cartaReceipts: [], ready: false, error: '', reading: '', generation: 0 }
  },
  computed: {
    user() { return this.$auth?.user || {} },
    identity() { return JSON.stringify([this.user.id, this.user.correo, this.$auth?.can('/inicio/tareas'), this.$auth?.can('/documentos/cartas')]) },
    notifications() {
      if (!this.ready) return []
      const tasks = this.$auth.can('/inicio/tareas') ? this.tasks.filter(task => task.creadorId !== this.user.id && isTareaSharedWith(task, this.user) && !this.receipts.includes(task.id)).map(task => ({ ...task, kind: 'tarea', time: task.fechaCreacion?.getTime() || 0 })) : []
      const cartas = this.$auth.can('/documentos/cartas') ? this.cartas.filter(carta => !this.cartaReceipts.includes(carta.id)).map(carta => {
        const date = carta.confirmacion?.fechaConfirmacion
        return { ...carta, kind: 'carta', titulo: carta.correlativo || 'Carta confirmada', time: date?.toMillis ? date.toMillis() : date?.seconds ? date.seconds * 1000 : new Date(date || 0).getTime() }
      }) : []
      return [...tasks, ...cartas].sort((a, b) => b.time - a.time)
    }
  },
  watch: { identity() { this.subscribe() } },
  mounted() { this.subscribe() },
  beforeDestroy() { this.stop() },
  methods: {
    stop() {
      this.generation++
      if (this.stopCartas) this.stopCartas()
      if (this.stopCartaReceipts) this.stopCartaReceipts()
      this.stopCartas = null
      this.stopCartaReceipts = null
      if (this.stopTasks) this.stopTasks()
      if (this.stopReceipts) this.stopReceipts()
      this.stopTasks = null
      this.stopReceipts = null
    },
    subscribe() {
      this.stop()
      this.tasks = []; this.receipts = []; this.cartas = []; this.cartaReceipts = []; this.ready = false; this.error = ''; this.open = false
      if (!this.user.id || !this.$db || (!this.$auth.can('/inicio/tareas') && !this.$auth.can('/documentos/cartas'))) return
      const generation = this.generation
      let tasksReady = !this.$auth.can('/inicio/tareas')
      let receiptsReady = tasksReady
      let cartasReady = !this.$auth.can('/documentos/cartas')
      let cartaReceiptsReady = cartasReady
      const updateReady = () => { this.ready = tasksReady && receiptsReady && cartasReady && cartaReceiptsReady }
      const fail = error => {
        if (generation !== this.generation) return
        console.error('No se pudieron cargar las notificaciones', error)
        this.error = 'No se pudieron cargar las notificaciones.'
        this.ready = false
      }
      if (this.$auth.can('/inicio/tareas')) {
        this.stopTasks = this.$db.collection(this.$firebaseApi.config.tareas.collection).onSnapshot(snapshot => {
          if (generation !== this.generation) return
          this.tasks = snapshot.docs.filter(doc => !doc.data().anulado && doc.data().estado !== 'Anulado').map(doc => normalizeTarea({ ...doc.data(), id: doc.id }))
          tasksReady = true
          updateReady()
        }, fail)
        this.stopReceipts = this.$db.collection('tareasNotificacionesLeidas').where('usuarioId', '==', this.user.id).onSnapshot(snapshot => {
          if (generation !== this.generation) return
          this.receipts = snapshot.docs.map(doc => doc.data().tareaId)
          receiptsReady = true
          updateReady()
        }, fail)
      }
      if (this.$auth.can('/documentos/cartas')) {
        this.stopCartas = this.$db.collection('cartas').where('confirmacion.confirmado', '==', true).onSnapshot(snapshot => {
          if (generation !== this.generation) return
          this.cartas = snapshot.docs.filter(doc => !doc.data().anulado && doc.data().estado !== 'Anulado').map(doc => ({ ...doc.data(), id: doc.id }))
          cartasReady = true; updateReady()
        }, fail)
        this.stopCartaReceipts = this.$db.collection('cartasNotificacionesLeidas').where('usuarioId', '==', this.user.id).onSnapshot(snapshot => {
          if (generation !== this.generation) return
          this.cartaReceipts = snapshot.docs.map(doc => doc.data().cartaId)
          cartaReceiptsReady = true; updateReady()
        }, fail)
      }
    },
    async readAll() {
      if (this.reading) return
      const pending = this.notifications.slice()
      const generation = this.generation
      const usuarioId = this.user.id
      this.reading = 'all'; this.error = ''
      try {
        for (let offset = 0; offset < pending.length; offset += 400) {
          if (generation !== this.generation) return
          const batch = this.$db.batch()
          const chunk = pending.slice(offset, offset + 400)
          chunk.forEach(item => {
            const carta = item.kind === 'carta'
            const id = encodeURIComponent(JSON.stringify([usuarioId, item.id]))
            batch.set(this.$db.collection(carta ? 'cartasNotificacionesLeidas' : 'tareasNotificacionesLeidas').doc(id), { usuarioId, [carta ? 'cartaId' : 'tareaId']: item.id })
          })
          await batch.commit()
          if (generation !== this.generation) return
          chunk.forEach(item => { const receipts = item.kind === 'carta' ? this.cartaReceipts : this.receipts; if (!receipts.includes(item.id)) receipts.push(item.id) })
        }
      } catch (error) { if (generation === this.generation) this.error = 'No se pudieron marcar todas las notificaciones. Intenta nuevamente.' }
      finally { this.reading = '' }
    },
    async readTask(task) {
      if (this.reading) return
      const carta = task.kind === 'carta'
      const path = carta ? '/documentos/cartas' : '/inicio/tareas'
      if (!this.$auth.can(path)) return
      const receipts = carta ? this.cartaReceipts : this.receipts
      const usuarioId = this.user.id
      const generation = this.generation
      this.reading = task.id
      this.error = ''
      try {
        // Stable receipt per user/task: edits and reloads never create a new notification.
        const id = encodeURIComponent(JSON.stringify([usuarioId, task.id]))
        await this.$db.collection(carta ? 'cartasNotificacionesLeidas' : 'tareasNotificacionesLeidas').doc(id).set({ usuarioId, [carta ? 'cartaId' : 'tareaId']: task.id })
        if (generation !== this.generation) return
        if (!receipts.includes(task.id)) receipts.push(task.id)
        this.open = false
        if (this.$route.path !== path || this.$route.query[carta ? 'cartaId' : 'tarea'] !== task.id) {
          await this.$router.push({ path, query: { [carta ? 'cartaId' : 'tarea']: task.id } })
        }
      } catch (error) {
        console.error(error)
        if (generation === this.generation) this.error = 'No se pudo abrir la tarea. Intenta nuevamente.'
      } finally { this.reading = '' }
    }
  }
}
</script>

<style scoped>
.notification-list { max-height: 360px; overflow-y: auto; }
.notification-title { white-space: normal; overflow-wrap: anywhere; }
</style>
