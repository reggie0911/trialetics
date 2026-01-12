'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createProject, type CreateProjectInput } from '@/lib/actions/projects';
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

interface CreateProjectFormProps {
  onSuccess?: () => void;
}

export function CreateProjectForm({ onSuccess }: CreateProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state - use undefined for optional selects to avoid controlled/uncontrolled warnings
  const [formData, setFormData] = useState<Partial<CreateProjectInput> & {
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

  const resetForm = () => {
    setFormData({
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
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProject(formData);

      if (result.success) {
        setOpen(false);
        resetForm();
        toast.success('Project created successfully!', {
          description: `${formData.protocolName} has been added to your projects.`,
        });
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to create project');
        toast.error('Failed to create project', {
          description: result.error || 'An error occurred while creating the project.',
        });
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Create Project
      </DialogTrigger>
      <DialogContent className="w-[600px] max-w-[600px] max-h-[90vh] overflow-y-auto text-xs">
        <DialogHeader>
          <DialogTitle className="text-base">Create Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Main form grid - 2 columns, all inputs min 150px */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="protocolName" className="text-xs">
                  Protocol Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="protocolName"
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
                <Label htmlFor="protocolNumber" className="text-xs">
                  Protocol Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="protocolNumber"
                  required
                  value={formData.protocolNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      protocolNumber: e.target.value,
                    })
                  }
                  placeholder="Enter protocol number"
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialPhase" className="text-xs">
                  Trial Phase <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.trialPhase}
                  onValueChange={(value) =>
                    setFormData({ ...formData, trialPhase: value || '' })
                  }
                >
                  <SelectTrigger id="trialPhase" className="w-full text-xs placeholder:text-xs min-w-[150px]">
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
                <Label htmlFor="protocolStatus" className="text-xs">Protocol Status</Label>
                <Select
                  value={formData.protocolStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, protocolStatus: value || '' })
                  }
                >
                  <SelectTrigger id="protocolStatus" className="w-full text-xs placeholder:text-xs min-w-[150px]">
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
                <Label htmlFor="countryName" className="text-xs">Country Name</Label>
                <Input
                  id="countryName"
                  value={formData.countryName}
                  onChange={(e) =>
                    setFormData({ ...formData, countryName: e.target.value })
                  }
                  placeholder="Enter country name"
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="countryRegion" className="text-xs">Country Region</Label>
                <Input
                  id="countryRegion"
                  value={formData.countryRegion}
                  onChange={(e) =>
                    setFormData({ ...formData, countryRegion: e.target.value })
                  }
                  placeholder="Enter country region"
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedSites" className="text-xs">Planned Sites</Label>
                <Input
                  id="plannedSites"
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
                <Label htmlFor="plannedSubjects" className="text-xs">Planned Subjects</Label>
                <Input
                  id="plannedSubjects"
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
                <Label htmlFor="plannedStartDate" className="text-xs">Planned Start Date</Label>
                <span className="block text-right text-[8px] text-gray-400">mm/dd/yyyy</span>
                <Input
                  id="plannedStartDate"
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plannedStartDate: e.target.value,
                    })
                  }
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedEndDate" className="text-xs">Planned End Date</Label>
                <span className="block text-right text-[8px] text-gray-400">mm/dd/yyyy</span>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={formData.plannedEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plannedEndDate: e.target.value,
                    })
                  }
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="protocolDescription" className="text-xs">Protocol Description</Label>
                <Textarea
                  id="protocolDescription"
                  value={formData.protocolDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      protocolDescription: e.target.value,
                    })
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
      </DialogContent>
    </Dialog>
  );
}
