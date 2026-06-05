<template>
  <section class="pv-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Operaciones</p>
        <h1>Pedido de venta</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo PV
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de pedidos de venta</h2>
          <span>{{ filteredPedidos.length }} registros</span>
        </div>

        <div class="table-actions">
          <v-menu offset-y>
            <template #activator="{ on, attrs }">
              <v-btn class="excel-button" color="#107c41" dark type="button" v-bind="attrs" v-on="on">
                <v-icon left>
                  mdi-microsoft-excel
                </v-icon>
                Excel
              </v-btn>
            </template>

            <v-list dense>
              <v-list-item @click="exportPedidos">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="downloadTemplate">
                <v-list-item-title>Descargar plantilla</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportPedidos">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            ref="pedidosExcelInput"
            class="excel-input"
            type="file"
            accept=".xlsx"
            @change="importPedidos"
          >

          <label class="search-field">
            <span>Buscar por PV, cliente o placa</span>
            <input v-model.trim="search" type="search" placeholder="Ej. PV-1">
          </label>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>PV</th>
              <th>Cliente</th>
              <th>Placa</th>
              <th>Fecha</th>
              <th>Hora ingreso</th>
              <th>Peso neto</th>
              <th>Items</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pedido in filteredPedidos" :key="pedido.id">
              <td>{{ pedido.codigo }}</td>
              <td>{{ pedido.cliente.nombre }}</td>
              <td>{{ pedido.placa }}</td>
              <td>{{ formatDateInput(pedido.fecha) }}</td>
              <td>{{ pedido.horaIngreso }}</td>
              <td>{{ formatWeight(pedido.pesoNeto) }}</td>
              <td>{{ pedido.detalle.length }}</td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Preview" aria-label="Preview PV" @click="openPreviewModal(pedido)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar PV" @click="openEditModal(pedido)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar" aria-label="Eliminar PV" @click="deletePedido(pedido.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="loading">
              <td class="empty-state" colspan="8">
                Cargando pedidos de venta...
              </td>
            </tr>
            <tr v-else-if="filteredPedidos.length === 0">
              <td class="empty-state" colspan="8">
                No se encontraron pedidos de venta.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="savePedido">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar PV' : 'Nuevo PV' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
            x
          </button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="3">
              <label>
                Correlativo
                <input v-model.trim="form.codigo" type="text" readonly>
              </label>
            </v-col>

            <v-col cols="12" md="5">
              <label class="autocomplete-field">
                Cliente
                <input
                  v-model.trim="clienteSearch"
                  type="search"
                  required
                  placeholder="Buscar cliente"
                  autocomplete="off"
                  @focus="clienteOptionsOpen = true"
                  @input="handleClienteInput"
                  @blur="closeClienteOptions"
                >
                <div v-if="clienteOptionsOpen" class="autocomplete-list">
                  <button
                    v-for="cliente in filteredClientesOptions"
                    :key="cliente.id"
                    type="button"
                    @mousedown.prevent="selectCliente(cliente)"
                  >
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">
                    Cargando clientes...
                  </div>
                  <div v-else-if="filteredClientesOptions.length === 0" class="autocomplete-empty">
                    No hay clientes disponibles.
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label class="autocomplete-field">
                Placa
                <input
                  v-model.trim="form.placa"
                  type="search"
                  required
                  placeholder="Buscar placa"
                  autocomplete="off"
                  :disabled="!form.clienteId"
                  @focus="placaOptionsOpen = true"
                  @input="placaOptionsOpen = true"
                  @blur="closePlacaOptions"
                >
                <div v-if="placaOptionsOpen" class="autocomplete-list">
                  <button
                    v-for="vehiculo in filteredPlacaOptions"
                    :key="vehiculo.placa"
                    type="button"
                    @mousedown.prevent="selectPlaca(vehiculo)"
                  >
                    <strong>{{ vehiculo.placa }}</strong>
                    <span>{{ vehiculo.descripcion || 'Sin descripcion' }}</span>
                  </button>
                  <div v-if="!form.clienteId" class="autocomplete-empty">
                    Selecciona un cliente primero.
                  </div>
                  <div v-else-if="clienteVehiculos.length === 0" class="autocomplete-empty">
                    Este cliente no tiene vehiculos registrados.
                  </div>
                  <div v-else-if="filteredPlacaOptions.length === 0" class="autocomplete-empty">
                    No se encontraron placas.
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="3">
              <label>
                Fecha
                <input v-model="form.fecha" type="date" required>
              </label>
            </v-col>

            <v-col cols="12" md="3">
              <label>
                Hora ingreso
                <input v-model="form.horaIngreso" type="time" required>
              </label>
            </v-col>

            <v-col cols="12" md="2">
              <label>
                Peso ingreso
                <input v-model.number="form.pesoIngreso" type="number" min="0" step="0.01" required>
              </label>
            </v-col>

            <v-col cols="12" md="2">
              <label>
                Peso salida
                <input v-model.number="form.pesoSalida" type="number" min="0" step="0.01">
              </label>
            </v-col>

            <v-col cols="12" md="2">
              <label>
                Peso neto
                <input :value="formatWeight(pesoNeto)" type="text" readonly>
              </label>
            </v-col>
          </v-row>

          <div class="detail-header">
            <h3>Detalle del PV</h3>
            <div class="detail-actions">
              <button class="secondary-button" type="button" @click="addDetalleRow">
                Agregar item
              </button>

              <v-menu offset-y>
                <template #activator="{ on, attrs }">
                  <v-btn class="excel-button" color="#107c41" dark type="button" v-bind="attrs" v-on="on">
                    <v-icon left>
                      mdi-microsoft-excel
                    </v-icon>
                    Detalle
                  </v-btn>
                </template>

                <v-list dense>
                  <v-list-item @click="exportCurrentDetalle">
                    <v-list-item-title>Exportar detalle</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="downloadDetalleTemplate">
                    <v-list-item-title>Descargar plantilla detalle</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="openImportDetalle">
                    <v-list-item-title>Importar detalle</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>

              <input
                ref="detalleExcelInput"
                class="excel-input"
                type="file"
                accept=".xlsx"
                @change="importDetalle"
              >
            </div>
          </div>

          <div class="detail-wrapper">
            <table class="detail-edit-table">
              <colgroup>
                <col class="detail-col-item">
                <col class="detail-col-code">
                <col class="detail-col-name">
                <col class="detail-col-code">
                <col class="detail-col-name">
                <col class="detail-col-product">
                <col class="detail-col-weight">
                <col class="detail-col-zone">
                <col class="detail-col-action">
              </colgroup>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Codigo residuo</th>
                  <th>Nombre residuo</th>
                  <th>Generador</th>
                  <th>Nombre generador</th>
                  <th>Producto</th>
                  <th>Peso declarado por cliente</th>
                  <th>Zona de recepcion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in form.detalle" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <input
                      v-model.trim="row.codigoResiduo"
                      type="text"
                      list="residuos-codigo-list"
                      placeholder="Codigo"
                      @input="syncResiduoByCodigo(row)"
                      @change="syncResiduoByCodigo(row)"
                    >
                  </td>
                  <td>
                    <input
                      v-model.trim="row.nombreResiduo"
                      type="text"
                      list="residuos-nombre-list"
                      placeholder="Residuo"
                      @input="syncResiduoByNombre(row)"
                      @change="syncResiduoByNombre(row)"
                    >
                  </td>
                  <td>
                    <input
                      v-model.trim="row.codigoGenerador"
                      type="text"
                      list="generadores-codigo-list"
                      placeholder="Codigo"
                      @input="syncGeneradorByCodigo(row)"
                      @change="syncGeneradorByCodigo(row)"
                    >
                  </td>
                  <td>
                    <input
                      v-model.trim="row.nombreGenerador"
                      type="text"
                      list="generadores-nombre-list"
                      placeholder="Generador"
                      @input="syncGeneradorByNombre(row)"
                      @change="syncGeneradorByNombre(row)"
                    >
                  </td>
                  <td>
                    <input
                      v-model.trim="row.producto"
                      type="text"
                      list="productos-list"
                      placeholder="Producto"
                      @input="syncProductoData(row)"
                      @change="syncProductoData(row)"
                    >
                  </td>
                  <td>
                    <input v-model.number="row.pesoDeclaradoCliente" type="number" min="0" step="0.01">
                  </td>
                  <td>
                    <input v-model.trim="row.zonaRecepcion" type="text" placeholder="Zona">
                  </td>
                  <td>
                    <button class="icon-button icon-button--danger" type="button" title="Quitar item" aria-label="Quitar item" @click="removeDetalleRow(index)">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <datalist id="productos-list">
              <option v-for="producto in productos" :key="producto.id" :value="producto.nombre">
                {{ producto.codigo }}
              </option>
            </datalist>
            <datalist id="residuos-codigo-list">
              <option v-for="residuo in residuos" :key="residuo.id" :value="residuo.codigo">
                {{ residuo.nombre }}
              </option>
            </datalist>
            <datalist id="residuos-nombre-list">
              <option v-for="residuo in residuos" :key="residuo.id" :value="residuo.nombre">
                {{ residuo.codigo }}
              </option>
            </datalist>
            <datalist id="generadores-codigo-list">
              <option v-for="generador in generadores" :key="generador.id" :value="generador.codigo">
                {{ generador.nombre }}
              </option>
            </datalist>
            <datalist id="generadores-nombre-list">
              <option v-for="generador in generadores" :key="generador.id" :value="generador.nombre">
                {{ generador.codigo }}
              </option>
            </datalist>
          </div>
        </div>

        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">
            Cancelar
          </button>
          <button class="primary-button" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>

    <div v-if="isPreviewOpen" class="modal-backdrop modal-backdrop--preview">
      <div class="modal modal--preview">
        <div class="modal-header preview-header">
          <h2>Preview PV</h2>
          <button type="button" class="modal-close" aria-label="Cerrar preview" @click="closePreviewModal">
            x
          </button>
        </div>

        <div class="preview-toolbar">
          <button class="primary-button" type="button" @click="printPreview">
            Imprimir
          </button>
        </div>

        <div class="preview-content">
          <div class="preview-sheet" v-html="buildPedidoPrintBody(selectedPedido)" />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { normalizeCliente } from '~/models/cliente'
import { normalizeGenerador } from '~/models/generador'
import { normalizeProducto } from '~/models/producto'
import { normalizeResiduo } from '~/models/residuo'
import { normalizeVehiculo } from '~/models/vehiculo'
import {
  calculatePesoNeto,
  createEmptyDetalleItem,
  createEmptyPedidoVentaForm,
  getNextPedidoVentaCodigo,
  getNowTimeInput,
  getTodayDateInput,
  normalizePedidoVenta,
  toPedidoVentaPayload
} from '~/models/pedidoVenta'
import {
  exportRowsToExcel,
  readRowsFromExcelFile
} from '~/utils/exportExcel'

const PEDIDO_VENTA_EXCEL_COLUMNS = [
  'Cliente',
  'RUC',
  'Placa',
  'Fecha',
  'Hora ingreso',
  'Peso ingreso',
  'Peso salida',
  'Tipo',
  'Codigo residuo',
  'Nombre residuo',
  'Generador',
  'Nombre generador',
  'Producto',
  'Eje Norte/Eje',
  'Peso declarado por cliente',
  'Zona de recepcion'
]

const PEDIDO_VENTA_DETALLE_EXCEL_COLUMNS = [
  'Tipo',
  'Codigo residuo',
  'Nombre residuo',
  'Generador',
  'Nombre generador',
  'Producto',
  'Eje Norte/Eje',
  'Peso declarado por cliente',
  'Zona de recepcion'
]

export default {
  name: 'PedidosVentaPage',
  data() {
    return {
      search: '',
      loading: false,
      clientesLoading: false,
      isModalOpen: false,
      isPreviewOpen: false,
      editingId: null,
      selectedPedido: null,
      clienteSearch: '',
      clienteOptionsOpen: false,
      placaOptionsOpen: false,
      form: this.getEmptyForm(),
      pedidos: [],
      clientes: [],
      vehiculos: [],
      productos: [],
      residuos: [],
      generadores: []
    }
  },
  computed: {
    filteredPedidos() {
      const term = this.search.toLowerCase()

      if (!term) return this.pedidos

      return this.pedidos.filter(pedido =>
        pedido.codigo.toLowerCase().includes(term) ||
        pedido.placa.toLowerCase().includes(term) ||
        pedido.cliente.nombre.toLowerCase().includes(term)
      )
    },
    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()
      const activos = this.clientes.filter(cliente => cliente.estado)

      if (!term) return activos.slice(0, 8)

      return activos
        .filter(cliente =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.ruc.toLowerCase().includes(term)
        )
        .slice(0, 8)
    },
    selectedCliente() {
      return this.clientes.find(cliente => cliente.id === this.form.clienteId)
    },
    clienteVehiculos() {
      if (!this.selectedCliente) return []

      const vehiculosFromMaster = this.vehiculos
        .filter(vehiculo => vehiculo.estado && vehiculo.clienteId === this.selectedCliente.id)
        .map(vehiculo => ({
          placa: vehiculo.placa,
          descripcion: [vehiculo.marca, vehiculo.modelo, vehiculo.descripcion].filter(Boolean).join(' - ')
        }))

      const fallbackVehiculos = this.selectedCliente.vehiculos || []
      const byPlaca = new Map()

      ;[...vehiculosFromMaster, ...fallbackVehiculos].forEach(vehiculo => {
        if (vehiculo.placa) byPlaca.set(vehiculo.placa, vehiculo)
      })

      return Array.from(byPlaca.values())
    },
    filteredPlacaOptions() {
      const term = this.form.placa.toLowerCase()

      if (!term) return this.clienteVehiculos

      return this.clienteVehiculos.filter(vehiculo =>
        vehiculo.placa.toLowerCase().includes(term) ||
        String(vehiculo.descripcion || '').toLowerCase().includes(term)
      )
    },
    pesoNeto() {
      return calculatePesoNeto(this.form.pesoIngreso, this.form.pesoSalida)
    }
  },
  mounted() {
    this.loadPageData()
  },
  methods: {
    getEmptyForm() {
      return createEmptyPedidoVentaForm()
    },
    async loadPageData() {
      this.loading = true
      this.clientesLoading = true

      try {
        const [pedidos, clientes, vehiculos, productos, residuos, generadores] = await Promise.all([
          this.$firebaseApi.list('pedidosVenta'),
          this.$firebaseApi.list('clientes'),
          this.$firebaseApi.list('vehiculos'),
          this.$firebaseApi.list('productos'),
          this.$firebaseApi.list('residuos'),
          this.$firebaseApi.list('generadores')
        ])

        this.pedidos = pedidos.map(normalizePedidoVenta)
        this.clientes = clientes.map(normalizeCliente)
        this.vehiculos = vehiculos.map(normalizeVehiculo)
        this.productos = productos.map(normalizeProducto).filter(producto => producto.estado)
        this.residuos = residuos.map(normalizeResiduo).filter(residuo => residuo.estado)
        this.generadores = generadores.map(normalizeGenerador).filter(generador => generador.estado)
      } catch (error) {
        alert('No se pudieron listar los datos del PV')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
        this.clientesLoading = false
      }
    },
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.form.codigo = getNextPedidoVentaCodigo(this.pedidos)
      this.form.fecha = getTodayDateInput()
      this.form.horaIngreso = getNowTimeInput()
      this.clienteSearch = ''
      this.isModalOpen = true
    },
    openEditModal(pedido) {
      this.editingId = pedido.id
      this.form = {
        codigo: pedido.codigo,
        clienteId: pedido.clienteId,
        cliente: { ...pedido.cliente },
        placa: pedido.placa,
        fecha: pedido.fecha,
        horaIngreso: pedido.horaIngreso,
        pesoIngreso: pedido.pesoIngreso,
        pesoSalida: pedido.pesoSalida,
        detalle: pedido.detalle.length
          ? pedido.detalle.map(row => ({ ...row }))
          : [createEmptyDetalleItem(1)]
      }
      this.clienteSearch = pedido.cliente.nombre
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
      this.clienteOptionsOpen = false
      this.placaOptionsOpen = false
    },
    handleClienteInput() {
      this.clienteOptionsOpen = true
      this.form.clienteId = ''
      this.form.cliente = {
        nombre: this.clienteSearch,
        ruc: '',
        direccion: ''
      }
      this.form.placa = ''
    },
    closeClienteOptions() {
      window.setTimeout(() => {
        this.clienteOptionsOpen = false
      }, 120)
    },
    closePlacaOptions() {
      window.setTimeout(() => {
        this.placaOptionsOpen = false
      }, 120)
    },
    selectCliente(cliente) {
      this.form.clienteId = cliente.id
      this.form.cliente = {
        nombre: cliente.nombre,
        ruc: cliente.ruc,
        direccion: cliente.direccion
      }
      this.form.placa = ''
      this.clienteSearch = cliente.nombre
      this.clienteOptionsOpen = false
      this.placaOptionsOpen = true
    },
    selectPlaca(vehiculo) {
      this.form.placa = vehiculo.placa
      this.placaOptionsOpen = false
    },
    syncResiduoByCodigo(row) {
      const residuo = this.findResiduoByCodigo(row.codigoResiduo)

      if (residuo) {
        row.codigoResiduo = residuo.codigo
        row.nombreResiduo = residuo.nombre
      }
    },
    syncResiduoByNombre(row) {
      const residuo = this.findResiduoByNombre(row.nombreResiduo)

      if (residuo) {
        row.codigoResiduo = residuo.codigo
        row.nombreResiduo = residuo.nombre
      }
    },
    syncGeneradorByCodigo(row) {
      const generador = this.findGeneradorByCodigo(row.codigoGenerador)

      if (generador) {
        row.codigoGenerador = generador.codigo
        row.nombreGenerador = generador.nombre
      }
    },
    syncGeneradorByNombre(row) {
      const generador = this.findGeneradorByNombre(row.nombreGenerador)

      if (generador) {
        row.codigoGenerador = generador.codigo
        row.nombreGenerador = generador.nombre
      }
    },
    syncProductoData(row) {
      const producto = this.findProducto(row.producto)

      if (!producto) {
        return
      }

      row.producto = producto.nombre

      if (producto.zonaRecepcion) {
        row.zonaRecepcion = producto.zonaRecepcion
      }

      if (producto.codigoResiduo) {
        row.codigoResiduo = producto.codigoResiduo
      }

      if (producto.nombreResiduo) {
        row.nombreResiduo = producto.nombreResiduo
      }
    },
    getProductoZonaRecepcion(nombreProducto) {
      const producto = this.findProducto(nombreProducto)

      return producto ? producto.zonaRecepcion : ''
    },
    findProducto(value) {
      const cleanValue = String(value || '').trim().toLowerCase()

      return this.productos.find(producto => {
        return producto.nombre.toLowerCase() === cleanValue ||
          producto.codigo.toLowerCase() === cleanValue
      })
    },
    findResiduoByCodigo(codigo) {
      const cleanCodigo = String(codigo || '').trim().toLowerCase()

      return this.residuos.find(residuo => residuo.codigo.toLowerCase() === cleanCodigo)
    },
    findResiduoByNombre(nombre) {
      const cleanNombre = String(nombre || '').trim().toLowerCase()

      return this.residuos.find(residuo => residuo.nombre.toLowerCase() === cleanNombre)
    },
    findGeneradorByCodigo(codigo) {
      const cleanCodigo = String(codigo || '').trim().toLowerCase()

      return this.generadores.find(generador => generador.codigo.toLowerCase() === cleanCodigo)
    },
    findGeneradorByNombre(nombre) {
      const cleanNombre = String(nombre || '').trim().toLowerCase()

      return this.generadores.find(generador => generador.nombre.toLowerCase() === cleanNombre)
    },
    addDetalleRow() {
      this.form.detalle.push(createEmptyDetalleItem(this.form.detalle.length + 1))
    },
    removeDetalleRow(index) {
      if (this.form.detalle.length === 1) return
      this.form.detalle.splice(index, 1)
    },
    async savePedido() {
      if (!this.form.clienteId) {
        alert('Selecciona un cliente de la lista')
        return
      }

      if (!this.form.codigo) {
        this.form.codigo = getNextPedidoVentaCodigo(this.pedidos, this.editingId)
      }

      try {
        if (this.editingId) {
          const pedido = await this.$firebaseApi.update(
            'pedidosVenta',
            this.editingId,
            toPedidoVentaPayload(this.form)
          )
          this.pedidos = this.pedidos.map(currentPedido => {
            return currentPedido.id === this.editingId
              ? normalizePedidoVenta(pedido)
              : currentPedido
          })
        } else {
          const pedido = await this.$firebaseApi.create(
            'pedidosVenta',
            toPedidoVentaPayload(this.form)
          )
          this.pedidos.unshift(normalizePedidoVenta(pedido))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el PV')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async deletePedido(id) {
      if (!window.confirm('Deseas eliminar este PV?')) return

      try {
        await this.$firebaseApi.remove('pedidosVenta', id)
        this.pedidos = this.pedidos.filter(pedido => pedido.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el PV')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    openPreviewModal(pedido) {
      this.selectedPedido = this.clonePedido(pedido)
      this.isPreviewOpen = true
    },
    closePreviewModal() {
      this.isPreviewOpen = false
      this.selectedPedido = null
    },
    clonePedido(pedido) {
      return {
        ...pedido,
        cliente: { ...(pedido.cliente || {}) },
        detalle: Array.isArray(pedido.detalle)
          ? pedido.detalle.map(row => ({ ...row }))
          : []
      }
    },
    printPreview() {
      if (!process.client || !this.selectedPedido) return

      const printFrame = document.createElement('iframe')
      printFrame.setAttribute('title', 'Imprimir PV')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'

      document.body.appendChild(printFrame)

      const printWindow = printFrame.contentWindow
      const printDocument = printWindow.document
      printDocument.open()
      printDocument.write(this.buildPedidoPrintHtml(this.selectedPedido))
      printDocument.close()

      window.setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        document.body.removeChild(printFrame)
      }, 250)
    },
    buildPedidoPrintHtml(pedido) {
      return `
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>${this.escapeHtml((pedido || {}).codigo || 'PV')}</title>
            <style>${this.buildPedidoPrintStyles()}</style>
          </head>
          <body>
            ${this.buildPedidoPrintBody(pedido)}
          </body>
        </html>
      `
    },
    buildPedidoPrintBody(pedido = {}) {
      const safePedido = {
        codigo: '',
        cliente: {},
        placa: '',
        fecha: '',
        horaIngreso: '',
        pesoIngreso: 0,
        pesoSalida: 0,
        pesoNeto: 0,
        detalle: [],
        ...pedido
      }
      const cliente = safePedido.cliente || {}
      const detalle = Array.isArray(safePedido.detalle) ? safePedido.detalle : []
      const detailRows = detalle.length
        ? detalle.map((row, index) => this.buildPedidoDetailPrintRow(row, index)).join('')
        : this.buildPedidoDetailPrintRow({}, 0)

      return `
        <main class="pv-print-page">
          <header class="pv-print-header">
            <div class="brand-block">
              <div class="brand-mark">Seche Group Peru</div>
              <div class="brand-subtitle">A world of solutions</div>
            </div>
            <div class="page-number">Page 1 of 1</div>
          </header>

          <h1>Control de Ingreso de Residuos Peligrosos</h1>

          <section class="summary-grid">
            <div class="summary-left">
              <div><strong>RUC Cliente:</strong><span>${this.escapeHtml(cliente.ruc)}</span></div>
              <div><strong>Cliente:</strong><span>${this.escapeHtml(cliente.nombre)}</span></div>
              <div><strong>Transportista:</strong><span>${this.escapeHtml(cliente.nombre)}</span></div>
              <div><strong>Placa:</strong><span>${this.escapeHtml(safePedido.placa)}</span></div>
              <div><strong>Fecha:</strong><span>${this.escapeHtml(this.formatDateInput(safePedido.fecha))}</span></div>
            </div>
            <div class="summary-right">
              <div><strong>Peso ingreso (kg):</strong><span>${this.escapeHtml(this.formatWeight(safePedido.pesoIngreso))}</span></div>
              <div><strong>Peso Salida (kg):</strong><span>${this.escapeHtml(this.formatWeight(safePedido.pesoSalida))}</span></div>
              <div><strong>Peso Neto (kg):</strong><span>${this.escapeHtml(this.formatWeight(safePedido.pesoNeto))}</span></div>
              <div><strong>Orden No.</strong><span>${this.escapeHtml(safePedido.codigo)}</span></div>
              <div><strong>Hora Ingreso:</strong><span>${this.escapeHtml(safePedido.horaIngreso)}</span></div>
            </div>
          </section>

          <table class="detail-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>N° Boleta</th>
                <th>Producto</th>
                <th>Generador</th>
                <th>Eje<br>Norte/Eje</th>
                <th>Envase</th>
                <th>Peso Declarado por cliente (kg)</th>
                <th>Zona Recepción</th>
              </tr>
            </thead>
            <tbody>
              ${detailRows}
            </tbody>
          </table>

          <section class="observations-grid">
            <div class="observations-cell">Observaciones</div>
            <div class="responsable-cell">Responsable</div>
            <div class="containers-title">Observaciones sobre los contenedores:</div>
            <div class="container-row">Depositos</div>
            <div></div>
            <div class="container-row">Plataforma</div>
            <div></div>
            <div class="container-row">Lozas</div>
            <div></div>
            <div class="container-row">Pozas</div>
            <div></div>
            <div class="container-row">Balsas</div>
            <div></div>
          </section>

          <footer class="signature-grid">
            <div>
              <span></span>
              VÂ°BÂ° EPC TRANSPORTE
            </div>
            <div>
              <span></span>
              VÂ°BÂ° LABORATORIO
            </div>
          </footer>
        </main>
      `
    },
    buildPedidoDetailPrintRow(row = {}, index = 0) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td></td>
          <td>${this.escapeHtml(row.producto)}</td>
          <td>${this.escapeHtml(row.nombreGenerador || row.generador)}</td>
          <td>${this.escapeHtml(row.eje)}</td>
          <td>${this.escapeHtml(row.envase)}</td>
          <td>${this.escapeHtml(this.formatWeight(row.pesoDeclaradoCliente))}</td>
          <td>${this.escapeHtml(row.zonaRecepcion)}</td>
        </tr>
      `
    },
    buildPedidoPrintStyles() {
      return `
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
        }
        body {
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .pv-print-page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 8mm 7mm 30mm;
          font-size: 9px;
        }
        .pv-print-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 3mm;
        }
        .brand-mark {
          color: #1e4f8f;
          font-size: 15px;
          font-style: italic;
          font-weight: 700;
        }
        .brand-subtitle {
          margin-top: 1mm;
          color: #64748b;
          font-size: 8px;
          font-style: italic;
        }
        .page-number {
          font-size: 8px;
        }
        h1 {
          margin: 0 0 6mm;
          font-size: 14px;
          text-align: center;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 0.9fr;
          gap: 6mm;
          margin-bottom: 3mm;
          font-size: 9px;
        }
        .summary-left div,
        .summary-right div {
          display: grid;
          grid-template-columns: 24mm 1fr;
          min-height: 4.5mm;
          align-items: center;
        }
        .summary-right div {
          justify-content: end;
          grid-template-columns: max-content 20mm;
          column-gap: 1.5mm;
        }
        .summary-right {
          justify-self: end;
          width: 72mm;
        }
        .summary-right strong {
          text-align: right;
        }
        .summary-right span {
          text-align: right;
        }
        .summary-grid strong {
          font-weight: 700;
        }
        .detail-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.2px;
        }
        .detail-table th,
        .detail-table td {
          border: 1px solid #000;
          padding: 1.4mm 0.7mm;
          text-align: center;
          vertical-align: middle;
          word-break: break-word;
        }
        .detail-table th {
          font-weight: 700;
        }
        .detail-table td:nth-child(3),
        .detail-table td:nth-child(4) {
          text-align: left;
        }
        .detail-table th:nth-child(1) { width: 8mm; }
        .detail-table th:nth-child(2) { width: 17mm; }
        .detail-table th:nth-child(3) { width: 42mm; }
        .detail-table th:nth-child(4) { width: 32mm; }
        .detail-table th:nth-child(5) { width: 20mm; }
        .detail-table th:nth-child(6) { width: 24mm; }
        .detail-table th:nth-child(7) { width: 30mm; }
        .detail-table th:nth-child(8) { width: 23mm; }
        .observations-grid {
          display: grid;
          grid-template-columns: 1fr 45mm 45mm;
          border-left: 1px solid #000;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          font-size: 8px;
        }
        .observations-grid > div {
          min-height: 6mm;
          border-right: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1.5mm;
        }
        .observations-grid > div:nth-child(3n) {
          border-right: 0;
        }
        .observations-cell {
          grid-column: 1 / 3;
          min-height: 20mm !important;
        }
        .responsable-cell {
          display: flex;
          align-items: flex-end;
        }
        .containers-title {
          grid-row: span 5;
        }
        .container-row {
          min-height: 6mm !important;
        }
        .signature-grid {
          position: absolute;
          right: 18mm;
          bottom: 10mm;
          left: 18mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24mm;
          font-size: 9px;
          text-align: center;
        }
        .signature-grid span {
          display: block;
          width: 48mm;
          margin: 0 auto 1mm;
          border-top: 1px solid #000;
        }
      `
    },
    escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    },
    async exportPedidos() {
      await exportRowsToExcel({
        filename: 'pedidos-venta',
        sheetName: 'PedidosVenta',
        rows: this.buildExcelRows(this.filteredPedidos),
        columns: PEDIDO_VENTA_EXCEL_COLUMNS.map(header => ({
          label: header,
          value: row => row[header]
        }))
      })
    },
    async exportCurrentDetalle() {
      await exportRowsToExcel({
        filename: this.form.codigo ? `detalle-${this.form.codigo}` : 'detalle-pv',
        sheetName: 'DetallePV',
        rows: this.buildFormDetalleExcelRows(),
        columns: PEDIDO_VENTA_DETALLE_EXCEL_COLUMNS.map(header => ({
          label: header,
          value: row => row[header]
        }))
      })
    },
    async downloadTemplate() {
      await exportRowsToExcel({
        filename: 'plantilla-pedidos-venta',
        sheetName: 'PedidosVenta',
        rows: [
          {
            Cliente: 'Cliente ejemplo',
            RUC: '20600000000',
            Placa: 'ABC-123',
            Fecha: getTodayDateInput(),
            'Hora ingreso': getNowTimeInput(),
            'Peso ingreso': '1000',
            'Peso salida': '250',
            Tipo: 'Producto',
            'Codigo residuo': '7000000',
            'Nombre residuo': 'Residuo ejemplo',
            Generador: 'GEN-001',
            'Nombre generador': 'Generador ejemplo',
            Producto: 'Producto ejemplo',
            'Eje Norte/Eje': 'Eje 1',
            'Peso declarado por cliente': '750',
            'Zona de recepcion': 'Zona A'
          }
        ],
        columns: PEDIDO_VENTA_EXCEL_COLUMNS.map(header => ({
          label: header,
          value: row => row[header]
        }))
      })
    },
    openImportPedidos() {
      this.$refs.pedidosExcelInput.click()
    },
    async importPedidos(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, PEDIDO_VENTA_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        const groups = this.groupPedidoRows(result.rows)
        const importedPedidos = []
        let created = 0
        let skipped = 0

        for (const group of groups) {
          const cliente = this.findCliente(group.header.RUC, group.header.Cliente)

          if (!cliente || !group.header.Placa) {
            skipped += group.rows.length
            continue
          }

          const payload = this.buildPedidoPayloadFromExcelGroup(group, cliente, importedPedidos)
          const pedido = await this.$firebaseApi.create('pedidosVenta', payload)
          const normalizedPedido = normalizePedidoVenta(pedido)
          this.pedidos.unshift(normalizedPedido)
          importedPedidos.push(normalizedPedido)
          created += 1
        }

        alert(`Se registraron ${created} PV. Filas omitidas: ${skipped}.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    groupPedidoRows(rows) {
      const groups = new Map()

      rows.forEach(row => {
        const key = [
          row.RUC || row.Cliente,
          row.Placa,
          row.Fecha,
          row['Hora ingreso'],
          row['Peso ingreso'],
          row['Peso salida']
        ].join('|')

        if (!groups.has(key)) {
          groups.set(key, {
            header: row,
            rows: []
          })
        }

        groups.get(key).rows.push(row)
      })

      return Array.from(groups.values())
    },
    buildPedidoPayloadFromExcelGroup(group, cliente, importedPedidos = []) {
      const currentPedidos = [
        ...this.pedidos,
        ...importedPedidos
      ]
      const codigo = getNextPedidoVentaCodigo(currentPedidos)
      const header = group.header
      const pesoIngreso = Number(header['Peso ingreso']) || 0
      const pesoSalida = Number(header['Peso salida']) || 0

      return {
        codigo,
        clienteId: cliente.id,
        cliente: {
          nombre: cliente.nombre,
          ruc: cliente.ruc,
          direccion: cliente.direccion
        },
        placa: String(header.Placa || '').trim().toUpperCase(),
        fecha: this.normalizeExcelDate(header.Fecha) || getTodayDateInput(),
        horaIngreso: header['Hora ingreso'] || getNowTimeInput(),
        pesoIngreso,
        pesoSalida,
        pesoNeto: calculatePesoNeto(pesoIngreso, pesoSalida),
        detalle: group.rows.map((row, index) => this.buildDetalleRowFromExcel(row, index))
      }
    },
    async downloadDetalleTemplate() {
      await exportRowsToExcel({
        filename: 'plantilla-detalle-pv',
        sheetName: 'DetallePV',
        rows: [
          {
            Tipo: 'Producto',
            'Codigo residuo': '7000000',
            'Nombre residuo': 'Residuo ejemplo',
            Generador: 'GEN-001',
            'Nombre generador': 'Generador ejemplo',
            Producto: 'Producto ejemplo',
            'Eje Norte/Eje': 'Eje 1',
            'Peso declarado por cliente': '750',
            'Zona de recepcion': 'Zona A'
          }
        ],
        columns: PEDIDO_VENTA_DETALLE_EXCEL_COLUMNS.map(header => ({
          label: header,
          value: row => row[header]
        }))
      })
    },
    openImportDetalle() {
      this.$refs.detalleExcelInput.click()
    },
    async importDetalle(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, PEDIDO_VENTA_DETALLE_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas del detalle esperadas.')
          return
        }

        if (result.rows.length === 0) {
          alert('El Excel no tiene items para importar.')
          return
        }

        this.form.detalle = result.rows.map((row, index) => this.buildDetalleRowFromExcel(row, index))

        alert(`Se cargaron ${this.form.detalle.length} items en el detalle.`)
      } catch (error) {
        alert('No se pudo importar el detalle')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    buildExcelRows(pedidos) {
      return pedidos.flatMap(pedido => {
        return pedido.detalle.map(row => ({
          Cliente: pedido.cliente.nombre,
          RUC: pedido.cliente.ruc,
          Placa: pedido.placa,
          Fecha: pedido.fecha,
          'Hora ingreso': pedido.horaIngreso,
          'Peso ingreso': pedido.pesoIngreso,
          'Peso salida': pedido.pesoSalida,
          Tipo: 'Producto',
          'Codigo residuo': row.codigoResiduo,
          'Nombre residuo': row.nombreResiduo,
          Generador: row.codigoGenerador,
          'Nombre generador': row.nombreGenerador || row.generador,
          Producto: row.producto,
          'Eje Norte/Eje': row.eje,
          'Peso declarado por cliente': row.pesoDeclaradoCliente,
          'Zona de recepcion': row.zonaRecepcion
        }))
      })
    },
    buildFormDetalleExcelRows() {
      return this.form.detalle.map(row => ({
        Tipo: 'Producto',
        'Codigo residuo': row.codigoResiduo,
        'Nombre residuo': row.nombreResiduo,
        Generador: row.codigoGenerador,
        'Nombre generador': row.nombreGenerador || row.generador,
        Producto: row.producto,
        'Eje Norte/Eje': row.eje,
        'Peso declarado por cliente': row.pesoDeclaradoCliente,
        'Zona de recepcion': row.zonaRecepcion
      }))
    },
    buildDetalleRowFromExcel(row, index) {
      const generadorValue = String(row.Generador || '').trim()
      const detalle = {
        item: index + 1,
        tipo: 'Producto',
        codigoResiduo: String(row['Codigo residuo'] || '').trim(),
        nombreResiduo: String(row['Nombre residuo'] || '').trim(),
        codigoGenerador: generadorValue,
        nombreGenerador: String(row['Nombre generador'] || '').trim(),
        producto: String(row.Producto || '').trim(),
        eje: row['Eje Norte/Eje'],
        pesoDeclaradoCliente: Number(row['Peso declarado por cliente']) || 0,
        zonaRecepcion: row['Zona de recepcion'] || this.getProductoZonaRecepcion(row.Producto)
      }

      this.syncResiduoByCodigo(detalle)
      this.syncResiduoByNombre(detalle)
      this.syncGeneradorByCodigo(detalle)

      if (generadorValue && !detalle.nombreGenerador) {
        detalle.nombreGenerador = generadorValue
      }

      this.syncGeneradorByNombre(detalle)
      this.syncProductoData(detalle)

      return detalle
    },
    findCliente(ruc, nombre) {
      const cleanRuc = String(ruc || '').trim()
      const cleanNombre = String(nombre || '').trim().toLowerCase()

      return this.clientes.find(cliente =>
        (cleanRuc && cliente.ruc === cleanRuc) ||
        (cleanNombre && cliente.nombre.toLowerCase() === cleanNombre)
      )
    },
    normalizeExcelDate(value) {
      const raw = String(value || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

      const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (!match) return ''

      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    },
    formatDateInput(value) {
      if (!value) return ''

      const [year, month, day] = value.split('-')
      return `${day}/${month}/${year}`
    },
    formatWeight(value) {
      return Number(value || 0).toFixed(2)
    }
  }
}
</script>

