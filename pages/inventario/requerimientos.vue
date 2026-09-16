<template>
  <section class="inventory-module unified-list-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Inventario</p>
        <h1>Requerimientos</h1>
        <span class="registros-count">{{ requests.length }} registros</span>
      </div>
      <div class="header-actions">
        <!-- <button class="secondary-button" type="button" :disabled="!requests.length || !products.length || busy" @click="copyRequest(requests[0])">Copiar último</button> -->
        <button class="primary-button" type="button" :disabled="!products.length || busy" @click="openRequest()">Nuevo requerimiento</button>
      </div>
    </div>
    <v-alert v-if="error" type="error" dismissible @input="error = ''">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" dismissible @input="message = ''">{{ message }}</v-alert>
    <div class="content">
      <div class="table-header"><div><h2>Listado de requerimientos</h2><span>{{ requests.length }} registros</span></div></div>
      <div class="table-wrapper">
          <v-data-table :headers="requestHeaders" :items="requests" :loading="loading" item-key="id" no-data-text="Aún no hay requerimientos.">
            <template #[`item.fechaCreacion`]="{ item }">{{ formatDate(item.fechaCreacion) }}</template>
            <template #[`item.detalle`]="{ item }">
              <div v-for="line in item.items" :key="line.productoId">
                <strong>{{ line.nombre || productName(line.productoId) }}</strong>
                <span class="grey--text"> · {{ line.codigo }} · {{ line.cantidad }} unidad(es)</span>
              </div>
            </template>
            <template #[`item.actions`]="{ item }">
              <div class="actions">
                <v-btn v-if="item.estado === 'Pendiente'" small text color="teal" :disabled="busy" @click="setRequestStatus(item, 'Aceptado')">Aceptar</v-btn>
                <v-btn v-if="item.estado === 'Pendiente'" small text color="red" :disabled="busy" @click="setRequestStatus(item, 'Rechazado')">Rechazar</v-btn>
                <v-btn v-if="item.estado === 'Aceptado'" small text color="teal" :disabled="busy" @click="openReceive(item)">Recibir</v-btn>
                <button class="icon-button icon-button--excel" type="button" title="Descargar Excel" :aria-label="'Descargar Excel del requerimiento del ' + formatDate(item.fechaCreacion)" :disabled="exportingId === item.id" @click="exportRequest(item)">
                  <v-icon small>mdi-microsoft-excel</v-icon>
                </button>
                <button class="icon-button" type="button" title="Repetir requerimiento" :aria-label="'Repetir requerimiento del ' + formatDate(item.fechaCreacion)" :disabled="busy || !products.length" @click="copyRequest(item)">
                  <v-icon small>mdi-content-copy</v-icon>
                </button>
                <button v-if="item.estado !== 'Recibido'" class="icon-button" type="button" title="Editar requerimiento" :aria-label="'Editar requerimiento del ' + formatDate(item.fechaCreacion)" :disabled="busy" @click="editRequest(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                </button>
                <button v-if="isAdmin" class="icon-button icon-button--danger" type="button" title="Eliminar requerimiento" :aria-label="'Eliminar requerimiento ' + item.id" :disabled="busy" @click="deleteRequest(item)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M8 7l1 13h6l1-13" /><path d="M9 7V4h6v3" /></svg>
                </button>
              </div>
            </template>
          </v-data-table>
      </div>
    </div>
    <v-dialog v-model="requestDialog" max-width="680">
      <v-card>
        <v-card-title>{{ editingRequestId ? 'Editar requerimiento' : sourceRequestId ? 'Repetir requerimiento' : 'Nuevo requerimiento' }}</v-card-title>
        <v-card-text>
          <p v-if="sourceRequestId">Puedes cambiar las cantidades, quitar productos o agregar otros. Se guardará como un requerimiento nuevo.</p>
          <p v-if="editingRequestId && editingRequestStatus !== 'Pendiente'">Al guardar, el requerimiento volverá a Pendiente para aprobar los cambios.</p>
          <v-form ref="requestForm">
            <v-row v-for="(line, index) in requestForm.items" :key="index" align="center">
              <v-col cols="12" sm="7"><v-autocomplete v-model="line.productoId" :items="productOptions" item-text="label" item-value="id" :filter="filterProduct" label="Buscar producto por nombre o código" placeholder="Escribe el nombre del útil" clearable :rules="[required]" /></v-col>
              <v-col cols="8" sm="3"><v-text-field v-model.number="line.cantidad" type="number" min="1" step="1" label="Cantidad" :rules="[positive]" /></v-col>
              <v-col cols="4" sm="2"><v-btn icon aria-label="Quitar producto" @click="requestForm.items.splice(index, 1)"><v-icon>mdi-delete</v-icon></v-btn></v-col>
            </v-row>
            <v-btn text color="teal" @click="requestForm.items.push({ productoId: '', cantidad: 1 })">Agregar producto</v-btn>
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="requestDialog = false">Cancelar</v-btn><v-btn color="teal" dark :loading="busy" @click="saveRequest">Guardar requerimiento</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="receiveDialog" max-width="680">
      <v-card>
        <v-card-title>Registrar recepción</v-card-title>
        <v-card-text>
          <p>Confirma las cantidades recibidas. Si algo no llegó, registra 0.</p>
          <v-form ref="receiveForm">
            <v-text-field v-for="line in receiveForm.items" :key="line.productoId" v-model.number="line.cantidadRecibida" :label="`${line.nombre} (solicitado: ${line.cantidad})`" type="number" min="0" step="1" :rules="[nonNegative]" />
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="receiveDialog = false">Cancelar</v-btn><v-btn color="teal" dark :loading="busy" @click="receiveRequest">Confirmar recepción</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

  </section>
