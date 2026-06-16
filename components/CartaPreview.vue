<template>
  <article class="carta-preview">
    <p class="letter-date">
      {{ safeCarta.lugar }}, {{ formattedFecha }}
    </p>

    <p class="correlativo">
      {{ safeCarta.correlativo }}
    </p>

    <p class="recipient">
      <strong>Señores:</strong><br>
      <strong>{{ safeCliente.nombre }}</strong><br>
      <span>{{ safeCliente.direccion }}</span>
    </p>

    <p class="attention">
      <strong>Atención:</strong><br>
      <strong>{{ safeCliente.contactoNombre }}</strong><br>
      <span>Contacto: {{ safeCliente.contactoTelefono }}</span>
    </p>

    <p class="asunto">
      <strong>ASUNTO:</strong> {{ safeCarta.asunto }}
    </p>

    <p class="paragraph">
      {{ safeCarta.contexto }}
    </p>

    <ul v-if="safeDetalles.length" class="detalles">
      <li v-for="(detalle, index) in safeDetalles" :key="index">
        {{ detalle.descripcion }}
      </li>
    </ul>

    <p class="paragraph">
      {{ safeCarta.despedida }}
    </p>

    <p>
      Atentamente,
    </p>
  </article>
</template>

<script>
export default {
  name: 'CartaPreview',
  props: {
    carta: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    safeCarta() {
      return {
        lugar: '',
        fecha: null,
        correlativo: '',
        asunto: '',
        descripcion: '',
        contexto: '',
        despedida: '',
        detalles: [],
        cliente: {},
        ...this.carta
      }
    },
    safeCliente() {
      return {
        nombre: '',
        direccion: '',
        contactoNombre: '',
        contactoTelefono: '',
        ...(this.safeCarta.cliente || {})
      }
    },
    safeDetalles() {
      return Array.isArray(this.safeCarta.detalles)
        ? this.safeCarta.detalles.filter(detalle => detalle && detalle.descripcion)
        : []
    },
    formattedFecha() {
      return this.formatPeruDate(this.safeCarta.fecha)
    }
  },
  methods: {
    formatPeruDate(date) {
      if (!date) return ''

      const parsedDate = this.parseLocalDate(date)
      if (Number.isNaN(parsedDate.getTime())) return ''

      const formatted = new Intl.DateTimeFormat('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(parsedDate)

      return formatted.replace(/ de (\d{4})$/, ' del $1')
    },
    parseLocalDate(value) {
      if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

        if (match) {
          const [, year, month, day] = match
          return new Date(Number(year), Number(month) - 1, Number(day))
        }
      }

      return new Date(value)
    }
  }
}
</script>

<style scoped>
.carta-preview {
  width: 210mm;
  height: 297mm;
  margin: 0 auto;
  box-sizing: border-box;
  overflow: hidden;
  padding: 86px 68px 20px;
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 1.35;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
}

.letter-date {
  margin-bottom: 34px;
  font-style: italic;
  font-weight: 700;
  text-align: right;
}

.correlativo {
  display: inline-block;
  margin-bottom: 18px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.recipient,
.attention {
  margin-bottom: 18px;
}

.asunto {
  margin-bottom: 10px;
  padding-bottom: 2px;
  border-bottom: 1px solid #111827;
}

.paragraph {
  white-space: pre-line;
}

.detalles {
  margin: 16px 0 28px;
  padding-left: 34px;
  list-style: none;
}

.detalles li {
  margin-bottom: 3px;
}

.detalles li::before {
  content: "→ ";
}

p {
  margin: 0 0 12px;
}

@media (max-width: 900px) {
  .carta-preview {
    width: 100%;
    height: auto;
    min-height: 100vh;
    padding: 72px 36px 24px;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  .carta-preview {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 86px 68px 20px;
    overflow: hidden;
    font-size: 10px;
    line-height: 1.3;
    box-shadow: none;
    page-break-after: avoid;
    page-break-before: avoid;
    page-break-inside: avoid;
  }

  .letter-date {
    margin-bottom: 30px;
  }

  .correlativo {
    margin-bottom: 14px;
  }

  .recipient,
  .attention {
    margin-bottom: 14px;
  }

  .asunto {
    margin-bottom: 8px;
    padding-bottom: 2px;
  }

  .detalles {
    margin: 14px 0 24px;
    padding-left: 30px;
  }

  .detalles li {
    margin-bottom: 2px;
  }

  p {
    margin-bottom: 9px;
  }
}
</style>
