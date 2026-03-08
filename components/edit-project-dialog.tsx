'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
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
import { updateProject, type UpdateProjectInput, type CountryEntry } from '@/lib/actions/projects';
import type { AssignedProtocol } from '@/lib/actions/projects';
import { Spinner } from '@/components/ui/spinner';
import { getCountryNames, getRegionForCountry, GEOGRAPHIC_REGIONS } from '@/lib/data/countries';

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

function emptyCountry(): CountryEntry {
  return { countryName: '', countryRegion: '', plannedSites: undefined, plannedSubjects: undefined, plannedStartDate: '', plannedEndDate: '' };
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

  const [formData, setFormData] = useState({
    protocolName: '',
    protocolNumber: '',
    trialPhase: '',
    protocolDescription: '',
    protocolStatus: 'planning',
  });

  const [countries, setCountries] = useState<CountryEntry[]>([]);

  useEffect(() => {
    if (project && open) {
      setFormData({
        protocolName: project.protocol_name,
        protocolNumber: project.protocol_number,
        trialPhase: project.trial_phase || '',
        protocolDescription: project.protocol_description || '',
        protocolStatus: project.protocol_status || 'planning',
      });

      if (project.countries && project.countries.length > 0) {
        setCountries(project.countries.map((c) => ({
          id: c.id,
          countryName: c.countryName,
          countryRegion: c.countryRegion || '',
          plannedSites: c.plannedSites ?? undefined,
          plannedSubjects: c.plannedSubjects ?? undefined,
          plannedStartDate: c.plannedStartDate?.slice(0, 10) || '',
          plannedEndDate: c.plannedEndDate?.slice(0, 10) || '',
        })));
      } else {
        setCountries([]);
      }

      setError(null);
    }
  }, [project, open]);

  const updateCountry = (index: number, updates: Partial<CountryEntry>) => {
    setCountries((prev) => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCountry = (index: number) => {
    setCountries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setError(null);

    startTransition(async () => {
      const input: UpdateProjectInput = {
        protocolName: formData.protocolName,
        protocolNumber: formData.protocolNumber,
        trialPhase: formData.trialPhase,
        protocolDescription: formData.protocolDescription,
        protocolStatus: formData.protocolStatus,
        countries: countries.filter((c) => c.countryName),
      };

      const result = await updateProject(project.id, input);

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
      <DialogContent className="w-[700px] max-w-[700px] max-h-[90vh] overflow-y-auto text-[12px]">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Project</DialogTitle>
        </DialogHeader>

        {project && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-[12px] text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-protocolName" className="!text-[12px]">
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
                    className="!text-[12px] placeholder:!text-[12px] min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-protocolNumber" className="!text-[12px]">
                    Protocol Number
                  </Label>
                  <Input
                    id="edit-protocolNumber"
                    value={formData.protocolNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, protocolNumber: e.target.value })
                    }
                    placeholder="Enter protocol number"
                    className="!text-[12px] placeholder:!text-[12px] min-w-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-trialPhase" className="!text-[12px]">
                    Trial Phase
                  </Label>
                  <Select
                    value={formData.trialPhase}
                    onValueChange={(value) =>
                      setFormData({ ...formData, trialPhase: value || '' })
                    }
                  >
                    <SelectTrigger id="edit-trialPhase" className="w-full !text-[12px] placeholder:!text-[12px] min-w-[150px]">
                      <SelectValue>
                        {TRIAL_PHASES.find((p) => p.toLowerCase() === formData.trialPhase.toLowerCase()) || formData.trialPhase || 'Choose an option...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAL_PHASES.map((phase) => (
                        <SelectItem key={phase} value={phase} className="!text-[12px]">
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-protocolStatus" className="!text-[12px]">Protocol Status</Label>
                  <Select
                    value={formData.protocolStatus}
                    onValueChange={(value) =>
                      setFormData({ ...formData, protocolStatus: value || '' })
                    }
                  >
                    <SelectTrigger id="edit-protocolStatus" className="w-full !text-[12px] placeholder:!text-[12px] min-w-[150px]">
                      <SelectValue>
                        {formData.protocolStatus
                          ? formData.protocolStatus.charAt(0).toUpperCase() +
                            formData.protocolStatus.slice(1)
                          : 'Select status'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="!text-[12px]">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-protocolDescription" className="!text-[12px]">Protocol Description</Label>
                  <Textarea
                    id="edit-protocolDescription"
                    value={formData.protocolDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, protocolDescription: e.target.value })
                    }
                    placeholder="Enter description"
                    className="min-h-[60px] !text-[12px] placeholder:!text-[12px] min-w-[150px]"
                  />
                </div>
              </div>

              {/* Countries Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="!text-[12px] font-semibold">Participating Countries</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 !text-[11px]"
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
                  <div key={idx} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Country {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCountry(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="!text-[11px]">Country Name</Label>
                        <Select
                          value={country.countryName}
                          onValueChange={(value) =>
                            updateCountry(idx, {
                              countryName: value,
                              countryRegion: getRegionForCountry(value) || country.countryRegion || '',
                            })
                          }
                        >
                          <SelectTrigger className="w-full !text-[11px] h-8">
                            <SelectValue>
                              {country.countryName || 'Select country'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getCountryNames().map((name) => (
                              <SelectItem key={name} value={name} className="!text-[11px]">
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="!text-[11px]">Region</Label>
                        <Select
                          value={country.countryRegion || ''}
                          onValueChange={(value) => updateCountry(idx, { countryRegion: value })}
                        >
                          <SelectTrigger className="w-full !text-[11px] h-8">
                            <SelectValue>
                              {country.countryRegion || 'Select region'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {GEOGRAPHIC_REGIONS.map((region) => (
                              <SelectItem key={region} value={region} className="!text-[11px]">
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="!text-[11px]">Planned Sites</Label>
                        <Input
                          type="number"
                          min="0"
                          value={country.plannedSites ?? ''}
                          onChange={(e) =>
                            updateCountry(idx, { plannedSites: e.target.value ? parseInt(e.target.value) : undefined })
                          }
                          placeholder="0"
                          className="!text-[11px] h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="!text-[11px]">Planned Subjects</Label>
                        <Input
                          type="number"
                          min="0"
                          value={country.plannedSubjects ?? ''}
                          onChange={(e) =>
                            updateCountry(idx, { plannedSubjects: e.target.value ? parseInt(e.target.value) : undefined })
                          }
                          placeholder="0"
                          className="!text-[11px] h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="!text-[11px]">Start Date</Label>
                        <Input
                          type="date"
                          value={country.plannedStartDate || ''}
                          onChange={(e) => updateCountry(idx, { plannedStartDate: e.target.value })}
                          className="!text-[11px] h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="!text-[11px]">End Date</Label>
                        <Input
                          type="date"
                          value={country.plannedEndDate || ''}
                          onChange={(e) => updateCountry(idx, { plannedEndDate: e.target.value })}
                          className="!text-[11px] h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || !formData.protocolName}
                className="w-full sm:w-auto !text-[12px]"
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
