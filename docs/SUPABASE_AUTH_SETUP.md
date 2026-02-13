# Supabase Auth Setup for Trialetics

This guide helps you configure Supabase Auth so sign-up, login, and email confirmation work correctly.

## Dashboard Configuration

### 1. URL Configuration

Go to **Authentication → URL Configuration** in your Supabase project:

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |
| **Redirect URLs** | Add these (one per line): |
| | `http://localhost:3000/**` |
| | `http://localhost:3000/auth/callback` |
| | `http://localhost:3000/auth/confirm` |
| | `http://localhost:3000/protected` |
| | For production: `https://yourdomain.com/**` |

### 2. Email Auth Settings

Go to **Authentication → Providers → Email**:

| Setting | Recommendation |
|---------|-----------------|
| **Enable Email provider** | On |
| **Confirm email** | **Off** for development (users can login immediately). **On** for production. |

When "Confirm email" is **On**:
- Users must click the confirmation link before they can log in
- Supabase sends a confirmation email
- If emails aren't arriving, see [Email delivery](#email-delivery) below

### 3. Email Templates (optional)

Go to **Authentication → Email Templates** → **Confirm signup**:

The default template uses `{{ .ConfirmationURL }}` or `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .TokenType }}`. Ensure your **Site URL** matches your app origin.

### 4. Email Delivery

If confirmation emails aren't arriving:

1. **Check spam/junk folder**
2. **Rate limits**: Supabase free tier has email limits. Wait a few minutes and try again.
3. **Custom SMTP**: For production, configure **Project Settings → Auth → SMTP** with your own SMTP provider (SendGrid, Resend, etc.) for reliable delivery.
4. **Supabase Inbucket**: For local dev with Supabase CLI, emails go to Inbucket at `http://localhost:54324`.

## Auth Flow Summary

| Flow | Route | Purpose |
|------|-------|---------|
| Sign up | `/auth/sign-up` | Creates account, sends confirmation email if enabled |
| Login | `/auth/login` | Email/password sign-in |
| Email confirm (token) | `/auth/confirm` | Handles `?token_hash=` and `?type=` from email link |
| Auth callback (code) | `/auth/callback` | Exchanges `?code=` for session (OAuth, invite) |
| Error | `/auth/error` | Displays auth errors |

## Environment Variables

Ensure `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_APP_URL` to your production URL.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid login credentials" | Wrong password or **email not confirmed** | Confirm email first, or disable "Confirm email" for dev |
| "User already registered" | Email already exists | Use login or different email |
| "User already exists" | Same as above | Same |
| Redirect fails / 400 | Redirect URL not in allowlist | Add URL to **Redirect URLs** in dashboard |
| No confirmation email | SMTP/rate limit | See [Email delivery](#email-delivery) |
