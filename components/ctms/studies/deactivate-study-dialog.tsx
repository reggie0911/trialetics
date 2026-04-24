'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

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
import { closeStudy } from '@/lib/actions/studies';
import type { Study } from '@/lib/types/ctms';

const PASSWORD_INPUT_ID = 'deactivate-study-password-edit';

export interface DeactivateStudyDialogProps {
  study: Pick<Study, 'id' | 'title'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeactivateStudyDialog({
  study,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateStudyDialogProps) {
  const [password, setPassword] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !isClosing) {
        setPassword('');
      }
      onOpenChange(next);
    },
    [isClosing, onOpenChange],
  );

  const handleConfirm = useCallback(async () => {
    const pwd = password.trim();
    if (!pwd) {
      toast.error('Password is required.');
      return;
    }
    setIsClosing(true);
    const { error } = await closeStudy(study.id, pwd);
    setIsClosing(false);
    if (error) {
      toast.error(error);
      setPassword('');
      return;
    }
    toast.success('Study deactivated');
    setPassword('');
    onOpenChange(false);
    onSuccess();
  }, [password, study.id, onOpenChange, onSuccess]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate study</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark &ldquo;{study.title}&rdquo; as closed. The study will no longer be active, but all
            associated data will be preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 py-1">
          <Label htmlFor={PASSWORD_INPUT_ID}>Confirm your password</Label>
          <Input
            id={PASSWORD_INPUT_ID}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            disabled={isClosing || !password.trim()}
            onClick={() => void handleConfirm()}
          >
            {isClosing ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
