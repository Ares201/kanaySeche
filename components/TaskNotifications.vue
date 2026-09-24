<template>
  <v-menu v-if="user.id && $auth.can('/inicio/tareas')" v-model="open" bottom left offset-y :close-on-content-click="false" max-width="380">
    <template #activator="{ on, attrs }">
      <v-btn icon aria-label="Notificaciones de tareas" v-bind="attrs" v-on="on">
        <v-badge :value="notifications.length > 0" :content="notifications.length" color="error" overlap>
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>
    <v-card width="360" max-width="90vw">
      <v-card-title class="text-subtitle-1">Tareas compartidas contigo</v-card-title>
      <v-progress-linear v-if="!ready && !error" indeterminate />
      <v-alert v-if="error" type="error" dense text class="ma-2">{{ error }}</v-alert>
      <v-list class="notification-list" two-line>
        <v-list-item v-for="task in notifications" :key="task.id" :disabled="!!reading" @click="readTask(task)">
          <v-list-item-icon><v-icon color="primary">mdi-account-multiple-plus</v-icon></v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="notification-title">{{ task.titulo }}</v-list-item-title>
            <v-list-item-subtitle>{{ task.creadorNombre || 'Un usuario' }} comparti&oacute; esta tarea contigo.</v-list-item-subtitle>
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
    return { open: false, tasks: [], receipts: [], ready: false, error: '', reading: '', generation: 0 }
  },
  computed: {
    user() { return this.$auth?.user || {} },
    identity() { return JSON.stringify([this.user.id, this.user.correo, this.$auth?.can('/inicio/tareas')]) },
    notifications() {
      if (!this.ready) return []
      return this.tasks.filter(task => task.creadorId !== this.user.id && isTareaSharedWith(task, this.user) && !this.receipts.includes(task.id))
        .sort((a, b) => (b.fechaCreacion?.getTime() || 0) - (a.fechaCreacion?.getTime() || 0))
    }
  },
  watch: { identity() { this.subscribe() } },
  mounted() { this.subscribe() },
  beforeDestroy() { this.stop() },
  methods: {
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
      if (!this.user.id || !this.$db || !this.$auth.can('/inicio/tareas')) return
      const generation = this.generation
      let tasksReady = false
      let receiptsReady = false
      const fail = error => {
        if (generation !== this.generation) return
        console.error('No se pudieron cargar las notificaciones', error)
        this.error = 'No se pudieron cargar las notificaciones.'
        this.ready = false
      }
      this.stopTasks = this.$db.collection(this.$firebaseApi.config.tareas.collection).onSnapshot(snapshot => {
        if (generation !== this.generation) return
        this.tasks = snapshot.docs.filter(doc => !doc.data().anulado && doc.data().estado !== 'Anulado').map(doc => normalizeTarea({ ...doc.data(), id: doc.id }))
        tasksReady = true
        this.ready = tasksReady && receiptsReady
      }, fail)
      this.stopReceipts = this.$db.collection('tareasNotificacionesLeidas').where('usuarioId', '==', this.user.id).onSnapshot(snapshot => {
        if (generation !== this.generation) return
        this.receipts = snapshot.docs.map(doc => doc.data().tareaId)
        receiptsReady = true
        this.ready = tasksReady && receiptsReady
      }, fail)
    },
    async readTask(task) {
      if (this.reading) return
      const usuarioId = this.user.id
      const generation = this.generation
      this.reading = task.id
      this.error = ''
      try {
        // Stable receipt per user/task: edits and reloads never create a new notification.
        const id = encodeURIComponent(JSON.stringify([usuarioId, task.id]))
        await this.$db.collection('tareasNotificacionesLeidas').doc(id).set({ usuarioId, tareaId: task.id })
        if (generation !== this.generation) return
        if (!this.receipts.includes(task.id)) this.receipts.push(task.id)
        this.open = false
        if (this.$route.path !== '/inicio/tareas' || this.$route.query.tarea !== task.id) {
          await this.$router.push({ path: '/inicio/tareas', query: { tarea: task.id } })
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
