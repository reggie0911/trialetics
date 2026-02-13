import { createClient } from '@/lib/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth callback route - handles OAuth, email confirmation, and invite redirects.
 * Supabase redirects here with ?code=xxx after OAuth or invite acceptance.
 * We exchange the code for a session and redirect to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/protected'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError)
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(exchangeError.message)}`,
          request.url
        )
      )
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
