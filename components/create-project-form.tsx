'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { createProject, type CreateProjectInput, type CountryEntry } from '@/lib/actions/projects';
import { Spinner } from '@/components/ui/spinner';
import { CountryRegionEntryFields } from '@/components/clinical-trials/country-region-entry-fields';

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
  /** When provided with onOpenChange, dialog is controlled by parent (no trigger rendered) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function emptyCountry(): CountryEntry {
  return { countryName: '', countryRegion: '', plannedSites: undefined, plannedSubjects: undefined, plannedStartDate: '', plannedEndDate: '' };
}

export function CreateProjectForm({ onSuccess, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateProjectFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    protocolName: '',
    protocolNumber: '',
    trialPhase: '',
    protocolDescription: '',
    protocolStatus: 'planning',
  });

  const [countries, setCountries] = useState<CountryEntry[]>([emptyCountry()]);

  const resetForm = () => {
    setFormData({
      protocolName: '',
      protocolNumber: '',
      trialPhase: '',
      protocolDescription: '',
      protocolStatus: 'planning',
    });
    setCountries([emptyCountry()]);
    setError(null);
  };

  const updateCountry = (index: number, updates: Partial<CountryEntry>) => {
    setCountries((prev) => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCountry = (index: number) => {
    setCountries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const input: CreateProjectInput = {
        protocolName: formData.protocolName,
        protocolNumber: formData.protocolNumber,
        trialPhase: formData.trialPhase,
        protocolDescription: formData.protocolDescription,
        protocolStatus: formData.protocolStatus,
        countries: countries.filter((c) => c.countryName),
      };

      const result = await createProject(input);

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
      {!isControlled && (
        <DialogTrigger render={<Button className="gap-2" />}>
          <Plus className="h-4 w-4" />
          Create Project
        </DialogTrigger>
      )}
      <DialogContent className="w-[700px] max-w-[700px] max-h-[90vh] overflow-y-auto text-xs">
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
                  Protocol Number
                </Label>
                <Input
                  id="protocolNumber"
                  value={formData.protocolNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, protocolNumber: e.target.value })
                  }
                  placeholder="Enter protocol number"
                  className="text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialPhase" className="text-xs">
                  Trial Phase
                </Label>
                <Select
                  value={formData.trialPhase}
                  onValueChange={(value) =>
                    setFormData({ ...formData, trialPhase: value || '' })
                  }
                >
                  <SelectTrigger id="trialPhase" className="w-full text-xs placeholder:text-xs min-w-[150px]">
                    <SelectValue>
                      {TRIAL_PHASES.find((p) => p.toLowerCase() === formData.trialPhase.toLowerCase()) || formData.trialPhase || 'Choose an option...'}
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="protocolDescription" className="text-xs">Protocol Description</Label>
                <Textarea
                  id="protocolDescription"
                  value={formData.protocolDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, protocolDescription: e.target.value })
                  }
                  placeholder="Enter description"
                  className="min-h-[60px] text-xs placeholder:text-xs min-w-[150px]"
                />
              </div>
            </div>

            {/* Countries Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Participating Countries</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setCountries((prev) => [...prev, emptyCountry()])}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Country
                </Button>
              </div>

              {countries.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-2 text-center border border-dashed rounded-md">
                  No countries added. Click &quot;Add Country&quot; to add participating countries.
                </p>
              )}

              {countries.map((country, idx) => (
                <CountryRegionEntryFields
                  key={idx}
                  value={country}
                  onChange={(v) => updateCountry(idx, v)}
                  index={idx}
                  showDelete={countries.length > 1}
                  onDelete={() => removeCountry(idx)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !formData.protocolName}
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
