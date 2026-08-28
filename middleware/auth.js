import { isPublicRoute } from '~/utils/access-control'

export default function ({ route, redirect, $auth }) {
  if (process.server) return
  if (isPublicRoute(route.path)) return
  if (!$auth?.isAuthenticated) return redirect(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
  if (!$auth.can(route.path)) return redirect('/acceso-denegado')
}
