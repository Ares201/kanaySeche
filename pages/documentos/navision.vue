<template>
  <section class="navision-page">
    <header class="page-header">
      <div>
        <p>Documentos</p>
        <h1>Pedidos de venta · Navision</h1>
        <p>Consulta de SalesOrder en Séché Perú - PROD.</p>
      </div>
      <v-btn color="primary" :loading="loading" @click="cargar(false)">Consultar Navision</v-btn>
    </header>

    <v-alert type="info" outlined>
      Requiere conexión a la intranet o VPN de Séché y acceso con tu usuario de Windows.
      <a :href="apiUrl" target="_blank" rel="noopener noreferrer">Abrir API</a>
    </v-alert>
    <v-alert v-if="error" type="error" outlined role="alert">{{ error }}</v-alert>

    <v-card outlined>
      <v-card-title>Pedidos consultados <v-spacer /><span class="subtitle-2">{{ pedidos.length }} cargados</span></v-card-title>
      <v-card-text>
        <v-text-field v-model="search" label="Buscar en los pedidos cargados" prepend-inner-icon="mdi-magnify" clearable />
        <p v-if="ultimaConsulta">Última consulta: {{ ultimaConsulta }}</p>
        <p v-if="!consultado && !loading">Pulsa Consultar Navision para obtener los pedidos.</p>
        <v-data-table :headers="headers" :items="pedidos" :search="search" :loading="loading"
          :items-per-page="15" item-key="No" :no-data-text="consultado ? 'Navision no devolvió pedidos.' : 'Sin consulta realizada.'"
          no-results-text="No hay coincidencias en los pedidos cargados." loading-text="Consultando Navision..." />
        <v-btn v-if="nextLink" outlined color="primary" :loading="loading" @click="cargar(true)">Cargar más pedidos</v-btn>
      </v-card-text>
    </v-card>
  </section>
</template>

<script>
import { SALES_ORDER_URL, obtenerPedidosNavision } from '~/services/navision.service'

export default {
  name: 'NavisionDocumentosPage',
  data: () => ({
    apiUrl: SALES_ORDER_URL, pedidos: [], search: '', loading: false, error: '',
    consultado: false, ultimaConsulta: '', nextLink: null,
    headers: [
      { text: 'Pedido', value: 'No' },
      { text: 'Código cliente', value: 'Sell_to_Customer_No' },
      { text: 'Cliente', value: 'Sell_to_Customer_Name' },
      { text: 'Fecha pedido', value: 'Order_Date' },
      { text: 'Fecha registro', value: 'Posting_Date' },
      { text: 'Estado', value: 'Status' }
    ]
  }),
  methods: {
    async cargar(append) {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const result = await obtenerPedidosNavision(append ? this.nextLink : null)
        this.pedidos = append ? this.pedidos.concat(result.pedidos) : result.pedidos
        this.nextLink = result.nextLink
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
@media (max-width: 700px) { .page-header { align-items: flex-start; flex-direction: column; } .navision-page { padding: 16px; } }
</style>
