<template>
  <section class="agendamientos-page">

    <div class="page-header">

      <div>
        <p class="eyebrow">Planificación</p>
        <h1>Agendamientos</h1>
      </div>

      <div class="header-actions">

        <v-select
          v-model="clienteSeleccionado"
          :items="clientes"
          item-text="nombre"
          item-value="id"
          outlined
          dense
          hide-details
          label="Cliente"
          style="width:300px"
        />

      </div>

    </div>

    <div class="calendar-layout">

      <!-- PANEL IZQUIERDO -->
      <div class="left-panel">

        <v-date-picker
          v-model="fechaSeleccionada"
          full-width
        />

        <v-card class="mt-4 pa-4">

          <h3>Resumen del día</h3>

          <div class="mt-3">
            Servicios: 0
          </div>

          <div>
            Pendientes: 0
          </div>

          <div>
            Confirmados: 0
          </div>

          <div>
            Finalizados: 0
          </div>

        </v-card>

      </div>

      <!-- PANEL DERECHO -->
      <div class="calendar-panel">

        <div class="calendar-placeholder">

          <v-icon size="60" color="grey">
            mdi-calendar-month
          </v-icon>

          <h2>Calendario semanal</h2>

          <p>
            Aquí se mostrará el calendario donde podrás hacer clic
            sobre una hora para crear un agendamiento.
          </p>

        </div>

      </div>

    </div>

  </section>
</template>

<script>
export default {

  name: 'AgendamientosPage',

  data() {
    return {

      clienteSeleccionado: null,

      fechaSeleccionada: new Date().toISOString().substr(0, 10),

      clientes: [
        {
          id: 1,
          nombre: 'Volcan'
        },
        {
          id: 2,
          nombre: 'Southern'
        },
        {
          id: 3,
          nombre: 'Las Bambas'
        }
      ]

    }
  }

}
</script>

<style scoped>

.agendamientos-page{
  width:calc(100% - 30px);
  margin:auto;
  padding:20px;
}

.page-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
}

.eyebrow{
  margin:0;
  color:#0f766e;
  font-weight:bold;
}

.header-actions{
  display:flex;
  gap:15px;
}

.calendar-layout{
  display:grid;
  grid-template-columns:320px 1fr;
  gap:20px;
}

.left-panel{
  display:flex;
  flex-direction:column;
}

.calendar-panel{
  background:white;
  border:1px solid #ddd;
  border-radius:10px;
  min-height:760px;
  display:flex;
  justify-content:center;
  align-items:center;
}

.calendar-placeholder{
  text-align:center;
  color:#777;
}

.calendar-placeholder h2{
  margin-top:15px;
}

.calendar-placeholder p{
  max-width:400px;
  margin:auto;
}

</style>