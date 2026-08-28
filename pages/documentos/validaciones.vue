<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 font-['Inter',system-ui,sans-serif]">
    <!-- Fondo decorativo -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl"></div>
    </div>

    <!-- Contenedor principal con efecto glass -->
    <div class="relative max-w-7xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl shadow-black/40 p-4 md:p-6 transition-all">
      
      <!-- Header con gradiente y badge (tamaños reducidos) -->
      <div class="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-white/10 gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl md:text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Ingresos a Planta
            </h1>
            <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Carga el reporte Excel 50007
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Botón Exportar -->
          <button
            v-if="items.length"
            @click="exportarCSV"
            class="group relative px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-300 flex items-center gap-1.5 overflow-hidden"
          >
            <span class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <svg class="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span class="relative z-10">Exportar CSV</span>
          </button>

          <input
            type="file"
            accept=".xlsx, .xls"
            @change="importarExcel"
            class="hidden"
            ref="fileInput"
          />
          <button
            @click="$refs.fileInput.click()"
            :disabled="cargando"
            class="group relative px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
          >
            <span class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <svg v-if="!cargando" class="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <svg v-else class="w-3.5 h-3.5 animate-spin relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="relative z-10">{{ cargando ? 'Cargando...' : 'Importar Excel' }}</span>
          </button>
        </div>
      </div>

      <!-- Toast mejorado -->
      <div
        v-if="toast.mensaje"
        class="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-3.5 flex items-start gap-3 transition-all duration-500 animate-slide-in"
      >
        <div class="flex-shrink-0 mt-0.5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="toast.tipo === 'exito' ? 'bg-emerald-500/20' : 'bg-rose-500/20'">
            <svg v-if="toast.tipo === 'exito'" class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">{{ toast.titulo }}</p>
          <p class="text-slate-300 text-xs mt-0.5">{{ toast.mensaje }}</p>
        </div>
        <button @click="toast.mensaje = ''" class="text-slate-500 hover:text-slate-300 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Barra de estado compacta -->
      <div v-if="items.length" class="my-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
            <span class="text-slate-400">Total</span>
            <span class="font-mono font-bold text-white text-sm">{{ items.length }}</span>
          </div>
          <div v-if="itemsFiltrados.length !== items.length" class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <span class="text-emerald-400">Filtrados</span>
            <span class="font-mono font-bold text-emerald-400 text-sm">{{ itemsFiltrados.length }}</span>
          </div>
          <button @click="items = []" class="text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpiar tabla
          </button>
        </div>

        <div class="relative w-full sm:w-56">
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar..."
            class="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
          />
          <svg class="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Tabla con diseño premium y tamaños más ajustados -->
      <div v-if="items.length" class="overflow-x-auto rounded-xl border border-white/5 shadow-2xl shadow-black/30 bg-slate-900/40 backdrop-blur-sm">
        <v-data-table class="validaciones-table" :headers="tableHeaders" :items="tableItems" :search="busqueda"
          :loading="cargando" :items-per-page="25"
          loading-text="Procesando archivo..." no-data-text="No hay datos para mostrar"
          :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.Fecha`]="{ item }">{{ formatFecha(item.Fecha) }}</template>
          <template #[`item.horaIngreso`]="{ item }">{{ item.horaIngreso || '-' }}</template>
          <template #[`item.numeroPedido`]="{ item }">
            <span class="inline-block px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 font-mono font-bold text-[10px]">
              {{ item.numeroPedido || '-' }}
            </span>
          </template>
          <template #[`item.numeroBoleta`]="{ item }">{{ item.numeroBoleta || '-' }}</template>
          <template #[`item.Cliente`]="{ item }"><span :title="item.Cliente">{{ item.Cliente || '-' }}</span></template>
          <template #[`item.Generador`]="{ item }"><span :title="item.Generador">{{ item.Generador || '-' }}</span></template>
          <template #[`item.Residuo`]="{ item }"><span :title="item.Residuo">{{ item.Residuo || '-' }}</span></template>
          <template #[`item.Cantidad`]="{ item }">
            {{ item.Cantidad }} <span class="text-slate-500 text-[9px]">{{ item.unidadVenta || '' }}</span>
          </template>
          <template #[`item.Placa`]="{ item }">{{ item.Placa || '-' }}</template>
          <template #[`item.guiaRemitente`]="{ item }">{{ item.guiaRemitente || '-' }}</template>
        </v-data-table>
      </div>


      <!-- Empty State mejorado y más compacto -->
      <div v-else class="mt-8 border-2 border-dashed border-white/10 rounded-2xl p-12 text-center bg-white/5 backdrop-blur-sm transition-all hover:border-white/20">
        <div class="w-16 h-16 mx-auto bg-gradient-to-br from-slate-800/60 to-slate-700/30 rounded-2xl flex items-center justify-center text-slate-500 mb-3 shadow-inner">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white">No hay datos para mostrar</h3>
        <p class="text-slate-400 mt-1 text-sm max-w-sm mx-auto">Sube el archivo Excel con el reporte 50007 para visualizar los ingresos a planta.</p>
        <button
          @click="$refs.fileInput.click()"
          class="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 flex items-center gap-2 mx-auto"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Subir archivo ahora
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx'

export default {
  data() {
    return {
      items: [],
      itemsFiltrados: [],
      tableHeaders: [
        { text: 'Fecha', value: 'Fecha' },
        { text: 'Hora', value: 'horaIngreso' },
        { text: 'N° Pedido', value: 'numeroPedido' },
        { text: 'N° Boleta', value: 'numeroBoleta' },
        { text: 'Cliente', value: 'Cliente' },
        { text: 'Generador', value: 'Generador' },
        { text: 'Residuo', value: 'Residuo' },
        { text: 'Cantidad', value: 'Cantidad' },
        { text: 'Placa', value: 'Placa' },
        { text: 'Guía Rem.', value: 'guiaRemitente' }
      ],
      busqueda: '',
      columnaOrden: '',
      ordenAsc: true,
      paginaActual: 1,
      itemsPorPagina: 25,
      cargando: false,
      toast: {
        mensaje: '',
        titulo: '',
        tipo: ''
      }
    }
  },
  computed: {
    tableItems() {
      return this.items.map(item => ({
        ...item,
        horaIngreso: item['Hora Ingreso'],
        numeroPedido: item['No. Pedido de Venta'],
        numeroBoleta: item['No. Boleta'],
        unidadVenta: item['Unidad Venta'],
        guiaRemitente: item['Guía Remitente']
      }))
    },
    totalPaginas() {
      return Math.ceil(this.itemsFiltrados.length / this.itemsPorPagina)
    },
    filasPaginadas() {
      const inicio = (this.paginaActual - 1) * this.itemsPorPagina
      const fin = inicio + this.itemsPorPagina
      return this.itemsFiltrados.slice(inicio, fin)
    }
  },
  watch: {
    items: {
      handler() {
        this.aplicarFiltrosYOrden()
      },
      deep: true
    },
    busqueda() {
      this.aplicarFiltrosYOrden()
    },
    columnaOrden() {
      this.aplicarFiltrosYOrden()
    },
    ordenAsc() {
      this.aplicarFiltrosYOrden()
    }
  },
  methods: {
    importarExcel(event) {
      const file = event.target.files[0]
      if (!file) return

      this.cargando = true
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 })

          const headerRowIndex = matrix.findIndex(row =>
            row.some(cell => String(cell).includes('No. Pedido de Venta') || String(cell) === 'Fecha')
          )

          if (headerRowIndex === -1) {
            throw new Error('No se detectó el formato del reporte 50007.')
          }

          const headers = matrix[headerRowIndex].map(h => String(h || '').trim())
          const dataRows = matrix.slice(headerRowIndex + 1)

          this.items = dataRows
            .filter(row => row.length > 0 && row.some(c => c !== null && c !== ''))
            .map(row => {
              const obj = {}
              headers.forEach((header, colIndex) => {
                if (header) {
                  obj[header] = row[colIndex] !== undefined ? row[colIndex] : null
                }
              })
              return obj
            })

          this.mostrarToast('exito', '¡Importación exitosa!', `Se cargaron ${this.items.length} registros.`)
        } catch (error) {
          this.mostrarToast('error', 'Error', error.message)
        } finally {
          this.cargando = false
          event.target.value = ''
          this.paginaActual = 1
        }
      }
      reader.onerror = () => {
        this.cargando = false
        this.mostrarToast('error', 'Error', 'No se pudo leer el archivo.')
      }
      reader.readAsArrayBuffer(file)
    },

    aplicarFiltrosYOrden() {
      let filtrados = this.items
      if (this.busqueda.trim() !== '') {
        const q = this.busqueda.toLowerCase().trim()
        filtrados = filtrados.filter(row =>
          Object.values(row).some(val =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(q)
          )
        )
      }

      if (this.columnaOrden) {
        const key = this.columnaOrden === '#' ? '#' : this.columnaOrden
        filtrados.sort((a, b) => {
          let valA = key === '#' ? 0 : a[key]
          let valB = key === '#' ? 0 : b[key]
          if (valA === undefined || valA === null) valA = ''
          if (valB === undefined || valB === null) valB = ''
          if (typeof valA === 'string') valA = valA.toLowerCase()
          if (typeof valB === 'string') valB = valB.toLowerCase()
          if (valA < valB) return this.ordenAsc ? -1 : 1
          if (valA > valB) return this.ordenAsc ? 1 : -1
          return 0
        })
      }

      this.itemsFiltrados = filtrados
      if (this.paginaActual > this.totalPaginas) {
        this.paginaActual = Math.max(1, this.totalPaginas)
      }
    },

    ordenarPor(columna) {
      if (this.columnaOrden === columna) {
        this.ordenAsc = !this.ordenAsc
      } else {
        this.columnaOrden = columna
        this.ordenAsc = true
      }
    },

    formatFecha(val) {
      if (!val) return '-'
      if (typeof val === 'string') {
        const date = new Date(val)
        if (!isNaN(date)) {
          return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        }
        return val.split('T')[0]
      }
      if (val instanceof Date) {
        return val.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }
      return val
    },

    mostrarToast(tipo, titulo, mensaje) {
      this.toast = { mensaje, titulo, tipo }
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(() => {
        this.toast.mensaje = ''
      }, 4000)
    },

    exportarCSV() {
      if (!this.itemsFiltrados.length) return
      const cabeceras = Object.keys(this.itemsFiltrados[0])
      const rows = this.itemsFiltrados.map(row =>
        cabeceras.map(key => `"${String(row[key] || '').replace(/"/g, '""')}"`).join(',')
      )
      const csv = [cabeceras.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ingresos_planta_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap');

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-0.75rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Scrollbar personalizada más fina */
.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
  width: 4px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}
.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}
</style>
