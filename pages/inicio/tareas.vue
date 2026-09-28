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

    <v-dialog v-model="dialog" max-width="620" persistent scrollable content-class="task-dialog">
      <v-card class="task-form-card">
        <v-card-title class="task-form-header">
          <span class="task-form-icon"><v-icon color="primary" size="21">mdi-clipboard-text-outline</v-icon></span>
          <div><h2>{{ editingId ? (readOnly ? 'Detalle de tarea' : 'Editar tarea') : 'Nueva tarea' }}</h2><span>{{ readOnly ? 'Revisa los detalles y comparte tus avances' : 'Detalles y participantes' }}</span></div>
        </v-card-title>
        <v-card-text class="task-form-body">
          <div v-if="readOnly" class="task-shared-note"><v-icon small color="primary">mdi-account-multiple-outline</v-icon>Compartida contigo · Puedes cambiar el estado y comentar.</div>
          <div class="task-fields">
            <v-text-field v-model.trim="form.titulo" :readonly="readOnly" label="Título" outlined dense hide-details required />
            <v-textarea v-model.trim="form.descripcion" :readonly="readOnly" label="Descripción" outlined dense hide-details rows="2" />
            <div class="task-fields-row">
              <v-select v-model="form.prioridad" :readonly="readOnly" :items="prioridades" label="Prioridad" outlined dense hide-details />
              <v-text-field v-model="form.fechaLimite" :readonly="readOnly" label="Fecha límite" type="date" outlined dense hide-details />
            </div>
            <v-autocomplete v-model="form.compartidos" multiple small-chips :deletable-chips="!readOnly" return-object :readonly="readOnly" :items="personalDisponible" item-text="nombres" item-value="id" label="Compartir con" outlined dense hide-details :clearable="!readOnly" />
          </div>
          <section class="task-comments" aria-label="Comentarios de la tarea">
            <div class="comments-heading"><h3>Comentarios <span v-if="comments.length" class="comments-count">{{ comments.length }}</span></h3><span>{{ editingId ? 'Visibles para todos los participantes' : 'Opcional' }}</span></div>
            <v-progress-linear v-if="commentsLoading" indeterminate aria-label="Cargando comentarios" />
            <v-alert v-if="commentError" type="error" dense text role="alert">{{ commentError }}</v-alert>
            <div v-if="comments.length" class="comments-list" aria-live="polite">
              <article v-for="comment in comments" :key="comment.id" class="task-comment">
                <div class="comment-meta"><strong>{{ comment.autorNombre }}</strong><time>{{ formatCommentDate(comment.fecha) }}</time></div>
                <p>{{ comment.texto }}</p>
              </article>
            </div>
            <v-textarea v-model="commentDraft" :disabled="commentSaving || saving || !commentAllowed" :label="editingId ? 'Escribir comentario' : 'Comentario inicial'" outlined dense hide-details rows="2" maxlength="2000" />
            <div class="comment-compose-footer"><span>{{ commentDraft.length }}/2000</span><v-btn v-if="editingId" color="primary" small text :loading="commentSaving" :disabled="!commentDraft.trim() || !commentAllowed || saving" @click="sendComment"><v-icon left small>mdi-send-outline</v-icon>Publicar comentario</v-btn></div>
          </section>
        </v-card-text>
        <v-card-actions class="task-form-actions"><v-spacer /><v-btn small text :disabled="saving || commentSaving" @click="dialog=false">{{ readOnly ? 'Cerrar' : 'Cancelar' }}</v-btn><v-btn v-if="!readOnly" small color="primary" depressed :loading="saving" :disabled="commentSaving" @click="saveTask">Guardar tarea</v-btn></v-card-actions>
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
      comments: [], commentDraft: '', commentSaving: false, commentsLoading: false, commentError: '', commentAllowed: true, commentGeneration: 0,
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
  watch: { dialog(value) { if (!value) this.stopComments() }, '$route.query.tarea'() { this.loadData() }, tareasFiltradas: { handler() { this.syncColumns() }, immediate: true } },
  beforeDestroy() { this.stopComments() },
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
    stopComments() {
      this.commentGeneration++
      if (this.unsubscribeComments) this.unsubscribeComments()
      this.unsubscribeComments = null
    },
    resetComments() { this.stopComments(); this.comments = []; this.commentDraft = ''; this.commentError = ''; this.commentSaving = false; this.commentsLoading = false; this.commentAllowed = true },
    openCreate() { this.resetComments(); this.editingId = null; this.readOnly = false; this.form = createEmptyTareaForm(); this.dialog = true },
    openTask(tarea) {
      this.resetComments()
      this.editingId = tarea.id; this.readOnly = !this.canEdit(tarea); this.form = { ...tarea, compartidos: tarea.compartidos.map(person => ({ ...person })) }; this.dialog = true
      this.commentsLoading = true
      this.commentAllowed = false
      const generation = this.commentGeneration
      this.unsubscribeComments = this.$db.collection(this.$firebaseApi.config.tareas.collection).doc(tarea.id).onSnapshot(doc => {
        if (generation !== this.commentGeneration) return
        const data = doc.exists ? doc.data() : null
        this.commentsLoading = false
        this.commentAllowed = Boolean(data && !data.anulado && canViewTarea(data, this.currentUser))
        this.comments = this.commentAllowed ? normalizeTarea(data).comentarios : []
        this.commentError = this.commentAllowed ? '' : 'Esta tarea ya no está disponible para ti.'
      }, () => {
        if (generation !== this.commentGeneration) return
        this.commentsLoading = false; this.commentAllowed = false; this.comments = []; this.commentError = 'No se pudieron cargar los comentarios. Cierra y vuelve a abrir la tarea.'
      })
    },
    async sendComment() {
      if (this.commentSaving || !this.commentAllowed || !this.editingId || !this.commentDraft.trim()) return
      const generation = this.commentGeneration
      this.commentSaving = true; this.commentError = ''
      try {
        await this.$firebaseApi.commentTask(this.editingId, this.commentDraft)
        if (generation === this.commentGeneration) this.commentDraft = ''
      } catch (error) { if (generation === this.commentGeneration) this.commentError = error.message || 'No se pudo publicar el comentario.' }
      finally { if (generation === this.commentGeneration) this.commentSaving = false }
    },
    formatCommentDate(value) { return value ? new Date(value).toLocaleString('es-PE') : '' },
    async saveTask() {
      if (this.readOnly) return
      if (this.saving || this.commentSaving) return
      if (this.editingId && this.commentDraft.trim()) { this.commentError = 'Publica el comentario antes de guardar los cambios de la tarea.'; return }
      if (!this.form.titulo.trim()) return alert('Ingresa el título de la tarea')
      this.saving = true
      try {
        const payload = toTareaPayload(this.form, this.currentUser)
        if (!this.editingId && this.commentDraft.trim()) {
          if (this.commentDraft.trim().length > 2000) throw new Error('El comentario admite hasta 2000 caracteres.')
          payload.comentarios = [{ id: this.$db.collection(this.$firebaseApi.config.tareas.collection).doc().id, texto: this.commentDraft.trim(), autorId: this.currentUser.id, autorNombre: this.currentUser.nombres || 'Usuario', fecha: new Date() }]
        }
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
.task-form-card.v-card { border-radius: 14px; }
.task-form-card.v-card .task-form-header { word-break: normal; padding: 16px 20px; gap: 12px; flex-wrap: nowrap; border-bottom: 1px solid rgba(100,116,139,.16); }
.task-form-icon { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; background: rgba(0,75,122,.07); border-radius: 10px; }
.task-form-header h2 { margin: 0; font-size: 18px; line-height: 1.3; font-weight: 600; }
.task-form-header span:not(.task-form-icon) { display: block; margin-top: 2px; font-size: 12px; line-height: 1.4; opacity: .65; }
.task-form-card.v-card .task-form-body.v-card__text { padding: 18px 20px 8px; }
.task-fields { display: grid; gap: 14px; }
.task-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.task-fields ::v-deep .v-input, .task-comments ::v-deep .v-input { font-size: 13px; }
.task-fields ::v-deep .v-label, .task-comments ::v-deep .v-label { font-size: 13px; }
.task-shared-note { display: flex; gap: 6px; align-items: center; margin-bottom: 16px; font-size: 12px; color: var(--ui-text-006b8f, #006b8f); }
.task-comments { margin-top: 18px; border-top: 1px solid rgba(100,116,139,.16); padding-top: 12px; }
.comments-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.comments-heading h3 { font-size: 13px; margin: 0; }
.comments-heading > span { font-size: 11px; opacity: .65; }
.comments-count { display: inline-block; padding: 0 6px; margin-left: 4px; background: rgba(0,75,122,.08); border-radius: 8px; font-size: 11px; }
.comments-list { max-height: 150px; overflow-y: auto; margin-bottom: 12px; padding-right: 4px; }
.task-comment { padding: 9px 11px; margin-bottom: 6px; border-radius: 8px; background: rgba(100,116,139,.06); }
.comment-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.comment-meta strong { font-size: 12px; }
.comment-meta time { font-size: 10px; opacity: .65; }
.task-comment p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.comment-compose-footer { display: flex; align-items: center; justify-content: space-between; min-height: 30px; }
.comment-compose-footer > span { font-size: 10px; opacity: .6; }
.task-form-card.v-card .task-form-actions { padding: 10px 20px; border-top: 1px solid rgba(100,116,139,.16); }
@media(max-width: 480px) {
  .task-form-card.v-card .task-form-header { word-break: normal; padding: 14px; }
  .task-form-card.v-card .task-form-body.v-card__text { padding: 16px 14px 6px; }
  .task-form-card.v-card .task-form-actions { padding: 10px 14px; }
  .task-form-header h2 { font-size: 16px; }
  .task-fields-row { gap: 8px; }
  .comments-heading { align-items: flex-start; flex-direction: column; gap: 2px; }
}

.tasks-page{width:92%;margin:0 auto;padding:32px 0}.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.page-header h1{margin:3px 0}.page-header span{color:var(--ui-text-64748b, #64748b)}.eyebrow{margin:0;color:var(--ui-text-0f766e, #0f766e);font-size:13px;font-weight:700;text-transform:uppercase}.header-actions,.filters{display:flex;align-items:center;gap:12px}.filters{margin-bottom:18px;padding:14px}.filters>*{max-width:320px}.kanban-board{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:16px}.kanban-column{height:clamp(320px,65vh,760px);overflow:hidden;display:flex;flex-direction:column;min-height:440px;padding:12px;border:1px solid var(--ui-border-dbe5eb, #dbe5eb);border-radius:10px;background:var(--ui-surface-f8fafc, #f8fafc)}.column-header{display:flex;justify-content:space-between;padding:5px 4px 12px;border-bottom:2px solid var(--ui-border-dbe5eb, #dbe5eb)}.column-header span{min-width:25px;padding:2px 7px;border-radius:20px;background:var(--ui-surface-e2e8f0, #e2e8f0);text-align:center}.kanban-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:10px 4px 0 0}.column-header{flex-shrink:0}.task-card{overflow-wrap:anywhere}.task-card{margin-bottom:10px;padding:13px;border:1px solid var(--ui-border-dbe5eb, #dbe5eb);border-left:4px solid #00558a;border-radius:8px;background:var(--ui-surface-ffffff, white);box-shadow:0 2px 5px rgba(15,23,42,.06);cursor:grab}.task-top,.task-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.task-card h3{margin:10px 0 5px;font-size:15px}.task-card p{min-height:32px;margin:0 0 10px;color:var(--ui-text-64748b, #64748b);font-size:12px}.task-meta{align-items:flex-start;flex-direction:column;color:var(--ui-text-64748b, #64748b);font-size:11px}.task-meta span{display:flex;align-items:center;gap:4px}.empty-column{padding:30px 8px;color:var(--ui-text-94a3b8, #94a3b8);text-align:center}@media(max-width:850px){.page-header,.filters{align-items:stretch;flex-direction:column}.header-actions{justify-content:space-between}.filters>*{max-width:none}.kanban-board{grid-template-columns:1fr}.kanban-column{min-height:260px}}
</style>