</template>

<script>
export default {
  name: 'RequerimientosInventarioPage',
  data() {
    return {
      loading: false, busy: false, exportingId: '', error: '', message: '', products: [], requests: [],
      requestDialog: false, receiveDialog: false,
      requestForm: { items: [] }, sourceRequestId: '', editingRequestId: '', editingRequestStatus: '', originalItems: [], receiveForm: { id: '', items: [] },
      required: value => Boolean(String(value == null ? '' : value).trim()) || 'Obligatorio',
      positive: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) > 0 || 'Ingresa un entero mayor que 0',
      nonNegative: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 || 'Ingresa un entero desde 0',
      requestHeaders: [{ text: 'Fecha', value: 'fechaCreacion' }, { text: 'Productos solicitados', value: 'detalle', sortable: false }, { text: 'Estado', value: 'estado' }, { text: 'Acciones', value: 'actions', sortable: false }]
    }
  },
  computed: {
    isAdmin() { return Boolean(this.$auth?.isAdmin) },
    productOptions() { return this.products.map(item => ({ id: item.id, label: `${item.nombre} · ${item.codigo}` })) }
  },
  mounted() { this.loadAll() },
  methods: {
    async loadAll() {
      this.loading = true
      try {
        const [products, requests] = await Promise.all([
          this.$firebaseApi.list('utilesOficina'), this.$firebaseApi.list('requerimientosUtiles')
        ])
        this.products = products
        this.requests = requests.map(item => ({ ...item, items: item.items || [] }))
        this.error = ''
      } catch (error) { this.fail('No se pudieron cargar los requerimientos.', error) }
      finally { this.loading = false }
    },
    fail(message, error) { this.error = message; console.error(error) },
    async exportRequest(item) {
      if (this.exportingId) return
      this.exportingId = item.id
      try {
        const { exportRequerimientoExcel } = await import('~/utils/exportRequerimientoExcel')
        await exportRequerimientoExcel(item)
        this.message = 'Excel descargado.'
      } catch (error) { this.fail('No se pudo exportar el requerimiento: ' + error.message, error) }
      finally { this.exportingId = '' }
    },
    productName(id) { return this.products.find(item => item.id === id)?.nombre || 'Producto no disponible' },
    filterProduct(item, queryText) {
      const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return normalize(item.label).includes(normalize(queryText))
    },
    formatDate(value) {
      const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value || Date.now())
      return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    },
    openRequest() {
      this.sourceRequestId = ''
      this.editingRequestId = ''
      this.requestForm = { items: [{ productoId: '', cantidad: 1 }] }
      this.error = ''
      this.requestDialog = true
    },
    copyRequest(source) {
      const available = new Set(this.products.map(product => product.id))
      const lines = (source.items || [])
        .filter(line => available.has(line.productoId))
        .map(line => ({ productoId: line.productoId, cantidad: Number(line.cantidad) || 1 }))
      if (!lines.length) {
        this.error = 'Los productos de ese requerimiento ya no están disponibles. Crea uno nuevo.'
        return
      }
      this.sourceRequestId = source.id
      this.editingRequestId = ''
      this.requestForm = { items: lines }
      this.error = lines.length < (source.items || []).length
        ? 'Se omitieron productos que ya no están en el catálogo.'
        : ''
      this.requestDialog = true
    },
    editRequest(item) {
      if (item.estado === 'Recibido') return
      const available = new Set(this.products.map(product => product.id))
      if ((item.items || []).some(line => !available.has(line.productoId))) {
        this.error = 'Este requerimiento contiene productos que ya no están en el catálogo. Puedes repetirlo y elegir otros productos.'
        return
      }
      this.editingRequestId = item.id
      this.editingRequestStatus = item.estado
      this.originalItems = (item.items || []).map(line => ({ ...line }))
      this.sourceRequestId = ''
      this.requestForm = { items: (item.items || []).map(line => ({ productoId: line.productoId, cantidad: Number(line.cantidad) })) }
      this.error = ''
      this.requestDialog = true
    },
    async saveRequest() {
      if (!this.requestForm.items.length) {
        this.error = 'Agrega al menos un producto al requerimiento.'
        return
      }
      if (!this.$refs.requestForm.validate()) return
      const ids = this.requestForm.items.map(item => item.productoId)
      if (new Set(ids).size !== ids.length) { this.error = 'Un producto solo puede aparecer una vez por requerimiento.'; return }
      if (ids.some(id => !this.products.some(product => product.id === id))) {
        this.error = 'Uno de los productos ya no está disponible. Actualiza la página.'
        return
      }
      const items = this.requestForm.items.map(line => {
        const product = this.products.find(item => item.id === line.productoId)
        return { productoId: product.id, codigo: product.codigo, nombre: product.nombre, cantidad: Number(line.cantidad) }
      })
      this.busy = true
      try {
        if (this.editingRequestId) {
          const ref = this.$db.collection('requerimientosUtiles').doc(this.editingRequestId)
          await this.$db.runTransaction(async transaction => {
            const snapshot = await transaction.get(ref)
            if (!snapshot.exists || snapshot.data().anulado || snapshot.data().estado !== this.editingRequestStatus || snapshot.data().estado === 'Recibido') {
              throw new Error('El requerimiento cambió de estado. Actualiza la página.')
            }
            if (JSON.stringify(snapshot.data().items || []) !== JSON.stringify(this.originalItems)) {
              throw new Error('Otro usuario modificó los productos. Actualiza la página.')
            }
            const now = new Date()
            transaction.update(ref, { items, estado: 'Pendiente', fechaActualizacion: now })
            transaction.set(this.$db.collection('historial').doc(), {
              fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
              modulo: 'Inventario', pagina: 'Requerimientos', ruta: '/inventario/requerimientos',
              accion: 'Editar', coleccion: 'requerimientosUtiles', registroId: ref.id,
              detalle: `Productos o cantidades actualizados; estado ${snapshot.data().estado} → Pendiente`
            })
          })
        } else {
          await this.$firebaseApi.create('requerimientosUtiles', {
            items, estado: 'Pendiente',
            ...(this.sourceRequestId ? { requerimientoOrigenId: this.sourceRequestId } : {})
          })
        }
        this.requestDialog = false
        this.message = this.editingRequestId ? 'Requerimiento actualizado y pendiente de aprobación.' : 'Requerimiento creado.'
        await this.loadAll()
      } catch (error) { this.fail('No se pudo guardar el requerimiento: ' + error.message, error) }
      finally { this.busy = false }
    },
    async setRequestStatus(item, estado) {
      this.busy = true
      try {
        const ref = this.$db.collection('requerimientosUtiles').doc(item.id)
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          if (!snapshot.exists || snapshot.data().estado !== 'Pendiente') throw new Error('El requerimiento ya cambió de estado.')
          const productRefs = estado === 'Aceptado'
            ? (snapshot.data().items || []).map(line => this.$db.collection('utilesOficina').doc(line.productoId))
            : []
          const productSnapshots = await Promise.all(productRefs.map(productRef => transaction.get(productRef)))
          if (productSnapshots.some(product => !product.exists || product.data().anulado)) throw new Error('Uno de los productos ya no está disponible.')
          const now = new Date()
          transaction.update(ref, { estado, fechaActualizacion: now })
          productRefs.forEach(productRef => transaction.update(productRef, { enAlmacen: true, fechaActualizacion: now }))
        })
        this.message = `Requerimiento ${estado.toLowerCase()}.`; await this.loadAll()
      } catch (error) { this.fail('No se pudo cambiar el estado del requerimiento.', error) }
      finally { this.busy = false }
    },
    openReceive(item) {
      this.receiveForm = { id: item.id, items: item.items.map(line => ({ ...line, cantidadRecibida: line.cantidad })) }
      this.receiveDialog = true
    },
    async receiveRequest() {
      if (!this.$refs.receiveForm.validate()) return
      const lines = this.receiveForm.items.map(line => ({ ...line, cantidadRecibida: Number(line.cantidadRecibida) }))
      this.busy = true
      try {
        const requestRef = this.$db.collection('requerimientosUtiles').doc(this.receiveForm.id)
        const productRefs = lines.map(line => this.$db.collection('utilesOficina').doc(line.productoId))
        await this.$db.runTransaction(async transaction => {
          const request = await transaction.get(requestRef)
          if (!request.exists || request.data().estado !== 'Aceptado') throw new Error('Este requerimiento ya fue recibido o cambió de estado.')
          const snapshots = await Promise.all(productRefs.map(ref => transaction.get(ref)))
          if (snapshots.some(snapshot => !snapshot.exists || snapshot.data().anulado)) throw new Error('Uno de los productos ya no existe.')
          const requested = request.data().items || []
          if (requested.length !== lines.length || lines.some(line => !requested.some(original => original.productoId === line.productoId && original.cantidad === line.cantidad))) throw new Error('El detalle del requerimiento cambió. Actualiza la página.')
          const now = new Date()
          lines.forEach((line, index) => {
            if (!line.cantidadRecibida) return
            transaction.update(productRefs[index], { stock: (Number(snapshots[index].data().stock) || 0) + line.cantidadRecibida, enAlmacen: true, fechaActualizacion: now })
            transaction.set(this.$db.collection('movimientosUtiles').doc(), { tipo: 'entrada', productoId: line.productoId, codigo: line.codigo, nombre: line.nombre, cantidad: line.cantidadRecibida, detalle: `Requerimiento ${requestRef.id}`, requerimientoId: requestRef.id, fechaCreacion: now })
          })
          transaction.update(requestRef, { estado: 'Recibido', itemsRecibidos: lines.map(line => ({ productoId: line.productoId, cantidad: line.cantidadRecibida })), fechaRecepcion: now, fechaActualizacion: now })
        })
        this.receiveDialog = false; this.message = 'Recepción registrada en almacén.'; await this.loadAll()
      } catch (error) { this.fail('No se pudo registrar la recepción: ' + error.message, error) }
      finally { this.busy = false }
    },
    async deleteRequest(item) {
      if (!this.isAdmin || this.busy) return
      const detail = item.estado === 'Recibido'
        ? 'Las existencias ya recibidas permanecerán en el almacén.'
        : 'El requerimiento dejará de estar disponible.'
      if (!confirm(`¿Eliminar este requerimiento? ${detail}`)) return
      this.busy = true
      try {
        const ref = this.$db.collection('requerimientosUtiles').doc(item.id)
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          if (!snapshot.exists || snapshot.data().anulado) throw new Error('El requerimiento ya fue eliminado.')
          const now = new Date()
          transaction.update(ref, { anulado: true, estado: 'Anulado', estadoAnterior: snapshot.data().estado, fechaAnulacion: now, fechaActualizacion: now })
          transaction.set(this.$db.collection('historial').doc(), {
            fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
            modulo: 'Inventario', pagina: 'Requerimientos', ruta: '/inventario/requerimientos',
            accion: 'Eliminar', coleccion: 'requerimientosUtiles', registroId: item.id,
            detalle: `Requerimiento ${snapshot.data().estado} eliminado; existencias recibidas conservadas`
          })
        })
        this.message = 'Requerimiento eliminado.'
        await this.loadAll()
      } catch (error) { this.fail('No se pudo eliminar el requerimiento: ' + error.message, error) }
      finally { this.busy = false }
    }
  }
}
</script>

