/**
 * Optional, privacy-reviewed analytics hook for guided setup.
 * Enable only after updating the in-app privacy policy and DPA as needed.
 * Set `NEXT_PUBLIC_ONBOARDING_ANALYTICS=true` to log development breadcrumbs to the console.
 */
export function reportOnboardingEvent(step: string, detail?: string): void {
  if (process.env.NEXT_PUBLIC_ONBOARDING_ANALYTICS !== 'true') return;
  if (process.env.NODE_ENV === 'development') {
    console.debug('[guided-setup]', step, detail ?? '');
  }
}
