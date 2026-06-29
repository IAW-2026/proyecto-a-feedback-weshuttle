import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define which routes are public from Clerk's perspective.
// External endpoints like /api/ratings and /api/reviews/precreate are set as public
// under Clerk so they don't require user login cookie sessions, but we will protect them
// with API Keys in the custom middleware logic below.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/ratings(.*)',
  '/api/reviews/precreate(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  // 1. API key validation for all /api/* routes
  if (pathname.startsWith('/api/')) {
    // Skip verification for mocks if any to facilitate offline testing
    if (pathname.startsWith('/api/mocks/')) {
      return NextResponse.next()
    }

    const internalKey = process.env.WESHUTTLE_INTERNAL_KEY
    const analyticsKey = process.env.ANALYTICS_API_KEY

    // If API keys are not defined in the local environment, bypass protection to allow offline testing
    if (!internalKey && !analyticsKey) {
      return NextResponse.next()
    }

    // Extract Bearer token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (token) {
      const isGet = req.method === 'GET'
      if (isGet) {
        // GET requests allow either internal key or analytics key
        const isValid = 
          (internalKey && token === internalKey) || 
          (analyticsKey && token === analyticsKey)
        if (!isValid) {
          return NextResponse.json(
            { error: 'FORBIDDEN', message: 'Invalid API Key' },
            { status: 403 }
          )
        }
      } else {
        // Write requests (POST, PUT, PATCH, DELETE) only allow the internal core key
        const isValid = internalKey && token === internalKey
        if (!isValid) {
          return NextResponse.json(
            { error: 'FORBIDDEN', message: 'Invalid API Key for write operations' },
            { status: 403 }
          )
        }
      }
      return NextResponse.next()
    }

    // If there is no Authorization header, check if the request is authenticated via a Clerk session (for frontend browser calls)
    const session = await auth()
    if (session && session.userId) {
      return NextResponse.next()
    }

    // Mismatch or absence of credentials: block access
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401 }
    )
  }

  // 2. Standard Clerk route protection for user-facing pages
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
