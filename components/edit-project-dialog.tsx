'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { updateProject, type UpdateProjectInput } from '@/lib/actions/projects';
import type { AssignedProtocol } from '@/lib/actions/projects';
import { Spinner } from '@/components/ui/spinner';

const TRIAL_PHASES = [
  'Phase I',
  'Phase II',
  'Phase III',
  'Phase IV',
  'Pilot Stage',
  'Pivotal',
  'Post Market',
  'Early Feasibility Study',
  'First In-Human',
] as const;

const PROJECT_STATUSES = ['planning', 'approved', 'closed'] as const;

interface EditProjectDialogProps {
  project: AssignedProtocol | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: EditProjectDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<UpdateProjectInput> & {
    protocolName: string;
    protocolNumber: string;
    trialPhase: string;
    protocolStatus: string;
  }>({
    programName: '',
    protocolName: '',
    protocolNumber: '',
    trialPhase: '',
    protocolDescription: '',
    countryName: '',
    countryRegion: '',
    protocolStatus: 'planning',
    plannedSites: undefined,
    plannedSubjects: undefined,
    plannedStartDate: '',
    plannedEndDate: '',
  });

  useEffect(() => {
    if (project && open) {
      setFormData({
        programName: '',
        protocolName: project.protocol_name,
        protocolNumber: project.protocol_number,
        trialPhase: project.trial_phase || '',
        protocolDescription: project.protocol_description || '',
        countryName: project.country_name || '',
        countryRegion: project.country_region || '',
        protocolStatus: project.protocol_status || 'planning',
        plannedSites: project.planned_sites ?? undefined,
        plannedSubjects: project.planned_subjects ?? undefined,
        plannedStartDate: project.planned_start_date?.slice(0, 10) || '',
        plannedEndDate: project.planned_end_date?.slice(0, 10) || '',
      });
      setError(null);
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setError(null);

    startTransition(async () => {
      const result = await updateProject(project.id, formData as import('@/lib/actions/projects').UpdateProjectInput);

      if (result.success) {
        onOpenChange(false);
        toast.success('Project updated successfully!', {
          description: `${formData.protocolName} has been updated.`,
        });
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error || 'Failed to update project');
        toast.error('Failed to update project', {
          description: result.error || 'An error occurred while updating the project.',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[600px] max-w-[600px] max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Project</DialogTitle>
        </DialogHeader>

        {project && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-protocolName" className="text-xs">
                    Protocol Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-protocolName"
                    required
                    value={formData.protocolName}
                    onChange={(e) =>
                      setFormData({ ...formData, protocolName: e.target.value })
                    }
                    placeholder="Enter protocol name"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-protocolNumber" className="text-xs">
                    Protocol Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-protocolNumber"
                    required
                    value={formData.protocolNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, protocolNumber: e.target.value })
                    }
                    placeholder="Enter protocol number"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-trialPhase" className="text-xs">
                    Trial Phase <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.trialPhase}
                    onValueChange={(value) =>
                      setFormData({ ...formData, trialPhase: value || '' })
                    }
                  >
                    <SelectTrigger id="edit-trialPhase" className="w-full text-xs placeholder:text-xs min-w-[150px]">
                      <SelectValue>
                        {formData.trialPhase || 'Choose an option...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAL_PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase}>
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-protocolStatus" className="text-xs">Protocol Status</Label>
                  <Select
                    value={formData.protocolStatus}
                    onValueChange={(value) =>
                      setFormData({ ...formData, protocolStatus: value || '' })
                    }
                  >
                    <SelectTrigger id="edit-protocolStatus" className="w-full text-xs placeholder:text-xs min-w-[150px]">
                      <SelectValue>
                        {formData.protocolStatus
                          ? formData.protocolStatus.charAt(0).toUpperCase() +
                            formData.protocolStatus.slice(1)
                          : 'Select status'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-countryName" className="text-xs">Country Name</Label>
                  <Input
                    id="edit-countryName"
                    value={formData.countryName}
                    onChange={(e) =>
                      setFormData({ ...formData, countryName: e.target.value })
                    }
                    placeholder="Enter country name"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-countryRegion" className="text-xs">Country Region</Label>
                  <Input
                    id="edit-countryRegion"
                    value={formData.countryRegion}
                    onChange={(e) =>
                      setFormData({ ...formData, countryRegion: e.target.value })
                    }
                    placeholder="Enter country region"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plannedSites" className="text-xs">Planned Sites</Label>
                  <Input
                    id="edit-plannedSites"
                    type="number"
                    min="0"
                    value={formData.plannedSites || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plannedSites: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="0"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plannedSubjects" className="text-xs">Planned Subjects</Label>
                  <Input
                    id="edit-plannedSubjects"
                    type="number"
                    min="0"
                    value={formData.plannedSubjects || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plannedSubjects: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="0"
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plannedStartDate" className="text-xs">Planned Start Date</Label>
                  <span className="block text-right text-[8px] text-gray-400">mm/dd/yyyy</span>
                  <Input
                    id="edit-plannedStartDate"
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, plannedStartDate: e.target.value })
                    }
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-plannedEndDate" className="text-xs">Planned End Date</Label>
                  <span className="block text-right text-[8px] text-gray-400">mm/dd/yyyy</span>
                  <Input
                    id="edit-plannedEndDate"
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, plannedEndDate: e.target.value })
                    }
                    className="text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-protocolDescription" className="text-xs">Protocol Description</Label>
                  <Textarea
                    id="edit-protocolDescription"
                    value={formData.protocolDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, protocolDescription: e.target.value })
                    }
                    placeholder="Enter description"
                    className="min-h-[60px] text-xs placeholder:text-xs min-w-[150px]"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || !formData.protocolName || !formData.protocolNumber || !formData.trialPhase}
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
