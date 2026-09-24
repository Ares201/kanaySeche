<template>
  <section class="tasks-page">
    <div class="page-header">
      <div><p class="eyebrow">Inicio</p><h1>Mis tareas</h1><span>{{ tareasVisibles.length }} tareas visibles</span></div>
      <div class="header-actions">
        <v-btn-toggle v-model="viewMode" mandatory dense><v-btn small value="kanban"><v-icon small>mdi-view-dashboard</v-icon></v-btn><v-btn small value="table"><v-icon small>mdi-table</v-icon></v-btn></v-btn-toggle>
        <v-btn color="primary" @click="openCreate"><v-icon left>mdi-plus</v-icon>Nueva tarea</v-btn>
      </div>
    </div>

    <v-card class="filters" outlined>
      <v-text-field v-model.trim="search" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" label="Buscar tarea" />
      <v-select v-model="prioridadFiltro" :items="prioridades" dense outlined hide-details clearable label="Prioridad" />
      <v-select v-model="origenFiltro" :items="origenes" dense outlined hide-details clearable label="Origen" />
    </v-card>

    <div v-if="viewMode === 'kanban'" class="kanban-board">
      <div v-for="estado in estados" :key="estado" class="kanban-column">
        <div class="column-header"><strong>{{ estado }}</strong><span>{{ kanbanColumns[estado].length }}</span></div>
        <draggable :list="kanbanColumns[estado]" group="tareas" class="kanban-list" @change="event => onDragChange(event, estado)">
          <article v-for="tarea in kanbanColumns[estado]" :key="tarea.id" class="task-card" @click="openTask(tarea)">
            <div class="task-top"><v-chip x-small :color="priorityColor(tarea.prioridad)" dark>{{ tarea.prioridad }}</v-chip><v-icon v-if="!canEdit(tarea)" small title="Compartida contigo">mdi-account-arrow-left-outline</v-icon></div>
            <h3>{{ tarea.titulo }}</h3>
            <p>{{ truncate(tarea.descripcion, 90) }}</p>
            <div class="task-meta"><span><v-icon x-small>mdi-calendar</v-icon>{{ formatDate(tarea.fechaLimite) || 'Sin fecha' }}</span><span v-if="tarea.compartidoConNombre"><v-icon x-small>mdi-account-multiple</v-icon>{{ tarea.compartidoConNombre }}</span></div>
          </article>
          <div v-if="!kanbanColumns[estado].length" class="empty-column">Sin tareas</div>
        </draggable>
      </div>
    </div>

    <v-card v-else outlined>
      <v-data-table :headers="headers" :items="tareasFiltradas" :loading="loading" item-key="id" no-data-text="No hay tareas">
        <template #[`item.prioridad`]="{ item }"><v-chip small :color="priorityColor(item.prioridad)" dark>{{ item.prioridad }}</v-chip></template>
        <template #[`item.fechaLimite`]="{ item }">{{ formatDate(item.fechaLimite) || 'Sin fecha' }}</template>
        <template #[`item.origen`]="{ item }">{{ canEdit(item) ? 'Creada por mí' : `Compartida por ${item.creadorNombre}` }}</template>
        <template #[`item.actions`]="{ item }"><v-btn icon small :title="canEdit(item) ? 'Editar' : 'Ver'" @click="openTask(item)"><v-icon small>{{ canEdit(item) ? 'mdi-pencil' : 'mdi-eye' }}</v-icon></v-btn><v-btn v-if="canEdit(item)" icon small color="error" title="Eliminar" @click="removeTask(item)"><v-icon small>mdi-delete</v-icon></v-btn></template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="680" persistent>
      <v-card>
        <v-card-title>{{ editingId ? (readOnly ? 'Detalle de tarea' : 'Editar tarea') : 'Nueva tarea' }}</v-card-title>
        <v-card-text>
          <v-alert v-if="readOnly" type="info" dense text>Esta tarea fue compartida contigo. Puedes verla y moverla entre estados, pero solo su creador puede editar su contenido.</v-alert>
          <v-text-field v-model.trim="form.titulo" :readonly="readOnly" label="Título" outlined required />
          <v-textarea v-model.trim="form.descripcion" :readonly="readOnly" label="Descripción" outlined rows="3" />
          <v-row><v-col cols="12" sm="6"><v-select v-model="form.prioridad" :readonly="readOnly" :items="prioridades" label="Prioridad" outlined /></v-col><v-col cols="12" sm="6"><v-text-field v-model="form.fechaLimite" :readonly="readOnly" label="Fecha límite" type="date" outlined /></v-col></v-row>
          <v-autocomplete v-model="form.compartidos" multiple chips deletable-chips return-object :readonly="readOnly" :items="personalDisponible" item-text="nombres" item-value="id" label="Compartir con" outlined clearable hint="Las personas seleccionadas podrán visualizar y mover la tarea" persistent-hint />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="dialog=false">{{ readOnly ? 'Cerrar' : 'Cancelar' }}</v-btn><v-btn v-if="!readOnly" color="primary" :loading="saving" @click="saveTask">Guardar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import draggable from 'vuedraggable'
