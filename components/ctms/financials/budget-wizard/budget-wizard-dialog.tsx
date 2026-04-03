'use client';

import { useState, useTransition, useEffect, type ReactNode } from 'react';
import { Wand2, ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { StepStudyInputs } from './step-study-inputs';
import { StepFinancialAssumptions } from './step-financial-assumptions';
import { StepCostDrivers } from './step-cost-drivers';
import { StepReviewGenerate } from './step-review-generate';

import type { WizardStudyInputs, WizardFinancialAssumptions, WizardCostDrivers } from '@/lib/budget-template-generator';
import {
  generateBudgetFromWizard,
  buildWizardInputsSnapshot,
  DEFAULT_WIZARD_STUDY_INPUTS,
  DEFAULT_WIZARD_ASSUMPTIONS,
  DEFAULT_WIZARD_DRIVERS,
} from '@/lib/budget-template-generator';
import {
  generateBudgetFromTemplate,
  getStudyBudgetWizardHydration,
  saveStudyBudgetWizardMetadata,
  regenerateStudyBudgetFromWizard,
} from '@/lib/actions/study-budget-templates';

const STEP_LABELS = [
  'Study Inputs',
  'Financial Assumptions',
  'Cost Drivers',
  'Review & Generate',
] as const;

interface BudgetWizardDialogProps {
  studyId: string;
  companyId: string;
  currency?: string;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  /** Required when mode is `edit` (study financials). */
  existingBudgetId?: string;
}

export function BudgetWizardDialog({
  studyId,
  companyId,
  currency = 'USD',
  onSuccess,
  mode = 'create',
  existingBudgetId,
}: BudgetWizardDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [inferredFromDb, setInferredFromDb] = useState(false);

  const [studyInputs, setStudyInputs] = useState<WizardStudyInputs>(DEFAULT_WIZARD_STUDY_INPUTS);
  const [assumptions, setAssumptions] = useState<WizardFinancialAssumptions>(DEFAULT_WIZARD_ASSUMPTIONS);
  const [drivers, setDrivers] = useState<WizardCostDrivers>(DEFAULT_WIZARD_DRIVERS);
  const [budgetName, setBudgetName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const generated = generateBudgetFromWizard(studyInputs, assumptions, drivers);

  const isEdit = mode === 'edit' && Boolean(existingBudgetId);

  useEffect(() => {
    if (!open) {
      setHydrating(false);
      return;
    }
    if (isEdit && existingBudgetId) {
      setHydrating(true);
      let cancelled = false;
      getStudyBudgetWizardHydration(studyId, existingBudgetId).then((h) => {
        if (cancelled) return;
        setHydrating(false);
        if (!h) {
          toast.error('Could not load wizard data for this budget.');
          setOpen(false);
          return;
        }
        setStep(0);
        setStudyInputs(h.studyInputs);
        setAssumptions(h.assumptions);
        setDrivers(h.drivers);
        setBudgetName(h.budgetName);
        setSaveAsTemplate(false);
        setTemplateName('');
        setInferredFromDb(h.inferredFromDb);
      });
      return () => {
        cancelled = true;
      };
    }
    setStep(0);
    setStudyInputs(DEFAULT_WIZARD_STUDY_INPUTS);
    setAssumptions(DEFAULT_WIZARD_ASSUMPTIONS);
    setDrivers(DEFAULT_WIZARD_DRIVERS);
    setBudgetName('');
    setSaveAsTemplate(false);
    setTemplateName('');
    setInferredFromDb(false);
  }, [open, isEdit, existingBudgetId, studyId]);

  const buildSnapshot = () =>
    buildWizardInputsSnapshot(studyInputs, assumptions, drivers, {
      saveAsTemplateIntent: saveAsTemplate,
      templateName: saveAsTemplate ? templateName.trim() || budgetName.trim() || null : null,
    });

  const handleGenerateCreate = () => {
    if (!budgetName.trim()) {
      toast.error('Please enter a budget name.');
      return;
    }
    setGenerating(true);
    startTransition(async () => {
      const snapshot = buildSnapshot();
      const { budgetId, error } = await generateBudgetFromTemplate(studyId, generated, {
        budgetName: budgetName.trim(),
        currency,
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName.trim() || budgetName.trim() : undefined,
        companyId,
        wizardInputsSnapshot: snapshot,
      });
      if (error || !budgetId) {
        setGenerating(false);
        toast.error(error ?? 'Failed to generate budget.');
        return;
      }

      setGenerating(false);
      toast.success('Budget generated from wizard!');
      setOpen(false);
      onSuccess();
    });
  };

  const handleSaveMetadata = () => {
    if (!existingBudgetId) return;
    if (!budgetName.trim()) {
      toast.error('Please enter a budget name.');
      return;
    }
    setSavingMeta(true);
    startTransition(async () => {
      const snapshot = buildWizardInputsSnapshot(studyInputs, assumptions, drivers, {
        saveAsTemplateIntent: false,
        templateName: null,
      });
      const { error } = await saveStudyBudgetWizardMetadata(studyId, existingBudgetId, {
        budgetName: budgetName.trim(),
        snapshot,
      });
      setSavingMeta(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Wizard inputs saved. Line items were not changed — use Regenerate to rebuild them.');
      setOpen(false);
      onSuccess();
    });
  };

  const handleRegenerate = () => {
    if (!existingBudgetId) return;
    if (!budgetName.trim()) {
      toast.error('Please enter a budget name.');
      return;
    }
    setGenerating(true);
    startTransition(async () => {
      const snapshot = buildSnapshot();
      const { error } = await regenerateStudyBudgetFromWizard(studyId, existingBudgetId, generated, {
        budgetName: budgetName.trim(),
        currency,
        wizardInputsSnapshot: snapshot,
        saveAsTemplate,
        templateName: saveAsTemplate ? templateName.trim() || budgetName.trim() : undefined,
        companyId,
      });
      setGenerating(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget sections and line items were rebuilt from the wizard.');
      setOpen(false);
      onSuccess();
    });
  };

  const dialogTitle = isEdit ? 'Edit budget wizard inputs' : 'Budget Setup Wizard';

  const dialogDescription = isEdit
    ? 'Update saved wizard fields. Saving inputs updates the study budget record only. Regenerate replaces all sections and line items for this budget (site budgets linked to it may need Re-sync).'
    : 'Answer guided questions to auto-generate a structured budget with sections and line items.';

  const triggerLabel: ReactNode =
    isEdit ? (
      'Edit wizard'
    ) : (
      <>
        <Wand2 className="h-3.5 w-3.5" />
        Create from wizard
      </>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={isEdit ? 'text-xs h-8' : 'text-xs gap-1.5 h-8'}
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-xs">{dialogDescription}</DialogDescription>
        </DialogHeader>

        {hydrating && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading wizard…
          </div>
        )}

        {!hydrating && (
          <>
            {inferredFromDb && isEdit && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5">
                This budget has no saved wizard snapshot. Visits and defaults were inferred from the study and may not match the original wizard session.
              </p>
            )}

            <div className="flex items-center gap-1 py-2">
              {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className={`flex items-center justify-center rounded-full text-[10px] font-semibold w-6 h-6 shrink-0 transition-colors ${
                      i < step
                        ? 'bg-primary text-primary-foreground'
                        : i === step
                          ? 'bg-primary/20 text-primary ring-2 ring-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`text-[10px] ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-0.5" />
                  )}
                </div>
              ))}
            </div>

            <div className="py-2">
              {step === 0 && (
                <StepStudyInputs value={studyInputs} onChange={setStudyInputs} />
              )}
              {step === 1 && <StepFinancialAssumptions value={assumptions} onChange={setAssumptions} />}
              {step === 2 && <StepCostDrivers value={drivers} onChange={setDrivers} />}
              {step === 3 && (
                <StepReviewGenerate
                  generated={generated}
                  currency={currency}
                  budgetName={budgetName}
                  onBudgetNameChange={setBudgetName}
                  saveAsTemplate={saveAsTemplate}
                  onSaveAsTemplateChange={setSaveAsTemplate}
                  templateName={templateName}
                  onTemplateNameChange={setTemplateName}
                  plannedBudgetAmount={studyInputs.plannedBudgetAmount}
                  plannedSitesCount={studyInputs.plannedSitesCount}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <div className="flex-1" />
              {step < 3 ? (
                <Button size="sm" className="text-xs" onClick={() => setStep((s) => s + 1)}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : isEdit ? (
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={savingMeta || generating}
                    onClick={handleSaveMetadata}
                  >
                    {savingMeta && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Save inputs
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs" disabled={generating} />}>
                      Regenerate budget
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate this budget?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes all sections and line items for this study budget and rebuilds them from the current
                          wizard values. Custom edits and procedure grid values will be lost. Site budgets linked to this
                          study budget should be updated with Re-sync where needed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <Button size="sm" className="text-xs" onClick={handleGenerateCreate} disabled={generating}>
                  {generating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Generate Budget
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