<style scoped>
.pv-page {
  width: min(1280px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2,
h3 {
  margin: 0;
}

h1 {
  font-size: 32px;
}

h2 {
  font-size: 18px;
}

h3 {
  font-size: 16px;
}

.primary-button,
.secondary-button {
  min-height: 42px;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 0;
  color: #ffffff;
  background: #0f766e;
}

.secondary-button {
  border: 1px solid #cbd5e1;
  color: #334155;
  background: #ffffff;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.table-header,
.table-header > div,
.detail-header {
  display: flex;
  gap: 12px;
}

.table-actions,
.detail-actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.table-header,
.detail-header {
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header > div {
  flex-direction: column;
  gap: 4px;
}

.table-header span {
  color: #64748b;
  font-size: 14px;
}

.search-field,
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.search-field {
  width: min(320px, 100%);
  font-size: 13px;
}

.excel-button {
  margin-bottom: 1px;
  font-weight: 700;
  text-transform: none;
}

.excel-input {
  display: none;
}

.search-field input,
.form-grid input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.form-grid input[readonly] {
  color: #475569;
  background: #f1f5f9;
}

.form-grid input:disabled {
  color: #64748b;
  background: #f8fafc;
  cursor: not-allowed;
}

.search-field input:focus,
.form-grid input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.table-wrapper,
.detail-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 14px 20px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #edf2f7;
}

th {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  background: #f8fafc;
}

td {
  color: #1e293b;
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f766e;
  background: #ffffff;
  cursor: pointer;
}

.icon-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.icon-button--danger {
  color: #dc2626;
}

.empty-state {
  color: #64748b;
  text-align: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 24px 16px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  width: min(1180px, 100%);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.modal-header,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.modal-header {
  border-bottom: 1px solid #e2e8f0;
}

.modal-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  color: #475569;
  font-size: 18px;
  background: #f1f5f9;
  cursor: pointer;
}

.form-grid {
  padding: 20px;
}

.autocomplete-field {
  position: relative;
}

.autocomplete-list {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 5;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
}

.autocomplete-list button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: 0;
  padding: 10px 12px;
  color: #0f172a;
  text-align: left;
  background: #ffffff;
  cursor: pointer;
}

.autocomplete-list button:hover {
  background: #ecfdf3;
}

.autocomplete-list span,
.autocomplete-empty {
  color: #64748b;
  font-size: 13px;
}

.autocomplete-empty {
  padding: 12px;
}

.detail-header {
  margin: 20px -20px 0;
  border-top: 1px solid #e2e8f0;
}

.detail-wrapper {
  margin: 0 -20px;
  overflow-x: hidden;
}

.detail-edit-table {
  table-layout: fixed;
  width: 100%;
}

.detail-edit-table th,
.detail-edit-table td {
  padding: 8px;
  white-space: normal;
  vertical-align: middle;
}

.detail-edit-table th {
  line-height: 1.2;
}

.detail-edit-table input {
  min-width: 0;
  height: 38px;
  padding: 8px 9px;
  font-size: 13px;
}

.detail-col-item {
  width: 5%;
}

.detail-col-code {
  width: 10%;
}

.detail-col-name {
  width: 15%;
}

.detail-col-product {
  width: 16%;
}

.detail-col-weight {
  width: 13%;
}

.detail-col-zone {
  width: 11%;
}

.detail-col-action {
  width: 6%;
}

.detail-edit-table .icon-button {
  width: 32px;
  height: 32px;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}

.modal-backdrop--preview {
  z-index: 70;
}

.modal--preview {
  width: min(1180px, calc(100vw - 32px));
}

.preview-header,
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-toolbar {
  justify-content: flex-end;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.preview-content {
  --preview-scale: 0.58;
  overflow: auto;
  max-height: calc(100vh - 190px);
  padding: 22px;
  background: #e2e8f0;
}

.preview-sheet {
  width: calc(210mm * var(--preview-scale));
  min-height: calc(297mm * var(--preview-scale));
  margin: 0 auto;
  background: #ffffff;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.22);
}

.preview-sheet::v-deep .pv-print-page {
  width: 210mm;
  min-height: 297mm;
  transform: scale(var(--preview-scale));
  transform-origin: top left;
}

.preview-sheet::v-deep .pv-print-page {
  position: relative;
  padding: 8mm 7mm 30mm;
  color: #000;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9px;
}

.preview-sheet::v-deep .pv-print-header,
.preview-sheet::v-deep .summary-grid,
.preview-sheet::v-deep .signature-grid {
  display: flex;
}

.preview-sheet::v-deep .pv-print-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 3mm;
}

.preview-sheet::v-deep .brand-mark {
  color: #1e4f8f;
  font-size: 15px;
  font-style: italic;
  font-weight: 700;
}

.preview-sheet::v-deep .brand-subtitle {
  margin-top: 1mm;
  color: #64748b;
  font-size: 8px;
  font-style: italic;
}

.preview-sheet::v-deep .page-number {
  font-size: 8px;
}

.preview-sheet::v-deep h1 {
  margin: 0 0 6mm;
  font-size: 14px;
  text-align: center;
}

.preview-sheet::v-deep .summary-grid {
  display: grid;
  grid-template-columns: 1fr 0.9fr;
  gap: 6mm;
  margin-bottom: 3mm;
}

.preview-sheet::v-deep .summary-left div,
.preview-sheet::v-deep .summary-right div {
  display: grid;
  grid-template-columns: 24mm 1fr;
  min-height: 4.5mm;
  align-items: center;
}

.preview-sheet::v-deep .summary-right div {
  justify-content: end;
  grid-template-columns: max-content 20mm;
  column-gap: 1.5mm;
}

.preview-sheet::v-deep .summary-right {
  justify-self: end;
  width: 72mm;
}

.preview-sheet::v-deep .summary-right strong {
  text-align: right;
}

.preview-sheet::v-deep .summary-right span {
  text-align: right;
}

.preview-sheet::v-deep .detail-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.2px;
}

.preview-sheet::v-deep .detail-table th,
.preview-sheet::v-deep .detail-table td {
  border: 1px solid #000;
  padding: 1.4mm 0.7mm;
  color: #000;
  text-align: center;
  vertical-align: middle;
  white-space: normal;
  word-break: break-word;
}

.preview-sheet::v-deep .detail-table td:nth-child(3),
.preview-sheet::v-deep .detail-table td:nth-child(4) {
  text-align: left;
}

.preview-sheet::v-deep .observations-grid {
  display: grid;
  grid-template-columns: 1fr 45mm 45mm;
  border-left: 1px solid #000;
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
  font-size: 8px;
}

.preview-sheet::v-deep .observations-grid > div {
  min-height: 6mm;
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
  padding: 1.5mm;
}

.preview-sheet::v-deep .observations-grid > div:nth-child(3n) {
  border-right: 0;
}

.preview-sheet::v-deep .observations-cell {
  grid-column: 1 / 3;
  min-height: 20mm !important;
}

.preview-sheet::v-deep .responsable-cell {
  display: flex;
  align-items: flex-end;
}

.preview-sheet::v-deep .containers-title {
  grid-row: span 5;
}

.preview-sheet::v-deep .signature-grid {
  position: absolute;
  right: 18mm;
  bottom: 10mm;
  left: 18mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24mm;
  font-size: 9px;
  text-align: center;
}

.preview-sheet::v-deep .signature-grid span {
  display: block;
  width: 48mm;
  margin: 0 auto 1mm;
  border-top: 1px solid #000;
}

@media (max-width: 640px) {
  .page-header,
  .table-header,
  .table-actions,
  .detail-actions,
  .detail-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .excel-button,
  .modal-actions .primary-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .preview-content {
    --preview-scale: 0.32;
    padding: 14px;
  }
}
</style>
