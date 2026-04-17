'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, X } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert';
import type { DashboardStats, Study } from '@/lib/types/ctms';
import { closeStudy, reactivateStudy } from '@/lib/actions/studies';
import { StudyList } from '@/components/ctms/studies/study-list';

interface DashboardContentProps {
  firstName: string | null;
  stats: DashboardStats;
  studies: Study[];
  isAdmin: boolean;
  /** Show banner when user landed from a study-scoped route without a study context. */
  studySelectionHint?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const statCards = [
  {
    title: 'Total Studies',
    key: 'totalStudies' as const,
    href: '/protected/studies',
    markerColor: null as string | null,
    tooltipFn: (s: DashboardStats) => `${s.activeStudies} active`,
  },
  {
    title: 'Total Sites',
    key: 'totalSites' as const,
    href: '/protected/sites',
    markerColor: 'bg-emerald-500',
    tooltipFn: (s: DashboardStats) => `${s.activeSites} activated`,
  },
  {
    title: 'Enrolling Sites',
    key: 'enrollingSites' as const,
    href: '/protected/sites',
    markerColor: 'bg-amber-500',
    tooltipFn: () => 'Currently enrolling',
  },
  {
    title: 'Active Studies',
    key: 'activeStudies' as const,
    href: '/protected/studies',
    markerColor: 'bg-violet-500',
    tooltipFn: (s: DashboardStats) => `of ${s.totalStudies} total`,
  },
];

export function DashboardContent({
  firstName,
  stats,
  studies,
  isAdmin,
  studySelectionHint = false,
}: DashboardContentProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studyToClose, setStudyToClose] = useState<Study | null>(null);
  const [studyToReactivate, setStudyToReactivate] = useState<Study | null>(null);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [reactivatePassword, setReactivatePassword] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [studyHintDismissed, setStudyHintDismissed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAdmin) {
      setStudyToClose(null);
      setStudyToReactivate(null);
    }
  }, [isAdmin]);

  const handleDeactivateConfirm = async () => {
    if (!isAdmin || !studyToClose) return;
    const pwd = deactivatePassword.trim();
    if (!pwd) {
      toast.error('Password is required.');
      return;
    }
    setIsClosing(true);
    const { error } = await closeStudy(studyToClose.id, pwd);
    setIsClosing(false);
    if (error) {
      toast.error(error);
      setDeactivatePassword('');
      return;
    }
    toast.success('Study deactivated');
    setStudyToClose(null);
    setDeactivatePassword('');
    router.refresh();
  };

  const handleReactivateConfirm = async () => {
    if (!isAdmin || !studyToReactivate) return;
    const pwd = reactivatePassword.trim();
    if (!pwd) {
      toast.error('Password is required.');
      return;
    }
    setIsReactivating(true);
    const { error } = await reactivateStudy(studyToReactivate.id, pwd);
    setIsReactivating(false);
    if (error) {
      toast.error(error);
      setReactivatePassword('');
      return;
    }
    toast.success('Study reactivated');
    setStudyToReactivate(null);
    setReactivatePassword('');
    router.refresh();
  };

  return (
    <>
      <div className="p-6 lg:p-8 space-y-8" suppressHydrationWarning>
        {studySelectionHint && !studyHintDismissed && (
          <Alert className="pr-12">
            <Info className="size-4" aria-hidden />
            <AlertTitle>Open a study to continue</AlertTitle>
            <AlertDescription>
              CTMS areas such as visits, sites, and tasks are tied to a study. Choose one in the{' '}
              <strong>Studies</strong> table below.
            </AlertDescription>
            <AlertAction>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                aria-label="Dismiss"
                onClick={() => setStudyHintDismissed(true)}
              >
                <X className="size-4" />
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div>
          <h1 className="text-2xl font-semibold tracking-tight" suppressHydrationWarning>
            {mounted ? getGreeting() : 'Hello'}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s an overview of your clinical trial operations.
          </p>
        </div>

        <Card className="rounded-lg bg-white dark:bg-card">
          <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
            {statCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                title={card.tooltipFn(stats)}
              >
                {card.markerColor && (
                  <span className={`h-2 w-4 shrink-0 rounded-full ${card.markerColor}`} aria-hidden />
                )}
                <span>
                  {card.title} ({stats[card.key]})
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Studies</CardTitle>
            <CardDescription>Search, filter, open, or create a study</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <StudyList
              studies={studies}
              showNewStudyButton
              showEditDeactivate
              isAdmin={isAdmin}
              onDeactivateRequest={isAdmin ? setStudyToClose : undefined}
              onReactivateRequest={isAdmin ? setStudyToReactivate : undefined}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(studyToClose && isAdmin)}
        onOpenChange={(open) => {
          if (!open && !isClosing) {
            setStudyToClose(null);
            setDeactivatePassword('');
          }
        }}
      >
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate study</AlertDialogTitle>
            <AlertDialogDescription>
              {studyToClose && (
                <>
                  This will mark &ldquo;{studyToClose.title}&rdquo; as closed. The study will no longer be active,
                  but all associated data will be preserved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="deactivate-study-password">Confirm your password</Label>
            <Input
              id="deactivate-study-password"
              type="password"
              autoComplete="current-password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              disabled={isClosing}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing} type="button">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isClosing || !deactivatePassword.trim()}
              onClick={() => void handleDeactivateConfirm()}
            >
              {isClosing ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(studyToReactivate && isAdmin)}
        onOpenChange={(open) => {
          if (!open && !isReactivating) {
            setStudyToReactivate(null);
            setReactivatePassword('');
          }
        }}
      >
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate study</AlertDialogTitle>
            <AlertDialogDescription>
              {studyToReactivate && (
                <>
                  This will set &ldquo;{studyToReactivate.title}&rdquo; to <strong>active</strong>. Confirm your
                  password to continue.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="reactivate-study-password-dashboard">Confirm your password</Label>
            <Input
              id="reactivate-study-password-dashboard"
              type="password"
              autoComplete="current-password"
              value={reactivatePassword}
              onChange={(e) => setReactivatePassword(e.target.value)}
              disabled={isReactivating}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating} type="button">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={isReactivating || !reactivatePassword.trim()}
              onClick={() => void handleReactivateConfirm()}
            >
              {isReactivating ? 'Reactivating…' : 'Reactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
