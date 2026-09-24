<template>
  <section class="charts-page">
    <div class="page-header"><div><p class="eyebrow">Inicio</p><h1>Mis gráficos</h1><span>Resumen de tus tareas propias y compartidas</span></div><v-btn outlined color="primary" to="/inicio/tareas"><v-icon left>mdi-view-dashboard</v-icon>Ver tareas</v-btn></div>
    <div class="summary-grid">
      <article><span>Total visibles</span><strong>{{ tareas.length }}</strong><v-icon>mdi-format-list-checks</v-icon></article>
      <article><span>Pendientes</span><strong>{{ countByState('Pendiente') }}</strong><v-icon>mdi-clock-outline</v-icon></article>
      <article><span>En progreso</span><strong>{{ countByState('En progreso') }}</strong><v-icon>mdi-progress-clock</v-icon></article>
      <article><span>Completadas</span><strong>{{ countByState('Completada') }}</strong><v-icon>mdi-check-circle-outline</v-icon></article>
    </div>
    <div class="charts-grid">
      <v-card outlined class="chart-card"><h2>Tareas por estado</h2><div v-for="item in estadosChart" :key="item.label" class="bar-row"><span>{{ item.label }}</span><div class="track"><div class="bar state" :style="{ width: item.width + '%' }" /></div><strong>{{ item.value }}</strong></div></v-card>
      <v-card outlined class="chart-card"><h2>Tareas por prioridad</h2><div v-for="item in prioridadesChart" :key="item.label" class="bar-row"><span>{{ item.label }}</span><div class="track"><div class="bar" :class="item.className" :style="{ width: item.width + '%' }" /></div><strong>{{ item.value }}</strong></div></v-card>
      <v-card outlined class="chart-card"><h2>Origen de las tareas</h2><div v-for="item in origenChart" :key="item.label" class="bar-row"><span>{{ item.label }}</span><div class="track"><div class="bar origin" :style="{ width: item.width + '%' }" /></div><strong>{{ item.value }}</strong></div></v-card>
      <v-card outlined class="chart-card attention"><h2>Próximas fechas límite</h2><div v-if="proximas.length"><div v-for="tarea in proximas" :key="tarea.id" class="deadline"><div><strong>{{ tarea.titulo }}</strong><span>{{ tarea.creadorId === currentUser.id ? 'Creada por mí' : `De ${tarea.creadorNombre}` }}</span></div><v-chip small :color="deadlineColor(tarea)" dark>{{ formatDate(tarea.fechaLimite) }}</v-chip></div></div><p v-else class="empty">No hay tareas pendientes con fecha límite.</p></v-card>
    </div>
  </section>
</template>

<script>
import { normalizeTarea, ESTADOS_TAREA, PRIORIDADES_TAREA , canViewTarea } from '~/models/tarea'

export default {
  name: 'MisGraficosPage',
  data: () => ({ allTasks: [], loading: false }),
  computed: {
    currentUser() { return this.$auth?.user || {} },
    tareas() {
      return this.allTasks.filter(task => canViewTarea(task, this.currentUser))
    },
    estadosChart() { return this.chartItems(ESTADOS_TAREA.map(label => ({ label, value: this.countByState(label) }))) },
    prioridadesChart() { return this.chartItems(PRIORIDADES_TAREA.map(label => ({ label, value: this.tareas.filter(task => task.prioridad === label).length, className: label.toLowerCase() }))) },
    origenChart() { return this.chartItems([{ label: 'Creadas por mí', value: this.tareas.filter(task => task.creadorId === this.currentUser.id).length }, { label: 'Compartidas conmigo', value: this.tareas.filter(task => task.creadorId !== this.currentUser.id).length }]) },
    proximas() { return this.tareas.filter(task => task.estado !== 'Completada' && task.fechaLimite).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite)).slice(0, 6) }
  },
  mounted() { this.loadTasks() },
  methods: {
    async loadTasks() { this.loading = true; try { this.allTasks = (await this.$firebaseApi.list('tareas')).map(normalizeTarea) } catch (error) { console.error(error); alert('No se pudieron cargar los gráficos de tareas') } finally { this.loading = false } },
    countByState(state) { return this.tareas.filter(task => task.estado === state).length },
    chartItems(items) { const max = Math.max(...items.map(item => item.value), 1); return items.map(item => ({ ...item, width: Math.max((item.value / max) * 100, item.value ? 5 : 0) })) },
    formatDate(value) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` },
    deadlineColor(task) { const today = new Date(); today.setHours(0, 0, 0, 0); const [y, m, d] = task.fechaLimite.split('-').map(Number); const days = Math.ceil((new Date(y, m - 1, d) - today) / 86400000); return days < 0 ? 'red' : days <= 2 ? 'orange darken-1' : 'primary' }
  }
}
</script>

<style scoped>
.charts-page{width:92%;margin:0 auto;padding:32px 0}.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.page-header h1{margin:3px 0}.page-header span{color:#64748b}.eyebrow{margin:0;color:#0f766e;font-size:13px;font-weight:700;text-transform:uppercase}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.summary-grid article{position:relative;padding:18px;border:1px solid #dbe5eb;border-left:4px solid #00558a;border-radius:8px;background:#fff}.summary-grid span,.summary-grid strong{display:block}.summary-grid span{color:#64748b;font-size:12px;text-transform:uppercase}.summary-grid strong{margin-top:5px;font-size:28px}.summary-grid .v-icon{position:absolute;right:16px;top:18px;color:#00558a;opacity:.35}.charts-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.chart-card{padding:20px}.chart-card h2{margin:0 0 18px;font-size:17px}.bar-row{display:grid;grid-template-columns:145px 1fr 30px;align-items:center;gap:10px;margin:14px 0}.track{height:16px;overflow:hidden;border-radius:8px;background:#e8eef2}.bar{height:100%;border-radius:8px;background:#f59e0b}.bar.state{background:#00558a}.bar.origin{background:#0f766e}.bar.alta{background:#dc2626}.bar.media{background:#f59e0b}.bar.baja{background:#16a34a}.bar-row>strong{text-align:right}.deadline{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e2e8f0}.deadline div strong,.deadline div span{display:block}.deadline div span{margin-top:3px;color:#64748b;font-size:11px}.empty{color:#64748b}@media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,1fr)}.charts-grid{grid-template-columns:1fr}}@media(max-width:560px){.page-header{align-items:stretch;flex-direction:column}.summary-grid{grid-template-columns:1fr}.bar-row{grid-template-columns:110px 1fr 25px}}
</style>
