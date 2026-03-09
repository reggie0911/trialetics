'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrganizationFormDialog } from '@/components/contacts-organizations/organization-form-dialog';

interface CreateOrganizationPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  userEmail: string;
  onCreateSuccess?: () => void;
}

export function CreateOrganizationPromptDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  userEmail,
  onCreateSuccess,
}: CreateOrganizationPromptDialogProps) {
  const [phase, setPhase] = useState<'prompt' | 'form'>('prompt');
  const transitioningToForm = useRef(false);

  // Reset to prompt phase when dialog closes from parent
  useEffect(() => {
    if (!open) {
      setPhase('prompt');
    }
  }, [open]);

  const handleCreateClick = () => {
    transitioningToForm.current = true;
    setPhase('form');
  };

  const handleNotNow = () => {
    onOpenChange(false);
  };

  const handlePromptOpenChange = (o: boolean) => {
    if (!o && !transitioningToForm.current) {
      handleNotNow();
    }
    transitioningToForm.current = false;
  };

  const handleFormSuccess = () => {
    onCreateSuccess?.();
    onOpenChange(false);
  };

  const handleFormOpenChange = (formOpen: boolean) => {
    if (!formOpen) {
      // User cancelled the form - close entirely
      onOpenChange(false);
    }
  };

  return (
    <>
      <AlertDialog open={open && phase === 'prompt'} onOpenChange={handlePromptOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No institutions or contacts yet</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to create your first institution to get started?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNotNow}>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateClick}>Create Institution</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrganizationFormDialog
        open={open && phase === 'form'}
        onOpenChange={handleFormOpenChange}
        onSuccess={handleFormSuccess}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
      />
    </>
  );
}
