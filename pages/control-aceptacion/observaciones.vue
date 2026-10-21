<template>
  <section class="observaciones-page">
    <header>
      <div><span>Control y Aceptación</span>
        <h1>Observaciones</h1>
      </div>
      <v-btn color="primary" :disabled="loading || eliminando" @click="nuevo">Nueva observación</v-btn>
    </header>
    <v-alert v-if="error && !modal" type="error" outlined>{{ error }}</v-alert>
    <v-alert v-if="mensaje" type="success" outlined>{{ mensaje }}</v-alert>
    <v-dialog v-model="modal" max-width="900" :persistent="guardando">
      <v-card class="pa-5">
        <h2 class="mb-4">{{ editingId ? 'Editar observación' : 'Registrar observación' }}</h2>
        <v-alert v-if="error" type="error" outlined>{{ error }}</v-alert>
        <v-form ref="form" @submit.prevent="guardar">
          <v-row dense>
            <v-col v-for="campo in campos" :key="campo.key" cols="12" md="4">
              <v-autocomplete v-model="form[campo.key]" :items="opciones[campo.key]" :label="campo.label"
                :rules="[requerido]" :loading="cargandoOpciones[campo.key]" outlined dense clearable
                :disabled="guardando" @update:search-input="buscar(campo.key, $event)" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.estado" :items="estados" label="Estado" outlined dense :rules="[estadoValido]"
                :disabled="guardando">
                <template #selection="{ item }">
                  <v-chip small :color="item.fondo" :text-color="item.color">{{ item.text }}</v-chip>
                </template>
                <template #item="{ item }">
                  <v-chip small :color="item.fondo" :text-color="item.color">{{ item.text }}</v-chip>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.fecha_observacion" type="date" label="Fecha de observación"
                outlined dense :rules="[fechaValida]" :disabled="guardando"
                hint="Fecha en que se identificó la condición o se acordó la excepción comercial" persistent-hint />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model.trim="form.observacion" label="Observación" outlined rows="3" :rules="[requerido]"
                :disabled="guardando" />
            </v-col>
          </v-row>
          <v-btn type="submit" color="primary" :loading="guardando" :disabled="loading">Guardar</v-btn>
          <v-btn text :disabled="guardando" @click="modal = false">Cancelar</v-btn>
        </v-form>
      </v-card>
    </v-dialog>
    <v-card outlined class="pa-5">
      <v-text-field v-model="busqueda" label="Buscar observaciones" prepend-inner-icon="mdi-magnify" outlined dense />
      <v-data-table :headers="headers" :items="registros" :search="busqueda" :loading="loading" :items-per-page="10">
        <template #[`item.fecha_observacion`]="{ item }">{{ fechaTexto(item.fecha_observacion) }}</template>
        <template #[`item.estado`]="{ item }">
          <v-chip small :color="estadoInfo(item.estado).fondo" :text-color="estadoInfo(item.estado).color">
            {{ estadoInfo(item.estado).text }}
          </v-chip>
        </template>
        <template #[`item.acciones`]="{ item }">
          <v-btn icon :disabled="guardando || eliminando" aria-label="Editar observación"
            @click="editar(item)"><v-icon>mdi-pencil</v-icon></v-btn>
          <v-btn icon color="error" :disabled="guardando || eliminando" aria-label="Eliminar observación"
            title="Eliminar observación" @click="confirmarEliminar(item)"><v-icon>mdi-delete-outline</v-icon></v-btn>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="modalEliminar" max-width="480" :persistent="eliminando">
      <v-card>
        <v-card-title>Eliminar observación</v-card-title>
        <v-card-text>
          <p>¿Deseas eliminar esta observación?</p>
          <p v-if="registroEliminar">
            {{ registroEliminar.generador }} · {{ registroEliminar.transportista }} · {{
              registroEliminar.producto_cliente
            }}
          </p>
          <v-alert v-if="errorEliminar" type="error" outlined>{{ errorEliminar }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="eliminando" @click="modalEliminar = false">Cancelar</v-btn>
          <v-btn color="error" :loading="eliminando" @click="eliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
import { coincideObservacion, estadosObservacion, obtenerEstadoObservacion, fechaObservacionValida, formatearFechaObservacion } from '~/utils/observaciones-control'

const vacio = () => ({ generador: '', transportista: '', producto_cliente: '', estado: '', fecha_observacion: '', observacion: '' })
const campos = [
  { key: 'generador', label: 'Generador' },
  { key: 'transportista', label: 'Transportista' },
  { key: 'producto_cliente', label: 'Nombre Producto Cliente' }
]

export default {
  data() {
    return {
      modal: false, estados: estadosObservacion,
      modalEliminar: false, registroEliminar: null, eliminando: false, errorEliminar: '',
      campos, form: vacio(), editingId: null, registros: [], loading: false, guardando: false,
      error: '', mensaje: '', busqueda: '', opciones: {}, cargandoOpciones: {}, timers: {}, versiones: {},
      headers: [...campos.map(c => ({ text: c.label, value: c.key })),
      { text: 'Estado', value: 'estado' },
      { text: 'Fecha de observación', value: 'fecha_observacion' },
      { text: 'Observación', value: 'observacion' }, { text: 'Acciones', value: 'acciones', sortable: false }]
    }
  },
  mounted() {
    this.cargar()
    campos.forEach(c => this.cargarOpciones(c.key))
  },
  beforeDestroy() { Object.values(this.timers).forEach(clearTimeout) },
  methods: {
    fechaTexto: formatearFechaObservacion,
    fechaValida: value => fechaObservacionValida(value) || 'Selecciona una fecha válida',
    confirmarEliminar(item) {
      this.registroEliminar = item
      this.errorEliminar = ''
      this.mensaje = ''
      this.modalEliminar = true
    },
    async eliminar() {
      if (!this.registroEliminar || this.eliminando) return
      this.eliminando = true
      this.errorEliminar = ''
      try {
        const id = this.registroEliminar.id
        await this.$firebaseApi.remove('observacionesControl', id)
        this.registros = this.registros.filter(record => record.id !== id)
        this.modalEliminar = false
        this.registroEliminar = null
        this.mensaje = 'Observación eliminada.'
      } catch (error) {
        this.errorEliminar = error.message
      } finally {
        this.eliminando = false
      }
    },
    estadoInfo: obtenerEstadoObservacion,
    estadoValido: value => estadosObservacion.some(estado => estado.value === value) || 'Selecciona un estado',
    nuevo() {
      this.limpiar()
      this.error = ''
      this.mensaje = ''
      this.modal = true
    },
    requerido: value => Boolean(String(value || '').trim()) || 'Campo obligatorio',
    async cargar() {
      this.loading = true
      try { this.registros = await this.$firebaseApi.list('observacionesControl') }
      catch (error) { this.error = error.message }
      finally { this.loading = false }
    },
    buscar(field, value) {
      clearTimeout(this.timers[field])
      this.timers[field] = setTimeout(() => this.cargarOpciones(field, value || ''), 400)
    },
    async cargarOpciones(field, search = '') {
      const version = (this.versiones[field] || 0) + 1
      this.versiones[field] = version
      this.$set(this.cargandoOpciones, field, true)
      try {
        const params = new URLSearchParams({ action: 'opciones', field, search, limit: '30' })
        const response = await this.$axios.$get(`/api/reporteLab?${params}`)
        if (!response || !response.success) throw new Error(response?.error || 'No se pudieron cargar las opciones')
        if (this.versiones[field] === version) {
          this.$set(this.opciones, field, [...new Set([this.form[field], ...response.data].filter(Boolean))])
        }
      } catch (error) { this.error = error.message }
      finally { if (this.versiones[field] === version) this.$set(this.cargandoOpciones, field, false) }
    },
    editar(item) {
      this.editingId = item.id
      this.form = { ...vacio(), ...item }
      campos.forEach(c => this.$set(this.opciones, c.key, [...new Set([item[c.key], ...(this.opciones[c.key] || [])])]))
      this.mensaje = ''
      this.error = ''
      this.modal = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.resetValidation())
    },
    limpiar() {
      this.form = vacio()
      this.editingId = null
      this.$nextTick(() => this.$refs.form && this.$refs.form.resetValidation())
    },
    async guardar() {
      if (!this.$refs.form.validate() || this.guardando || this.loading) return
      this.error = ''
      this.mensaje = ''
      if (this.registros.some(r => r.id !== this.editingId && coincideObservacion(r, this.form))) {
        this.error = 'Ya existe una observación para esta combinación. Edita el registro existente.'
        return
      }
      this.guardando = true
      try {
        const payload = Object.fromEntries(Object.keys(vacio()).map(key => [key, String(this.form[key]).trim()]))
        const saved = this.editingId
          ? await this.$firebaseApi.update('observacionesControl', this.editingId, payload)
          : await this.$firebaseApi.create('observacionesControl', payload)
        this.registros = [saved, ...this.registros.filter(r => r.id !== saved.id)]
        this.modal = false
        this.limpiar()
        this.mensaje = 'Observación guardada.'
      } catch (error) { this.error = error.message }
      finally { this.guardando = false }
    }
  }
}
</script>

<style scoped>
.observaciones-page {
  padding: 28px 24px;
  min-height: 100vh;
  background: var(--ui-surface-f3f6f8, #f3f6f8);
  color: var(--ui-text-172033, #172033)
}

header {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap
}

header span {
  color: #087f8c;
  font-weight: 700;
  font-size: 12px
}

h1 {
  font-size: 30px
}

h2 {
  font-size: 18px
}
</style>
