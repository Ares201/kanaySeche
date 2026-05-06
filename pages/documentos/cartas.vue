<template>
  <section class="cartas-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Documentos</p>
        <h1>Cartas</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nueva carta
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de cartas</h2>
          <span>{{ filteredCartas.length }} registros</span>
        </div>

        <label class="search-field">
          <span>Buscar por cliente o correlativo</span>
          <input v-model.trim="search" type="search" placeholder="Ej. CARTA-001">
        </label>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Correlativo</th>
              <th>Cliente</th>
              <!-- <th>Asunto</th> -->
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="carta in filteredCartas" :key="carta.id">
              <td>{{ carta.correlativo }}</td>
              <td>{{ carta.cliente.nombre }}</td>
              <!-- <td>{{ carta.asunto }}</td> -->
              <td>{{ formatShortDate(carta.fecha) }}</td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Ver" aria-label="Ver carta" @click="openPreviewModal(carta)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar carta" @click="openEditModal(carta)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar" aria-label="Eliminar carta" @click="deleteCarta(carta.id)">
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
              <td class="empty-state" colspan="5">
                Cargando cartas...
              </td>
            </tr>
            <tr v-else-if="filteredCartas.length === 0">
              <td class="empty-state" colspan="5">
                No se encontraron cartas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal modal--form" @submit.prevent="saveCarta">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar carta' : 'Nueva carta' }}</h2>
          <div class="modal-header-actions">
            <label class="radio-toggle">
              <input :checked="showExtraFields" type="radio" @click.prevent="showExtraFields = !showExtraFields">
              Mostrar campos
            </label>
            <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
              x
            </button>
          </div>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="6">
              <label class="autocomplete-field">
                Cliente
                <input
                  v-model.trim="clienteSearch"
                  type="text"
                  required
                  autocomplete="off"
                  placeholder="Escribe para buscar cliente"
                  @focus="openClienteDropdown"
                  @input="handleClienteSearch"
                  @blur="closeClienteDropdown"
                  @keydown.esc="closeClienteDropdown"
                >
                <div v-if="isClienteDropdownOpen" class="autocomplete-menu">
                  <button
                    v-for="cliente in filteredClientesOptions"
                    :key="cliente.id"
                    class="autocomplete-option"
                    type="button"
                    @mousedown.prevent="selectCliente(cliente)"
                  >
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }} - {{ cliente.contacto }}</span>
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

            <v-col cols="12" md="6">
              <label>
                Direccion
                <input v-model.trim="form.cliente.direccion" type="text" required placeholder="Av. Principal 123">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Contacto
                <input v-model.trim="form.cliente.contactoNombre" type="text" required placeholder="Nombre del contacto">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Numero contacto
                <input v-model.trim="form.cliente.contactoNumero" type="text" required placeholder="Anexo o codigo">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Telefono
                <input v-model.trim="form.cliente.contactoTelefono" type="text" required placeholder="999 999 999">
              </label>
            </v-col>

            <v-col cols="12">
              <label>
                Asunto
                <input v-model.trim="form.asunto" type="text" required>
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                Lugar
                <input v-model.trim="form.lugar" type="text" required placeholder="Lima">
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                Fecha
                <input v-model="form.fecha" type="date" required>
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                Correlativo
                <input v-model.trim="form.correlativo" type="text" required placeholder="CARTA-001-2026">
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                RUC
                <input v-model.trim="form.cliente.ruc" type="text" required placeholder="20600000000">
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="8">
              <label>
                Despedida
                <textarea v-model.trim="form.despedida" rows="2" required placeholder="Texto de despedida" />
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12">
              <label>
                Contexto
                <textarea v-model.trim="form.contexto" rows="5" required />
              </label>
            </v-col>

            <v-col cols="12">
              <div class="details-header">
                <h3>Detalles</h3>
                <button class="secondary-button secondary-button--small" type="button" @click="addDetalle">
                  Agregar item
                </button>
              </div>

              <div class="details-list">
                <div v-for="(detalle, index) in form.detalles" :key="index" class="detail-row">
                  <label>
                    Descripcion (Documentos a enviar)
                    <input v-model.trim="detalle.descripcion" type="text" required placeholder="Detalle">
                  </label>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar item" aria-label="Eliminar item" :disabled="form.detalles.length === 1" @click="removeDetalle(index)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </div>
            </v-col>
          </v-row>
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
          <h2>Preview carta</h2>
          <button type="button" class="modal-close" aria-label="Cerrar preview" @click="closePreviewModal">
            x
          </button>
        </div>

        <div class="preview-toolbar">
          <button class="secondary-button" type="button" @click="printPreview">
            Imprimir
          </button>
          <button class="primary-button" type="button" @click="downloadPdf">
            Descargar PDF
          </button>
        </div>

        <div ref="previewContent" class="preview-content">
          <CartaPreview :carta="selectedCarta" />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import CartaPreview from '~/components/CartaPreview.vue'
