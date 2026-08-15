<template>
  <section class="expedientes-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Gestión</p>
        <h1>Expedientes PV</h1>
      </div>
      <div class="header-actions">
        <v-btn-toggle v-model="viewMode" mandatory dense class="view-toggle">
          <v-btn small value="table" :color="viewMode === 'table' ? 'success' : ''" :outlined="viewMode !== 'table'">
            <v-icon small>mdi-table</v-icon>
          </v-btn>
          <v-btn small value="kanban" :color="viewMode === 'kanban' ? 'success' : ''" :outlined="viewMode !== 'kanban'">
            <v-icon small>mdi-view-dashboard</v-icon>
          </v-btn>
        </v-btn-toggle>
        <button class="primary-button" type="button" @click="openCreateModal">
          Nuevo expediente
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Barra de filtros -->
      <div class="table-header">
        <div>
          <h2>Listado de expedientes</h2>
          <span>{{ filteredExpedientes.length }} registros</span>
        </div>
      </div>

      <v-row class="table-actions" dense align="end" justify="end">
        <v-col class="table-action-col" cols="3">
          <v-autocomplete v-model="estadoFiltro" :items="estados" label="Estado" dense hide-details outlined clearable />
        </v-col>
        <v-col class="table-action-col" cols="4">
          <v-text-field v-model.trim="search" dense hide-details outlined type="search" label="Buscar cliente o N° PV"
            placeholder="Ej. PV-001" />
        </v-col>
        <v-col class="table-action-col" cols="3">
          <v-text-field v-model="fechaFiltro" dense hide-details outlined type="date" label="Filtrar por fecha" />
        </v-col>
        <v-col class="table-action-col table-action-col--excel" cols="2">
          <v-menu offset-y>
            <template #activator="{ on, attrs }">
              <v-btn class="excel-button" color="#107c41" dark type="button" v-bind="attrs" v-on="on">
                <v-icon left>mdi-microsoft-excel</v-icon>
                Excel
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item @click="exportExpedientes">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportExpedientes">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="downloadPlantilla">
                <v-list-item-title>Plantilla</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>
        <input ref="excelInput" class="excel-input" type="file" accept=".xlsx" @change="importExpedientes" />
      </v-row>

      <!-- VISTA TABLA -->
      <div v-if="viewMode === 'table'" class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th># PV</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Acción Inmediata</th>
              <th>Planner</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in filteredExpedientes" :key="exp.id">
              <td>{{ exp.correlativo || '—' }}</td>
              <td>{{ formatDateOnly(exp.fecha) }}</td>
              <td>{{ exp.cliente.nombre || '—' }}</td>
              <td>{{ truncate(exp.accionInmediata, 20) }}</td>
              <td>{{ exp.planner || '—' }}</td>
              <td>
                <div class="actions">
                  <v-btn icon small class="status-icon-button status-icon-button--back"
                    :title="canRegress(exp.estado) ? `Retroceder a ${getPreviousEstado(exp.estado)}` : 'No se puede retroceder'"
                    :disabled="!canRegress(exp.estado)" @click="regressExpedienteEstado(exp)">
                    <v-icon small>mdi-arrow-left</v-icon>
                  </v-btn>

                  <v-btn v-if="exp.estado === 'Regularizado'" icon small color="primary"
                    class="status-icon-button status-icon-button--emitir" title="Emitir carta y cerrar expediente"
                    @click="emitirCarta(exp)">
                    <v-icon small>mdi-file-document-edit</v-icon>
                  </v-btn>
                  <v-btn v-else icon small class="status-icon-button"
                    :class="`status-icon-button--${getEstadoClass(exp.estado)}`" :title="getAvanceTitle(exp.estado)"
                    :disabled="exp.estado === 'Cerrado'" @click="advanceExpedienteEstado(exp)">
                    <v-icon small>{{ getAvanceIcon(exp.estado) }}</v-icon>
                  </v-btn>

                  <button class="icon-button" type="button" title="Editar expediente" aria-label="Editar expediente"
                    @click="openEditModal(exp)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>

                  <button class="icon-button icon-button--danger" type="button" title="Eliminar expediente"
                    @click="deleteExpediente(exp.id)">
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
              <td class="empty-state" colspan="10">Cargando expedientes...</td>
            </tr>
            <tr v-else-if="filteredExpedientes.length === 0">
              <td class="empty-state" colspan="10">No se encontraron expedientes.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- VISTA KANBAN (CORREGIDA) -->
      <div v-else class="kanban-board">
        <div
          v-for="(items, estado) in kanbanLists"
          :key="estado"
          class="kanban-column"
          :class="`kanban-column--${estado.toLowerCase()}`"
        >
          <div class="kanban-column-header">
            <span>{{ estado }}</span>
            <span class="badge">{{ items.length }}</span>
          </div>

          <div v-if="items.length === 0" class="kanban-empty-column">
            Sin registros
          </div>

          <draggable
            v-else
            :list="items"
            item-key="id"
            group="expedientes"
            @change="onDragChange($event, estado)"
            class="kanban-list"
            :move="onDragMove"
          >
            <template #item="{ element }">
              <div class="kanban-card" :class="{ 'card-cerrado': element.estado === 'Cerrado' }">
                <div class="card-header">
                  <strong>{{ element.correlativo || '—' }}</strong>
                  <span class="card-date">{{ formatDateOnly(element.fecha) }}</span>
                </div>
                <div class="card-body">
                  <div><strong>Cliente:</strong> {{ element.cliente.nombre || '—' }}</div>
                  <div><strong>Acción:</strong> {{ truncate(element.accionInmediata, 20) }}</div>
                  <div><strong>Planner:</strong> {{ element.planner || '—' }}</div>
                </div>
                <div class="card-actions">
                  <v-btn icon small @click="openEditModal(element)">
                    <v-icon small>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon small color="red" @click="deleteExpediente(element.id)">
                    <v-icon small>mdi-delete</v-icon>
                  </v-btn>
                  <v-btn
                    v-if="element.estado === 'Regularizado'"
                    icon small color="primary"
                    @click="emitirCarta(element)"
                    title="Emitir carta"
                  >
                    <v-icon small>mdi-file-document-edit</v-icon>
                  </v-btn>
                </div>
              </div>
            </template>
          </draggable>
        </div>

        <div v-if="loading" class="kanban-loading">Cargando expedientes...</div>
        <div v-else-if="filteredExpedientes.length === 0" class="kanban-empty">
          No se encontraron expedientes.
        </div>
      </div>
    </div>

    <!-- Modal de creación / edición -->
    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal modal--form" @submit.prevent="saveExpediente">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar expediente' : 'Nuevo expediente' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">x</button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="6">
              <label>
                N° PV (Correlativo)
                <input v-model.trim="form.correlativo" type="text" placeholder="Ej. PV-001" />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label class="autocomplete-field">
                Cliente
                <input v-model.trim="clienteSearch" type="text" required autocomplete="off"
                  placeholder="Escribe para buscar cliente" @focus="openClienteDropdown" @input="handleClienteSearch"
                  @blur="closeClienteDropdown" @keydown.esc="closeClienteDropdown" />
                <div v-if="isClienteDropdownOpen" class="autocomplete-menu">
                  <button v-for="cliente in filteredClientesOptions" :key="cliente.id" class="autocomplete-option"
                    type="button" @mousedown.prevent="selectCliente(cliente)">
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }} - {{ cliente.contacto }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">Cargando clientes...</div>
                  <div v-else-if="filteredClientesOptions.length === 0" class="autocomplete-empty">
                    <v-btn small color="green" outlined @mousedown.prevent="openQuickCliente">+ Agregar cliente</v-btn>
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Sede
                <select v-model="form.sede" required>
                  <option value="" disabled>Selecciona una sede</option>
                  <option value="Chilca">Chilca</option>
                  <option value="Villa el Salvador">Villa el Salvador</option>
                </select>
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Fecha
                <input v-model="form.fecha" type="date" required />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label class="autocomplete-field">
                Transportista
                <input v-model.trim="transportistaSearch" type="text" autocomplete="off"
                  placeholder="Buscar transportista (cliente)" @focus="openTransportistaDropdown"
                  @input="handleTransportistaSearch" @blur="closeTransportistaDropdown"
                  @keydown.esc="closeTransportistaDropdown" />
                <div v-if="isTransportistaDropdownOpen" class="autocomplete-menu">
                  <button v-for="cliente in filteredTransportistaOptions" :key="cliente.id" class="autocomplete-option"
                    type="button" @mousedown.prevent="selectTransportista(cliente)">
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }} - {{ cliente.contacto }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">Cargando clientes...</div>
                  <div v-else-if="filteredTransportistaOptions.length === 0" class="autocomplete-empty">
                    No se encontraron clientes
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label class="autocomplete-field">
                Generador PV
                <input v-model.trim="generadorSearch" type="text" autocomplete="off"
                  placeholder="Buscar generador (cliente)" @focus="openGeneradorDropdown" @input="handleGeneradorSearch"
                  @blur="closeGeneradorDropdown" @keydown.esc="closeGeneradorDropdown" />
                <div v-if="isGeneradorDropdownOpen" class="autocomplete-menu">
                  <button v-for="cliente in filteredGeneradorOptions" :key="cliente.id" class="autocomplete-option"
                    type="button" @mousedown.prevent="selectGenerador(cliente)">
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }} - {{ cliente.contacto }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">Cargando clientes...</div>
                  <div v-else-if="filteredGeneradorOptions.length === 0" class="autocomplete-empty">
                    No se encontraron clientes
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label class="autocomplete-field">
                Planner
                <input v-model.trim="plannerSearch" type="text" autocomplete="off"
                  placeholder="Escribe para buscar planner" @focus="openPlannerDropdown" @input="handlePlannerSearch"
                  @blur="closePlannerDropdown" @keydown.esc="closePlannerDropdown" />
                <div v-if="isPlannerDropdownOpen" class="autocomplete-menu">
                  <button v-for="persona in filteredPlannerOptions" :key="persona.id" class="autocomplete-option"
                    type="button" @mousedown.prevent="selectPlanner(persona)">
                    <strong>{{ persona.nombres }}</strong>
                    <span v-if="persona.apellidos">{{ persona.apellidos }}</span>
                  </button>
                  <div v-if="personalLoading" class="autocomplete-empty">Cargando planners...</div>
                  <div v-else-if="filteredPlannerOptions.length === 0" class="autocomplete-empty">
                    <v-btn small color="green" outlined @mousedown.prevent="openQuickPlanner">+ Agregar planner</v-btn>
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12">
              <label>
                Observaciones
                <textarea v-model.trim="form.observaciones" rows="3" placeholder="Detalle de la observación..." />
              </label>
            </v-col>

            <v-col cols="12">
              <label>
                Acción Inmediata
                <textarea v-model.trim="form.accionInmediata" rows="2" placeholder="Acción a tomar..." />
              </label>
            </v-col>
          </v-row>
        </div>

        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">Cancelar</button>
          <button class="primary-button" type="submit">Guardar</button>
        </div>
      </form>
    </div>

    <!-- Modal rápido -->
    <div v-if="quickModalOpen" class="modal-backdrop">
      <div class="modal modal--form" style="max-width: 500px;">
        <div class="modal-header">
          <h2>{{ quickModalType === 'cliente' ? 'Nuevo cliente' : 'Nuevo planner' }}</h2>
          <button type="button" class="modal-close" @click="closeQuickModal">x</button>
        </div>
        <div class="form-grid">
          <v-row dense>
            <v-col cols="12">
              <label>
                {{ quickModalType === 'cliente' ? 'Nombre del cliente' : 'Nombres completos' }}
                <input v-model.trim="quickForm.nombre" type="text" required />
              </label>
            </v-col>
            <v-col v-if="quickModalType === 'cliente'" cols="12">
              <label>
                RUC
                <input v-model.trim="quickForm.ruc" type="text" />
              </label>
            </v-col>
            <v-col v-if="quickModalType === 'cliente'" cols="12">
              <label>
                Contacto
                <input v-model.trim="quickForm.contacto" type="text" />
              </label>
            </v-col>
            <v-col v-if="quickModalType === 'cliente'" cols="12">
              <label>
                Teléfono de contacto
                <input v-model.trim="quickForm.telefonoContacto" type="text" />
              </label>
            </v-col>
          </v-row>
        </div>
        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeQuickModal">Cancelar</button>
          <button class="primary-button" type="button" @click="saveQuickItem">Guardar</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import draggable from 'vuedraggable'
import { normalizeCliente } from '~/models/cliente'
import { normalizePersonal } from '~/models/personal'
import {
  createEmptyExpedienteForm,
  normalizeExpediente,
  toExpedientePayload,
  ESTADOS_EXPEDIENTE
} from '~/models/expediente'
import { exportRowsToExcel, readRowsFromExcelFile } from '~/utils/exportExcel'
import { formatWeight, getNowDateTimeInput, getTodayDateInput } from '~/utils/formatters'

const EXCEL_COLUMNS = [
  'Correlativo',
  'Sede',
  'Fecha',
  'Cliente',
  'RUC',
  'Transportista',
  'Generador PV',
  'Observaciones',
  'Acción Inmediata',
  'Planner',
  'Estado'
]

export default {
  name: 'ExpedientesPage',
  components: { draggable },
  data() {
    return {
      viewMode: 'table',
      estados: ESTADOS_EXPEDIENTE,
      search: '',
      fechaFiltro: null,
      estadoFiltro: null,
      loading: false,
      isModalOpen: false,
      editingId: null,
      form: createEmptyExpedienteForm(),
      clientes: [],
      personal: [],
      clientesLoading: false,
      personalLoading: false,
      clienteSearch: '',
      isClienteDropdownOpen: false,
      transportistaSearch: '',
      isTransportistaDropdownOpen: false,
      generadorSearch: '',
      isGeneradorDropdownOpen: false,
      plannerSearch: '',
      isPlannerDropdownOpen: false,
      quickModalOpen: false,
      quickModalType: null,
      quickForm: {
        nombre: '',
        ruc: '',
        contacto: '',
        telefonoContacto: ''
      },
      expedientes: [],
      // Objeto reactivo para el Kanban
      kanbanLists: {}
    }
  },
  computed: {
    filteredExpedientes() {
      const term = this.search.toLowerCase()
      const fechaFiltro = this.fechaFiltro
      const estadoFiltro = this.estadoFiltro

      return this.expedientes.filter(exp => {
        const matchesSearch =
          !term ||
          (exp.cliente?.nombre || '').toLowerCase().includes(term) ||
          (exp.correlativo || '').toLowerCase().includes(term) ||
          (exp.sede || '').toLowerCase().includes(term) ||
          (exp.transportista || '').toLowerCase().includes(term) ||
          (exp.generadorPv || '').toLowerCase().includes(term)

        const fechaStr = this.formatDateInput(exp.fecha)
        const matchesDate = !fechaFiltro || fechaStr === fechaFiltro
        const matchesEstado = !estadoFiltro || exp.estado === estadoFiltro

        return matchesSearch && matchesDate && matchesEstado
      })
    },

    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()
      if (!term) return this.clientes.slice(0, 8)
      return this.clientes
        .filter(
          c =>
            c.nombre.toLowerCase().includes(term) ||
            c.ruc.toLowerCase().includes(term) ||
            c.contacto.toLowerCase().includes(term)
        )
        .slice(0, 8)
    },
    filteredTransportistaOptions() {
      const term = this.transportistaSearch.toLowerCase()
      if (!term) return this.clientes.slice(0, 8)
      return this.clientes
        .filter(
          c =>
            c.nombre.toLowerCase().includes(term) ||
            c.ruc.toLowerCase().includes(term) ||
            c.contacto.toLowerCase().includes(term)
        )
        .slice(0, 8)
    },
    filteredGeneradorOptions() {
      const term = this.generadorSearch.toLowerCase()
      if (!term) return this.clientes.slice(0, 8)
      return this.clientes
        .filter(
          c =>
            c.nombre.toLowerCase().includes(term) ||
            c.ruc.toLowerCase().includes(term) ||
            c.contacto.toLowerCase().includes(term)
        )
        .slice(0, 8)
    },
    filteredPlannerOptions() {
      const term = this.plannerSearch.toLowerCase()
      if (!term) return this.personal.slice(0, 8)
      return this.personal
        .filter(p =>
          (p.nombres + ' ' + (p.apellidos || '')).toLowerCase().includes(term) ||
          (p.nombres || '').toLowerCase().includes(term)
        )
        .slice(0, 8)
    }
  },
  watch: {
    // Actualizar kanbanLists cada vez que filteredExpedientes cambie
    filteredExpedientes: {
      handler(newVal) {
        const grupos = {}
        this.estados.forEach(est => { grupos[est] = [] })
        newVal.forEach(exp => {
          const estado = exp.estado || 'Pendiente'
          if (grupos[estado]) grupos[estado].push(exp)
          else grupos[estado] = [exp]
        })
        this.kanbanLists = grupos
      },
      immediate: true
    }
  },
  mounted() {
    this.getAll()
    this.loadClientes()
    this.loadPersonal()
  },
  methods: {
    formatWeight,
    getNowDateTimeInput,

    formatDateOnly(value) {
      if (!value) return ''
      let d = value
      if (typeof value.toDate === 'function') d = value.toDate()
      else if (typeof value === 'object' && value.seconds !== undefined) {
        d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6)
      }
      if (!(d instanceof Date) || isNaN(d.getTime())) return ''
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    },

    formatDateInput(value) {
      if (!value) return ''
      let d = value
      if (typeof value.toDate === 'function') d = value.toDate()
      else if (typeof value === 'object' && value.seconds !== undefined) {
        d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6)
      }
      if (!(d instanceof Date) || isNaN(d.getTime())) return ''
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    async getAll() {
      this.loading = true
      try {
        const data = await this.$firebaseApi.list('expedientes')
        this.expedientes = data.map(normalizeExpediente)
      } catch (error) {
        alert('No se pudieron cargar los expedientes')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async loadClientes() {
      this.clientesLoading = true
      try {
        const data = await this.$firebaseApi.list('clientes')
        this.clientes = data.map(normalizeCliente).filter(c => c.estado)
      } catch (error) {
        this.clientes = []
        console.error(error)
      } finally {
        this.clientesLoading = false
      }
    },

    async loadPersonal() {
      this.personalLoading = true
      try {
        const data = await this.$firebaseApi.list('personal')
        this.personal = data.map(normalizePersonal).filter(p => p.estado)
      } catch (error) {
        this.personal = []
        console.error(error)
      } finally {
        this.personalLoading = false
      }
    },

    async create(payload) {
      await this.$firebaseApi.create('expedientes', payload)
      await this.getAll()
    },

    async update(id, payload) {
      await this.$firebaseApi.update('expedientes', id, payload)
      await this.getAll()
    },

    async deleteExpediente(id) {
      if (!confirm('¿Eliminar este expediente permanentemente?')) return
      try {
        await this.$firebaseApi.remove('expedientes', id)
        await this.getAll()
      } catch (error) {
        alert('No se pudo eliminar')
        console.error(error)
      }
    },

    getPreviousEstado(estado) {
      const idx = ESTADOS_EXPEDIENTE.indexOf(estado)
      return idx > 0 ? ESTADOS_EXPEDIENTE[idx - 1] : null
    },

    getNextEstado(estado) {
      const idx = ESTADOS_EXPEDIENTE.indexOf(estado)
      return idx < ESTADOS_EXPEDIENTE.length - 1 ? ESTADOS_EXPEDIENTE[idx + 1] : null
    },

    canRegress(estado) {
      return estado !== 'Pendiente' && estado !== 'Cerrado'
    },

    getAvanceTitle(estado) {
      const next = this.getNextEstado(estado)
      return next ? `Avanzar a ${next}` : 'Estado final'
    },

    getAvanceIcon(estado) {
      const icons = {
        Pendiente: 'mdi-arrow-right-bold',
        Notificado: 'mdi-arrow-right-bold',
        Cerrado: 'mdi-check-circle'
      }
      return icons[estado] || 'mdi-arrow-right-bold'
    },

    getEstadoClass(estado) {
      return String(estado || 'Pendiente').toLowerCase()
    },

    async advanceExpedienteEstado(exp) {
      const next = this.getNextEstado(exp.estado)
      if (!next) return
      if (!confirm(`¿Cambiar estado de "${exp.estado}" a "${next}"?`)) return

      try {
        await this.$firebaseApi.update('expedientes', exp.id, { estado: next })
        await this.getAll()
      } catch (error) {
        alert('No se pudo actualizar el estado')
        console.error(error)
      }
    },

    async regressExpedienteEstado(exp) {
      const prev = this.getPreviousEstado(exp.estado)
      if (!prev) return
      if (!confirm(`¿Retroceder estado de "${exp.estado}" a "${prev}"?`)) return

      try {
        await this.$firebaseApi.update('expedientes', exp.id, { estado: prev })
        await this.getAll()
      } catch (error) {
        alert('No se pudo retroceder el estado')
        console.error(error)
      }
    },

    async emitirCarta(exp) {
      if (exp.estado !== 'Regularizado') {
        alert('Solo se puede emitir carta desde el estado "Regularizado"')
        return
      }
      if (!confirm(`¿Emitir carta para el expediente "${exp.correlativo}" y cerrarlo?`)) return

      try {
        const cartaPayload = this.buildCartaFromExpediente(exp)
        const cartaCreada = await this.$firebaseApi.create('cartas', cartaPayload)
        await this.$firebaseApi.update('expedientes', exp.id, {
          estado: 'Cerrado',
          cartaId: cartaCreada.id
        })
        await this.getAll()
        alert(`Carta ${cartaCreada.correlativo || 'generada'} creada exitosamente.`)
      } catch (error) {
        alert('Error al emitir la carta')
        console.error(error)
      }
    },

    buildCartaFromExpediente(exp) {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
      const nextCorrelativo = `SGP-CH-${month}.${year}-${random}`

      let fechaExpediente = new Date()
      if (exp.fecha) {
        const d = this.parseDate(exp.fecha)
        if (d && !isNaN(d.getTime())) fechaExpediente = d
      }

      return {
        correlativo: nextCorrelativo,
        lugar: 'Lima',
        fecha: fechaExpediente,
        fechaServicio: fechaExpediente,
        cliente: {
          nombre: exp.cliente.nombre || '',
          ruc: exp.cliente.ruc || '',
          direccion: exp.cliente.direccion || '',
          contactoNombre: exp.cliente.contactoNombre || '',
          contactoTelefono: exp.cliente.contactoTelefono || ''
        },
        contexto: `De nuestra consideración:\nLa presente tiene por finalidad hacerle llegar la documentación correspondiente al expediente ${exp.correlativo}.\nObservación: ${exp.observaciones || 'Sin detalle'}`,
        detalles: [{ numero: 1, numeroTexto: '(Uno)', descripcion: 'Documento adjunto' }],
        despedida: 'Sin otro particular, quedamos atentos a su respuesta.',
        estadoProceso: 'Emitido',
        estado: 'Emitido',
        fechaCreacion: new Date()
      }
    },

    openCreateModal() {
      this.editingId = null
      this.form = createEmptyExpedienteForm()
      this.form.fecha = getTodayDateInput()
      this.clienteSearch = ''
      this.transportistaSearch = ''
      this.generadorSearch = ''
      this.plannerSearch = ''
      this.isClienteDropdownOpen = false
      this.isTransportistaDropdownOpen = false
      this.isGeneradorDropdownOpen = false
      this.isPlannerDropdownOpen = false
      this.isModalOpen = true
    },

    openEditModal(exp) {
      this.editingId = exp.id
      this.form = {
        ...exp,
        cliente: { ...exp.cliente }
      }
      this.form.fecha = this.formatDateInput(exp.fecha) || getTodayDateInput()
      this.clienteSearch = exp.cliente?.nombre || ''
      this.transportistaSearch = exp.transportista || ''
      this.generadorSearch = exp.generadorPv || ''
      this.plannerSearch = exp.planner || ''
      this.isClienteDropdownOpen = false
      this.isTransportistaDropdownOpen = false
      this.isGeneradorDropdownOpen = false
      this.isPlannerDropdownOpen = false
      this.isModalOpen = true
    },

    closeModal() {
      this.isModalOpen = false
      this.isClienteDropdownOpen = false
      this.isTransportistaDropdownOpen = false
      this.isGeneradorDropdownOpen = false
      this.isPlannerDropdownOpen = false
    },

    async saveExpediente() {
      const payload = toExpedientePayload(this.form)
      try {
        if (this.editingId) {
          await this.update(this.editingId, payload)
        } else {
          await this.create(payload)
        }
        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el expediente')
        console.error(error)
      }
    },

    openClienteDropdown() { this.isClienteDropdownOpen = true },
    closeClienteDropdown() { this.isClienteDropdownOpen = false },
    handleClienteSearch() {
      this.form.cliente.nombre = this.clienteSearch
      this.isClienteDropdownOpen = true
    },
    selectCliente(cliente) {
      this.form.cliente = {
        nombre: cliente.nombre,
        ruc: cliente.ruc,
        direccion: cliente.direccion,
        contactoNombre: cliente.contacto,
        contactoTelefono: cliente.telefonoContacto
      }
      this.clienteSearch = cliente.nombre
      this.isClienteDropdownOpen = false
    },

    openTransportistaDropdown() { this.isTransportistaDropdownOpen = true },
    closeTransportistaDropdown() { this.isTransportistaDropdownOpen = false },
    handleTransportistaSearch() {
      this.form.transportista = this.transportistaSearch
      this.isTransportistaDropdownOpen = true
    },
    selectTransportista(cliente) {
      this.form.transportista = cliente.nombre
      this.transportistaSearch = cliente.nombre
      this.isTransportistaDropdownOpen = false
    },

    openGeneradorDropdown() { this.isGeneradorDropdownOpen = true },
    closeGeneradorDropdown() { this.isGeneradorDropdownOpen = false },
    handleGeneradorSearch() {
      this.form.generadorPv = this.generadorSearch
      this.isGeneradorDropdownOpen = true
    },
    selectGenerador(cliente) {
      this.form.generadorPv = cliente.nombre
      this.generadorSearch = cliente.nombre
      this.isGeneradorDropdownOpen = false
    },

    openPlannerDropdown() { this.isPlannerDropdownOpen = true },
    closePlannerDropdown() { this.isPlannerDropdownOpen = false },
    handlePlannerSearch() {
      this.form.planner = this.plannerSearch
      this.isPlannerDropdownOpen = true
    },
    selectPlanner(persona) {
      this.form.planner = persona.nombres
      this.plannerSearch = persona.nombres
      this.isPlannerDropdownOpen = false
    },

    openQuickCliente() {
      this.quickModalType = 'cliente'
      this.quickForm = { nombre: '', ruc: '', contacto: '', telefonoContacto: '' }
      this.quickModalOpen = true
    },

    openQuickPlanner() {
      this.quickModalType = 'planner'
      this.quickForm = { nombre: '' }
      this.quickModalOpen = true
    },

    closeQuickModal() {
      this.quickModalOpen = false
    },

    async saveQuickItem() {
      const { quickModalType, quickForm } = this
      if (!quickForm.nombre.trim()) {
        alert('El nombre es obligatorio')
        return
      }

      try {
        if (quickModalType === 'cliente') {
          const newCliente = {
            nombre: quickForm.nombre.trim(),
            ruc: quickForm.ruc?.trim() || '',
            contacto: quickForm.contacto?.trim() || '',
            telefonoContacto: quickForm.telefonoContacto?.trim() || '',
            direccion: '',
            estado: true
          }
          await this.$firebaseApi.create('clientes', newCliente)
          await this.loadClientes()
          const clienteCreado = this.clientes.find(c => c.nombre === quickForm.nombre.trim())
          if (clienteCreado) {
            this.selectCliente(clienteCreado)
          } else {
            this.clienteSearch = quickForm.nombre.trim()
            this.form.cliente.nombre = quickForm.nombre.trim()
          }
        } else if (quickModalType === 'planner') {
          const newPlanner = {
            nombres: quickForm.nombre.trim(),
            apellidos: '',
            estado: true
          }
          await this.$firebaseApi.create('personal', newPlanner)
          await this.loadPersonal()
          const plannerCreado = this.personal.find(p => p.nombres === quickForm.nombre.trim())
          this.form.planner = plannerCreado ? plannerCreado.nombres : quickForm.nombre.trim()
          this.plannerSearch = this.form.planner
        }
        this.closeQuickModal()
      } catch (error) {
        alert('Error al crear el registro. Revisa la consola.')
        console.error(error)
      }
    },

    getExcelColumns() {
      return [
        { label: 'Correlativo', value: e => e.correlativo },
        { label: 'Sede', value: e => e.sede },
        { label: 'Fecha', value: e => this.formatDateOnly(e.fecha) },
        { label: 'Cliente', value: e => e.cliente.nombre },
        { label: 'RUC', value: e => e.cliente.ruc },
        { label: 'Transportista', value: e => e.transportista },
        { label: 'Generador PV', value: e => e.generadorPv },
        { label: 'Observaciones', value: e => e.observaciones },
        { label: 'Acción Inmediata', value: e => e.accionInmediata },
        { label: 'Planner', value: e => e.planner },
        { label: 'Estado', value: e => e.estado }
      ]
    },

    async exportExpedientes() {
      await exportRowsToExcel({
        filename: 'expedientes',
        sheetName: 'Expedientes',
        rows: this.filteredExpedientes,
        columns: this.getExcelColumns()
      })
    },

    downloadPlantilla() {
      exportRowsToExcel({
        filename: 'plantilla_expedientes',
        sheetName: 'Plantilla',
        rows: [],
        columns: this.getExcelColumns()
      })
    },

    openImportExpedientes() {
      this.$refs.excelInput.click()
    },

    async importExpedientes(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, EXCEL_COLUMNS)
        if (!result.matched) {
          alert('El Excel no coincide con las columnas esperadas.')
          return
        }
        if (!result.rows.length) {
          alert('El archivo está vacío.')
          return
        }

        for (const row of result.rows) {
          const newExp = {
            ...createEmptyExpedienteForm(),
            correlativo: row.Correlativo || '',
            sede: row.Sede || '',
            fecha: this.parseImportedDate(row.Fecha),
            cliente: {
              nombre: row.Cliente || '',
              ruc: row.RUC || '',
              direccion: '',
              contactoNombre: '',
              contactoTelefono: ''
            },
            transportista: row.Transportista || '',
            generadorPv: row['Generador PV'] || '',
            observaciones: row.Observaciones || '',
            accionInmediata: row['Acción Inmediata'] || '',
            planner: row.Planner || '',
            estado: ESTADOS_EXPEDIENTE.includes(row.Estado) ? row.Estado : 'Pendiente'
          }
          const payload = toExpedientePayload(newExp)
          await this.$firebaseApi.create('expedientes', payload)
        }

        await this.getAll()
        alert(`Se importaron ${result.rows.length} expedientes.`)
      } catch (error) {
        alert('Error al importar el Excel')
        console.error(error)
      }
    },

    // ========== KANBAN DRAG & DROP ==========
    onDragMove(evt) {
      const exp = evt.draggedContext.element
      const destinoEstado = evt.relatedContext.listName
      if (exp.estado === 'Cerrado' && destinoEstado !== 'Cerrado') {
        alert('No se puede mover un expediente Cerrado.')
        return false
      }
      if (destinoEstado === 'Cerrado' && exp.estado !== 'Regularizado') {
        alert('Solo se puede cerrar un expediente que está Regularizado.')
        return false
      }
      return true
    },

    async onDragChange(event, estadoDestino) {
      if (event.added) {
        const exp = event.added.element
        if (!exp || !exp.id) return

        try {
          await this.$firebaseApi.update('expedientes', exp.id, { estado: estadoDestino })
          await this.getAll()
        } catch (error) {
          alert('Error al actualizar estado')
          console.error(error)
          await this.getAll()
        }
      }
    },

    getTodayInputDate() {
      return getTodayDateInput()
    },

    parseDate(dateInput) {
      if (!dateInput) return null
      if (dateInput instanceof Date) return dateInput
      if (typeof dateInput === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
          const parts = dateInput.split('T')[0].split('-').map(Number)
          if (parts.length === 3) {
            return new Date(parts[0], parts[1] - 1, parts[2])
          }
        }
        const partes = dateInput.split('/')
        if (partes.length === 3) {
          const dia = parseInt(partes[0], 10)
          const mes = parseInt(partes[1], 10) - 1
          const anio = parseInt(partes[2], 10)
          return new Date(anio, mes, dia)
        }
        return new Date(dateInput)
      }
      if (typeof dateInput === 'object' && dateInput.seconds !== undefined) {
        return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1e6)
      }
      return new Date(dateInput)
    },

    parseImportedDate(value) {
      if (!value) return getTodayDateInput()
      const parts = String(value).split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return value
    },

    truncate(text, len) {
      if (!text) return '—'
      return text.length > len ? text.slice(0, len) + '…' : text
    }
  }
}
</script>

