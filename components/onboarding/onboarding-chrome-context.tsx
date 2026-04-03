'use client';

import { createContext, useContext } from 'react';

export type OnboardingChromeContextValue = {
  /** When true, the inline AI assistant control hides so only one primary prompt runs at a time. */
  suppressAiAssistant: boolean;
};

const defaultValue: OnboardingChromeContextValue = {
  suppressAiAssistant: false,
};

export const OnboardingChromeContext = createContext<OnboardingChromeContextValue>(defaultValue);

export function useOnboardingChrome() {
  return useContext(OnboardingChromeContext);
}
