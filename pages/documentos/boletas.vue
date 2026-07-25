<template>
  <v-container fluid>
    <v-card class="no-print mb-5" elevation="2">
      <v-toolbar flat color="primary" dark>
        <v-toolbar-title>
          Generador de Boletas
        </v-toolbar-title>
      </v-toolbar>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-menu v-model="menuInicio" :close-on-content-click="false" transition="scale-transition" offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-text-field v-model="fechaInicioFormateada" label="Fecha Inicio" prepend-icon="mdi-calendar" readonly
                  outlined dense v-bind="attrs" v-on="on" />
              </template>
              <v-date-picker v-model="fechaInicio" locale="es" @input="menuInicio = false" />
            </v-menu>

          </v-col>
          <v-col cols="12" md="4">
            <v-menu v-model="menuFin" :close-on-content-click="false" transition="scale-transition" offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-text-field v-model="fechaFinFormateada" label="Fecha Final" prepend-icon="mdi-calendar" readonly
                  outlined dense v-bind="attrs" v-on="on" />
              </template>
              <v-date-picker v-model="fechaFin" locale="es" @input="menuFin = false" />
            </v-menu>
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn color="primary" class="mr-2" large @click="generarBoletas">
              <v-icon left>
                mdi-eye
              </v-icon>
              Vista previa
            </v-btn>
            <v-btn color="success" large :disabled="boletas.length === 0" @click="imprimir">
              <v-icon left>
                mdi-printer
              </v-icon>
              Imprimir
            </v-btn>
          </v-col>
        </v-row>
        <v-alert class="mt-4" type="info" dense outlined>
          Se imprimirán
          <strong>{{ boletas.length }}</strong>
          boletas.
        </v-alert>
      </v-card-text>
    </v-card>
    <div v-for="(boleta, index) in boletas" :key="index" class="print-page">
      <div class="boleta">
        <div class="titulo">
          INSTITUTO NACIONAL DE SALUD DEL NIÑO
        </div>
        <div class="items">
          <div class="item">
            <span class="label">
              Bolsa Rojas
            </span>
          </div>
          <div class="item">
            <span class="label">
              Cajas con Agujas
            </span>
          </div>
          <div class="item">
            <span class="label">
              Nutrición
            </span>
          </div>
          <div class="item">
            <span class="label">
              Bolsa Amarillas
            </span>
          </div>
          <div class="item">
            <span class="label">
              Líquido Laboratorio
            </span>
          </div>
        </div>
        <div class="fecha">
          {{ boleta.fecha }}
        </div>
      </div>
    </div>
  </v-container>
</template>
<script>
import {
  formatDateOnly,
  getTodayDateInput,
  parseDate
} from '~/utils/formatters'

export default {
  name: 'Boletas',

  data() {
    return {
      menuInicio: false,
      menuFin: false,

      fechaInicio: getTodayDateInput(),
      fechaFin: getTodayDateInput(),

      boletas: []
    }
  },

  computed: {

    fechaInicioFormateada() {
      return formatDateOnly(this.fechaInicio)
    },

    fechaFinFormateada() {
      return formatDateOnly(this.fechaFin)
    }

  },

  mounted() {
    this.generarBoletas()
  },

  methods: {

    generarBoletas() {

      this.boletas = []

      const inicio = parseDate(this.fechaInicio)
      const fin = parseDate(this.fechaFin)

      if (!inicio || !fin) return

      if (inicio > fin) {
        this.$swal({
          icon: 'warning',
          title: 'Fechas inválidas',
          text: 'La fecha inicial no puede ser mayor a la fecha final.'
        })
        return
      }

      const actual = new Date(inicio)

      while (actual <= fin) {

        this.boletas.push({

          fecha: formatDateOnly(actual)

        })

        actual.setDate(actual.getDate() + 1)

      }

    },

    imprimir() {

      if (!this.boletas.length) {

        this.$swal({
          icon: 'warning',
          title: 'No existen boletas para imprimir.'
        })

        return

      }

      window.print()

    }

  }

}
</script>
<style scoped>
.print-page {

  display: flex;
  justify-content: center;
  align-items: center;

  margin-bottom: 25px;

}

.boleta {

  position: relative;

  width: 297mm;
  height: 210mm;

  background: #fff;

  overflow: hidden;

}


/***************
 TITULO
****************/

.titulo {

  position: absolute;

  top: 84mm;
  left: 78mm;

  font-size: 18px;

  font-family: Arial;

  font-weight: bold;

}


/***************
 FECHA
****************/

.fecha {

  position: absolute;

  top: 91mm;
  right: 30mm;

  font-size: 18px;

  font-weight: bold;


}


/***************
 ITEMS
****************/

.items {

  position: absolute;

  left: 70mm;

  top: 116mm;

}

.item {

  font-size: 15px;

  font-family: Arial;

  font-weight: bold;

  margin-bottom: 10px;

}

.label {

  display: inline-block;

}


/********************
 IMPRESIÓN
********************/

@page {

  size: A4 landscape;

  margin: 0;

}

@media print {

  html,
  body {

    margin: 0;
    padding: 0;

    width: 297mm;
    height: 210mm;

    background: white;

  }

  .no-print {

    display: none !important;

  }

  .v-toolbar,
  .v-card,
  .v-alert {

    display: none !important;

  }

  .print-page {

    width: 297mm;
    height: 210mm;

    margin: 0;

    page-break-after: always;

    page-break-inside: avoid;

  }

  .print-page:last-child {

    page-break-after: auto;

  }

  .boleta {

    width: 297mm;
    height: 210mm;

    margin: 0;

  }

}
</style>