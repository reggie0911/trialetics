'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  completeOnboardingFlow,
  patchOnboardingFlow,
  setSkipAllOnboarding,
  syncOnboardingTourVersion,
} from '@/lib/actions/onboarding';
import {
  getStepById,
  ONBOARDING_SESSION_DISMISS_KEY,
  ONBOARDING_TOUR_VERSION,
  reportOnboardingEvent,
  selectStepsForFlow,
  type OnboardingFlow,
  type OnboardingRoleState,
  type OnboardingStepDef,
} from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import { OnboardingChromeContext } from '@/components/onboarding/onboarding-chrome-context';

function isDashboardRoot(pathname: string): boolean {
  return pathname === '/protected' || pathname === '/protected/';
}

function shouldDeferAutoWelcome(pathname: string): boolean {
  if (isDashboardRoot(pathname)) return false;
  const deepPrefixes = ['/protected/studies/', '/protected/sites/', '/protected/subjects/', '/protected/trip-reports/'];
  return deepPrefixes.some((p) => pathname.startsWith(p) && pathname !== p.slice(0, -1));
}

function stepMatchesRoute(step: OnboardingStepDef, pathname: string): boolean {
  if (step.routeExact) {
    return pathname === step.routeExact || pathname === `${step.routeExact}/`;
  }
  if (step.routePrefix) {
    return pathname === step.routePrefix || pathname.startsWith(`${step.routePrefix}/`);
  }
  return true;
}

function routeSearchMatches(
  step: OnboardingStepDef,
  searchParams: { get: (key: string) => string | null }
): boolean {
  if (!step.routeSearch) return true;
  const required = new URLSearchParams(step.routeSearch);
  let ok = true;
  required.forEach((value, key) => {
    if (searchParams.get(key) !== value) ok = false;
  });
  return ok;
}

function isAtStepRoute(
  step: OnboardingStepDef,
  pathname: string,
  searchParams: { get: (key: string) => string | null }
): boolean {
  return stepMatchesRoute(step, pathname) && routeSearchMatches(step, searchParams);
}

function navigationTargetForStep(step: OnboardingStepDef): string | null {
  if (step.routeExact) return step.routeExact;
  if (step.routePrefix) return step.routePrefix;
  return null;
}

/** `currentStepId` null means welcome; DB never stores `welcome` as id. */
function getBackTarget(
  steps: OnboardingStepDef[],
  currentStepId: string | null
): { mode: 'welcome' } | { mode: 'step'; step: OnboardingStepDef } | null {
  if (currentStepId === null) return null;
  const idx = steps.findIndex((s) => s.id === currentStepId);
  if (idx <= 0) return null;
  const prev = steps[idx - 1];
  if (!prev) return null;
  if (prev.kind === 'welcome') return { mode: 'welcome' };
  return { mode: 'step', step: prev };
}

export type OnboardingProviderProps = {
  children: ReactNode;
  flow: OnboardingFlow;
  hasCtmsAccess: boolean;
  isPlatformAdmin: boolean;
  autoStartEnabled: boolean;
  initialRoleState: OnboardingRoleState | undefined;
};

