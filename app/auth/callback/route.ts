import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/server-admin'
import {
  applyJoinLinkStudyAssignmentFromUserMetadata,
  applyPendingInvitationStudyAssignment,
} from '@/lib/auth/study-assignment-on-signup'
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
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError)
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(exchangeError.message)}`,
          request.url
        )
      )
    }

    if (data?.user) {
      const userEmail = data.user.email?.toLowerCase()

      // Mark pending invitation as accepted when an invited user confirms
      if (userEmail) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, company_id, is_active')
            .eq('user_id', data.user.id)
            .single()

          if (profile?.company_id && profile.id) {
            const admin = createAdminClient()
            const invResult = await applyPendingInvitationStudyAssignment(admin, {
              profileId: profile.id,
              companyId: profile.company_id,
              email: userEmail,
            })
            if (!invResult.ok) {
              console.error('Invitation study assignment failed:', invResult.error)
            }

            const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
            const joinResult = await applyJoinLinkStudyAssignmentFromUserMetadata(admin, {
              profileId: profile.id,
              companyId: profile.company_id,
              userMetadata: meta,
            })
            if (!joinResult.ok) {
              console.error('Join link study assignment failed:', joinResult.error)
            }
          }

          if (profile?.is_active === false && next.startsWith('/protected')) {
            return NextResponse.redirect(new URL('/auth/deactivated', request.url))
          }
        } catch (err) {
          console.error('Post-sign-in profile / assignment flow failed:', err)
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
