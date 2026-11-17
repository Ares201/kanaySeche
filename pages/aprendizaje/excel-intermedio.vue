<template>
  <section class="learning-page">
    <header class="course-header">
      <div>
        <p class="eyebrow">Aprendizaje · Curso</p>
        <h1>Excel intermedio</h1>
        <p>Aprende a resolver tareas cotidianas con fórmulas y ejemplos prácticos.</p>
      </div>
      <v-chip outlined color="success"><v-icon left small>mdi-microsoft-excel</v-icon>1 tema disponible</v-chip>
    </header>

    <div class="course-layout">
      <aside aria-label="Contenido del curso">
        <v-card outlined>
          <v-card-title>Contenido del curso</v-card-title>
          <v-list nav>
            <v-list-item href="#funcion-si" active-class="primary--text" :input-value="true">
              <v-list-item-icon><v-icon>mdi-function-variant</v-icon></v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Tema 1 · Función SI</v-list-item-title>
                <v-list-item-subtitle>Condiciones y resultados</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </aside>

      <article id="funcion-si" class="lesson">
        <v-card outlined>
          <v-card-text class="lesson-body">
            <p class="eyebrow">Tema 1</p>
            <h2>Función SI</h2>
            <v-btn color="success" class="mb-4" :loading="descargando" @click="descargarPractica">
              <v-icon left>mdi-file-excel</v-icon>Descargar Excel de práctica
            </v-btn>
            <v-alert v-if="errorDescarga" type="error" outlined role="alert">{{ errorDescarga }}</v-alert>
            <p>La función SI evalúa una condición y devuelve un resultado cuando se cumple y otro cuando no se cumple.</p>
            <h3>¿Cómo se escribe?</h3>
            <pre><code>=SI(prueba_lógica; valor_si_verdadero; valor_si_falso)</code></pre>
            <ul>
              <li><strong>Prueba lógica:</strong> la condición que deseas comprobar, por ejemplo, A2&gt;=11.</li>
              <li><strong>Valor si verdadero:</strong> el resultado cuando la condición se cumple.</li>
              <li><strong>Valor si falso:</strong> el resultado cuando la condición no se cumple.</li>
            </ul>
            <h3>Ejemplo: aprobado o desaprobado</h3>
            <p>Si la nota en A2 es mayor o igual a 11, mostramos “Aprobado”. En caso contrario, mostramos “Desaprobado”.</p>
            <pre><code>=SI(A2&gt;=11; "Aprobado"; "Desaprobado")</code></pre>
            <v-simple-table>
              <thead><tr><th scope="col">Nota (A2)</th><th scope="col">Resultado de la fórmula</th></tr></thead>
              <tbody><tr><td>15</td><td>Aprobado</td></tr><tr><td>11</td><td>Aprobado</td></tr><tr><td>8</td><td>Desaprobado</td></tr></tbody>
            </v-simple-table>
            <!-- <h3>Prueba la condición</h3> -->
            <!-- <p>Cambia la nota para ver cómo se comporta la misma fórmula.</p> -->
            <!-- <v-text-field v-model="nota" label="Nota en A2 (de 0 a 20)" type="number" min="0" max="20" step="0.1" -->
              <!-- outlined :error-messages="notaValida ? [] : ['Introduce una nota entre 0 y 20.']" /> -->
            <!-- <v-alert outlined :type="notaValida ? (Number(nota) >= 11 ? 'success' : 'info') : 'warning'" aria-live="polite">
              {{ notaValida ? `Resultado: ${Number(nota) >= 11 ? 'Aprobado' : 'Desaprobado'}` : 'Completa una nota válida para ver el resultado.' }}
            </v-alert> -->
            <h3>Para recordar</h3>
            <p>Escribe el texto entre comillas. Puedes comparar valores con =, &gt;, &lt;, &gt;=, &lt;= y &lt;&gt; (distinto de).</p>
            <p>Los ejemplos usan punto y coma para separar los argumentos. Según la configuración regional de Excel, puedes necesitar comas.</p>
          </v-card-text>
        </v-card>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ExcelIntermedioPage',
  head: () => ({ title: 'Excel intermedio · Aprendizaje' }),
  data: () => ({ nota: '15', descargando: false, errorDescarga: '' }),
  methods: {
    async descargarPractica() {
      if (this.descargando) return
      this.descargando = true
      this.errorDescarga = ''
      try {
        const { descargarPracticaSi } = await import('~/utils/excelPracticaSi')
        await descargarPracticaSi()
      } catch (error) {
        this.errorDescarga = 'No se pudo descargar el archivo. Inténtalo nuevamente.'
      } finally {
        this.descargando = false
      }
    }
  },
  computed: {
    notaValida() {
      return String(this.nota).trim() !== '' && Number.isFinite(Number(this.nota)) && Number(this.nota) >= 0 && Number(this.nota) <= 20
    }
  }
}
</script>

<style scoped>
.learning-page { max-width: 1400px; margin: auto; padding: 28px; }
.course-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.course-header h1 { margin-bottom: 10px; }
.eyebrow { color: var(--text-secondary, #64748b); font-size: 13px; letter-spacing: .06em; }
.course-layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 24px; align-items: start; }
.lesson { min-width: 0; scroll-margin-top: 90px; }
.lesson-body { padding: 28px; color: inherit; font-size: 16px; line-height: 1.7; }
.lesson-body h2 { font-size: 28px; margin-bottom: 20px; }
.lesson-body h3 { margin: 28px 0 12px; }
.lesson-body ul { margin-bottom: 24px; }
pre { overflow-x: auto; padding: 18px; margin: 16px 0; border: 1px solid rgba(128, 128, 128, .3); border-radius: 8px; }
pre code { background: transparent !important; color: inherit !important; padding: 0 !important; }
@media (max-width: 850px) { .course-layout { grid-template-columns: 1fr; } .course-header { flex-direction: column; align-items: flex-start; } }
@media (max-width: 600px) { .learning-page { padding: 16px; } .lesson-body { padding: 20px; } }
</style>
