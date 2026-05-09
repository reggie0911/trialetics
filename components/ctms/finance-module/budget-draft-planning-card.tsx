'use client';

import { useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  archiveBudgetLineItem,
  createBudgetLineItem,
  createBudgetVersion,
} from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_BUDGET_VERSION_STATUS_LABELS,
  FM_UNIT_BASIS_LABELS,
  type FmBudget,
  type FmBudgetCategory,
  type FmBudgetLineItem,
  type FmBudgetVersion,
  type FmUnitBasis,
} from '@/lib/finance-module/types';

const unitBasisValues = [
  'fixed',
  'per_subject',
  'per_visit',
  'per_site',
  'per_month',
  'per_milestone',
  'percent_of_total',
] as const satisfies readonly FmUnitBasis[];

const lineItemSchema = z.object({
  categoryId: z.string().uuid('Choose a category.'),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  unitBasis: z.enum(unitBasisValues),
  quantity: z.coerce.number({ invalid_type_error: 'Quantity required.' }).nonnegative(),
  unitCost: z.coerce.number({ invalid_type_error: 'Unit cost required.' }).nonnegative(),
  currency: z
    .string()
    .trim()
    .length(3, 'Use a 3-letter currency code.')
    .transform((s) => s.toUpperCase()),
  plannedStartDate: z.string().optional().or(z.literal('')),
  plannedEndDate: z.string().optional().or(z.literal('')),
});

type LineItemFormValues = z.infer<typeof lineItemSchema>;

interface BudgetDraftPlanningCardProps {
  studyId: string;
  budget: FmBudget;
  versions: FmBudgetVersion[];
  selectedVersion: FmBudgetVersion | null;
  categories: FmBudgetCategory[];
  lineItems: FmBudgetLineItem[];
  baseCurrency: string;
}

function toOptionalDate(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const t = value.trim();
  if (!t) return null;
  return t;
}

