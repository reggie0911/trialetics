'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { StepStudyBasics } from './wizard/step-study-basics';
import { StepMedicalContext } from './wizard/step-medical-context';
import { StepCommunicationGoals } from './wizard/step-communication-goals';
import { StepBrandDirection } from './wizard/step-brand-direction';
import { StepReviewSubmit } from './wizard/step-review-submit';
import {
  createBrandForgeProject,
  updateBrandForgeBrief,
  type BrandBriefEditRedirectTarget,
} from '@/lib/actions/brand-forge';
import { DEFAULT_BRAND_BRIEF, type BrandBriefFormValues } from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

const STEP_LABELS = [
  'Study Basics',
  'Medical Context',
  'Communication',
  'Brand Direction',
  'Review & Submit',
] as const;

export interface BrandBriefWizardProps {
  mode?: 'create' | 'edit';
  projectId?: string;
  initialValues?: BrandBriefFormValues;
  /** Where to send the user after a successful save in edit mode (default: logos). */
  editSuccessRedirect?: BrandBriefEditRedirectTarget;
}

export function BrandBriefWizard({
  mode = 'create',
  projectId,
  initialValues,
  editSuccessRedirect = 'logos',
}: BrandBriefWizardProps = {}) {
  const isEdit = mode === 'edit' && projectId;
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<BrandBriefFormValues>(() => initialValues ?? DEFAULT_BRAND_BRIEF);

  const updateField = <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return formData.study_name.trim().length > 0;
      case 1:
        return formData.therapeutic_area.length > 0;
      case 2:
        return true;
      case 3:
        return formData.brand_direction.length > 0 && formData.visual_preference.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    startTransition(async () => {
      if (isEdit) {
        const result = await updateBrandForgeBrief(projectId, formData, editSuccessRedirect);
        if (result?.error) {
          toast.error('Failed to save brief', { description: result.error });
        }
        return;
      }
      const result = await createBrandForgeProject(formData);
      if (result?.error) {
        toast.error('Failed to create project', { description: result.error });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors',
                i < step && 'bg-primary text-primary-foreground cursor-pointer',
                i === step && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                i > step && 'bg-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span className={cn(
              'text-xs hidden sm:inline',
              i === step ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn(
                'w-8 h-px',
                i < step ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 0 && <StepStudyBasics formData={formData} updateField={updateField} />}
        {step === 1 && <StepMedicalContext formData={formData} updateField={updateField} />}
        {step === 2 && <StepCommunicationGoals formData={formData} updateField={updateField} />}
        {step === 3 && <StepBrandDirection formData={formData} updateField={updateField} />}
        {step === 4 && <StepReviewSubmit formData={formData} onEdit={setStep} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step < STEP_LABELS.length - 1 ? (
          <Button
            size="sm"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !canAdvance()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create study brand'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
