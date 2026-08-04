export function create() {
  return {
    contador: 0,
    fecha: '',
  }
}

export function get(data) {
  return {
    id: data.id,
    contador: data.contador || 0,
    fecha: data.fecha || '',
  }
}