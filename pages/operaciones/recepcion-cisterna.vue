<template>
  <section class="pv-page unified-list-page">
    <!-- ===== HEADER ===== -->
    <div class="page-header">
      <div>
        <p class="eyebrow">Operaciones</p>
        <h1>Cisterna</h1>
        <span class="registros-count">{{ filteredIngresos.length }} registros</span>
      </div>
      <div class="header-actions">
        <button class="primary-button" type="button" @click="openCreateModal">
          Nuevo ingreso
        </button>
      </div>
    </div>

    <!-- ===== FILTROS Y LISTADO ===== -->
    <div class="content">
      <v-row dense>
        <v-spacer />
        <v-col cols="12" sm="6" md="3" class="mb-2 mt-2">
          <v-text-field v-model.trim="search" dense hide-details outlined type="search"
            label="Buscar correlativo, transportista o placa" placeholder="Ej. CIS-001" />
        </v-col>
        <v-col cols="12" sm="6" md="2" class="mb-2 mt-2">
          <v-text-field v-model="fechaFiltro" dense hide-details outlined type="date" label="Filtrar por fecha" />
        </v-col>
        <v-col cols="12" sm="6" md="1" class="mb-2 mt-2" mr-2>
          <v-menu offset-y>
            <template #activator="{ on, attrs }">
              <v-btn class="excel-button" color="#107c41" dark type="button" v-bind="attrs" v-on="on" block>
                <v-icon left>mdi-microsoft-excel</v-icon>
                Excel
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item @click="exportIngresos">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="downloadTemplate">
                <v-list-item-title>Descargar plantilla</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportIngresos">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>
      </v-row>

      <input ref="excelInput" class="excel-input" type="file" accept=".xlsx" @change="importIngresos" />

      <div class="table-wrapper">
        <v-data-table :headers="tableHeaders" :items="filteredIngresos" :loading="loading" item-key="id"
          loading-text="Cargando ingresos..." no-data-text="No se encontraron ingresos."
          :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.fechaIngreso`]="{ item: ingreso }">{{ formatDateOnly(ingreso.fechaIngreso) }}</template>
          <template #[`item.pesoNeto`]="{ item: ingreso }">{{ formatWeight(ingreso.pesoNeto) }} Kg</template>
          <template #[`item.actions`]="{ item: ingreso }">
                <div class="actions">
                  <!-- Botón Imprimir -->
                  <button class="icon-button" type="button" title="Imprimir" @click="imprimirDirecto(ingreso)">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="7" width="18" height="12" rx="2" />
                      <rect x="5" y="10" width="14" height="5" rx="1" />
                      <path d="M8 7V4h8v3" />
                      <path d="M8 17v3h8v-3" />
                      <path d="M7 12.5h10" />
                    </svg>
                  </button>
                  <button class="icon-button" type="button" title="Editar" @click="openEditModal(ingreso)">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar"
                    @click="deleteIngreso(ingreso.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
          </template>
        </v-data-table>
      </div>
    </div>

    <!-- ===== MODAL CREAR/EDITAR ===== -->
    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="guardarIngreso">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar' : 'Nuevo' }}</h2>
          <button type="button" class="modal-close" @click="closeModal">✕</button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <!-- Correlativo -->
            <v-col cols="12" md="2">
              <label class="form-label">Correlativo</label>
              <v-text-field v-model="form.correlativo" readonly outlined dense hide-details class="bg-form-disabled" />
            </v-col>
            <!-- Fecha ingreso -->
            <v-col cols="12" md="4">
              <label class="form-label">Fecha y hora ingreso</label>
              <v-text-field v-model="form.fechaIngreso" type="datetime-local" outlined dense hide-details />
            </v-col>
            <!-- Fecha salida -->
            <v-col cols="12" md="4">
              <label class="form-label">Fecha y hora salida</label>
              <v-text-field v-model="form.fechaSalida" type="datetime-local" outlined dense hide-details />
            </v-col>
            <!-- Prueba laboratorio -->
            <v-col cols="12" md="2">
              <label class="form-label">Prueba laboratorio</label>
              <v-select v-model="form.pruebaLaboratorio" :items="['Sí', 'No']" outlined dense hide-details />
            </v-col>
            <!-- Transportista -->
            <v-col cols="12" md="5">
              <label class="form-label">Transportista</label>
              <div class="autocomplete-field">
                <input v-model.trim="clienteSearch" type="search" required placeholder="Buscar cliente"
                  autocomplete="off" class="custom-input" @focus="clienteOptionsOpen = true" @input="handleClienteInput"
                  @blur="closeClienteOptions" />
                <div v-if="clienteOptionsOpen" class="autocomplete-list">
                  <button v-for="cliente in filteredClientesOptions" :key="cliente.id" type="button"
                    @mousedown.prevent="selectCliente(cliente)">
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">Cargando clientes...</div>
                  <div v-else-if="filteredClientesOptions.length === 0" class="autocomplete-empty">
                    No hay clientes disponibles.
                  </div>
                </div>
              </div>
            </v-col>
            <!-- Placa -->
            <v-col cols="12" md="4">
              <label class="form-label">Placa</label>
              <div class="autocomplete-field">
                <input v-model.trim="form.placa" type="search" required placeholder="Buscar placa" autocomplete="off"
                  class="custom-input" :disabled="!form.clienteId" @focus="placaOptionsOpen = true"
                  @input="placaOptionsOpen = true" @blur="closePlacaOptions" />
                <div v-if="placaOptionsOpen" class="autocomplete-list">
                  <button v-for="vehiculo in filteredPlacaOptions" :key="vehiculo.placa" type="button"
                    @mousedown.prevent="selectPlaca(vehiculo)">
                    <strong>{{ vehiculo.placa }}</strong>
                    <span>{{ vehiculo.descripcion || 'Sin descripción' }}</span>
                  </button>
                  <div v-if="!form.clienteId" class="autocomplete-empty">Selecciona un cliente primero.</div>
                  <div v-else-if="clienteVehiculos.length === 0" class="autocomplete-empty">
                    Este cliente no tiene vehículos registrados.
                  </div>
                  <div v-else-if="filteredPlacaOptions.length === 0" class="autocomplete-empty">
                    No se encontraron placas.
                  </div>
                </div>
              </div>
            </v-col>
            <!-- N° Guía -->
            <v-col cols="12" md="3">
              <label class="form-label">N° Guía / Comprobante</label>
              <v-text-field v-model="form.comprobante" outlined dense hide-details placeholder="Ej. GRR-001-00015" />
            </v-col>
            <!-- Destino -->
            <v-col cols="12" md="12">
              <label class="form-label">Lugar de destino</label>
              <v-combobox v-model="form.destino" :items="destinosSugeridos" outlined dense hide-details clearable
                placeholder="Selecciona o escribe un destino" no-data-text="Escribe para agregar otro destino"
                prepend-inner-icon="mdi-map-marker-outline" />
            </v-col>
            <!-- Peso Bruto -->
            <v-col cols="12" md="4">
              <label class="form-label">Peso Bruto</label>
              <v-text-field v-model.number="form.pesoBruto" type="number" suffix="Kg" outlined dense hide-details
                @input="calcularPesoNeto" />
            </v-col>
            <!-- Peso Tara -->
            <v-col cols="12" md="4">
              <label class="form-label">Peso Tara</label>
              <v-text-field v-model.number="form.pesoTara" type="number" suffix="Kg" outlined dense hide-details
                @input="calcularPesoNeto" />
            </v-col>
            <!-- Peso Neto -->
            <v-col cols="12" md="4">
              <label class="form-label">Peso Neto</label>
              <v-text-field v-model="form.pesoNeto" readonly outlined dense suffix="Kg" hide-details
                class="input-neto-calculado" />
            </v-col>
          </v-row>
        </div>
        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">Cancelar</button>
          <button class="primary-button" type="submit">{{ editingId ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </form>
    </div>

    <!-- ===== IFRAME OCULTO PARA IMPRIMIR ===== -->
    <iframe ref="printIframe" style="position:absolute;width:0;height:0;border:0;"></iframe>
  </section>
</template>

<script>
// ============================================================
// 1. IMPORTACIONES – MODELOS Y UTILIDADES
// ============================================================
import { normalizeCliente } from '~/models/cliente'
import { normalizeVehiculo } from '~/models/vehiculo'
import {
  createEmptyIngresoCisternaForm,
  normalizeIngresoCisterna,
  toIngresoCisternaPayload,
  getNextIngresoCisternaNumero,
  buildIngresoCisternaCodigo
} from '~/models/ingresoCisterna'
import { exportRowsToExcel, readRowsFromExcelFile } from '~/utils/exportExcel'
import { formatDate, formatDateOnly, formatWeight, escapeHtml, getNowDateTimeInput, getTodayDateInput } from '~/utils/formatters'

export default {
  name: 'RecepcionCisternaPage',
  data() {
    return {
      search: '',
      fechaFiltro: getTodayDateInput(),
      loading: false,
      tableHeaders: [
        { text: 'Código', value: 'correlativo' },
        { text: 'Fecha', value: 'fechaIngreso' },
        { text: 'Transportista', value: 'transportista' },
        { text: 'Placa', value: 'placa' },
        { text: 'Peso neto', value: 'pesoNeto' },
        { text: 'Acciones', value: 'actions', sortable: false }
      ],
      clientesLoading: false,
      isModalOpen: false,
      editingId: null,
      clienteSearch: '',
      clienteOptionsOpen: false,
      placaOptionsOpen: false,
      form: createEmptyIngresoCisternaForm(),
      ingresos: [],
      clientes: [],
      vehiculos: [],
      destinosSugeridos: [
        'Rotoplast',
        'Osmosis -Tapa verde',
        'PTT CONSUMO - TAPA VERDE',
        'Potable'
      ]
    }
  },
  computed: {
    filteredIngresos() {
      const term = this.search.toLowerCase()
      const fechaFiltro = this.fechaFiltro

      return this.ingresos.filter(i =>
        (!term ||
          i.correlativo.toLowerCase().includes(term) ||
          i.transportista.toLowerCase().includes(term) ||
          i.placa.toLowerCase().includes(term)) &&
        (!fechaFiltro || this.getDateInputValue(i.fechaIngreso) === fechaFiltro)
      )
    },
    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()
      const activos = this.clientes.filter(c => c.estado)
      if (!term) return activos.slice(0, 8)
      return activos
        .filter(c => c.nombre.toLowerCase().includes(term) || c.ruc.toLowerCase().includes(term))
        .slice(0, 8)
    },
    selectedCliente() {
      return this.clientes.find(c => c.id === this.form.clienteId)
    },
    clienteVehiculos() {
      if (!this.selectedCliente) return []
      const fromMaster = this.vehiculos
        .filter(v => v.estado && v.clienteId === this.selectedCliente.id)
        .map(v => ({
          placa: v.placa,
          descripcion: [v.marca, v.modelo, v.descripcion].filter(Boolean).join(' - ')
        }))
      const fromCliente = this.selectedCliente.vehiculos || []
      const map = new Map()
        ;[...fromMaster, ...fromCliente].forEach(v => { if (v.placa) map.set(v.placa, v) })
      return Array.from(map.values())
    },
    filteredPlacaOptions() {
      const term = this.form.placa.toLowerCase()
      if (!term) return this.clienteVehiculos
      return this.clienteVehiculos.filter(v =>
        v.placa.toLowerCase().includes(term) ||
        String(v.descripcion || '').toLowerCase().includes(term)
      )
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    // Para usar desde el template
    formatDateOnly,
    formatWeight,
    getNowDateTimeInput,

    formatToDatetimeLocal(dateInput) {
      if (!dateInput) return ''
      let dateObj
      if (typeof dateInput === 'string') {
        dateObj = new Date(dateInput)
      } else if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        dateObj = dateInput.toDate()
      } else if (dateInput instanceof Date) {
        dateObj = dateInput
      } else if (typeof dateInput === 'object' && dateInput.seconds !== undefined) {
        dateObj = new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1e6)
      } else {
        dateObj = new Date(dateInput)
      }
      if (isNaN(dateObj.getTime())) return ''
      const pad = n => String(n).padStart(2, '0')
      return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`
    },

    getDateInputValue(dateInput) {
      if (!dateInput) return ''

      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        return dateInput.slice(0, 10)
      }

      const dateObj = dateInput?.toDate && typeof dateInput.toDate === 'function'
        ? dateInput.toDate()
        : new Date(dateInput)

      if (isNaN(dateObj.getTime())) return ''

      const pad = n => String(n).padStart(2, '0')
      return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`
    },

    // ===== CARGA INICIAL =====
    async loadData() {
      this.loading = true
      this.clientesLoading = true
      try {
        const [ingresos, clientes, vehiculos] = await Promise.all([
          this.$firebaseApi.list('ingresosCisterna'),
          this.$firebaseApi.list('clientes'),
          this.$firebaseApi.list('vehiculos')
        ])
        this.ingresos = ingresos.map(normalizeIngresoCisterna).filter(i => i.estado !== false)
        this.clientes = clientes.map(normalizeCliente)
        this.vehiculos = vehiculos.map(normalizeVehiculo)
      } catch (error) {
        alert('No se pudieron cargar los datos')
        console.error(error)
      } finally {
        this.loading = false
        this.clientesLoading = false
      }
    },

    // ===== CORRELATIVO =====
    getNextCorrelativo() {
      const numero = getNextIngresoCisternaNumero(this.ingresos)
      return buildIngresoCisternaCodigo(numero)
    },

    // ===== MODAL =====
    openCreateModal() {
      this.editingId = null
      this.form = createEmptyIngresoCisternaForm()
      this.form.correlativo = this.getNextCorrelativo()
      this.form.fechaIngreso = this.getNowDateTimeInput()
      this.clienteSearch = ''
      this.form.placa = ''
      this.isModalOpen = true
    },
    openEditModal(ingreso) {
      this.editingId = ingreso.id

      // Copiar datos
      this.form = {
        ...ingreso,
        pesoBruto: Number(ingreso.pesoBruto) || 0,
        pesoTara: Number(ingreso.pesoTara) || 0,
        pesoNeto: Number(ingreso.pesoNeto) || 0
      }

      // Buscar cliente por nombre
      const clienteEncontrado = this.clientes.find(
        c => c.nombre.toLowerCase() === ingreso.transportista?.toLowerCase()
      )
      if (clienteEncontrado) {
        this.form.clienteId = clienteEncontrado.id
        this.clienteSearch = clienteEncontrado.nombre
      } else {
        this.form.clienteId = null
        this.clienteSearch = ingreso.transportista || ''
      }

      // Formatear fecha
      this.form.fechaIngreso = this.formatToDatetimeLocal(ingreso.fechaIngreso)
      this.form.fechaSalida = this.formatToDatetimeLocal(ingreso.fechaSalida)

      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
      this.clienteOptionsOpen = false
      this.placaOptionsOpen = false
    },

    // ===== AUTOCOMPLETADO CLIENTE =====
    handleClienteInput() {
      this.clienteOptionsOpen = true
    },
    closeClienteOptions() {
      setTimeout(() => { this.clienteOptionsOpen = false }, 120)
    },
    selectCliente(cliente) {
      this.form.clienteId = cliente.id
      this.form.transportista = cliente.nombre
      this.form.placa = ''
      this.clienteSearch = cliente.nombre
      this.clienteOptionsOpen = false
      this.placaOptionsOpen = true
    },

    // ===== AUTOCOMPLETADO PLACA =====
    closePlacaOptions() {
      setTimeout(() => { this.placaOptionsOpen = false }, 120)
    },
    selectPlaca(vehiculo) {
      this.form.placa = vehiculo.placa
      this.placaOptionsOpen = false
    },

    // ===== PESO NETO =====
    calcularPesoNeto() {
      const bruto = Number(this.form.pesoBruto) || 0
      const tara = Number(this.form.pesoTara) || 0
      this.form.pesoNeto = Math.max(0, bruto - tara)
    },

    // ===== GUARDAR (create / update) =====
    async guardarIngreso() {
      // Si no hay clienteId pero sí transportista, intentar buscar por nombre
      if (!this.form.clienteId && this.form.transportista) {
        const cliente = this.clientes.find(
          c => c.nombre.toLowerCase() === this.form.transportista.toLowerCase()
        )
        if (cliente) {
          this.form.clienteId = cliente.id
        }
      }

      if (!this.form.clienteId) {
        alert('Selecciona un transportista de la lista')
        return
      }
      if (!this.form.placa) {
        alert('Selecciona una placa')
        return
      }
      if (this.form.pesoNeto < 0) {
        alert('El peso neto no puede ser negativo')
        return
      }

      const payload = toIngresoCisternaPayload(this.form)
      try {
        if (this.editingId) {
          const updated = await this.$firebaseApi.update('ingresosCisterna', this.editingId, payload)
          const idx = this.ingresos.findIndex(i => i.id === this.editingId)
          if (idx !== -1) this.ingresos.splice(idx, 1, normalizeIngresoCisterna(updated))
        } else {
          const created = await this.$firebaseApi.create('ingresosCisterna', payload)
          this.ingresos.unshift(normalizeIngresoCisterna(created))
        }
        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el ingreso')
        console.error(error)
      }
    },

    // ===== ELIMINAR (antes anular) =====
    async deleteIngreso(id) {
      if (!window.confirm('¿Deseas eliminar este ingreso?')) return
      try {
        await this.$firebaseApi.remove('ingresosCisterna', id)
        this.ingresos = this.ingresos.filter(ingreso => ingreso.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el ingreso')
        console.error(error)
      }
    },

    // ===== IMPRESIÓN DIRECTA =====
    imprimirDirecto(ingreso) {
      const originalTitle = document.title;
      document.title = `Ingreso-${ingreso.correlativo}`;

      const html = this.buildIngresoPrintHtmlTriple(ingreso);
      const iframe = this.$refs.printIframe;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      iframe.contentWindow.focus();

      // Restaurar título después de imprimir
      const onPrintDone = () => {
        document.title = originalTitle;
        window.removeEventListener('afterprint', onPrintDone);
      };
      window.addEventListener('afterprint', onPrintDone);

      iframe.contentWindow.print();
    },

    buildIngresoPrintHtmlTriple(ingreso) {
      const body = this.buildIngresoPrintBody(ingreso);
      return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(ingreso.correlativo)} - 3 copias</title>
    <style>${this.buildPrintStyles()}</style>
    <style>
      /* Estilos específicos para las tres copias */
      .triple-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .copy {
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px 6px;
        page-break-inside: avoid;
      }
      .copy-label {
        font-size: 7pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 2px;
        color: #2f4f66;
      }
      @page {
        margin: 4mm 4mm;
      }
      .page {
        padding: 2mm 3mm !important;
        min-height: auto !important;
      }
      .panel {
        margin-bottom: 3px !important;
      }
      .panel-header {
        padding: 2px 6px !important;
        font-size: 7.5pt !important;
      }
      .panel-body {
        padding: 2px 6px !important;
      }
      .main-title {
        font-size: 9pt !important;
        margin-bottom: 3px !important;
      }
      .Logo {
        width: 80px !important;
      }
      .items-table td, .items-table th {
        padding: 2px 4px !important;
        font-size: 7pt !important;
      }
      .field-label {
        font-size: 6.5pt !important;
      }
      .field-value {
        font-size: 7.5pt !important;
      }
      .field-value.highlight {
        font-size: 8pt !important;
      }
      .desc-box {
        padding-top: 2px !important;
      }
      .desc-row {
        font-size: 6.5pt !important;
        margin-bottom: 0 !important;
      }
      .desc-total {
        font-size: 7pt !important;
        margin-top: 2px !important;
        padding-top: 2px !important;
      }
      .footer {
        margin-top: 80px !important;
        margin-bottom: 30px !important;
        position: static !important;
      }
      .signatures-table .sig-cell {
        padding: 0 8px !important;
      }
      .sig-line {
        margin-bottom: 2px !important;
      }
      .sig-title {
        font-size: 7.5pt !important;
      }
      .sig-subtitle {
        font-size: 6.5pt !important;
      }
      /* Eliminamos el padding extra del content */
      .content {
        padding-bottom: 0 !important;
      }
    </style>
    </head>
    <body>
      <div class="page">
        <div class="triple-container">
          <div class="copy">
            <div class="copy-label">Copia 1</div>
            ${body}
          </div>
          <div class="copy">
            <div class="copy-label">Copia 2</div>
            ${body}
          </div>
          <div class="copy">
            <div class="copy-label">Copia 3</div>
            ${body}
          </div>
        </div>
      </div>
    </body>
  </html>
    `;
    },

    buildIngresoPrintBody(ingreso) {
      const i = ingreso || {}
      const fechaIngreso = i.fechaIngreso ? formatDate(i.fechaIngreso) : ''
      const fechaSalida = i.fechaSalida ? formatDate(i.fechaSalida) : ''

      return `
    <div class="content">
      <div class="main-title">Recibo de Conformidad</div>

      <!-- CABECERA: logo + correlativo -->
      <div class="panel" style="display:flex; justify-content:space-between; align-items:center;">
        <img
          src="${window.location.origin}/kanay.jpeg"
          class="Logo"
          alt="Logo"
        />
        <div class="panel" style="width: 200px;">
          <div class="panel-header">Detalles de la Transacción</div>
          <div class="panel-body">
            <div class="field-label">N° de Ingreso - Lab:</div>
            <div class="field-value highlight">${escapeHtml(i.correlativo || '')}</div>
          </div>
        </div>
      </div>

      <!-- DATOS DEL SERVICIO -->
      <div class="panel">
        <div class="panel-header" style="text-align:left;">Descripción del Servicio / Datos</div>
        <div class="panel-body">
          <table style="width:100%;">
            <tr>
              <td>
                <div class="field-label">Ingreso</div>
                <div class="field-value">${escapeHtml(fechaIngreso)}</div>
              </td>
              <td>
                <div class="field-label">Salida</div>
                <div class="field-value">${escapeHtml(fechaSalida || '—')}</div>
              </td>
              <td>
                <div class="field-label">Transportista</div>
                <div class="field-value">${escapeHtml(i.transportista || '')}</div>
              </td>
              <td>
                <div class="field-label">Placa</div>
                <div class="field-value">${escapeHtml(i.placa || '')}</div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- TABLA DE BIENES -->
      <div style="font-size:8pt; font-weight:bold; margin:4px 0 2px 0; color:#2f4f66;">
        Información de Bienes Trasladados
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:5%;" class="text-center">Nro.</th>
            <th style="width:25%;">Guía</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td style="text-align:center; font-weight:bold;">${escapeHtml(i.comprobante || '')}</td>
            <td>
              <div class="desc-title">${escapeHtml(i.destino || '')}</div>
              <div class="desc-box">
                <div class="desc-row">
                  <span>Peso Bruto:</span>
                  <span>${formatWeight(i.pesoBruto)} KG</span>
                </div>
                <div class="desc-row">
                  <span>Peso Tara:</span>
                  <span>${formatWeight(i.pesoTara)} KG</span>
                </div>
                <div class="desc-total">
                  <span>Peso Neto:</span>
                  <span style="color: var(--primary-blue-dark);">${formatWeight(i.pesoNeto)} KG</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- FIRMA -->
      <div class="footer">
        <table class="signatures-table">
          <tr>
            <td class="sig-cell">
              <div class="sig-line"></div>
              <div class="sig-title">KANAY S.A.C.</div>
              <div class="sig-subtitle">Firma Autorizada</div>
            </td>
            <td class="sig-cell">
              <div class="sig-line"></div>
              <div class="sig-title">Transportista</div>
              <div class="sig-subtitle">Firma del Chófer</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `
    },

    buildPrintStyles() {
      return `
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    :root {
      --primary-blue: #416483;
      --primary-blue-dark: #2f4f66;
      --text-dark: #0f172a;
      --text-muted: #475569;
      --border: #cbd5e1;
    }
    body {
      margin: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 8pt;
      color: var(--text-dark);
    }
    .page {
      width: 210mm;
      min-height: auto;
      padding: 2mm 3mm;
      position: relative;
    }
    .content {
      padding-bottom: 0;
    }
    .main-title {
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .panel {
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 6px;
      overflow: hidden;
    }
    .panel-header {
      background: var(--primary-blue);
      padding: 4px 8px;
      font-size: 7.5pt;
      font-weight: bold;
      color: #fff;
      text-align: center;
      text-transform: uppercase;
    }
    .panel-body {
      padding: 4px 8px;
    }
    .field-label {
      font-size: 6.5pt;
      color: var(--text-muted);
    }
    .field-value {
      font-size: 7.5pt;
      font-weight: 500;
    }
    .field-value.highlight {
      font-size: 9pt;
      font-weight: bold;
      color: var(--primary-blue-dark);
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      margin-bottom: 2px;
    }
    .items-table th {
      background: var(--primary-blue);
      color: #fff;
      padding: 4px 6px;
      font-size: 7pt;
      border: 1px solid var(--primary-blue);
    }
    .items-table td {
      padding: 4px 6px;
      border: 1px solid var(--border);
      vertical-align: top;
      font-size: 7pt;
    }
    .text-center {
      text-align: center;
    }
    .desc-title {
      font-weight: bold;
      color: var(--primary-blue-dark);
      margin-bottom: 2px;
      font-size: 7.5pt;
    }
    .desc-box {
      border-top: 1px dashed var(--border);
      padding-top: 2px;
    }
    .desc-row {
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      margin-bottom: 0;
      color: var(--text-muted);
    }
    .desc-total {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      margin-top: 2px;
      padding-top: 2px;
      border-top: 1px solid var(--border);
      font-weight: bold;
    }
    .footer {
      margin-top: 2px;
      position: static;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
    }
    .sig-cell {
      width: 50%;
      text-align: center;
      padding: 0 12px;
    }
    .sig-line {
      border-top: 1px solid var(--text-muted);
      margin-bottom: 4px;
    }
    .sig-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 7.5pt;
    }
    .sig-subtitle {
      font-size: 6.5pt;
      color: var(--text-muted);
    }
    .Logo {
      max-width: 100px;
      height: auto;
      display: block;
    }
  `
    },

    // ===== EXCEL =====
    async exportIngresos() {
      const rows = this.filteredIngresos.map(i => {
        return {
          Correlativo: i.correlativo,
          'Fecha ingreso': i.fechaIngreso ? formatDate(i.fechaIngreso) : '',
          'Fecha salida': i.fechaSalida ? formatDate(i.fechaSalida) : '',
          Transportista: i.transportista,
          Placa: i.placa,
          Comprobante: i.comprobante,
          'Peso Bruto': i.pesoBruto,
          'Peso Tara': i.pesoTara,
          'Peso Neto': i.pesoNeto,
          Destino: i.destino,
          'Prueba laboratorio': i.pruebaLaboratorio
        }
      })
      const columns = [
        { label: 'Correlativo', value: row => row.Correlativo },
        { label: 'Fecha ingreso', value: row => row['Fecha ingreso'] },
        { label: 'Fecha salida', value: row => row['Fecha salida'] },
        { label: 'Transportista', value: row => row.Transportista },
        { label: 'Placa', value: row => row.Placa },
        { label: 'Comprobante', value: row => row.Comprobante },
        { label: 'Peso Bruto', value: row => row['Peso Bruto'] },
        { label: 'Peso Tara', value: row => row['Peso Tara'] },
        { label: 'Peso Neto', value: row => row['Peso Neto'] },
        { label: 'Destino', value: row => row.Destino },
        { label: 'Prueba laboratorio', value: row => row['Prueba laboratorio'] }
      ]
      await exportRowsToExcel({
        filename: 'ingresos-cisterna',
        sheetName: 'Ingresos',
        columns,
        rows
      })
    },

    async downloadTemplate() {
      const rows = [{
        Correlativo: 'CIS-0001',
        'Fecha ingreso': getNowDateTimeInput(),
        'Fecha salida': getNowDateTimeInput(),
        Transportista: 'Transportista ejemplo',
        Placa: 'ABC-123',
        Comprobante: 'GRR-001-00015',
        'Peso Bruto': 5000,
        'Peso Tara': 1500,
        'Peso Neto': 3500,
        Destino: 'Planta Central',
        'Prueba laboratorio': 'Sí'
      }]
      const columns = [
        { label: 'Correlativo', value: row => row.Correlativo },
        { label: 'Fecha ingreso', value: row => row['Fecha ingreso'] },
        { label: 'Fecha salida', value: row => row['Fecha salida'] },
        { label: 'Transportista', value: row => row.Transportista },
        { label: 'Placa', value: row => row.Placa },
        { label: 'Comprobante', value: row => row.Comprobante },
        { label: 'Peso Bruto', value: row => row['Peso Bruto'] },
        { label: 'Peso Tara', value: row => row['Peso Tara'] },
        { label: 'Peso Neto', value: row => row['Peso Neto'] },
        { label: 'Destino', value: row => row.Destino },
        { label: 'Prueba laboratorio', value: row => row['Prueba laboratorio'] }
      ]
      await exportRowsToExcel({
        filename: 'plantilla-ingresos-cisterna',
        sheetName: 'Ingresos',
        columns,
        rows
      })
    },

    openImportIngresos() {
      this.$refs.excelInput.click()
    },

    // ===== IMPORTACIÓN (sin RUC) =====
    async importIngresos(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      // Encabezados esperados (sin RUC)
      const expectedHeaders = [
        'Correlativo', 'Fecha ingreso', 'Fecha salida', 'Transportista', 'Placa',
        'Comprobante', 'Peso Bruto', 'Peso Tara', 'Peso Neto',
        'Destino', 'Prueba laboratorio'
      ]

      try {
        const result = await readRowsFromExcelFile(file, expectedHeaders)
        if (!result.matched) {
          alert('El Excel no coincide con las columnas esperadas.')
          return
        }

        let created = 0
        for (const row of result.rows) {
          const form = createEmptyIngresoCisternaForm()
          form.correlativo = row.Correlativo || this.getNextCorrelativo()
          form.fechaIngreso = row['Fecha ingreso'] || getNowDateTimeInput()
          form.fechaSalida = row['Fecha salida'] || ''
          form.pruebaLaboratorio = row['Prueba laboratorio'] || 'No'
          // No asignamos clienteId, lo dejamos null
          form.clienteId = null
          form.transportista = String(row.Transportista || '').trim()
          form.placa = row.Placa || ''
          form.comprobante = row.Comprobante || ''
          form.pesoBruto = Number(row['Peso Bruto']) || 0
          form.pesoTara = Number(row['Peso Tara']) || 0
          form.pesoNeto = Number(row['Peso Neto']) || 0
          form.destino = row.Destino || ''

          if (form.pesoNeto === 0) {
            form.pesoNeto = Math.max(0, form.pesoBruto - form.pesoTara)
          }

          const payload = toIngresoCisternaPayload(form)
          const createdDoc = await this.$firebaseApi.create('ingresosCisterna', payload)
          this.ingresos.unshift(normalizeIngresoCisterna(createdDoc))
          created++
        }
        alert(`Se importaron ${created} registros.`)
      } catch (error) {
        alert('Error al importar')
        console.error(error)
      }
    }
  }
}
</script>

