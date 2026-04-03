import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Calling getUser() refreshes expired JWTs and writes
  // the new tokens back to request.cookies + supabaseResponse.cookies
  // via setAll(). This ensures downstream Server Components receive
  // valid, non-expired auth cookies for PostgREST (RLS) queries.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoutes = [
    '/',
    '/auth',
    '/login',
    '/about',
    '/pricing',
    '/blog',
    '/faq',
    '/join',
    '/terms-and-conditions',
    '/privacy-policy',
  ]
  const isPublicRoute = publicRoutes.some(
    route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/')
  )

  if (!user && !isPublicRoute) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const isProtectedRoute = request.nextUrl.pathname === '/protected' || request.nextUrl.pathname.startsWith('/protected/')
  const isDeactivatedPage = request.nextUrl.pathname === '/auth/deactivated'

  if (user && isProtectedRoute && !isDeactivatedPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('user_id', user.id)
      .single()

    if (profile && profile.is_active === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/deactivated'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
