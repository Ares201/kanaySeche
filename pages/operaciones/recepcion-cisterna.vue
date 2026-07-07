<template>
  <section class="page">
    <div class="header">
      <div>
        <p class="eyebrow">Operaciones</p>
        <h1>Cisterna</h1>
      </div>
      <button class="btn-primary" @click="openCreateModal">
        + Nuevo Registro
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <v-row dense>
          <v-col cols="12">
            <div>
              <h2>Listado de conformidades</h2>
              <span>{{ filteredItems.length }} registros</span>
            </div>
          </v-col>
          <v-col>
            <v-divider />
          </v-col>
          <v-col cols="12">
            <v-row class="table-actions" dense justify="end">
              <v-col class="table-action-col" cols="4">
                <v-text-field v-model.trim="search" dense hide-details outlined type="search"
                  label="Buscar Proveedor o correlativo" placeholder="Ej. CARTA-001" />
              </v-col>
              <v-col class="table-action-col" cols="3">
                <v-text-field dense hide-details outlined type="date" label="Filtrar por fecha" />
              </v-col>
              <v-col class="table-action-col table-action-col--excel" cols="1">
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
                    <v-list-item>
                      <v-list-item-title>Exportar</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <v-list-item-title>Importar</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-col>

            </v-row>
          </v-col>
        </v-row>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Proveedor</th>
              <th>Placa</th>
              <th>Fecha</th>
              <th>Peso Cliente</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td class="code">{{ item.codigo }}</td>
              <td>{{ item.proveedor }}</td>
              <td><span class="badge">{{ item.placa }}</span></td>
              <td>{{ item.fecha }} {{ item.hora }}</td>
              <td>{{ formatWeight(item.pesoCliente) }} kg</td>

              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Ver" aria-label="Ver carta" @click="printItem(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar carta"
                    @click="openEditModal(item)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button style="color: red;" class="icon-button" type="button" title="Anular" aria-label="Anular carta"
                    @click="anularCarta(item.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 16l8-8" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredItems.length === 0">
              <td colspan="6" class="empty">No hay registros</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="save">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar' : 'Nuevo' }} registro</h2>
          <button type="button" @click="closeModal">✕</button>
        </div>
        <div class="grid">
          <input v-model="form.codigo" placeholder="Código" />
          <input v-model="form.proveedor" placeholder="Proveedor" />
          <input v-model="form.placa" placeholder="Placa" />
          <input v-model="form.fecha" type="date" />
          <input v-model="form.hora" type="time" />
          <input v-model.number="form.pesoCliente" type="number" placeholder="Peso cliente" />
          <input v-model="form.observaciones" placeholder="Observaciones" class="full" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeModal">
            Cancelar
          </button>
          <button type="submit" class="btn-primary">
            Guardar
          </button>
        </div>

      </form>
    </div>

  </section>
</template>

<script>
export default {
  name: 'ConformidadCisternaPage',

  data() {
    return {
      search: '',
      isModalOpen: false,
      isPreviewOpen: false,

      editingId: null,
      previewItem: null,

      form: {
        codigo: '',
        proveedor: '',
        placa: '',
        fecha: '',
        hora: '',
        pesoCliente: 0,
        observaciones: ''
      },

      items: [
        { id: 1, codigo: 'CIS-001', proveedor: 'Proveedor A', placa: 'ABC-123', fecha: '2024-06-01', hora: '10:00', pesoCliente: 1500, observaciones: 'OK' },
        { id: 2, codigo: 'CIS-002', proveedor: 'Proveedor B', placa: 'DEF-456', fecha: '2024-06-02', hora: '11:30', pesoCliente: 2000, observaciones: 'OK' },
        { id: 3, codigo: 'CIS-003', proveedor: 'Proveedor C', placa: 'GHI-789', fecha: '2024-06-03', hora: '09:15', pesoCliente: 1800, observaciones: 'OK' }
      ]
    }
  },

  computed: {
    filteredItems() {
      const t = this.search.toLowerCase()
      if (!t) return this.items

      return this.items.filter(i =>
        (i.placa || '').toLowerCase().includes(t) ||
        (i.proveedor || '').toLowerCase().includes(t) ||
        (i.codigo || '').toLowerCase().includes(t)
      )
    }
  },

  methods: {

    openCreateModal() {
      this.editingId = null
      this.form = {
        codigo: `CIS-${Date.now()}`,
        proveedor: '',
        placa: '',
        fecha: new Date().toISOString().substr(0, 10),
        hora: '',
        pesoCliente: 0,
        observaciones: ''
      }
      this.isModalOpen = true
    },

    openEdit(item) {
      this.editingId = item.id
      this.form = { ...item }
      this.isModalOpen = true
    },

    closeModal() {
      this.isModalOpen = false
    },

    save() {
      if (this.editingId) {
        this.items = this.items.map(i =>
          i.id === this.editingId ? { ...this.form, id: this.editingId } : i
        )
      } else {
        this.items.unshift({
          ...this.form,
          id: Date.now()
        })
      }

      this.closeModal()
    },
    openEditModal(item) {
      alert(`Editar carta con ID: ${item.id}`)
    },
    anularCarta(id) {
      alert(`Anular carta con ID: ${id}`)
    },

    printItem(item) {
      // 1. Creamos un iframe oculto en el documento
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;

      // 2. Inyectamos el HTML directamente
      doc.open();
      doc.write(this.buildPrintBody(item));
      doc.close();

      // 3. El evento 'onload' asegura que la imagen ya se cargó en memoria antes de disparar el print
      iframe.contentWindow.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        // Eliminamos el iframe del DOM después de imprimir para no dejar basura
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
    },

    buildPrintBody(item) {
      const ingreso = `${item.fecha} ${item.hora || ''}`

      return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Conformidad de Servicio de Agua</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm;
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
      font-size: 10pt;
      color: var(--text-dark);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page {
      width: 100%;
    }

    .content {
      padding-bottom: 45mm;
    }

    .main-title {
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 15px;
    }

    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    /* CONTENEDOR DEL LOGO LIMPIO (SIN COLOR ROJO) */
    .logo-container {
      width: 180px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: start;
    }

    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      display: block;
      object-fit: contain;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .panel-header {
      background: var(--primary-blue) !important;
      padding: 7px 10px;
      font-size: 9.5pt;
      font-weight: bold;
      color: #fff !important;
      text-align: center;
      text-transform: uppercase;
    }

    .panel-body {
      padding: 8px 10px;
    }

    .field-label {
      font-size: 9pt;
      color: var(--text-muted);
    }

    .field-value {
      font-size: 10.5pt;
      font-weight: 500;
    }

    .field-value.highlight {
      font-size: 12pt;
      font-weight: bold;
      color: var(--primary-blue-dark);
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      margin-bottom: 15px;
    }

    .items-table th {
      background: var(--primary-blue) !important;
      color: #fff !important;
      padding: 6px 8px;
      font-size: 9.5pt;
      border: 1px solid var(--primary-blue);
    }

    .items-table td {
      padding: 8px;
      border: 1px solid var(--border);
      vertical-align: top;
      font-size: 9.5pt;
    }

    .text-center {
      text-align: center;
    }

    .desc-title {
      font-weight: bold;
      color: var(--primary-blue-dark);
      margin-bottom: 6px;
    }

    .desc-box {
      border-top: 1px dashed var(--border);
      padding-top: 6px;
    }

    .desc-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.7pt;
      margin-bottom: 2px;
      color: var(--text-muted);
    }

    .desc-total {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid var(--border);
      font-weight: bold;
    }

    .footer {
      position: absolute;
      bottom: 15mm;
      left: 12mm;
      right: 12mm;
    }

    .signatures-table {
      width: 100%;
      border-collapse: collapse;
    }

    .sig-cell {
      width: 50%;
      text-align: center;
      padding: 0 30px;
    }

    .sig-line {
      border-top: 1px solid var(--text-muted);
      margin-bottom: 6px;
    }

    .sig-title {
      font-weight: bold;
      text-transform: uppercase;
    }

    .sig-subtitle {
      font-size: 8.5pt;
      color: var(--text-muted);
    }
  </style>
</head>
<body>

  <div class="page">
    <div class="content">

      <div class="main-title">
        Recibo de Conformidad
      </div>

      <div class="header-container">
        <div class="logo-container">
          <img style="max-height: 90px; width: 180px;" src="/images.png" alt="Kanay Logo">
        </div>
        <div class="panel" style="width: 260px; margin-bottom: 0;">
          <div class="panel-header">Detalles de la Transacción</div>
          <div class="panel-body">
            <div class="field-label">N° de Ingreso - Lab:</div>
            <div class="field-value highlight">${item.correlativo || 'Provisional'}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header" style="text-align:left;">Descripción del Servicio / Datos</div>
        <div class="panel-body">
          <table style="width:100%;">
            <tr>
              <td>
                <div class="field-label">Ingreso</div>
                <div class="field-value">${ingreso}</div>
              </td>
              <td>
                <div class="field-label">Salida</div>
                <div class="field-value">${item.fechaSalida || item.fecha} - ${item.horaSalida || ''}</div>
              </td>
              <td>
                <div class="field-label">Transportista</div>
                <div class="field-value">${item.transportista || ''}</div>
              </td>
              <td>
                <div class="field-label">Placa</div>
                <div class="field-value">${item.placa || ''}</div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div style="font-size:11pt; font-weight:bold; margin:10px 0; color:#2f4f66;">
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
            <td style="text-align:center; font-weight:bold;">${item.guia || ''}</td>
            <td>
              <div class="desc-title">${item.descripcion || ''}</div>
              <div class="desc-box">
                <div class="desc-row">
                  <span>Peso Ingreso:</span>
                  <span>${item.pesoIngreso || '0'} KG</span>
                </div>
                <div class="desc-row">
                  <span>Peso Salida:</span>
                  <span>${item.pesoSalida || '0'} KG</span>
                </div>
                <div class="desc-total">
                  <span>Peso Neto:</span>
                  <span style="color: var(--primary-blue-dark);">${item.pesoNeto || '0'} KG</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>

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

</body>
</html>
  `
    },

    formatWeight(v) {
      return Number(v || 0).toFixed(2)
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

.page {
  width: min(1200px, 95%);
  margin: auto;
  padding: 30px 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.eyebrow {
  color: #0f766e;
  font-weight: 700;
  font-size: 12px;
}

.btn-primary {
  background: #0f766e;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-secondary {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.actions-header {
  display: flex;
  gap: 10px;
  align-items: center;
}

.actions-header input {
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
  padding: 12px;
}

td {
  padding: 14px 12px;
  border-bottom: 1px solid #f1f5f9;
}

tr:hover {
  background: #f8fafc;
}

.badge {
  background: #ecfeff;
  color: #0f766e;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.actions button {
  border: none;
  background: #f1f5f9;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 6px;
}

.actions .danger {
  background: #fee2e2;
}

.empty {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fff;
  width: 700px;
  border-radius: 12px;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.grid input {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.grid .full {
  grid-column: span 2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}
</style>