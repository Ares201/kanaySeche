import { isPublicRoute } from '~/utils/access-control'

export default function ({ route, redirect, $auth }) {
  if (isPublicRoute(route.path)) return
  // En una carga directa el servidor no puede leer sessionStorage: evita renderizar
  // contenido protegido y deja que el cliente restaure la sesión desde /login.
  if (process.server) return redirect('/login')
  if (!$auth?.isAuthenticated) return redirect('/login')
  if (!$auth.can(route.path)) return redirect('/acceso-denegado')
}
