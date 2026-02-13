'use client';

import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProject, type CreateProjectInput } from '@/lib/actions/projects';
import { useToast } from '@/hooks/use-toast';

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

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  approved: 'Approved',
  closed: 'Closed',
};

interface OnboardingStepProjectProps {
  onCreated: () => void;
  onSkip: () => void;
}

export function OnboardingStepProject({ onCreated, onSkip }: OnboardingStepProjectProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateProjectInput> & {
    protocolName: string;
    protocolNumber: string;
    trialPhase: string;
    protocolStatus: string;
  }>({
    protocolName: '',
    protocolNumber: '',
    trialPhase: 'Phase I',
    protocolDescription: '',
    protocolStatus: 'planning',
    plannedSites: undefined,
    plannedSubjects: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.protocolName || !formData.protocolNumber || !formData.trialPhase) {
      toast({
        title: 'Required fields',
        description: 'Please fill in Project Name, Project Number, and Trial Phase.',
        variant: 'destructive',
      });
      return;
    }

    setIsPending(true);
    try {
      const result = await createProject(formData as CreateProjectInput);

      if (result.success) {
        toast({
          title: 'Project created',
          description: `${formData.protocolName} has been added.`,
        });
        onCreated();
      } else {
        toast({
          title: 'Failed to create project',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderPlus className="h-5 w-5" />
          Create Your First Project
        </CardTitle>
        <CardDescription>
          Set up a clinical trial project to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="protocolName" className="text-[12px]">
              Project Name
            </Label>
            <Input
              id="protocolName"
              value={formData.protocolName}
              onChange={(e) => setFormData({ ...formData, protocolName: e.target.value })}
              placeholder="Enter project name"
              className="text-[12px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocolNumber" className="text-[12px]">
              Project Number
            </Label>
            <Input
              id="protocolNumber"
              value={formData.protocolNumber}
              onChange={(e) => setFormData({ ...formData, protocolNumber: e.target.value })}
              placeholder="Enter project number"
              className="text-[12px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trialPhase" className="text-[12px]">
              Trial Phase
            </Label>
            <Select
              value={formData.trialPhase}
              onValueChange={(v) => setFormData({ ...formData, trialPhase: v || '' })}
            >
              <SelectTrigger id="trialPhase" className="text-[12px]">
                <SelectValue placeholder="Choose trial phase" />
              </SelectTrigger>
              <SelectContent>
                {TRIAL_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase} className="text-[12px]">
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocolStatus" className="text-[12px]">
              Status
            </Label>
            <Select
              value={formData.protocolStatus}
              onValueChange={(v) => setFormData({ ...formData, protocolStatus: v || 'planning' })}
            >
              <SelectTrigger id="protocolStatus" className="text-[12px]">
                <SelectValue placeholder="Select status">
                  {formData.protocolStatus
                    ? STATUS_LABELS[formData.protocolStatus] ?? formData.protocolStatus
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-[12px]">
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="text-[12px]">
              {isPending ? 'Creating...' : 'Create and Continue'}
            </Button>
            <Button type="button" variant="outline" onClick={onSkip} className="text-[12px]">
              Skip
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
