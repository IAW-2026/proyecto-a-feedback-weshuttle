import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// La constante isPublicRoute es una funcion que recibe una ruta 
// y devuelve true si la ruta es publica, es decir, si no requiere autenticacion
// Define que rutas no necesitan contraseña
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/ratings(.*)',
  '/api/reviews/precreate(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}

