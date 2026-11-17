<template>
  <section class="navision-page">
    <header class="page-header">
      <div>
        <p>Documentos</p>
        <h1>Pedidos de venta · Navision</h1>
      </div>
      <v-btn color="primary" :loading="loading" @click="cargar(false)">Consultar Navision</v-btn>
    </header>

    <v-alert v-if="error" type="error" outlined role="alert">{{ error }}</v-alert>

    <v-card outlined>
      <v-card-title>Pedidos consultados <v-spacer /><span class="subtitle-2">{{ pedidos.length }} cargados</span></v-card-title>
      <v-card-text>
        <div class="filters">
          <v-combobox v-model="centroResponsabilidad" :items="centrosResponsabilidad"
            label="Centro de responsabilidad" placeholder="Selecciona o escribe el código"
            hint="Puedes escribir un centro aunque todavía no aparezca en la lista."
            persistent-hint clearable :disabled="loading" />
          <v-text-field v-model="fechaInicio" type="date" label="Fecha de inicio (registro)"
            :max="fechaFin || undefined" :disabled="loading" />
          <v-text-field v-model="fechaFin" type="date" label="Fecha final (registro)"
            :min="fechaInicio || undefined" :disabled="loading" />
          <v-btn color="primary" :disabled="loading" @click="cargar(false)">Aplicar filtros</v-btn>
          <v-btn text :disabled="loading" @click="limpiarFiltro">Limpiar filtros</v-btn>
        </div>
        <p v-if="consultado">Centro consultado: {{ centroConsultado || 'Todos' }}</p>
        <p v-if="consultado">Fechas consultadas: {{ fechaInicioConsultada ? fechaTexto(fechaInicioConsultada) : 'Sin inicio' }}
          — {{ fechaFinConsultada ? fechaTexto(fechaFinConsultada) : 'Sin final' }}</p>
        <v-text-field v-model="search" label="Buscar en los pedidos cargados" prepend-inner-icon="mdi-magnify" clearable />
        <p v-if="ultimaConsulta">Última consulta: {{ ultimaConsulta }}</p>
        <p v-if="!consultado && !loading">Pulsa Consultar Navision para obtener los pedidos.</p>
        <v-data-table :headers="headers" :items="pedidos" :search="search" :loading="loading"
          :items-per-page="15" item-key="No" :no-data-text="consultado ? 'Navision no devolvió pedidos.' : 'Sin consulta realizada.'"
          no-results-text="No hay coincidencias en los pedidos cargados." loading-text="Consultando Navision...">
          <template #item.Status="{ item }">{{ estadoTexto(item.Status) }}</template>
          <template #item.Posting_Date="{ item }">{{ fechaTexto(item.Posting_Date) }}</template>
          <template #item.Completely_Shipped="{ item }">{{ enviadoTexto(item.Completely_Shipped) }}</template>
        </v-data-table>
        <v-btn v-if="nextLink" outlined color="primary" :loading="loading" @click="cargar(true)">Cargar más pedidos</v-btn>
      </v-card-text>
    </v-card>
  </section>
</template>

<script>
import { SALES_ORDER_URL, obtenerPedidosNavision, rangoActualNavision } from '~/services/navision.service'

export default {
  name: 'NavisionDocumentosPage',
  data: () => ({
    apiUrl: SALES_ORDER_URL, pedidos: [], search: '', loading: false, error: '',
    consultado: false, ultimaConsulta: '', nextLink: null,
    centroResponsabilidad: '', centroConsultado: '', centrosResponsabilidad: [],
    ...rangoActualNavision(), fechaInicioConsultada: '', fechaFinConsultada: '',
    headers: [
      { text: 'N°', value: 'No' },
      { text: 'Estado', value: 'Status' },
      { text: 'Fecha registro', value: 'Posting_Date' },
      { text: 'Venta a-N° cliente', value: 'Sell_to_Customer_No' },
      { text: 'Venta a-Nombre', value: 'Sell_to_Customer_Name' },
      { text: 'Enviado completamente', value: 'Completely_Shipped' }
    ]
  }),
  methods: {
    estadoTexto(estado) {
      return ({ Open: 'Abierto', Released: 'Lanzado', Pending_Approval: 'Pendiente de aprobación',
        'Pending Approval': 'Pendiente de aprobación', Pending_Prepayment: 'Pendiente de prepago',
        'Pending Prepayment': 'Pendiente de prepago' })[estado] || estado || '—'
    },
    fechaTexto(fecha) {
      const match = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
      return match ? `${match[3]}/${match[2]}/${match[1]}` : fecha || '—'
    },
    enviadoTexto(valor) {
      if (valor === true || valor === 'true') return 'Sí'
      if (valor === false || valor === 'false') return 'No'
      return valor == null ? '—' : String(valor)
    },
    limpiarFiltro() {
      this.centroResponsabilidad = ''
      this.fechaInicio = ''
      this.fechaFin = ''
      this.cargar(false)
    },
    async cargar(append) {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const centro = String(this.centroResponsabilidad || '').trim()
        const result = await obtenerPedidosNavision(append ? this.nextLink : null, centro, this.fechaInicio, this.fechaFin)
        this.pedidos = append ? this.pedidos.concat(result.pedidos) : result.pedidos
        this.nextLink = result.nextLink
        if (!append) {
          this.centroConsultado = centro
          this.fechaInicioConsultada = this.fechaInicio
          this.fechaFinConsultada = this.fechaFin
        }
        this.centrosResponsabilidad = [...new Set(this.centrosResponsabilidad.concat(
          result.pedidos.map(pedido => pedido.Responsibility_Center).filter(Boolean)
        ))].sort()
        this.consultado = true
        this.ultimaConsulta = new Date().toLocaleString('es-PE')
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.navision-page { padding: 24px; max-width: 1600px; margin: auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; }
.page-header h1 { font-size: 26px; margin-bottom: 8px; }
.page-header p { color: var(--text-secondary, #64748b); }
.filters { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.filters .v-input { flex: 1 1 280px; }
@media (max-width: 700px) { .page-header { align-items: flex-start; flex-direction: column; } .navision-page { padding: 16px; } }
</style>