export function BudgetDraftPlanningCard({
  studyId,
  budget,
  versions,
  selectedVersion,
  categories,
  lineItems,
  baseCurrency,
}: BudgetDraftPlanningCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [versionPending, versionTransition] = useTransition();
  const [linePending, lineTransition] = useTransition();
  const [archivePending, archiveTransition] = useTransition();

  const activeCategories = categories.filter((c) => !c.is_archived);
  const categoryNameById = Object.fromEntries(activeCategories.map((c) => [c.id, c.name]));

  const versionLabelForm = useForm<{ label: string }>({
    defaultValues: { label: '' },
  });

  const lineForm = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      categoryId: activeCategories[0]?.id ?? '',
      name: '',
      description: '',
      unitBasis: 'fixed',
      quantity: 1,
      unitCost: 0,
      currency: baseCurrency || 'USD',
      plannedStartDate: '',
      plannedEndDate: '',
    },
  });

  const settingsHref = `/protected/studies/${studyId}/finance-module/settings`;
  const isDraft = selectedVersion?.status === 'draft';
  const visibleLineItems = lineItems.filter((li) => !li.is_archived);

  const firstLineIdByCategory = useMemo(() => {
    const m = new Map<string, string>();
    for (const li of visibleLineItems) {
      if (!m.has(li.category_id)) m.set(li.category_id, li.id);
    }
    return m;
  }, [visibleLineItems]);

  const createVersion = () => {
    const label = versionLabelForm.getValues('label').trim();
    versionTransition(async () => {
      const { data, error } = await createBudgetVersion({
        studyId,
        budgetId: budget.id,
        label: label || null,
      });
      if (error || !data) {
        toast.error(error ?? 'Failed to create version.');
        return;
      }
      toast.success(`Draft version ${data.version_number} created.`);
      versionLabelForm.reset({ label: '' });
      router.push(`${pathname}?version=${encodeURIComponent(data.id)}`);
      router.refresh();
    });
  };

  const onVersionSelect = (versionId: string) => {
    router.push(`${pathname}?version=${encodeURIComponent(versionId)}`);
    router.refresh();
  };

  const onSubmitLine = (values: LineItemFormValues) => {
    if (!selectedVersion) return;
    lineTransition(async () => {
      const { data, error } = await createBudgetLineItem({
        studyId,
        budgetVersionId: selectedVersion.id,
        categoryId: values.categoryId,
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        unitBasis: values.unitBasis,
        quantity: values.quantity,
        unitCost: values.unitCost,
        currency: values.currency,
        plannedStartDate: toOptionalDate(values.plannedStartDate) ?? null,
        plannedEndDate: toOptionalDate(values.plannedEndDate) ?? null,
      });
      if (error || !data) {
        toast.error(error ?? 'Failed to add line item.');
        return;
      }
      toast.success('Line item added.');
      lineForm.reset({
        categoryId: values.categoryId,
        name: '',
        description: '',
        unitBasis: values.unitBasis,
        quantity: 1,
        unitCost: 0,
        currency: values.currency,
        plannedStartDate: '',
        plannedEndDate: '',
      });
      router.refresh();
    });
  };

  const archiveLine = (lineItemId: string, updatedAt: string) => {
    archiveTransition(async () => {
      const { error } = await archiveBudgetLineItem({ studyId, lineItemId, updatedAt });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Line item removed from draft.');
      router.refresh();
    });
  };

  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Draft budget planning</CardTitle>
        <CardDescription className="text-[11px]">
          Create a <strong>draft</strong> budget version, then add line items by category. Only draft
          versions can be edited. Define categories under{' '}
          <Link href={settingsHref} className="text-primary underline-offset-2 hover:underline">
            Finance Settings
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.length === 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-1 flex-1 max-w-xs">
              <label className="text-[11px] font-medium text-muted-foreground">Version label (optional)</label>
              <Input
                {...versionLabelForm.register('label')}
                className="text-xs h-9"
                placeholder="e.g. Initial operating plan"
              />
            </div>
            <Button type="button" size="sm" onClick={createVersion} disabled={versionPending}>
              {versionPending ? 'Creating…' : 'Create draft version'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">Budget version</span>
              <Select
                value={selectedVersion?.id ?? ''}
                onValueChange={(v) => {
                  if (v) onVersionSelect(v);
                }}
              >
                <SelectTrigger className="h-9 w-full max-w-md text-xs">
                  <SelectValue
                    placeholder="Select version"
                    getDisplayLabel={(val) => {
                      if (!val?.trim()) return null;
                      const v = sortedVersions.find((x) => x.id === val);
                      if (!v) return null;
                      const status = FM_BUDGET_VERSION_STATUS_LABELS[v.status];
                      return `Version ${v.version_number}${v.label ? ` · ${v.label}` : ''} · ${status}`;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sortedVersions.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      Version {v.version_number}
                      {v.label ? ` · ${v.label}` : ''} · {FM_BUDGET_VERSION_STATUS_LABELS[v.status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={createVersion} disabled={versionPending}>
              {versionPending ? 'Creating…' : 'New draft version'}
            </Button>
          </div>
        )}

        {selectedVersion && !isDraft ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This version is <strong>{selectedVersion.status}</strong> and cannot be edited. Select a
            draft version or create a new one to add line items.
          </p>
        ) : null}

        {activeCategories.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add at least one budget category in{' '}
            <Link href={settingsHref} className="text-primary underline-offset-2 hover:underline">
              Finance Settings
            </Link>{' '}
            before you can enter line items.
          </p>
        ) : selectedVersion && isDraft ? (
          <>
            <Form {...lineForm}>
              <form
                onSubmit={lineForm.handleSubmit(onSubmitLine)}
                className="grid gap-3 rounded-md border border-border p-3"
              >
                <div className="text-[11px] font-medium text-muted-foreground">Add line item</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    control={lineForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-[11px]">Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                              <SelectValue
                                placeholder="Category"
                                getDisplayLabel={(val) => {
                                  if (!val?.trim()) return null;
                                  const c = activeCategories.find((x) => x.id === val);
                                  return c ? `${c.code} · ${c.name}` : null;
                                }}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-[11px]">Line name</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-xs h-9" placeholder="Description of spend" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="unitBasis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Unit basis</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                              <SelectValue
                                placeholder="Unit basis"
                                getDisplayLabel={(val) => {
                                  if (!val?.trim()) return null;
                                  return FM_UNIT_BASIS_LABELS[val as FmUnitBasis] ?? null;
                                }}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {unitBasisValues.map((ub) => (
                              <SelectItem key={ub} value={ub} className="text-xs">
                                {FM_UNIT_BASIS_LABELS[ub]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" min={0} className="text-xs h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Unit cost</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="any" min={0} className="text-xs h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Currency</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={3} className="text-xs h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="plannedStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">Start (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="text-xs h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lineForm.control}
                    name="plannedEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px]">End (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="text-xs h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" size="sm" disabled={linePending} className="w-fit">
                  {linePending ? 'Adding…' : 'Add line item'}
                </Button>
              </form>
            </Form>

            {visibleLineItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No line items in this draft yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Line</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Basis</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit</TableHead>
                    <TableHead className="text-xs text-right">Planned</TableHead>
                    <TableHead className="text-xs w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLineItems.map((li) => {
                    const ext = Number(li.quantity) * Number(li.unit_cost);
                    const anchorId =
                      firstLineIdByCategory.get(li.category_id) === li.id
                        ? `fm-budget-draft-cat-${li.category_id}`
                        : undefined;
                    return (
                      <TableRow key={li.id} id={anchorId}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{li.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {categoryNameById[li.category_id] ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">{FM_UNIT_BASIS_LABELS[li.unit_basis]}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{li.quantity}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {formatCompactCurrency(Number(li.unit_cost), li.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          {formatCompactCurrency(ext, li.currency)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2"
                            disabled={archivePending}
                            onClick={() => archiveLine(li.id, li.updated_at)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
