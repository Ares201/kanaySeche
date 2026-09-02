<template>
  <section class="charts-page">
    <header class="page-header">
      <div>
        <h1>Gráficos</h1>
        <p>Resumen de cartas y generaciones de PDF.</p>
      </div>
      <div class="filters">
        <label>Desde <input v-model="fechaInicio" type="date"></label>
        <label>Hasta <input v-model="fechaFin" type="date"></label>
        <button type="button" title="Restablecer filtros" @click="resetFiltros"><v-icon small>mdi-refresh</v-icon></button>
        <button type="button" title="Mostrar todo" @click="mostrarTodo"><v-icon small>mdi-eye</v-icon></button>
      </div>
    </header>

    <section class="pdf-summary">
      <article><v-icon>mdi-file-pdf-box</v-icon><span>PDFs generados</span><strong>{{ contadorPDF }}</strong></article>
      <article><v-icon>mdi-clock-outline</v-icon><span>Última generación</span><strong class="date-value">{{ ultimaFechaPDF ? formatDate(ultimaFechaPDF) : 'Sin datos' }}</strong></article>
      <article><v-icon>mdi-file-document-multiple</v-icon><span>Boletas generadas</span><strong>{{ contadorBoletas }}</strong></article>
      <article><v-icon>mdi-clock-outline</v-icon><span>Ultima generacion de boletas</span><strong class="date-value">{{ ultimaFechaBoletas ? formatDate(ultimaFechaBoletas) : 'Sin datos' }}</strong></article>
    </section>

    <article class="chart-card">
      <h2><v-icon>mdi-email</v-icon> Estado de Cartas</h2>
      <div class="stats">
        <div class="emitido"><span>Emitidos</span><strong>{{ totalEmitidos }}</strong></div>
        <div class="enviado"><span>Enviados</span><strong>{{ totalEnviados }}</strong></div>
        <div class="entregado"><span>Entregados</span><strong>{{ totalEntregados }}</strong></div>
        <div class="anulado"><span>Anulados</span><strong>{{ totalAnulados }}</strong></div>
      </div>
      <div class="chart-area"><span v-if="loading">Cargando datos...</span><canvas v-else ref="cartasCanvas" /></div>
    </article>
  </section>
</template>

<script>
import Chart from 'chart.js/auto'

export default {
  name: 'GraficosDocumentosPage',
  data: () => ({ loading: false, cartas: [], contadorPDF: 0, ultimaFechaPDF: null, contadorBoletas: 0, ultimaFechaBoletas: null, fechaInicio: '', fechaFin: '', chart: null }),
  computed: {
    cartasFiltradas() {
      return this.cartas.filter(carta => {
        const fecha = this.obtenerFechaString(carta.fecha || carta.fechaCreacion)
        return fecha && (!this.fechaInicio || fecha >= this.fechaInicio) && (!this.fechaFin || fecha <= this.fechaFin)
      })
    },
    totalEmitidos() { return this.contarEstado('Emitido') },
    totalEnviados() { return this.contarEstado('Enviado') },
    totalEntregados() { return this.contarEstado('Entregado') },
    totalAnulados() { return this.contarEstado('Anulado') },
    datosGrafico() {
      const estados = ['Emitido', 'Enviado', 'Pendiente de Confirmación', 'Entregado', 'Anulado']
      return { labels: estados, counts: estados.map(estado => this.contarEstado(estado)) }
    }
  },
  watch: { cartasFiltradas() { this.renderizarGrafico() } },
  mounted() { this.resetFiltros(); this.cargarDatos(); this.cargarContadorPDF(); this.cargarContadorBoletas() },
  beforeDestroy() { if (this.chart) this.chart.destroy() },
  methods: {
    async cargarDatos() {
      this.loading = true
      try {
        const cartas = await this.$firebaseApi.list('cartas')
        this.cartas = cartas.map(carta => ({ id: carta.id || '', estadoProceso: carta.estadoProceso || carta.estado || 'Emitido', fecha: carta.fecha || null, fechaCreacion: carta.fechaCreacion || null }))
      } catch (error) { console.error('Error al cargar las cartas:', error); alert('No se pudieron cargar los datos de las cartas') }
      finally { this.loading = false; this.$nextTick(this.renderizarGrafico) }
    },
    async cargarContadorPDF() {
      try {
        const total = await this.$db.collection('firmarPdf').get(); this.contadorPDF = total.size
        const ultimo = await this.$db.collection('firmarPdf').orderBy('fecha', 'desc').limit(1).get()
        this.ultimaFechaPDF = ultimo.empty ? null : ultimo.docs[0].data().fecha || null
      } catch (error) {
        console.error('Error cargando contador PDF:', error)
        if (error.code === 'failed-precondition') { const respaldo = await this.$db.collection('firmarPdf').limit(1).get(); this.ultimaFechaPDF = respaldo.empty ? null : respaldo.docs[0].data().fecha || null }
      }
    },
    async cargarContadorBoletas() {
      try {
        const total = await this.$db.collection('procesarBoletas').get(); this.contadorBoletas = total.size
        const ultimo = await this.$db.collection('procesarBoletas').orderBy('fecha', 'desc').limit(1).get()
        this.ultimaFechaBoletas = ultimo.empty ? null : ultimo.docs[0].data().fecha || null
      } catch (error) {
        console.error('Error cargando contador de boletas:', error)
        if (error.code === 'failed-precondition') {
          const respaldo = await this.$db.collection('procesarBoletas').limit(1).get()
          this.ultimaFechaBoletas = respaldo.empty ? null : respaldo.docs[0].data().fecha || null
        }
      }
    },
    contarEstado(estado) { return this.cartasFiltradas.filter(carta => carta.estadoProceso === estado).length },
    resetFiltros() { const hoy = new Date(); this.fechaInicio = this.formatearInputDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); this.fechaFin = this.formatearInputDate(hoy) },
    mostrarTodo() { this.fechaInicio = ''; this.fechaFin = '' },
    formatearInputDate(fecha) { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}` },
    obtenerFechaString(fecha) {
      if (!fecha) return null
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
      const date = fecha.toDate ? fecha.toDate() : fecha.seconds !== undefined ? new Date(fecha.seconds * 1000) : new Date(fecha)
      return Number.isNaN(date.getTime()) ? null : this.formatearInputDate(date)
    },
    formatDate(fecha) { const date = fecha.toDate ? fecha.toDate() : new Date(fecha); return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    renderizarGrafico() {
      this.$nextTick(() => {
        const canvas = this.$refs.cartasCanvas; if (!canvas) return
        if (this.chart) this.chart.destroy()
        const ctx = canvas.getContext('2d'); const { labels, counts } = this.datosGrafico; const total = counts.reduce((sum, count) => sum + count, 0)
        if (!total) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#64748b'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('No hay datos en el período seleccionado', canvas.width / 2, canvas.height / 2); this.chart = null; return }
        this.chart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ data: counts, backgroundColor: ['#3b82f6', '#f59e0b', '#64748b', '#10b981', '#ef4444'], borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.raw} carta(s)` } } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } } })
      })
    }
  }
}
</script>

