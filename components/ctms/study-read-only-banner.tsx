'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
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
import { reactivateStudy } from '@/lib/actions/studies';
import { useStudyHub } from '@/components/ctms/study-hub-context';

export function StudyReadOnlyBanner() {
  const ctx = useStudyHub();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ctx?.isStudyReadOnly) return null;

  const handleReactivate = async () => {
    const pwd = password.trim();
    if (!pwd) {
      toast.error('Password is required.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await reactivateStudy(ctx.studyId, pwd);
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
      setPassword('');
      return;
    }
    toast.success('Study reactivated');
    setOpen(false);
    setPassword('');
    router.refresh();
  };

  return (
    <>
      <div className="px-4 pt-3">
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              This study is <strong>deactivated</strong> (read-only). Data is preserved; changes are not allowed until
              the study is reactivated.
            </p>
            {ctx.isAdmin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-600/50"
                onClick={() => setOpen(true)}
              >
                <RotateCcw className="mr-1.5 size-4" />
                Reactivate study
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !isSubmitting) {
            setOpen(false);
            setPassword('');
          } else if (next) {
            setOpen(true);
          }
        }}
      >
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate study</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the study status to <strong>active</strong>. Confirm your password to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="reactivate-study-password">Password</Label>
            <Input
              id="reactivate-study-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} type="button">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={isSubmitting || !password.trim()}
              onClick={() => void handleReactivate()}
            >
              {isSubmitting ? 'Reactivating…' : 'Reactivate'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
