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
      </div>
      <v-row class="table-actions" dense align="end" justify="end">
        <v-col class="table-action-col" cols="3">
          <v-autocomplete v-model="estadoFiltro" :items="estados" label="Estado" dense hide-details outlined
            clearable />
        </v-col>
        <v-col class="table-action-col" cols="4">
          <v-text-field v-model.trim="search" dense hide-details outlined type="search"
            label="Buscar cliente o correlativo" placeholder="Ej. CARTA-001" />
        </v-col>
        <v-col class="table-action-col" cols="3">
          <v-text-field v-model="fechaFiltro" dense hide-details outlined type="date" label="Filtrar por fecha" />
        </v-col>
        <v-col class="table-action-col table-action-col--excel" cols="2">
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
              <v-list-item @click="exportCartas">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportCartas">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>

        <input ref="cartasExcelInput" class="excel-input" type="file" accept=".xlsx" @change="importCartas">
      </v-row>

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
                  <v-btn icon small class="status-icon-button"
                    :class="`status-icon-button--${getEstadoClass(carta.estadoProceso)}`" :title="getEstadoTitle(carta)"
                    :aria-label="getEstadoTitle(carta)" :disabled="carta.estadoProceso === 'Entregado'"
                    @click="advanceCartaEstado(carta)">
                    <v-icon small>
                      {{ getEstadoIcon(carta.estadoProceso) }}
                    </v-icon>
                  </v-btn>
                  <v-btn icon small class="status-icon-button" title="Ver o editar cargo digital"
                    aria-label="Ver o editar cargo digital" @click="openCargoDialog(carta)">
                    <v-icon small>mdi-file-sign</v-icon>
                  </v-btn>
                  <button class="icon-button" type="button" title="Ver" aria-label="Ver carta"
                    @click="openPreviewModal(carta)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar carta"
                    @click="openEditModal(carta)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button style="color: red;" class="icon-button" type="button" title="Anular" aria-label="Anular carta"
                    @click="anularCarta(carta.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 16l8-8" />
                    </svg>
                  </button>
                  <!-- <button class="icon-button icon-button--danger" type="button" title="Eliminar"
                    aria-label="Eliminar carta" @click="deleteCarta(carta.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button> -->
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
              <input v-model="form.direccionAlterna" type="checkbox" @change="toggleRecojoPlanta">
              Recojo en planta
            </label>

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
                <input v-model.trim="clienteSearch" type="text" required autocomplete="off"
                  placeholder="Escribe para buscar cliente" @focus="openClienteDropdown" @input="handleClienteSearch"
                  @blur="closeClienteDropdown" @keydown.esc="closeClienteDropdown">
                <div v-if="isClienteDropdownOpen" class="autocomplete-menu">
                  <button v-for="cliente in filteredClientesOptions" :key="cliente.id" class="autocomplete-option"
                    type="button" @mousedown.prevent="selectCliente(cliente)">
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }} - {{ cliente.contacto }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">
                    Cargando clientes...
                  </div>
                  <div v-else-if="filteredClientesOptions.length === 0" class="autocomplete-empty">
                    <v-btn small color="green" size="x-large" outlined @mousedown.prevent="openQuickCliente">
                      + Agregar cliente
                    </v-btn>
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>Direccion
                <input v-model.trim="form.cliente.direccion" :disabled="form.direccionAlterna" type="text"
                  placeholder="Av. Principal 123" style="flex:1;">
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Contacto
                <input v-model.trim="form.cliente.contactoNombre" type="text" placeholder="Nombre del contacto">
              </label>
            </v-col>

            <v-col cols="12" md="6">
              <label>
                Telefono
                <input v-model.trim="form.cliente.contactoTelefono" type="text" placeholder="999 999 999">
              </label>
            </v-col>

            <v-row dense>
              <v-col cols="12" md="10">
                <label>
                  Asunto
                  <input :value="form.asunto" type="text" readonly>
                </label>
              </v-col>

              <v-col cols="12" md="2">
                <label>
                  Fecha servicio
                  <input v-model="form.fechaServicio" type="date" required @change="actualizarAsunto" />
                </label>
              </v-col>
            </v-row>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                Fecha de emisión
                <input v-model="form.fecha" type="date" required>
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                Correlativo
                <input v-model.trim="form.correlativo" type="text" required placeholder="CARTA">
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="4">
              <label>
                RUC
                <input v-model.trim="form.cliente.ruc" type="text" required placeholder="20600000000">
              </label>
            </v-col>

            <v-col v-if="showExtraFields" cols="12" md="12">
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
                <v-menu offset-y>
                  <template #activator="{ on, attrs }">
                    <button class="secondary-button secondary-button--small" v-bind="attrs" v-on="on" type="button">
                      Añadir
                    </button>
                  </template>

                  <v-list dense>

                    <v-list-item @click="addDetalle('Manifiesto Generador')">
                      <v-list-item-title>Manifiesto Generador</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Manifiesto Transportista')">
                      <v-list-item-title>Manifiesto Transportista</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Manifiesto Disposición Final')">
                      <v-list-item-title>Manifiesto Disposición Final</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Manifiesto Control Administrativo')">
                      <v-list-item-title>Manifiesto Control Administrativo</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Guía Transportista')">
                      <v-list-item-title>Guía Transportista</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Guía Remitente')">
                      <v-list-item-title>Guía Remitente</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Ticket de Pesaje')">
                      <v-list-item-title>Ticket de Pesaje</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Acta Notarial')">
                      <v-list-item-title>Acta Notarial</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="addDetalle('Otros')">
                      <v-list-item-title>Otros...</v-list-item-title>
                    </v-list-item>

                  </v-list>

                </v-menu>
              </div>

              <div class="details-list">

                <div v-for="(detalle, index) in form.detalles" :key="index" class="detail-row">

                  <label>
                    N°
                    <input v-model.number="detalle.numero" type="number" min="1" @input="actualizarNumero(detalle)">
                  </label>


                  <label>
                    Número texto
                    <input :value="detalle.numeroTexto" type="text" readonly>
                  </label>


                  <label>
                    Documento
                    <input v-model="detalle.descripcion" type="text" :readonly="!detalle.editable"
                      :placeholder="detalle.editable ? 'Escriba el documento...' : ''" />
                  </label>

                  <button class="icon-button" type="button" title="Agregar (Retornar)" @click="toggleRetornar(detalle)">
                    ↩
                  </button>

                  <button class="icon-button icon-button--danger" type="button" title="Eliminar item"
                    @click="removeDetalle(index)">
                    🗑
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

    <ConfirmacionDialog v-if="confirmacionCarta" v-model="isConfirmacionOpen" :carta="confirmacionCarta"
      @save-cargo="saveCargo" @mark-delivered="markDelivered" @message="showMessage" />
    <CargoDigitalDialog v-if="cargoCarta" v-model="isCargoDialogOpen" :carta="cargoCarta"
      @save="saveCargoDigital" @message="showMessage" />

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
          <div class="preview-sheet">
            <CartaPreview :carta="selectedCarta" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import CartaPreview from '~/components/CartaPreview.vue'
import ConfirmacionDialog from '~/components/documentos/ConfirmacionDialog.vue'
import CargoDigitalDialog from '~/components/documentos/CargoDigitalDialog.vue'
import { normalizeCliente } from '~/models/cliente'
import { exportRowsToExcel, readRowsFromExcelFile } from '~/utils/exportExcel'

const DEFAULT_ASUNTO = 'Presentación de Documentos del Servicio Ambiental del'
const DEFAULT_CONTEXTO = `De nuestra consideración:
La presente tiene por finalidad saludarlo cordialmente en nombre de la Empresa KANAY S.A.C. – Séché Group Perú y a su vez hacerles llegar la documentación del Servicio de Disposición Final, según detalle:`
const DEFAULT_DESPEDIDA = 'Sin otro particular me despido y le reiteramos nuestro atento saludo.'
const CARTA_ESTADOS = ['Emitido', 'Enviado', 'Pendiente de Confirmación', 'Entregado', 'Anulado']
const CARTA_EXCEL_COLUMNS = [
  'Correlativo',
  'Cliente',
  'RUC',
  'Direccion',
  'Contacto',
  'Telefono',
  'Asunto',
  'Fecha',
  'Estado proceso'
]

export default {
  name: 'CartasPage',
  components: {
    CartaPreview,
    ConfirmacionDialog,
    CargoDigitalDialog
  },
  data() {
    return {
      estados: CARTA_ESTADOS,
      search: '',
      fechaFiltro: this.getTodayInputDate(),
      estadoFiltro: null,
      loading: false,
      isModalOpen: false,
      isPreviewOpen: false,
      isConfirmacionOpen: false,
      confirmacionCarta: null,
      isCargoDialogOpen: false,
      cargoCarta: null,
      editingId: null,
      selectedCarta: this.getEmptyForm(),
      form: this.getEmptyForm(),
      clientes: [],
      clientesLoading: false,
      clienteSearch: '',
      isClienteDropdownOpen: false,
      showExtraFields: false,
      cartas: [],
    }
  },
  computed: {
    filteredCartas() {
      const term = this.search.toLowerCase()
      const fechaFiltro = this.fechaFiltro
      const estadoFiltro = this.estadoFiltro

      if (!term && !fechaFiltro && !estadoFiltro) return this.cartas

      return this.cartas.filter(carta => {
        const cliente = carta.cliente || {}

        const matchesSearch =
          !term ||
          (cliente.nombre || '').toLowerCase().includes(term) ||
          (carta.correlativo || '').toLowerCase().includes(term)

        const matchesDate =
          !fechaFiltro ||
          this.normalizeDateInput(carta.fecha) === fechaFiltro

        const matchesEstado =
          !estadoFiltro ||
          carta.estadoProceso === estadoFiltro

        return matchesSearch && matchesDate && matchesEstado
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
    openQuickCliente() {
      alert('Agregar cliente')
    },
    getEmptyForm() {
      return {
        id: '',
        lugar: 'Lima',
        fecha: this.getTodayInputDate(),
        fechaServicio: this.getTodayInputDate(),
        correlativo: this.getNextCorrelativo(),
        direccionAlterna: false,
        cliente: {
          nombre: '',
          ruc: '',
          direccion: '',
          contactoNombre: '',
          contactoTelefono: ''
        },
        asunto: DEFAULT_ASUNTO,
        contexto: DEFAULT_CONTEXTO,
        detalles: [],
        despedida: DEFAULT_DESPEDIDA,
        estadoProceso: 'Emitido',
        estado: 'Emitido',
        fechaCreacion: new Date()
      }
    },
    async getAll() {
      this.loading = true

      try {
        const cartas = await this.$firebaseApi.list('cartas')
        await this.migrarFechasLegacy(cartas)
        this.cartas = cartas.map(this.normalizeCarta)
      } catch (error) {
        alert('No se pudieron listar las cartas')
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
    getNextEstadoProceso(estado) {
      if (estado === 'Enviado') return 'Pendiente de Confirmación'
      const index = CARTA_ESTADOS.indexOf(estado)

      return CARTA_ESTADOS[index + 1] || estado
    },
    getEstadoClass(estado) {
      return String(estado || 'Emitido').toLowerCase()
    },
    getEstadoIcon(estado) {
      const icons = {
        Emitido: 'mdi-file-document-check-outline',
        Enviado: 'mdi-send',
        'Pendiente de Confirmación': 'mdi-clock-outline',
        Entregado: 'mdi-check-circle-outline',
        Anulado: 'mdi-cancel'
      }

      return icons[estado] || icons.Emitido
    },
    getEstadoTitle(carta) {
      const nextEstado = this.getNextEstadoProceso(carta.estadoProceso)

      return carta.estadoProceso === nextEstado
        ? 'Carta entregada'
        : `Cambiar a ${nextEstado}`
    },
    async advanceCartaEstado(carta) {
      const nextEstado = this.getNextEstadoProceso(carta.estadoProceso)

      if (nextEstado === carta.estadoProceso) return
      if (carta.estadoProceso === 'Enviado' || carta.estadoProceso === 'Pendiente de Confirmación') {
        await this.openConfirmacionDialog(carta)
        return
      }
      if (!window.confirm(`Deseas cambiar el estado de la carta a ${nextEstado}?`)) return

      try {
        const updatedCarta = await this.$firebaseApi.update('cartas', carta.id, {
          estadoProceso: nextEstado,
          estado: nextEstado
        })

        this.cartas = this.cartas.map(currentCarta => {
          return currentCarta.id === carta.id
            ? this.normalizeCarta({ ...carta, ...updatedCarta, estadoProceso: nextEstado })
            : currentCarta
        })
      } catch (error) {
        alert('No se pudo actualizar el estado de la carta')
        console.error(error)
      }
    },
    async migrarFechasLegacy(cartas) {
      const actualizaciones = cartas.map(carta => {
        const cambios = {}
        if (this.isInputDateString(carta.fecha)) cambios.fecha = this.parseLocalDate(carta.fecha)
        if (this.isInputDateString(carta.fechaServicio)) cambios.fechaServicio = this.parseLocalDate(carta.fechaServicio)
        return Object.keys(cambios).length
          ? this.$firebaseApi.update('cartas', carta.id, cambios)
          : null
      }).filter(Boolean)

      if (!actualizaciones.length) return

      try {
        await Promise.all(actualizaciones)
      } catch (error) {
        console.error('No se pudieron migrar algunas fechas de cartas', error)
      }
    },
    generateConfirmationToken() {
      if (process.client && window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(20)
        window.crypto.getRandomValues(bytes)
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
      }
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`
    },
    async openConfirmacionDialog(carta) {
      try {
        const currentDoc = await this.$db.collection('cartas').doc(carta.id).get()
        const currentCarta = currentDoc.exists
          ? this.normalizeCarta({ id: currentDoc.id, ...currentDoc.data() })
          : carta
        const changes = {}
        if (!currentCarta.tokenConfirmacion) changes.tokenConfirmacion = this.generateConfirmationToken()
        if (currentCarta.estadoProceso === 'Enviado') {
          changes.estadoProceso = 'Pendiente de Confirmación'
          changes.estado = 'Pendiente de Confirmación'
        }
        let updatedCarta = currentCarta
        if (Object.keys(changes).length) updatedCarta = await this.$firebaseApi.update('cartas', currentCarta.id, changes)
        this.confirmacionCarta = this.normalizeCarta({ ...currentCarta, ...updatedCarta, ...changes })
        this.cartas = this.cartas.map(item => item.id === currentCarta.id ? this.confirmacionCarta : item)
        this.isConfirmacionOpen = true
      } catch (error) {
        alert('No se pudo abrir la confirmación')
        console.error(error)
      }
    },
    async saveCargo(cargo) {
      try {
        this.confirmacionCarta = await this.updateCargo(this.confirmacionCarta, cargo)
        this.showMessage('Cargo guardado')
      } catch (error) { alert('No se pudo guardar el cargo') }
    },
    openCargoDialog(carta) {
      this.cargoCarta = this.cloneCarta(carta)
      this.isCargoDialogOpen = true
    },
    async saveCargoDigital(cargo) {
      try {
        this.cargoCarta = await this.updateCargo(this.cargoCarta, cargo)
        this.showMessage('Cargo digital actualizado')
      } catch (error) { alert('No se pudo guardar el cargo digital') }
    },
    async updateCargo(carta, cargo) {
      const updatedCarta = await this.$firebaseApi.update('cartas', carta.id, { cargo })
      const normalizedCarta = this.normalizeCarta({ ...carta, ...updatedCarta, cargo })
      this.cartas = this.cartas.map(item => item.id === carta.id ? normalizedCarta : item)
      if (this.confirmacionCarta && this.confirmacionCarta.id === carta.id) this.confirmacionCarta = normalizedCarta
      return normalizedCarta
    },
    async markDelivered() {
      try {
        const updatedCarta = await this.$firebaseApi.update('cartas', this.confirmacionCarta.id, { estadoProceso: 'Entregado', estado: 'Entregado' })
        this.confirmacionCarta = this.normalizeCarta({ ...this.confirmacionCarta, ...updatedCarta, estadoProceso: 'Entregado', estado: 'Entregado' })
        this.cartas = this.cartas.map(item => item.id === this.confirmacionCarta.id ? this.confirmacionCarta : item)
        this.isConfirmacionOpen = false
        this.showMessage('Carta marcada como entregada')
      } catch (error) { alert('No se pudo marcar la carta como entregada') }
    },
    showMessage(message) { alert(message) },
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
        console.error(error)
      }
    },

    async anularCarta(id) {
      if (!window.confirm('¿Deseas anular esta carta?')) return

      try {
        const updatedCarta = await this.$firebaseApi.update('cartas', id, {
          estadoProceso: 'Anulado',
          estado: 'Anulado'
        })

        this.cartas = this.cartas.map(carta => {
          return carta.id === id
            ? this.normalizeCarta({
              ...carta,
              ...updatedCarta,
              estadoProceso: 'Anulado',
              estado: 'Anulado'
            })
            : carta
        })
      } catch (error) {
        alert('No se pudo anular la carta')
        console.error(error)
      }
    },

    async deleteCarta(id) {
      if (!window.confirm('Deseas eliminar esta carta?')) return

      try {
        await this.delete(id)
      } catch (error) {
        alert('No se pudo eliminar la carta')
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
    toggleRetornar(detalle) {
      const texto = ' (Retornar)'

      if (detalle.descripcion.endsWith(texto)) {
        detalle.descripcion = detalle.descripcion.slice(0, -texto.length)
      } else {
        detalle.descripcion += texto
      }
    },
    actualizarAsunto() {
      if (!this.form.fechaServicio) {
        this.form.asunto = DEFAULT_ASUNTO
        return
      }
      const [year, month, day] = this.form.fechaServicio.split('-')
      this.form.asunto = `Presentación de Documentos del Servicio Ambiental del ${day}/${month}/${year}`
    },
    printCarta(carta = this.selectedCarta) {
      const escapeHtml = value => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      const textToHtml = value => escapeHtml(value).replace(/\r?\n/g, '<br>')
      const formatPeruDate = date => {
        if (!date) return ''

        const parsedDate = this.parseLocalDate(date)
        if (Number.isNaN(parsedDate.getTime())) return ''

        const formatted = new Intl.DateTimeFormat('es-PE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(parsedDate)

        return formatted.replace(/ de (\d{4})$/, ' del $1')
      }

      const cliente = carta.cliente || {}
      const detalles = Array.isArray(carta.detalles)
        ? carta.detalles.filter(detalle => detalle && detalle.descripcion)
        : []
      const detallesHtml = detalles.length
        ? `
            <ul class="detalles">
              ${detalles.map(detalle => `
                <li>
                  ${detalle.numeroTexto} ${textToHtml(detalle.descripcion)}
                </li>
              `).join('')}
            </ul>
          `
        : ''

      const imprimir = `
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Carta</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }

              * {
                box-sizing: border-box;
              }

              html,
              body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                background: #fff;
                font-family: Arial, Helvetica, sans-serif;
                color: #000;
              }

              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
              }

              .page {
                width: 210mm;
                height: 297mm;
                position: relative;
                padding:
                  30mm
                  24mm
                  25mm
                  30mm;
              }

              .membrete {
                position: absolute;
                top: 0;
                left: 0;
                width: 210mm;
                height: 297mm;
                z-index: 0;
              }

              .contenido-documento {
                position: relative;
                z-index: 1;
              }

              .fecha {
                text-align: right;
                font-size: 13px;
                font-style: italic;
                font-weight: 600;
                margin-bottom: 38px;
              }

              .correlativo {
                font-size: 13px;
                font-weight: 700;
                text-decoration: underline;
                margin-bottom: 24px;
              }

              .bloque-datos {
                margin-bottom: 22px; /* espacio entre los datos y el asunto */
                font-size: 13px;
              }

              .fila {
                display: flex;
                margin-bottom: 4px;
                align-items: flex-start;
              }

              .fila:last-child {
                margin-bottom: 0;
              }

              .fila strong {
                width: 85px;
                flex-shrink: 0;
              }

              .fila span {
                flex: 1;
              }

              .asunto {
                margin-top: 10px;
                margin-bottom: 22px;
                padding-bottom: 5px;
                border-bottom: 1px solid #000;
                font-size: 13px;
                line-height: 1.5;
              }

              .contenido {
                font-size: 13px;
                line-height: 1.8;
                text-align: justify;
              }

              .contenido p {
                margin: 0 0 14px;
              }

              .detalles {
                margin: 18px 0 26px 0;
                padding-left: 22px;
                list-style: none;
              }

              .detalles li {
                margin-bottom: 7px;
                position: relative;
              }

              .detalles li::before {
                content: "\\2192";
                position: absolute;
                left: -20px;
              }

              .firma {
                margin-top: 50px;
                font-size: 13px;
              }

              .firma p {
                margin: 0;
              }
            </style>
          </head>
          <body>
            <div class="page">
              <img
                src="${window.location.origin}/membrete.jpg"
                class="membrete"
                alt="Membrete"
              />

              <div class="contenido-documento">

                <div class="fecha">
                  ${escapeHtml(carta.lugar)}, ${escapeHtml(formatPeruDate(carta.fecha))}
                </div>

                <div class="correlativo">
                  ${escapeHtml(carta.correlativo)}
                </div>

                <div class="bloque-datos">

                  <div class="fila">
                    <strong>Señores:</strong>
                    <span>${escapeHtml(cliente.nombre)}</span>
                  </div>

                  ${cliente.direccion ? `
                    <div class="fila">
                      <strong>Dirección:</strong>
                      <span>${escapeHtml(cliente.direccion)}</span>
                    </div>
                  ` : ''}

                  ${cliente.contactoNombre ? `
                    <div class="fila">
                      <strong>Atención:</strong>
                      <span>${escapeHtml(cliente.contactoNombre)}</span>
                    </div>
                  ` : ''}

                  ${cliente.contactoTelefono ? `
                    <div class="fila fila-contacto">
                      <strong>Contacto:</strong>
                      <span>${escapeHtml(cliente.contactoTelefono)}</span>
                    </div>
                  ` : ''}

                </div>

                <div class="asunto">
                  <strong>ASUNTO:</strong>
                  ${escapeHtml(carta.asunto)}
                </div>

                <div class="contenido">
                  <p>
                    ${textToHtml(carta.contexto)}
                  </p>

                  ${detallesHtml}

                  <p>
                    ${textToHtml(carta.despedida)}
                  </p>
                </div>

                <div class="firma">
                  <p>Atentamente,</p>
                </div>

              </div>
            </div>
          </body>
        </html>
      `

      return imprimir
    },
    printPreview() {
      if (!process.client) return

      const printFrame = document.createElement('iframe')
      printFrame.setAttribute('title', 'Imprimir carta')
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
      printDocument.write(this.printCarta())
      printDocument.close()

      window.setTimeout(() => {
        printWindow.focus()
        printWindow.print()

        document.body.removeChild(printFrame)
      }, 250)
    },
    async downloadPdf() {
      if (!process.client) return

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

      const pdfContainer = document.createElement('div')
      pdfContainer.style.position = 'fixed'
      pdfContainer.style.left = '-9999px'
      pdfContainer.style.top = '0'
      pdfContainer.innerHTML = this.printCarta()
      document.body.appendChild(pdfContainer)

      try {
        await html2pdf().set(options).from(pdfContainer.querySelector('.page')).save()
      } finally {
        document.body.removeChild(pdfContainer)
      }
    },
    addDetalle(tipo) {
      const numero = 1

      this.form.detalles.push({
        numero,
        numeroTexto: this.numeroEnTexto(numero),
        descripcion: tipo === 'Otros' ? '' : tipo,
        editable: tipo === 'Otros'
      })
    },
    numeroEnTexto(numero) {
      const unidades = [
        '',
        'Uno',
        'Dos',
        'Tres',
        'Cuatro',
        'Cinco',
        'Seis',
        'Siete',
        'Ocho',
        'Nueve'
      ]
      const especiales = {
        10: 'Diez',
        11: 'Once',
        12: 'Doce',
        13: 'Trece',
        14: 'Catorce',
        15: 'Quince',
        16: 'Dieciséis',
        17: 'Diecisiete',
        18: 'Dieciocho',
        19: 'Diecinueve'
      }
      const decenas = {
        20: 'Veinte',
        30: 'Treinta',
        40: 'Cuarenta',
        50: 'Cincuenta',
        60: 'Sesenta',
        70: 'Setenta',
        80: 'Ochenta',
        90: 'Noventa'
      }
      if (numero < 10) {
        return `(${unidades[numero]})`
      }
      if (especiales[numero]) {
        return `(${especiales[numero]})`
      }
      if (numero === 100) {
        return '(Cien)'
      }
      if (numero === 20) {
        return '(Veinte)'
      }
      if (numero < 30) {
        return `(Veinti${unidades[numero - 20].toLowerCase()})`
      }
      const d = Math.floor(numero / 10) * 10
      const u = numero % 10
      if (u === 0) {
        return `(${decenas[d]})`
      }
      return `(${decenas[d]} y ${unidades[u]})`
    },
    actualizarNumero(detalle) {
      detalle.numeroTexto = this.numeroEnTexto(detalle.numero)
    },
    removeDetalle(index) {
      if (this.form.detalles.length === 1) return
      this.form.detalles.splice(index, 1)
    },
    toggleRecojoPlanta() {
      if (this.form.direccionAlterna) {
        this.form.cliente.direccion = 'Recojo en planta'
      } else {
        this.form.cliente.direccion = ''
      }
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

      payload.fecha = this.parseLocalDate(normalizedCarta.fecha)
      payload.fechaServicio = this.parseLocalDate(normalizedCarta.fechaServicio)

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
        fecha: this.normalizeDateInput(source.fecha) || this.getTodayInputDate(),
        fechaServicio: this.normalizeDateInput(source.fechaServicio) || this.getTodayInputDate(),
        correlativo: source.correlativo || '',
        cliente: {
          nombre: cliente.nombre || '',
          ruc: cliente.ruc || '',
          direccion: cliente.direccion || '',
          contactoNombre: cliente.contactoNombre || '',
          contactoTelefono: cliente.contactoTelefono || ''
        },
        asunto: source.asunto || DEFAULT_ASUNTO,
        contexto: source.contexto || DEFAULT_CONTEXTO,
        detalles: detalles.map(detalle => ({
          numero: detalle.numero || 1,
          numeroTexto:
            detalle.numeroTexto ||
            this.numeroEnTexto(detalle.numero || 1),
          descripcion: detalle.descripcion || ''
        })),
        despedida: source.despedida || DEFAULT_DESPEDIDA,
        estadoProceso: CARTA_ESTADOS.includes(source.estadoProceso) ? source.estadoProceso : 'Emitido',
        estado: source.estado || source.estadoProceso || 'Emitido',
        tokenConfirmacion: source.tokenConfirmacion || '',
        confirmacion: {
          confirmado: !!(source.confirmacion || {}).confirmado,
          nombre: (source.confirmacion || {}).nombre || '',
          codigo: (source.confirmacion || {}).codigo || '',
          fechaConfirmacion: (source.confirmacion || {}).fechaConfirmacion || null,
          ip: (source.confirmacion || {}).ip || '',
          userAgent: (source.confirmacion || {}).userAgent || ''
        },
        cargo: {
          link: (source.cargo || {}).link || '',
          fechaCarga: (source.cargo || {}).fechaCarga || null
        },
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
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      if (!this.cartas || this.cartas.length === 0) {
        return `SGP-CH-${month}.${year}-0001`
      }
      const ultimaCarta = this.cartas[0]
      const ultimoNumero = parseInt(
        ultimaCarta.correlativo.split('-').pop(),
        10
      )
      const siguiente = String(ultimoNumero + 1).padStart(4, '0')
      return `SGP-CH-${month}.${year}-${siguiente}`
    },
    getTodayInputDate() {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    async exportCartas() {
      await exportRowsToExcel({
        filename: 'cartas',
        sheetName: 'Cartas',
        rows: this.filteredCartas,
        columns: [
          { label: 'Correlativo', value: carta => carta.correlativo },
          { label: 'Cliente', value: carta => (carta.cliente || {}).nombre },
          { label: 'RUC', value: carta => (carta.cliente || {}).ruc },
          { label: 'Direccion', value: carta => (carta.cliente || {}).direccion },
          { label: 'Contacto', value: carta => (carta.cliente || {}).contactoNombre },
          { label: 'Telefono', value: carta => (carta.cliente || {}).contactoTelefono },
          { label: 'Asunto', value: carta => carta.asunto },
          { label: 'Fecha', value: carta => this.formatShortDate(carta.fecha) },
          { label: 'Estado proceso', value: carta => carta.estadoProceso }
        ]
      })
    },
    openImportCartas() {
      this.$refs.cartasExcelInput.click()
    },
    async importCartas(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, CARTA_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        if (result.rows.length === 0) {
          alert('El Excel no tiene filas para importar.')
          return
        }

        for (const row of result.rows) {
          const carta = await this.$firebaseApi.create('cartas', this.toCartaPayload({
            ...this.getEmptyForm(),
            correlativo: row.Correlativo,
            fecha: this.parseImportedDate(row.Fecha),
            asunto: row.Asunto,
            estadoProceso: CARTA_ESTADOS.includes(row['Estado proceso']) ? row['Estado proceso'] : 'Emitido',
            cliente: {
              nombre: row.Cliente,
              ruc: row.RUC,
              direccion: row.Direccion,
              contactoNombre: row.Contacto,
              contactoTelefono: row.Telefono
            }
          }))
          this.cartas.unshift(this.normalizeCarta(carta))
        }

        alert(`Se agregaron ${result.rows.length} filas.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
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
    parseLocalDate(value) {
      if (value && typeof value.toDate === 'function') {
        return value.toDate()
      }

      if (value && value.seconds !== undefined) {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000)
      }

      if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

        if (match) {
          const [, year, month, day] = match
          return new Date(Number(year), Number(month) - 1, Number(day))
        }
      }

      return new Date(value)
    },
    isInputDateString(value) {
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    },
    normalizeDateInput(value) {
      if (!value) return ''

      if (this.isInputDateString(value)) {
        return value
      }

      const parsedDate = this.parseLocalDate(value)
      if (Number.isNaN(parsedDate.getTime())) return ''

      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    },
    formatShortDate(date) {
      if (!date) return ''

      const parsedDate = this.parseLocalDate(date)
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
.status-icon-button--anulado {
  color: #dc2626 !important;
  border-color: #fecaca;
  background: #fee2e2;
}

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

.table-actions {
  width: min(760px, 100%);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 12px;
  margin: 16px 20px 18px auto;
}

.table-header span {
  color: #64748b;
  font-size: 14px;
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

.status-icon-button--emitido {
  color: #075985 !important;
  border-color: #bae6fd;
  background: #e0f2fe;
}

.status-icon-button--enviado {
  color: #854d0e !important;
  border-color: #fde68a;
  background: #fef3c7;
}

.status-icon-button--entregado {
  color: #166534 !important;
  border-color: #bbf7d0;
  background: #dcfce7;
  cursor: not-allowed;
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
  align-items: center;
  overflow: hidden;
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
  width: min(760px, 100%);
  max-height: calc(100vh - 32px);
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
  grid-template-columns: 80px 120px 1fr 40px 40px;
  gap: 10px;
  align-items: end;
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
  padding: 0px 12px;
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
  --preview-scale: 0.62;
  display: flex;
  justify-content: center;
  max-height: calc(100vh - 174px);
  overflow: auto;
  padding: 16px;
  background: #f8fafc;
}

.preview-sheet {
  width: calc(210mm * var(--preview-scale));
  height: calc(297mm * var(--preview-scale));
  flex: 0 0 auto;
}

.preview-sheet .carta-preview {
  transform: scale(var(--preview-scale));
  transform-origin: top left;
}

@media (max-width: 640px) {

  .page-header,
  .table-header,
  .details-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .table-actions {
    width: 100%;
    flex-direction: row;
    flex-wrap: nowrap;
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

  .preview-content {
    --preview-scale: 0.42;
    max-height: calc(100vh - 228px);
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
  .preview-sheet,
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

  .preview-sheet .carta-preview {
    transform: none;
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