import { normalizePersonal } from '~/models/personal'
import { createEmptyTareaForm, normalizeTarea, toTareaPayload, ESTADOS_TAREA, PRIORIDADES_TAREA, canViewTarea } from '~/models/tarea'

export default {
  name: 'TareasPage',
  components: { draggable },
  data() {
    return {
      tareas: [], personal: [], estados: ESTADOS_TAREA, prioridades: PRIORIDADES_TAREA,
      origenes: [{ text: 'Creadas por mí', value: 'propias' }, { text: 'Compartidas conmigo', value: 'compartidas' }],
      search: '', prioridadFiltro: null, origenFiltro: null, viewMode: 'kanban', loading: false, saving: false,
      openedNotificationId: null, kanbanColumns: {}, dialog: false, editingId: null, readOnly: false, form: createEmptyTareaForm(),
      headers: [
        { text: 'Tarea', value: 'titulo' }, { text: 'Prioridad', value: 'prioridad' }, { text: 'Fecha límite', value: 'fechaLimite' },
        { text: 'Estado', value: 'estado' }, { text: 'Origen', value: 'origen', sortable: false }, { text: 'Acciones', value: 'actions', sortable: false }
      ]
    }
  },
  computed: {
    currentUser() { return this.$auth?.user || {} },
    tareasVisibles() {
      return this.tareas.filter(tarea => canViewTarea(tarea, this.currentUser))
    },
    tareasFiltradas() {
      const term = String(this.search || '').toLowerCase()
      return this.tareasVisibles.filter(tarea => {
        const matchesSearch = !term || tarea.titulo.toLowerCase().includes(term) || tarea.descripcion.toLowerCase().includes(term)
        const matchesPriority = !this.prioridadFiltro || tarea.prioridad === this.prioridadFiltro
        const matchesOrigin = !this.origenFiltro || (this.origenFiltro === 'propias' ? this.canEdit(tarea) : !this.canEdit(tarea))
        return matchesSearch && matchesPriority && matchesOrigin
      })
    },
    personalDisponible() { return this.personal.filter(persona => persona.estado && persona.id !== this.currentUser.id) }
  },
  watch: { '$route.query.tarea'() { this.loadData() }, tareasFiltradas: { handler() { this.syncColumns() }, immediate: true } },
  mounted() { this.loadData() },
  methods: {
    openRequestedTask() {
      const task = this.tareasVisibles.find(item => item.id === this.$route.query.tarea)
      if (task && this.openedNotificationId !== task.id) {
        this.openedNotificationId = task.id
        this.openTask(task)
      }
    },
    async loadData() {
      this.loading = true
      try {
        const [tareas, personal] = await Promise.all([this.$firebaseApi.list('tareas'), this.$firebaseApi.list('personal')])
        this.tareas = tareas.map(normalizeTarea)
        this.personal = personal.map(normalizePersonal).filter(persona => persona.estado)
        this.openRequestedTask()
      } catch (error) { console.error(error); alert('No se pudieron cargar las tareas') } finally { this.loading = false }
    },
    syncColumns() {
      const columns = {}
      ESTADOS_TAREA.forEach(estado => { columns[estado] = this.tareasFiltradas.filter(tarea => tarea.estado === estado) })
      this.kanbanColumns = columns
    },
    canEdit(tarea) { return tarea.creadorId === this.currentUser.id },
    openCreate() { this.editingId = null; this.readOnly = false; this.form = createEmptyTareaForm(); this.dialog = true },
    openTask(tarea) { this.editingId = tarea.id; this.readOnly = !this.canEdit(tarea); this.form = { ...tarea, compartidos: tarea.compartidos.map(person => ({ ...person })) }; this.dialog = true },
    async saveTask() {
      if (this.readOnly) return
      if (!this.form.titulo.trim()) return alert('Ingresa el título de la tarea')
      this.saving = true
      try {
        const payload = toTareaPayload(this.form, this.currentUser)
        if (this.editingId) await this.$firebaseApi.update('tareas', this.editingId, payload)
        else await this.$firebaseApi.create('tareas', payload)
        this.dialog = false
        await this.loadData()
      } catch (error) { console.error(error); alert('No se pudo guardar la tarea') } finally { this.saving = false }
    },
    async removeTask(tarea) {
      if (!this.canEdit(tarea) || !confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return
      try { await this.$firebaseApi.remove('tareas', tarea.id); await this.loadData() } catch (error) { console.error(error); alert('No se pudo eliminar la tarea') }
    },
    async onDragChange(event, estado) {
      const tarea = event.added?.element
      if (!tarea?.id || tarea.estado === estado) return
      try { tarea.estado = estado; await this.$firebaseApi.update('tareas', tarea.id, { estado }); await this.loadData() } catch (error) { console.error(error); alert('No se pudo mover la tarea'); await this.loadData() }
    },
    priorityColor(value) { return { Alta: 'red darken-1', Media: 'orange darken-1', Baja: 'green darken-1' }[value] || 'grey' },
    formatDate(value) { if (!value) return ''; const [y, m, d] = value.split('-'); return `${d}/${m}/${y}` },
    truncate(value, length) { const text = String(value || ''); return text.length > length ? `${text.slice(0, length)}…` : text }
  }
}
</script>

<style scoped>
.tasks-page{width:92%;margin:0 auto;padding:32px 0}.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.page-header h1{margin:3px 0}.page-header span{color:#64748b}.eyebrow{margin:0;color:#0f766e;font-size:13px;font-weight:700;text-transform:uppercase}.header-actions,.filters{display:flex;align-items:center;gap:12px}.filters{margin-bottom:18px;padding:14px}.filters>*{max-width:320px}.kanban-board{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:16px}.kanban-column{height:clamp(320px,65vh,760px);overflow:hidden;display:flex;flex-direction:column;min-height:440px;padding:12px;border:1px solid #dbe5eb;border-radius:10px;background:#f8fafc}.column-header{display:flex;justify-content:space-between;padding:5px 4px 12px;border-bottom:2px solid #dbe5eb}.column-header span{min-width:25px;padding:2px 7px;border-radius:20px;background:#e2e8f0;text-align:center}.kanban-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:10px 4px 0 0}.column-header{flex-shrink:0}.task-card{overflow-wrap:anywhere}.task-card{margin-bottom:10px;padding:13px;border:1px solid #dbe5eb;border-left:4px solid #00558a;border-radius:8px;background:white;box-shadow:0 2px 5px rgba(15,23,42,.06);cursor:grab}.task-top,.task-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.task-card h3{margin:10px 0 5px;font-size:15px}.task-card p{min-height:32px;margin:0 0 10px;color:#64748b;font-size:12px}.task-meta{align-items:flex-start;flex-direction:column;color:#64748b;font-size:11px}.task-meta span{display:flex;align-items:center;gap:4px}.empty-column{padding:30px 8px;color:#94a3b8;text-align:center}@media(max-width:850px){.page-header,.filters{align-items:stretch;flex-direction:column}.header-actions{justify-content:space-between}.filters>*{max-width:none}.kanban-board{grid-template-columns:1fr}.kanban-column{min-height:260px}}
</style>