import { normalizeCliente } from '~/models/cliente'

const DEFAULT_ASUNTO = 'Presentación de Documentos del Servicio Ambiental del /.'
const DEFAULT_CONTEXTO = `De nuestra consideración:
La presente tiene por finalidad saludarlo cordialmente en nombre de la Empresa KANAY S.A.C. – Séché Group Perú y a su vez hacerles llegar la documentación del Servicio de Disposición Final, según detalle:`
const DEFAULT_DESPEDIDA = 'Sin otro particular me despido y le reiteramos nuestro atento saludo.'

export default {
  name: 'CartasPage',
  components: {
    CartaPreview
  },
  data() {
    return {
      search: '',
      loading: false,
      isModalOpen: false,
      isPreviewOpen: false,
      editingId: null,
      selectedCarta: this.getEmptyForm(),
      form: this.getEmptyForm(),
      clientes: [],
      clientesLoading: false,
      clienteSearch: '',
      isClienteDropdownOpen: false,
      showExtraFields: false,
      cartas: []
    }
  },
  computed: {
    filteredCartas() {
      const term = this.search.toLowerCase()

      if (!term) return this.cartas

      return this.cartas.filter(carta => {
        const cliente = carta.cliente || {}
        return (
          (cliente.nombre || '').toLowerCase().includes(term) ||
          (carta.correlativo || '').toLowerCase().includes(term)
        )
      })
    },
    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()

      if (!term) return this.clientes.slice(0, 8)

      return this.clientes
        .filter(cliente => {
          return (
            cliente.nombre.toLowerCase().includes(term) ||
            cliente.ruc.toLowerCase().includes(term) ||
            cliente.contacto.toLowerCase().includes(term)
          )
        })
        .slice(0, 8)
    }
  },
  mounted() {
    this.getAll()
    this.loadClientes()
  },
  methods: {
    getEmptyForm() {
      return {
        id: '',
        lugar: 'Lima',
        fecha: this.getTodayInputDate(),
        correlativo: this.getNextCorrelativo(),
        cliente: {
          nombre: '',
          ruc: '',
          direccion: '',
          contactoNombre: '',
          contactoNumero: '',
          contactoTelefono: ''
        },
        asunto: DEFAULT_ASUNTO,
        contexto: DEFAULT_CONTEXTO,
        detalles: [
          { descripcion: '' }
        ],
        despedida: DEFAULT_DESPEDIDA,
        fechaCreacion: new Date()
      }
    },
    async getAll() {
      this.loading = true

      try {
        const cartas = await this.$firebaseApi.list('cartas')
        this.cartas = cartas.map(this.normalizeCarta)
      } catch (error) {
        alert('No se pudieron listar las cartas')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    async loadClientes() {
      this.clientesLoading = true

      try {
        const clientes = await this.$firebaseApi.list('clientes')
        this.clientes = clientes
          .map(normalizeCliente)
          .filter(cliente => cliente.estado)
      } catch (error) {
        this.clientes = []
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.clientesLoading = false
      }
    },
    async create(payload) {
      const carta = await this.$firebaseApi.create('cartas', this.toCartaPayload(payload))
      this.cartas.unshift(this.normalizeCarta(carta))
    },
    async update(id, payload) {
      const updatedCarta = await this.$firebaseApi.update('cartas', id, this.toCartaPayload(payload))
      this.cartas = this.cartas.map(carta => {
        return carta.id === id ? this.normalizeCarta(updatedCarta) : carta
      })
    },
    async delete(id) {
      await this.$firebaseApi.remove('cartas', id)
      this.cartas = this.cartas.filter(carta => carta.id !== id)
    },
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.applyDefaultText()
      this.clienteSearch = ''
      this.isClienteDropdownOpen = false
      this.showExtraFields = false
      this.isModalOpen = true
    },
    openEditModal(carta) {
      this.editingId = carta.id
      this.form = this.cloneCarta(carta)
      this.applyDefaultText()
      this.clienteSearch = this.form.cliente.nombre
      this.isClienteDropdownOpen = false
      this.showExtraFields = false
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
      this.isClienteDropdownOpen = false
    },
    async saveCarta() {
      const payload = this.normalizeCarta(this.form)
      const exists = this.cartas.some(carta => {
        return carta.correlativo === payload.correlativo && carta.id !== this.editingId
      })

      if (exists) {
        alert('El correlativo ya existe')
        return
      }

      try {
        if (this.editingId) {
          await this.update(this.editingId, payload)
        } else {
          await this.create(payload)
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar la carta')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async deleteCarta(id) {
      if (!window.confirm('Deseas eliminar esta carta?')) return

      try {
        await this.delete(id)
      } catch (error) {
        alert('No se pudo eliminar la carta')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    openPreviewModal(carta) {
      this.selectedCarta = this.cloneCarta(carta)
      this.isPreviewOpen = true
    },
    closePreviewModal() {
      this.isPreviewOpen = false
    },
    printPreview() {
      window.print()
    },
    async downloadPdf() {
      if (!process.client) return

      const element = this.$refs.previewContent
      if (!element) return

      const fileName = `${this.selectedCarta.correlativo || 'carta'}.pdf`
      const options = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      const html2pdfModule = await import('html2pdf.js')
      const html2pdf = html2pdfModule.default || html2pdfModule

      html2pdf().set(options).from(element).save()
    },
    addDetalle() {
      this.form.detalles.push({ descripcion: '' })
    },
    removeDetalle(index) {
      if (this.form.detalles.length === 1) return
      this.form.detalles.splice(index, 1)
    },
    applyDefaultText() {
      if (!this.form.asunto) {
        this.form.asunto = DEFAULT_ASUNTO
      }

      if (!this.form.contexto) {
        this.form.contexto = DEFAULT_CONTEXTO
      }

      if (!this.form.despedida) {
        this.form.despedida = DEFAULT_DESPEDIDA
      }
    },
    openClienteDropdown() {
      this.isClienteDropdownOpen = true
    },
    closeClienteDropdown() {
      this.isClienteDropdownOpen = false
    },
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
        contactoNumero: cliente.numeroContacto,
        contactoTelefono: cliente.telefonoContacto
      }
      this.clienteSearch = cliente.nombre
      this.isClienteDropdownOpen = false
    },
    cloneCarta(carta) {
      return JSON.parse(JSON.stringify(this.normalizeCarta(carta)))
    },
    toCartaPayload(carta) {
      const normalizedCarta = this.normalizeCarta(carta)
      const {
        id,
        fechaCreacion,
        ...payload
      } = normalizedCarta

      if (fechaCreacion) {
        payload.fechaCreacion = fechaCreacion
      }

      return payload
    },
    normalizeCarta(carta) {
      const source = carta || {}
      const cliente = source.cliente || {}
      const detalles = Array.isArray(source.detalles) && source.detalles.length
        ? source.detalles
        : [{ descripcion: '' }]

      return {
        id: source.id || '',
        lugar: source.lugar || '',
        fecha: source.fecha || this.getTodayInputDate(),
        correlativo: source.correlativo || '',
        cliente: {
          nombre: cliente.nombre || '',
          ruc: cliente.ruc || '',
          direccion: cliente.direccion || '',
          contactoNombre: cliente.contactoNombre || '',
          contactoNumero: cliente.contactoNumero || '',
          contactoTelefono: cliente.contactoTelefono || ''
        },
        asunto: source.asunto || DEFAULT_ASUNTO,
        contexto: source.contexto || DEFAULT_CONTEXTO,
        detalles: detalles.map(detalle => ({
          descripcion: detalle && detalle.descripcion ? detalle.descripcion : ''
        })),
        despedida: source.despedida || DEFAULT_DESPEDIDA,
        fechaCreacion: this.normalizeDate(source.fechaCreacion)
      }
    },
    normalizeDate(value) {
      if (!value) {
        return new Date()
      }

      if (typeof value.toDate === 'function') {
        return value.toDate()
      }

      if (value.seconds) {
        return new Date(value.seconds * 1000)
      }

      return new Date(value)
    },
    getNextCorrelativo() {
      const year = new Date().getFullYear()
      const nextNumber = this.cartas ? this.cartas.length + 1 : 1
      return `CARTA-${String(nextNumber).padStart(3, '0')}-${year}`
    },
    getTodayInputDate() {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    formatShortDate(date) {
      if (!date) return ''

      const parsedDate = new Date(date)
      if (Number.isNaN(parsedDate.getTime())) return ''

      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(parsedDate)
    }
  }
}
</script>

<style scoped>
.cartas-page {
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

h3 {
  color: #334155;
  font-size: 15px;
}

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: #ffffff;
  font-weight: 700;
  background: #0f766e;
  cursor: pointer;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.table-header,
.table-header>div {
  display: flex;
  gap: 12px;
}

.table-header {
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header>div {
  flex-direction: column;
  gap: 4px;
}

.table-header span {
  color: #64748b;
  font-size: 14px;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(320px, 100%);
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.search-field input,
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

.search-field input:focus,
.form-grid input:focus,
.form-grid textarea:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
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

.icon-button:disabled {
  color: #94a3b8;
  background: #f8fafc;
  cursor: not-allowed;
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

.modal-backdrop--preview {
  align-items: flex-start;
  overflow-y: auto;
}

.modal {
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.modal--form {
  width: min(920px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}

.modal--preview {
  width: min(960px, 100%);
  margin: 24px 0;
  overflow: hidden;
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

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.radio-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.radio-toggle input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #0f766e;
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

.autocomplete-field {
  position: relative;
}

.autocomplete-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 70;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
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
  background: #ffffff;
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

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  align-items: end;
  gap: 10px;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}

.secondary-button {
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 16px;
  color: #334155;
  font-weight: 700;
  background: #ffffff;
  cursor: pointer;
}

.secondary-button--small {
  min-height: 34px;
  padding: 0 12px;
}

.preview-header,
.preview-toolbar {
  background: #ffffff;
}

.preview-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.preview-content {
  padding: 24px;
  background: #ffffff;
}

@media (max-width: 640px) {
  .page-header,
  .table-header,
  .details-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button,
  .details-header .secondary-button {
    width: 100%;
  }

  .modal-actions,
  .preview-toolbar {
    flex-direction: column-reverse;
  }

  .secondary-button,
  .modal-actions .primary-button,
  .preview-toolbar .primary-button {
    width: 100%;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  html,
  body {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  body * {
    visibility: hidden;
  }

  .preview-content,
  .preview-content * {
    visibility: visible;
  }

  .modal-backdrop,
  .modal,
  .preview-content {
    position: static;
    display: block;
    padding: 0;
    margin: 0;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    background: #ffffff;
    box-shadow: none;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
  }

  .modal-header,
  .preview-toolbar {
    display: none;
  }
}
</style>