<style scoped>
/* ===== VARIABLES DE MARCA ===== */
.pv-page {
  width: 90%;
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--color-secondary);
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

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: #ffffff;
  font-weight: 700;
  background: var(--color-primary);
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: var(--color-primary-dark);
}

.secondary-button {
  min-height: 42px;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  padding: 0 16px;
  color: var(--color-primary);
  font-weight: 700;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background: rgba(0, 85, 138, 0.06);
}

.content {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.registros-count {
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.excel-button {
  min-height: 40px;
  font-weight: 700;
  text-transform: none;
}

.excel-input {
  display: none;
}

.table-wrapper {
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
  border-bottom: 1px solid var(--color-border);
}

th {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  background: #f8fafc;
}

td {
  color: var(--color-text);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-primary);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button:hover {
  background: #f0f6fa;
  border-color: var(--color-primary);
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

.icon-button--danger:hover {
  background: #fee2e2;
  border-color: #dc2626;
}

.empty-state {
  color: var(--color-muted);
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
  width: min(800px, 100%);
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
  border-bottom: 1px solid var(--color-border);
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

.modal-close:hover {
  background: #e2e8f0;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
}

.form-grid {
  padding: 20px;
}

.form-label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  color: #334155;
  margin-bottom: 4px;
}

.custom-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.custom-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 85, 138, 0.14);
}

.custom-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.autocomplete-field {
  position: relative;
}

.autocomplete-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.autocomplete-list button {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.autocomplete-list button:hover {
  background: #f0f6fa;
}

.autocomplete-list button strong {
  font-weight: 600;
}

.autocomplete-list button span {
  font-size: 12px;
  color: var(--color-muted);
}

.autocomplete-empty {
  padding: 10px 12px;
  color: var(--color-muted);
  font-size: 13px;
}

.bg-form-disabled input {
  background: #f1f5f9;
}

.input-neto-calculado input {
  background: #aaa7a7;
  font-weight: 700;
}

@media (max-width: 640px) {

  .page-header,
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
