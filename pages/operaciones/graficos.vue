<template>
  <section class="charts-page">
    <header class="page-header">
      <div>
        <h1>Gráficos</h1>
        <p>Seguimiento de ingresos de cisterna y pedidos de venta.</p>
      </div>
      <div class="filters">
        <label>Desde <input v-model="fechaInicio" type="date"></label>
        <label>Hasta <input v-model="fechaFin" type="date"></label>
        <button type="button" title="Restablecer filtros" @click="resetFiltros"><v-icon small>mdi-refresh</v-icon></button>
        <button type="button" title="Mostrar todo" @click="mostrarTodo"><v-icon small>mdi-eye</v-icon></button>
      </div>
    </header>
    <v-row dense>
      <v-col cols="12" md="6">
        <article class="chart-card">
          <h2><v-icon>mdi-truck</v-icon> Ingresos Cisterna</h2>
          <div class="stats">
            <div><span>Total</span><strong>{{ totalIngresos }}</strong></div>
            <div><span>Promedio diario</span><strong>{{ promedioDiario }}</strong></div>
            <div><span>Días con datos</span><strong>{{ diasConDatos }}</strong></div>
          </div>
          <div class="chart-area"><span v-if="loading">Cargando datos...</span><canvas v-else ref="ingresosCanvas" /></div>
        </article>
      </v-col>
      <v-col cols="12" md="6">
        <article class="chart-card">
          <h2><v-icon>mdi-cart</v-icon> Pedidos de Venta</h2>
          <div class="stats pedidos">
            <div><span>Total pedidos</span><strong>{{ totalPedidos }}</strong></div>
            <div><span>Promedio diario</span><strong>{{ promedioDiarioPedidos }}</strong></div>
            <div><span>Días con datos</span><strong>{{ diasConDatosPedidos }}</strong></div>
          </div>
          <div class="chart-area"><span v-if="loading">Cargando datos...</span><canvas v-else ref="pedidosCanvas" /></div>
        </article>
      </v-col>
    </v-row>
  </section>
</template>

<script>
import Chart from 'chart.js/auto'
import { normalizeIngresoCisterna } from '~/models/ingresoCisterna'

