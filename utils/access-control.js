export const ADMIN_ROLE = 'Administrador'

export const SYSTEM_PAGES = [
  { nombre: 'Historial', ruta: '/configuracion/historial', modulo: 'Configuración', soloAdministrador: true },
  { nombre: 'Inicio', ruta: '/', modulo: 'General', descripcion: 'Página de inicio' },
  { nombre: 'Tareas', ruta: '/inicio/tareas', modulo: 'Inicio', descripcion: 'Tareas personales y compartidas' },
  { nombre: 'Mis gráficos', ruta: '/inicio/graficos', modulo: 'Inicio', descripcion: 'Resumen de tareas del usuario' },
  { nombre: 'Gráficos de operaciones', ruta: '/operaciones/graficos', modulo: 'Operaciones' },
  { nombre: 'Pedidos de venta', ruta: '/operaciones/pedidos-venta', modulo: 'Operaciones' },
  { nombre: 'Recepción de cisternas', ruta: '/operaciones/recepcion-cisterna', modulo: 'Operaciones' },
  { nombre: 'Gráficos documentarios', ruta: '/documentos/graficos', modulo: 'Documentos' },
  { nombre: 'Graficos de control y aceptacion', ruta: '/control-aceptacion/graficos', modulo: 'Control y Aceptacion' },
  { nombre: 'Control de Ingresos', ruta: '/documentos/controlDeIngresos', modulo: 'Documentos' },
  { nombre: 'Cartas', ruta: '/documentos/cartas', modulo: 'Documentos' },
  { nombre: 'Firmar PDF', ruta: '/documentos/firmar-pdf', modulo: 'Documentos' },
  { nombre: 'Boletas', ruta: '/documentos/boletas', modulo: 'Documentos' },
  { nombre: 'Residuos', ruta: '/configuracion/residuos', modulo: 'Configuración' },
  { nombre: 'Clientes', ruta: '/configuracion/clientes', modulo: 'Configuración' },
  { nombre: 'Personal', ruta: '/configuracion/personal', modulo: 'Configuración' },
  { nombre: 'Roles y permisos', ruta: '/configuracion/roles', modulo: 'Administración', soloAdministrador: true },
  { nombre: 'Vehículos', ruta: '/configuracion/vehiculos', modulo: 'Configuración' },
  { nombre: 'Almacén de útiles', ruta: '/inventario', modulo: 'Inventario' },
  { nombre: 'Requerimientos de útiles', ruta: '/inventario/requerimientos', modulo: 'Inventario' },
  { nombre: 'Productos de inventario', ruta: '/inventario/productos', modulo: 'Inventario' },
]

export const PUBLIC_ROUTES = ['/login', '/confirmacion']

export function isPublicRoute(route) {
  return PUBLIC_ROUTES.some(publicRoute => route === publicRoute || route.startsWith(`${publicRoute}/`))
}

export function canAccessRoute(session, route) {
  if (!session || isRetiredRoute(route)) return false
  if (route === '/acceso-denegado') return true
  if (session.rolNombre === ADMIN_ROLE) return true
  const registeredPage = SYSTEM_PAGES.find(page => page.ruta === route)
  if (registeredPage?.soloAdministrador) return false
  if (route === '/') return true
  return (session.rutasPermitidas || []).some(allowed => route === allowed || route.startsWith(`${allowed}/`))
}

// Compatibilidad con registros y sesiones anteriores al retiro del modulo.
export function isRetiredRoute(route = '') {
  return /^\/planificacion(?:\/|[?#]|$)/i.test(route)
    || /^\/configuracion\/(envases|productos|generador)(?:\/|[?#]|$)/i.test(route)
    || /^\/documentos\/(expedientes|certificados|validaciones)(?:\/|[?#]|$)/i.test(route)
    || /^\/control-aceptacion\/ingresos-cisterna(?:\/|[?#]|$)/i.test(route)
}
