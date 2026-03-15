'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StudyForm } from '@/components/ctms/studies/study-form';

interface StudyFormDialogProps {
  onSuccess: () => void;
}

export function StudyFormDialog({ onSuccess }: StudyFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Study
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Study</DialogTitle>
          <DialogDescription>
            Set up a new clinical trial with protocol details.
          </DialogDescription>
        </DialogHeader>
        <StudyForm
          mode="create"
          onSuccess={() => {
            setOpen(false);
            onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