<style scoped>
.charts-page { min-height: 100vh; padding: 24px 16px; background: #f1f5f9; font-family: Inter, sans-serif; }.page-header { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 20px; } h1, h2, p { margin: 0; } h1 { color: #0f172a; font-size: 28px; }.page-header p { margin-top: 5px; color: #64748b; }
.filters { display: flex; align-items: end; gap: 8px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }.filters label { display: grid; gap: 3px; color: #475569; font-size: 12px; font-weight: 600; }.filters input { height: 34px; border: 1px solid #d1d9e6; border-radius: 6px; padding: 0 8px; }.filters button { width: 34px; height: 34px; border: 0; border-radius: 6px; background: #f1f5f9; color: #0f766e; cursor: pointer; }
.pdf-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }.pdf-summary article { position: relative; padding: 16px; border-left: 4px solid #0f766e; background: #fff; border: 1px solid #e2e8f0; }.pdf-summary .v-icon { position: absolute; right: 14px; top: 14px; color: #0f766e; opacity: .35; }.pdf-summary span, .pdf-summary strong { display: block; }.pdf-summary span { color: #64748b; font-size: 12px; text-transform: uppercase; }.pdf-summary strong { margin-top: 5px; color: #0f172a; font-size: 26px; }.pdf-summary .date-value { font-size: 17px; }
.chart-card { padding: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }.chart-card h2 { display: flex; align-items: center; gap: 8px; color: #0f172a; font-size: 18px; }.chart-card h2 .v-icon { color: #0f766e; }.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }.stats div { padding: 12px; background: #fafbfc; border-left: 4px solid #64748b; }.stats .emitido { border-left-color: #3b82f6; }.stats .enviado { border-left-color: #f59e0b; }.stats .entregado { border-left-color: #10b981; }.stats .anulado { border-left-color: #ef4444; }.stats span, .stats strong { display: block; }.stats span { color: #64748b; font-size: 11px; text-transform: uppercase; }.stats strong { margin-top: 4px; color: #0f172a; font-size: 23px; }.chart-area { position: relative; height: 260px; padding: 6px; background: #fafbfc; }.chart-area > span { display: grid; height: 100%; place-items: center; color: #64748b; }.chart-area canvas { width: 100% !important; height: 100% !important; }
@media (max-width: 960px) { .page-header { align-items: stretch; flex-direction: column; }.filters { align-self: stretch; }.stats { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 600px) { .charts-page { padding: 12px 10px; }.filters { flex-wrap: wrap; }.filters label { flex: 1 1 135px; }.pdf-summary { grid-template-columns: 1fr; }.chart-area { height: 210px; } }
</style>