export default {
  name: 'GraficosOperacionesPage',
  data: () => ({ loading: false, ingresos: [], pedidos: [], fechaInicio: '', fechaFin: '', ingresosChart: null, pedidosChart: null }),
  computed: {
    ingresosFiltrados() { return this.filtrarPorFecha(this.ingresos, 'fechaIngreso') },
    pedidosFiltrados() { return this.filtrarPorFecha(this.pedidos, 'fechaCreacion') },
    datosGraficoIngresos() { return this.agruparPorDia(this.ingresosFiltrados, 'fechaIngreso') },
    datosGraficoPedidos() { return this.agruparPorDia(this.pedidosFiltrados, 'fechaCreacion') },
    totalIngresos() { return this.ingresosFiltrados.length },
    promedioDiario() { return this.promedio(this.totalIngresos, this.datosGraficoIngresos.labels.length) },
    diasConDatos() { return this.datosGraficoIngresos.labels.length },
    totalPedidos() { return this.pedidosFiltrados.length },
    promedioDiarioPedidos() { return this.promedio(this.totalPedidos, this.datosGraficoPedidos.labels.length) },
    diasConDatosPedidos() { return this.datosGraficoPedidos.labels.length }
  },
  watch: { ingresosFiltrados() { this.renderizarGraficoIngresos() }, pedidosFiltrados() { this.renderizarGraficoPedidos() } },
  mounted() { this.cargarDatos() },
  beforeDestroy() { this.destruirGraficos() },
  methods: {
    async cargarDatos() {
      this.loading = true; this.resetFiltros()
      try {
        const [ingresos, pedidos] = await Promise.all([this.$firebaseApi.list('ingresosCisterna'), this.$firebaseApi.list('pedidosVenta')])
        this.ingresos = ingresos.map(normalizeIngresoCisterna).filter(ingreso => ingreso.estado !== false)
        this.pedidos = pedidos.map(pedido => ({ id: pedido.id || '', fechaCreacion: pedido.fechaCreacion || null }))
      } catch (error) { console.error('Error al cargar gráficos de operaciones:', error); alert('No se pudieron cargar los datos de los gráficos') }
      finally { this.loading = false; this.$nextTick(() => { this.renderizarGraficoIngresos(); this.renderizarGraficoPedidos() }) }
    },
    resetFiltros() { const hoy = new Date(); this.fechaInicio = this.formatearInputDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); this.fechaFin = this.formatearInputDate(hoy) },
    mostrarTodo() { this.fechaInicio = ''; this.fechaFin = '' },
    formatearInputDate(fecha) { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}` },
    obtenerFechaString(fecha) {
      if (!fecha) return null
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
      const date = fecha.toDate ? fecha.toDate() : fecha.seconds !== undefined ? new Date(fecha.seconds * 1000) : new Date(fecha)
      return Number.isNaN(date.getTime()) ? null : this.formatearInputDate(date)
    },
    filtrarPorFecha(items, campo) { return items.filter(item => { const fecha = this.obtenerFechaString(item[campo]); return fecha && (!this.fechaInicio || fecha >= this.fechaInicio) && (!this.fechaFin || fecha <= this.fechaFin) }) },
    agruparPorDia(items, campo) {
      const grupos = {}; items.forEach(item => { const fecha = this.obtenerFechaString(item[campo]); if (fecha) grupos[fecha] = (grupos[fecha] || 0) + 1 })
      const fechas = Object.keys(grupos).sort(); return { labels: fechas.map(fecha => fecha.split('-').reverse().join('/')), counts: fechas.map(fecha => grupos[fecha]) }
    },
    promedio(total, dias) { return dias ? (total / dias).toFixed(1) : '0' },
    renderizarGraficoIngresos() { this.renderizarGrafico('ingresosCanvas', 'ingresosChart', this.datosGraficoIngresos, 'Ingresos', '#0f766e', 'ingreso(s)') },
    renderizarGraficoPedidos() { this.renderizarGrafico('pedidosCanvas', 'pedidosChart', this.datosGraficoPedidos, 'Pedidos', '#f54927', 'pedido(s)') },
    renderizarGrafico(ref, instance, datos, etiqueta, color, unidad) {
      this.$nextTick(() => {
        const canvas = this.$refs[ref]; if (!canvas) return
        if (this[instance]) this[instance].destroy()
        const ctx = canvas.getContext('2d')
        if (!datos.labels.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#64748b'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No hay datos en el período seleccionado', canvas.width / 2, canvas.height / 2); this[instance] = null; return }
        this[instance] = new Chart(ctx, { type: 'bar', data: { labels: datos.labels, datasets: [{ label: etiqueta, data: datos.counts, backgroundColor: color, borderRadius: 4, barPercentage: 0.6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.raw} ${unidad}` } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: Math.max(1, Math.ceil(Math.max(...datos.counts) / 5)) } }, x: { grid: { display: false } } } } })
      })
    },
    destruirGraficos() { ['ingresosChart', 'pedidosChart'].forEach(key => { if (this[key]) { this[key].destroy(); this[key] = null } }) }
  }
}
</script>

<style scoped>
.charts-page { min-height: 100vh; padding: 24px 16px; background: #f1f5f9; font-family: Inter, sans-serif; }
.page-header { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 20px; } h1, h2, p { margin: 0; } h1 { color: #0f172a; font-size: 28px; } .page-header p { margin-top: 5px; color: #64748b; }
.filters { display: flex; align-items: end; gap: 8px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }.filters label { display: grid; gap: 3px; color: #475569; font-size: 12px; font-weight: 600; }.filters input { height: 34px; border: 1px solid #d1d9e6; border-radius: 6px; padding: 0 8px; }.filters button { width: 34px; height: 34px; border: 0; border-radius: 6px; background: #f1f5f9; color: #0f766e; cursor: pointer; }
.chart-card { height: 100%; padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }.chart-card h2 { display: flex; align-items: center; gap: 8px; color: #0f172a; font-size: 18px; }.chart-card h2 .v-icon { color: #0f766e; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }.stats div { padding: 12px; border-left: 4px solid #0f766e; background: #fafbfc; }.stats.pedidos div { border-left-color: #f54927; }.stats span, .stats strong { display: block; }.stats span { color: #64748b; font-size: 11px; text-transform: uppercase; }.stats strong { margin-top: 4px; color: #0f172a; font-size: 23px; }
.chart-area { position: relative; height: 240px; padding: 6px; background: #fafbfc; }.chart-area > span { display: grid; height: 100%; place-items: center; color: #64748b; }.chart-area canvas { width: 100% !important; height: 100% !important; }
@media (max-width: 960px) { .page-header { align-items: stretch; flex-direction: column; } .filters { align-self: stretch; } } @media (max-width: 600px) { .charts-page { padding: 12px 10px; }.filters { flex-wrap: wrap; }.filters label { flex: 1 1 135px; }.stats { gap: 8px; }.stats div { padding: 10px 8px; }.stats strong { font-size: 20px; }.chart-area { height: 190px; } }
</style>
