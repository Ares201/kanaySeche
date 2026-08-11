<template>
  <section class="expedientes-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Documentos</p>
        <h1>Expedientes</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo expediente
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de expedientes</h2>
          <span>{{ filteredExpedientes.length }} registros</span>
        </div>
      </div>

      <v-row class="table-actions" dense align="end" justify="end">
        <v-col class="table-action-col" cols="3">
          <v-autocomplete v-model="estadoFiltro" :items="estados" label="Estado" dense hide-details outlined
            clearable />
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
            </v-list>
          </v-menu>
        </v-col>
        <input ref="excelInput" class="excel-input" type="file" accept=".xlsx" @change="importExpedientes" />
      </v-row>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th># PV</th>
              <th>Sede</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Transportista</th>
              <th>Generador PV</th>
              <th>Observaciones</th>
              <th>Acción Inmediata</th>
              <th>Planner</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in filteredExpedientes" :key="exp.id">
              <td>{{ exp.correlativo || '—' }}</td>
              <td>{{ exp.sede || '—' }}</td>
              <td>{{ formatShortDate(exp.fecha) }}</td>
              <td>{{ exp.cliente.nombre || '—' }}</td>
              <td>{{ exp.transportista || '—' }}</td>
              <td>{{ exp.generadorPv || '—' }}</td>
              <td>{{ truncate(exp.observaciones, 30) }}</td>
              <td>{{ truncate(exp.accionInmediata, 20) }}</td>
              <td>{{ exp.planner || '—' }}</td>
              <td>
                <div class="actions">
                  <!-- Botón de retroceder -->
                  <v-btn icon small class="status-icon-button status-icon-button--back"
                    :title="canRegress(exp.estado) ? `Retroceder a ${getPreviousEstado(exp.estado)}` : 'No se puede retroceder'"
                    :disabled="!canRegress(exp.estado)" @click="regressExpedienteEstado(exp)">
                    <v-icon small>mdi-arrow-left</v-icon>
                  </v-btn>

                  <!-- Botón de avanzar o Emitir Carta -->
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

                  <!-- Eliminar -->
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
    </div>

    <!-- Modal de creación -->
    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal modal--form" @submit.prevent="saveExpediente">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar expediente' : 'Nuevo expediente' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">x</button>
        </div>

        <div class="form-grid">
          <v-row dense>
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
                <input v-model.trim="form.sede" type="text" placeholder="Ej. Lima" required />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Transportista
                <input v-model.trim="form.transportista" type="text" placeholder="Nombre del transportista" />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Generador PV
                <input v-model.trim="form.generadorPv" type="text" placeholder="Generador del PV" />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Planner
                <input v-model.trim="form.planner" type="text" placeholder="Nombre del planner" />
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Fecha
                <input v-model="form.fecha" type="date" required />
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
  </section>
</template>

<script>
// import { normalizeCliente } from '~/models/cliente'
import { exportRowsToExcel, readRowsFromExcelFile } from '~/utils/exportExcel'

// Estados posibles
const ESTADOS = ['Pendiente', 'Notificado', 'Regularizado', 'Cerrado']

