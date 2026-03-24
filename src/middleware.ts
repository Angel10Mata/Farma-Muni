import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/proxy'

export async function middleware(request: NextRequest) {
  // Create a Supabase client that can handle cookies in Next.js Middleware
  const { supabase, response } = createClient(request)

  // This will refresh the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect internal routes: if the user tries to access /kore and doesn't have a session, redirect to /login
  if (request.nextUrl.pathname.startsWith('/kore') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If the user is logged in but tries to access /login, redirect them to the dashboard
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/kore'
    return NextResponse.redirect(url)
  }

  // Si todo esta correcto, devolvemos la respuesta normal pero con cookies actualizadas por supabase
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