<style scoped>
/* Estilos iguales a los que ya tenías, no hay cambios */
.expedientes-page {
  width: min(1120px, calc(100% - 32px));
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle .v-btn {
  min-width: 36px;
  padding: 0 8px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1, h2, h3 {
  margin: 0;
}

h1 {
  font-size: 32px;
}

h2 {
  font-size: 18px;
}

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: #fff;
  font-weight: 700;
  background: #0f766e;
  cursor: pointer;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header>div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-header span {
  color: #64748b;
  font-size: 14px;
}

.table-actions {
  width: min(760px, 100%);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 12px;
  margin: 16px 20px 18px auto;
}

.table-action-col {
  padding: 0;
}

.excel-button {
  width: 100%;
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

th, td {
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
  align-items: center;
  gap: 8px;
}

.status-icon-button {
  border: 1px solid transparent;
  border-radius: 8px;
}

.status-icon-button--back {
  color: #475569 !important;
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.status-icon-button--pendiente {
  color: #b45309 !important;
  border-color: #fde68a;
  background: #fef3c7;
}

.status-icon-button--notificado {
  color: #1d4ed8 !important;
  border-color: #bfdbfe;
  background: #dbeafe;
}

.status-icon-button--regularizado {
  color: #16a34a !important;
  border-color: #bbf7d0;
  background: #dcfce7;
}

.status-icon-button--cerrado {
  color: #475569 !important;
  border-color: #cbd5e1;
  background: #f1f5f9;
  cursor: not-allowed;
}

.status-icon-button--emitir {
  color: #fff !important;
  background: #0f766e;
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
  background: #fff;
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
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.modal--form {
  width: min(920px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}

.modal-header, .modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.modal-header {
  border-bottom: 1px solid #e2e8f0;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
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

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.form-grid input,
.form-grid textarea,
.form-grid select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.form-grid input:focus,
.form-grid textarea:focus,
.form-grid select:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.form-grid select {
  background: #fff;
  appearance: auto;
}

.autocomplete-field {
  position: relative;
}

.autocomplete-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 70;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
}

.autocomplete-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #edf2f7;
  padding: 10px 12px;
  color: #1e293b;
  font: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
}

.autocomplete-option:hover {
  background: #f8fafc;
}

.autocomplete-option span,
.autocomplete-empty {
  color: #64748b;
  font-size: 13px;
  font-weight: 400;
}

.autocomplete-empty {
  padding: 12px;
}

.secondary-button {
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 16px;
  color: #334155;
  font-weight: 700;
  background: #fff;
  cursor: pointer;
}

/* KANBAN */
.kanban-board {
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow-x: auto;
  min-height: 300px;
}

.kanban-column {
  flex: 1;
  min-width: 220px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  max-height: 600px;
}

.kanban-column-header {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #cbd5e1;
}

.badge {
  background: #e2e8f0;
  padding: 0 8px;
  border-radius: 12px;
  font-size: 12px;
}

.kanban-list {
  flex: 1;
  min-height: 80px;
  overflow-y: auto;
}

.kanban-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  border: 1px solid #edf2f7;
  cursor: grab;
  transition: box-shadow 0.2s;
}

.kanban-card:active {
  cursor: grabbing;
}

.kanban-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-cerrado {
  opacity: 0.7;
  cursor: not-allowed;
}

.card-header {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 6px;
}

.card-date {
  color: #64748b;
  font-size: 12px;
}

.card-body {
  font-size: 13px;
  color: #334155;
}

.card-body div {
  margin: 2px 0;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.kanban-empty-column {
  text-align: center;
  color: #94a3b8;
  padding: 16px 0;
  font-style: italic;
}

.kanban-loading,
.kanban-empty {
  padding: 20px;
  text-align: center;
  color: #64748b;
  width: 100%;
}

@media (max-width: 640px) {
  .page-header, .table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .table-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .primary-button,
  .modal-actions .primary-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .secondary-button {
    width: 100%;
  }

  .kanban-board {
    flex-direction: column;
    align-items: stretch;
  }

  .kanban-column {
    min-width: unset;
    max-height: none;
  }
}
</style>