import { createClient } from '@/lib/server'
import { createAdminClient } from '@/lib/server-admin'
import { applyPendingInvitationStudyAssignment } from '@/lib/auth/study-assignment-on-signup'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      if (type === 'invite') {
        if (data?.user?.email) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, company_id')
              .eq('user_id', data.user.id)
              .single()
            if (profile?.company_id && profile.id) {
              const admin = createAdminClient()
              const result = await applyPendingInvitationStudyAssignment(admin, {
                profileId: profile.id,
                companyId: profile.company_id,
                email: data.user.email,
              })
              if (!result.ok) {
                console.error('Invitation study assignment failed:', result.error)
              }
            }
          } catch (err) {
            console.error('Failed to complete invitation:', err)
          }
        }
        redirect('/auth/update-password')
      }
      redirect('/protected')
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
    }
  }

  redirect(`/auth/error?error=${encodeURIComponent('No token hash or type')}`)
}
