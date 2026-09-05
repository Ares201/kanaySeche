export const ADMIN_ROLE = 'Administrador'

export const SYSTEM_PAGES = [
  { nombre: 'Inicio', ruta: '/', modulo: 'General', descripcion: 'Página de inicio' },
  { nombre: 'Agendamientos', ruta: '/planificacion/agendamientos', modulo: 'Planificación' },
  { nombre: 'Gráficos de operaciones', ruta: '/operaciones/graficos', modulo: 'Operaciones' },
  { nombre: 'Pedidos de venta', ruta: '/operaciones/pedidos-venta', modulo: 'Operaciones' },
  { nombre: 'Recepción de cisternas', ruta: '/operaciones/recepcion-cisterna', modulo: 'Operaciones' },
  { nombre: 'Gráficos documentarios', ruta: '/documentos/graficos', modulo: 'Documentos' },
  { nombre: 'Graficos de control y aceptacion', ruta: '/control-aceptacion/graficos', modulo: 'Control y Aceptacion' },
  { nombre: 'Ingresos Cisterna', ruta: '/control-aceptacion/ingresos-cisterna', modulo: 'Control y Aceptacion' },
  { nombre: 'Control de Ingresos', ruta: '/documentos/controlDeIngresos', modulo: 'Documentos' },
  { nombre: 'Expedientes', ruta: '/documentos/expedientes', modulo: 'Documentos' },
  { nombre: 'Cartas', ruta: '/documentos/cartas', modulo: 'Documentos' },
  { nombre: 'Firmar PDF', ruta: '/documentos/firmar-pdf', modulo: 'Documentos' },
  { nombre: 'Boletas', ruta: '/documentos/boletas', modulo: 'Documentos' },
  { nombre: 'Validaciones', ruta: '/documentos/validaciones', modulo: 'Documentos' },
  { nombre: 'Envases', ruta: '/configuracion/envases', modulo: 'Configuración' },
  { nombre: 'Residuos', ruta: '/configuracion/residuos', modulo: 'Configuración' },
  { nombre: 'Clientes', ruta: '/configuracion/clientes', modulo: 'Configuración' },
  { nombre: 'Personal', ruta: '/configuracion/personal', modulo: 'Administración', soloAdministrador: true },
  { nombre: 'Roles y permisos', ruta: '/configuracion/roles', modulo: 'Administración', soloAdministrador: true },
  { nombre: 'Vehículos', ruta: '/configuracion/vehiculos', modulo: 'Configuración' },
  { nombre: 'Productos', ruta: '/configuracion/productos', modulo: 'Configuración' },
  { nombre: 'Generadores', ruta: '/configuracion/generador', modulo: 'Configuración' }
]

export const PUBLIC_ROUTES = ['/login', '/confirmacion']

export function isPublicRoute(route) {
  return PUBLIC_ROUTES.some(publicRoute => route === publicRoute || route.startsWith(`${publicRoute}/`))
}

export function canAccessRoute(session, route) {
  if (!session) return false
  if (route === '/acceso-denegado') return true
  if (session.rolNombre === ADMIN_ROLE) return true
  const registeredPage = SYSTEM_PAGES.find(page => page.ruta === route)
  if (registeredPage?.soloAdministrador) return false
  if (route === '/') return true
  return (session.rutasPermitidas || []).some(allowed => route === allowed || route.startsWith(`${allowed}/`))
}