// Columnas para Excel
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
  data() {
    return {
      estados: ESTADOS,
      search: '',
      fechaFiltro: this.getTodayInputDate(),
      estadoFiltro: null,
      loading: false,
      isModalOpen: false,
      editingId: null,
      form: this.getEmptyForm(),
      clientes: [],
      clientesLoading: false,
      clienteSearch: '',
      isClienteDropdownOpen: false,
      expedientes: []
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
          (exp.transportista || '').toLowerCase().includes(term)

        const matchesDate =
          !fechaFiltro ||
          this.normalizeDateInput(exp.fecha) === fechaFiltro

        const matchesEstado =
          !estadoFiltro ||
          exp.estado === estadoFiltro

        return matchesSearch && matchesDate && matchesEstado
      })
    },
    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()
      if (!term) return this.clientes.slice(0, 8)
      return this.clientes
        .filter(c =>
          c.nombre.toLowerCase().includes(term) ||
          c.ruc.toLowerCase().includes(term) ||
          c.contacto.toLowerCase().includes(term)
        )
        .slice(0, 8)
    }
  },
  mounted() {
    this.getAll()
    this.loadClientes()
  },
  methods: {
    // ========== FORMULARIOS Y ESTADO INICIAL ==========
    getEmptyForm() {
      return {
        id: '',
        correlativo: '',
        sede: '',
        fecha: this.getTodayInputDate(),
        cliente: { nombre: '', ruc: '', direccion: '', contactoNombre: '', contactoTelefono: '' },
        transportista: '',
        generadorPv: '',
        observaciones: '',
        accionInmediata: '',
        planner: '',
        estado: 'Pendiente',
        fechaCreacion: new Date()
      }
    },

    // ========== CRUD ==========
    async getAll() {
      this.loading = true
      try {
        const data = await this.$firebaseApi.list('expedientes')
        this.expedientes = data.map(this.normalizeExpediente)
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

    async create(payload) {
      const doc = await this.$firebaseApi.create('expedientes', payload)
      this.expedientes.unshift(this.normalizeExpediente(doc))
    },

    async update(id, payload) {
      const updated = await this.$firebaseApi.update('expedientes', id, payload)
      this.expedientes = this.expedientes.map(e =>
        e.id === id ? this.normalizeExpediente(updated) : e
      )
    },

    async delete(id) {
      if (!confirm('¿Eliminar este expediente permanentemente?')) return
      try {
        await this.$firebaseApi.remove('expedientes', id)
        this.expedientes = this.expedientes.filter(e => e.id !== id)
      } catch (error) {
        alert('No se pudo eliminar')
        console.error(error)
      }
    },

    // ========== NORMALIZACIÓN ==========
    normalizeExpediente(src) {
      const s = src || {}
      const cliente = s.cliente || {}
      return {
        id: s.id || '',
        correlativo: s.correlativo || '',
        sede: s.sede || '',
        fecha: this.normalizeDateInput(s.fecha) || this.getTodayInputDate(),
        cliente: {
          nombre: cliente.nombre || '',
          ruc: cliente.ruc || '',
          direccion: cliente.direccion || '',
          contactoNombre: cliente.contactoNombre || '',
          contactoTelefono: cliente.contactoTelefono || ''
        },
        transportista: s.transportista || '',
        generadorPv: s.generadorPv || '',
        observaciones: s.observaciones || '',
        accionInmediata: s.accionInmediata || '',
        planner: s.planner || '',
        estado: ESTADOS.includes(s.estado) ? s.estado : 'Pendiente',
        fechaCreacion: this.normalizeDate(s.fechaCreacion)
      }
    },

    toPayload(exp) {
      const { id, fechaCreacion, ...payload } = this.normalizeExpediente(exp)
      payload.fecha = this.parseLocalDate(payload.fecha)
      return payload
    },

    // ========== ESTADOS Y TRANSICIONES ==========
    getPreviousEstado(estado) {
      const idx = ESTADOS.indexOf(estado)
      return idx > 0 ? ESTADOS[idx - 1] : null
    },

    getNextEstado(estado) {
      const idx = ESTADOS.indexOf(estado)
      return idx < ESTADOS.length - 1 ? ESTADOS[idx + 1] : null
    },

    canRegress(estado) {
      return estado !== 'Pendiente' && estado !== 'Cerrado'
    },

    canAdvance(estado) {
      return estado !== 'Cerrado' && estado !== 'Regularizado' // Regularizado usa "Emitir Carta"
    },

    getAvanceTitle(estado) {
      const next = this.getNextEstado(estado)
      return next ? `Avanzar a ${next}` : 'Estado final'
    },

    getAvanceIcon(estado) {
      const icons = {
        Pendiente: 'mdi-arrow-right-bold',
        Notificado: 'mdi-arrow-right-bold',
        Regularizado: 'mdi-file-document-edit', // pero este no se usa porque se muestra el otro botón
        Cerrado: 'mdi-check-circle'
      }
      return icons[estado] || 'mdi-arrow-right-bold'
    },

    getEstadoClass(estado) {
      return String(estado || 'Pendiente').toLowerCase()
    },

    // ========== ACCIONES DE ESTADO ==========
    async advanceExpedienteEstado(exp) {
      const next = this.getNextEstado(exp.estado)
      if (!next) return
      if (!confirm(`¿Cambiar estado de "${exp.estado}" a "${next}"?`)) return

      try {
        const updated = await this.$firebaseApi.update('expedientes', exp.id, { estado: next })
        this.expedientes = this.expedientes.map(e =>
          e.id === exp.id ? this.normalizeExpediente({ ...e, ...updated, estado: next }) : e
        )
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
        const updated = await this.$firebaseApi.update('expedientes', exp.id, { estado: prev })
        this.expedientes = this.expedientes.map(e =>
          e.id === exp.id ? this.normalizeExpediente({ ...e, ...updated, estado: prev }) : e
        )
      } catch (error) {
        alert('No se pudo retroceder el estado')
        console.error(error)
      }
    },

    // ========== EMITIR CARTA ==========
    async emitirCarta(exp) {
      if (exp.estado !== 'Regularizado') {
        alert('Solo se puede emitir carta desde el estado "Regularizado"')
        return
      }
      if (!confirm(`¿Emitir carta para el expediente "${exp.correlativo}" y cerrarlo?`)) return

      try {
        // 1. Construir payload de carta
        const cartaPayload = this.buildCartaFromExpediente(exp)

        // 2. Crear la carta en Firebase
        const cartaCreada = await this.$firebaseApi.create('cartas', cartaPayload)

        // 3. Actualizar expediente a "Cerrado" y guardar referencia a la carta
        await this.$firebaseApi.update('expedientes', exp.id, {
          estado: 'Cerrado',
          cartaId: cartaCreada.id
        })

        // 4. Actualizar lista local
        this.expedientes = this.expedientes.map(e =>
          e.id === exp.id
            ? this.normalizeExpediente({ ...e, estado: 'Cerrado', cartaId: cartaCreada.id })
            : e
        )

        alert(`Carta ${cartaCreada.correlativo || 'generada'} creada exitosamente.`)
      } catch (error) {
        alert('Error al emitir la carta')
        console.error(error)
      }
    },

    buildCartaFromExpediente(exp) {
      // Reutiliza la lógica de generación de correlativo de cartas
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const nextCorrelativo = `SGP-CH-${month}.${year}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}` // simplificado

      return {
        correlativo: nextCorrelativo,
        lugar: 'Lima',
        fecha: exp.fecha || this.getTodayInputDate(),
        fechaServicio: exp.fecha || this.getTodayInputDate(),
        cliente: {
          nombre: exp.cliente.nombre || '',
          ruc: exp.cliente.ruc || '',
          direccion: exp.cliente.direccion || '',
          contactoNombre: exp.cliente.contactoNombre || '',
          contactoTelefono: exp.cliente.contactoTelefono || ''
        },
        asunto: `Expediente PV ${exp.correlativo} - ${exp.observaciones || 'Observación'}`,
        contexto: `De nuestra consideración:\nLa presente tiene por finalidad hacerle llegar la documentación correspondiente al expediente ${exp.correlativo}.\nObservación: ${exp.observaciones || 'Sin detalle'}`,
        detalles: [{ numero: 1, numeroTexto: '(Uno)', descripcion: 'Documento adjunto' }],
        despedida: 'Sin otro particular, quedamos atentos a su respuesta.',
        estadoProceso: 'Emitido',
        estado: 'Emitido',
        fechaCreacion: new Date()
      }
    },

    // ========== MODAL ==========
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.clienteSearch = ''
      this.isClienteDropdownOpen = false
      this.isModalOpen = true
    },

    closeModal() {
      this.isModalOpen = false
      this.isClienteDropdownOpen = false
    },

    async saveExpediente() {
      const payload = this.toPayload(this.form)
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

    // ========== AUTCOMPLETE CLIENTE ==========
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
    openQuickCliente() {
      alert('Función para agregar cliente rápido (pendiente de implementar)')
    },

    // ========== EXPORT / IMPORT EXCEL ==========
    async exportExpedientes() {
      await exportRowsToExcel({
        filename: 'expedientes',
        sheetName: 'Expedientes',
        rows: this.filteredExpedientes,
        columns: [
          { label: 'Correlativo', value: e => e.correlativo },
          { label: 'Sede', value: e => e.sede },
          { label: 'Fecha', value: e => this.formatShortDate(e.fecha) },
          { label: 'Cliente', value: e => e.cliente.nombre },
          { label: 'RUC', value: e => e.cliente.ruc },
          { label: 'Transportista', value: e => e.transportista },
          { label: 'Generador PV', value: e => e.generadorPv },
          { label: 'Observaciones', value: e => e.observaciones },
          { label: 'Acción Inmediata', value: e => e.accionInmediata },
          { label: 'Planner', value: e => e.planner },
          { label: 'Estado', value: e => e.estado }
        ]
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
            ...this.getEmptyForm(),
            correlativo: '',
            sede: row.Sede,
            fecha: this.parseImportedDate(row.Fecha),
            cliente: {
              nombre: row.Cliente,
              ruc: row.RUC,
              direccion: '',
              contactoNombre: '',
              contactoTelefono: ''
            },
            transportista: row.Transportista,
            generadorPv: row['Generador PV'],
            observaciones: row.Observaciones,
            accionInmediata: row['Acción Inmediata'],
            planner: row.Planner,
            estado: ESTADOS.includes(row.Estado) ? row.Estado : 'Pendiente'
          }
          const payload = this.toPayload(newExp)
          await this.$firebaseApi.create('expedientes', payload)
        }

        // Recargar lista
        await this.getAll()
        alert(`Se importaron ${result.rows.length} expedientes.`)
      } catch (error) {
        alert('Error al importar el Excel')
        console.error(error)
      }
    },

    // ========== UTILIDADES DE FECHAS ==========
    getTodayInputDate() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    normalizeDateInput(value) {
      if (!value) return ''
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const parsed = this.parseLocalDate(value)
      if (isNaN(parsed.getTime())) return ''
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    parseLocalDate(value) {
      if (value && typeof value.toDate === 'function') return value.toDate()
      if (value && value.seconds !== undefined) return new Date(value.seconds * 1000)
      if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      }
      return new Date(value)
    },

    parseImportedDate(value) {
      if (!value) return this.getTodayInputDate()
      const parts = String(value).split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      return value
    },

    formatShortDate(date) {
      if (!date) return ''
      const d = this.parseLocalDate(date)
      if (isNaN(d.getTime())) return ''
      return new Intl.DateTimeFormat('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    },

    normalizeDate(value) {
      if (!value) return new Date()
      if (typeof value.toDate === 'function') return value.toDate()
      if (value.seconds) return new Date(value.seconds * 1000)
      return new Date(value)
    },

    truncate(text, len) {
      if (!text) return '—'
      return text.length > len ? text.slice(0, len) + '…' : text
    }
  }
}
</script>

<style scoped>
/* ===== Estilos generales (igual que CartasPage) ===== */
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

/* ===== MODAL ===== */
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
.form-grid textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.form-grid input:focus,
.form-grid textarea:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
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

/* ===== RESPONSIVE ===== */
@media (max-width: 640px) {

  .page-header,
  .table-header {
    flex-direction: column;
    align-items: flex-start;
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
}
</style>