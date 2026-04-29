'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import type { DashboardStats, Study } from '@/lib/types/ctms';
import { reactivateStudy } from '@/lib/actions/studies';
import { StudyList } from '@/components/ctms/studies/study-list';

interface StudiesTableCardProps {
  studies: Study[];
  stats: DashboardStats;
  isAdmin: boolean;
}

const statCards = [
  {
    title: 'Total Studies',
    key: 'totalStudies' as const,
    markerColor: null as string | null,
    tooltipFn: (s: DashboardStats) => `${s.activeStudies} active`,
  },
  {
    title: 'Total Sites',
    key: 'totalSites' as const,
    markerColor: 'bg-emerald-500',
    tooltipFn: (s: DashboardStats) => `${s.activeSites} activated`,
  },
  {
    title: 'Enrolling Sites',
    key: 'enrollingSites' as const,
    markerColor: 'bg-amber-500',
    tooltipFn: () => 'Currently enrolling',
  },
  {
    title: 'Active Studies',
    key: 'activeStudies' as const,
    markerColor: 'bg-violet-500',
    tooltipFn: (s: DashboardStats) => `of ${s.totalStudies} total`,
  },
];

/**
 * Studies-table experience extracted from the legacy `DashboardContent`. Used
 * by the User View tab on `/protected/studies` and as the primary content of
 * the `/protected/studies/catalog` deep link.
 */
export function StudiesTableCard({ studies, stats, isAdmin }: StudiesTableCardProps) {
  const router = useRouter();
  const [studyToReactivate, setStudyToReactivate] = useState<Study | null>(null);
  const [reactivatePassword, setReactivatePassword] = useState('');
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setStudyToReactivate(null);
    }
  }, [isAdmin]);

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
      <Card id="studies" className="w-full rounded-lg bg-white dark:bg-card" aria-label="Studies">
        <CardHeader className="!flex border-b pb-3">
          <div
            className="flex w-full min-w-0 flex-wrap items-center justify-end gap-4 md:gap-6"
            role="group"
            aria-label="Summary statistics"
          >
            {statCards.map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-2 text-sm font-medium text-foreground"
                title={card.tooltipFn(stats)}
              >
                {card.markerColor && (
                  <span className={`h-2 w-4 shrink-0 rounded-full ${card.markerColor}`} aria-hidden />
                )}
                <span>
                  {card.title} ({stats[card.key]})
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <StudyList
            studies={studies}
            showNewStudyButton
            showEditDeactivate
            isAdmin={isAdmin}
            onReactivateRequest={isAdmin ? setStudyToReactivate : undefined}
          />
        </CardContent>
      </Card>

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
            <Label htmlFor="reactivate-study-password-table">Confirm your password</Label>
            <Input
              id="reactivate-study-password-table"
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
