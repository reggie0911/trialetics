/** When `NEXT_PUBLIC_ONBOARDING_AUTO_START` is exactly `'false'`, the welcome step does not open automatically. Manual replay from settings still works. */
export function readOnboardingAutoStartFromEnv(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_AUTO_START !== 'false';
}