export function OnboardingProvider({
  children,
  flow,
  hasCtmsAccess,
  isPlatformAdmin,
  autoStartEnabled,
  initialRoleState,
}: OnboardingProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [coachPosition, setCoachPosition] = useState<{ top: number; left: number; width: number; placement: 'top' | 'bottom' } | null>(null);
  const [coachFallback, setCoachFallback] = useState(false);
  const [mounted, setMounted] = useState(false);
  const welcomeLoggedRef = useRef(false);

  const steps = useMemo(() => selectStepsForFlow(flow, hasCtmsAccess), [flow, hasCtmsAccess]);

  const roleState = initialRoleState ?? {};

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) return;
    const needsSync =
      initialRoleState?.version !== undefined &&
      initialRoleState.version !== ONBOARDING_TOUR_VERSION &&
      !initialRoleState.skipAll;
    if (needsSync) {
      void syncOnboardingTourVersion(flow).then(() => router.refresh());
    }
  }, [flow, isPlatformAdmin, initialRoleState?.version, initialRoleState?.skipAll, router]);

  const inactive = isPlatformAdmin || roleState.skipAll === true || !!roleState.completedAt;

  const sessionDismissed =
    mounted && typeof window !== 'undefined' && sessionStorage.getItem(ONBOARDING_SESSION_DISMISS_KEY) === '1';

  const currentStepId = roleState.currentStepId ?? null;
  const stepDef = getStepById(steps, currentStepId);

  const showWelcomeDialog =
    !inactive &&
    autoStartEnabled &&
    !sessionDismissed &&
    currentStepId === null &&
    isDashboardRoot(pathname) &&
    !shouldDeferAutoWelcome(pathname);

  useEffect(() => {
    if (showWelcomeDialog && !welcomeLoggedRef.current) {
      welcomeLoggedRef.current = true;
      reportOnboardingEvent('welcome_visible', flow);
    }
    if (!showWelcomeDialog) {
      welcomeLoggedRef.current = false;
    }
  }, [flow, showWelcomeDialog]);

  const showCoach = !inactive && stepDef?.kind === 'coach' && stepMatchesRoute(stepDef, pathname);

  const showCompleteDialog = !inactive && stepDef?.kind === 'complete';

  const suppressAiAssistant = showWelcomeDialog || showCoach || showCompleteDialog;

  const welcomeStep = steps[0];
  const completeStep = steps.find((s) => s.kind === 'complete');

  const updateCoachRect = useCallback(
    (def: OnboardingStepDef | undefined) => {
      if (!def?.anchor || typeof document === 'undefined') {
        setCoachPosition(null);
        setCoachFallback(true);
        return;
      }
      const el = document.querySelector(`[data-onboarding="${def.anchor}"]`);
      if (!el) {
        setCoachPosition(null);
        setCoachFallback(true);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setCoachPosition(null);
        setCoachFallback(true);
        return;
      }
      setCoachFallback(false);
      const placement = rect.top > window.innerHeight * 0.45 ? 'top' : 'bottom';
      const top = placement === 'bottom' ? rect.bottom + 12 : rect.top - 12;
      const edge = 16;
      const width = Math.min(320, Math.max(0, window.innerWidth - edge * 2));
      const anchorCenterX = rect.left + rect.width / 2;
      const half = width / 2;
      // `left` is the popover center because of translateX(-50%); keep full width inside the viewport.
      const minCenter = edge + half;
      const maxCenter = window.innerWidth - edge - half;
      const left = Math.min(Math.max(anchorCenterX, minCenter), maxCenter);
      setCoachPosition({
        top,
        left,
        width,
        placement,
      });
    },
    []
  );

  useLayoutEffect(() => {
    if (!showCoach || !stepDef) {
      setCoachPosition(null);
      return;
    }
    updateCoachRect(stepDef);
    const ro = () => updateCoachRect(stepDef);
    window.addEventListener('resize', ro);
    window.addEventListener('scroll', ro, true);
    return () => {
      window.removeEventListener('resize', ro);
      window.removeEventListener('scroll', ro, true);
    };
  }, [showCoach, stepDef, updateCoachRect, pathname]);

  /** Open the correct trip-reports tab (etc.) when the step defines `routeSearch`. */
  useEffect(() => {
    if (!showCoach || !stepDef?.routeSearch) return;
    if (!stepMatchesRoute(stepDef, pathname)) return;
    if (routeSearchMatches(stepDef, searchParams)) return;
    const next = new URLSearchParams(searchParams.toString());
    const required = new URLSearchParams(stepDef.routeSearch);
    required.forEach((value, key) => next.set(key, value));
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [showCoach, stepDef, pathname, router, searchParams]);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const advanceToStepId = useCallback(
    async (nextId: string | null) => {
      if (!nextId) return;
      await patchOnboardingFlow(flow, { currentStepId: nextId, version: ONBOARDING_TOUR_VERSION });
      refresh();
    },
    [flow, refresh]
  );

  const handleWelcomeContinue = useCallback(async () => {
    const nextId = welcomeStep?.nextId ?? 'company';
    await advanceToStepId(nextId);
  }, [advanceToStepId, welcomeStep?.nextId]);

  const handleWelcomeSkipAll = useCallback(async () => {
    await setSkipAllOnboarding(flow, true);
    refresh();
  }, [flow, refresh]);

  const handleWelcomeMaybeLater = useCallback(() => {
    sessionStorage.setItem(ONBOARDING_SESSION_DISMISS_KEY, '1');
    refresh();
  }, [refresh]);

  const handleCoachNext = useCallback(async () => {
    if (!stepDef?.nextId) return;
    const nextStep = getStepById(steps, stepDef.nextId);
    await patchOnboardingFlow(flow, { currentStepId: stepDef.nextId, version: ONBOARDING_TOUR_VERSION });
    if (nextStep && !isAtStepRoute(nextStep, pathname, searchParams)) {
      const href = navigationTargetForStep(nextStep);
      if (href) router.push(href);
    }
    refresh();
  }, [flow, pathname, refresh, router, searchParams, stepDef, steps]);

  const handleCoachSkipAll = handleWelcomeSkipAll;

  const backTarget = useMemo(() => getBackTarget(steps, currentStepId), [steps, currentStepId]);

  const handleOnboardingBack = useCallback(async () => {
    const target = getBackTarget(steps, currentStepId);
    if (!target) return;

    if (target.mode === 'welcome') {
      await patchOnboardingFlow(flow, { currentStepId: null, version: ONBOARDING_TOUR_VERSION });
      if (!isDashboardRoot(pathname)) {
        router.push('/protected');
      }
      refresh();
      return;
    }

    const prev = target.step;
    await patchOnboardingFlow(flow, { currentStepId: prev.id, version: ONBOARDING_TOUR_VERSION });
    if (!isAtStepRoute(prev, pathname, searchParams)) {
      const href = navigationTargetForStep(prev);
      if (href) {
        router.push(href);
      }
    }
    refresh();
  }, [currentStepId, flow, pathname, refresh, router, searchParams, steps]);

  const handleCompleteFinish = useCallback(async () => {
    await completeOnboardingFlow(flow);
    refresh();
  }, [flow, refresh]);

  const coachBody = (
    <div
      className={cn(
        'fixed z-[45] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg motion-reduce:transition-none',
        'max-w-[min(22rem,calc(100vw-2rem))] break-words'
      )}
      style={
        coachPosition && !coachFallback
          ? {
              top: coachPosition.placement === 'bottom' ? coachPosition.top : undefined,
              bottom: coachPosition.placement === 'top' ? window.innerHeight - coachPosition.top : undefined,
              left: coachPosition.left,
              transform: 'translateX(-50%)',
              width: coachPosition.width,
            }
          : {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-coach-title"
      aria-describedby="onboarding-coach-desc"
    >
      <h2 id="onboarding-coach-title" className="font-semibold text-sm mb-2">
        {stepDef?.title}
      </h2>
      <p id="onboarding-coach-desc" className="text-xs text-muted-foreground mb-4">
        {stepDef?.body}
      </p>
      {coachFallback && stepDef?.anchor && (
        <p className="text-xs text-muted-foreground mb-3">
          If you do not see the highlighted control, open the main menu (on small screens use the menu icon) and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={isPending || !backTarget}
          onClick={() => void handleOnboardingBack()}
        >
          Back
        </Button>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => handleCoachSkipAll()}>
            Do not show tips again
          </Button>
          <Button type="button" size="sm" className="text-xs" onClick={() => void handleCoachNext()} disabled={isPending}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <OnboardingChromeContext.Provider value={{ suppressAiAssistant }}>
      {children}

      <Dialog open={showWelcomeDialog} onOpenChange={(open) => !open && handleWelcomeMaybeLater()}>
        <DialogContent className="sm:max-w-md" showCloseButton aria-describedby="onboarding-welcome-desc">
          <DialogHeader>
            <DialogTitle className="text-[16pt]">{welcomeStep?.title}</DialogTitle>
            <DialogDescription id="onboarding-welcome-desc">{welcomeStep?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => void handleWelcomeSkipAll()}>
              Do not show tips again
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handleWelcomeMaybeLater}>
              Maybe later
            </Button>
            <Button type="button" size="sm" className="text-xs" onClick={() => void handleWelcomeContinue()} disabled={isPending}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteDialog} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          aria-describedby="onboarding-complete-desc"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            void handleCompleteFinish();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[16pt]">{completeStep?.title}</DialogTitle>
            <DialogDescription id="onboarding-complete-desc">{completeStep?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={isPending || !backTarget}
              onClick={() => void handleOnboardingBack()}
            >
              Back
            </Button>
            <Button type="button" size="sm" className="text-xs" onClick={() => void handleCompleteFinish()} disabled={isPending}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mounted &&
        showCoach &&
        stepDef &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[40] bg-black/15 pointer-events-none motion-reduce:transition-none" aria-hidden />
            <div className="pointer-events-auto">{coachBody}</div>
          </>,
          document.body
        )}
    </OnboardingChromeContext.Provider>
  );
}
