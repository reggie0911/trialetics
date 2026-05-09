'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  archiveBudgetCategory,
  createBudgetCategory,
  restoreBudgetCategory,
  updateBudgetCategory,
} from '@/lib/actions/study-finance-module';
import type { FmBudgetCategory } from '@/lib/finance-module/types';

const categorySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(50),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const editCategorySchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(50),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().nonnegative(),
});

type EditCategoryFormValues = z.infer<typeof editCategorySchema>;

interface BudgetCategoriesSettingsCardProps {
  studyId: string;
  workspaceId: string;
  categories: FmBudgetCategory[];
}

export function BudgetCategoriesSettingsCard({
  studyId,
  workspaceId,
  categories,
}: BudgetCategoriesSettingsCardProps) {
  const router = useRouter();
  const [formPending, formTransition] = useTransition();
  const [archivePending, archiveTransition] = useTransition();
  const [editPending, editTransition] = useTransition();
  const [restorePending, restoreTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const editForm = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: { code: '', name: '', description: '', sortOrder: 0 },
  });

  const onSubmit = (values: CategoryFormValues) => {
    formTransition(async () => {
      const { error } = await createBudgetCategory({
        studyId,
        workspaceId,
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Category added.');
      form.reset({ code: '', name: '', description: '' });
      router.refresh();
    });
  };

  const openEdit = (cat: FmBudgetCategory) => {
    setEditCategoryId(cat.id);
    editForm.reset({
      code: cat.code,
      name: cat.name,
      description: cat.description ?? '',
      sortOrder: cat.sort_order,
    });
    setEditOpen(true);
  };

  const onEditSubmit = (values: EditCategoryFormValues) => {
    if (!editCategoryId) return;
    editTransition(async () => {
      const cat = categories.find((c) => c.id === editCategoryId);
      if (!cat) {
        toast.error('Category not found.');
        return;
      }
      const { error } = await updateBudgetCategory({
        studyId,
        categoryId: editCategoryId,
        updatedAt: cat.updated_at,
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        sortOrder: values.sortOrder,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Category updated.');
      setEditOpen(false);
      setEditCategoryId(null);
      router.refresh();
    });
  };

  const active = categories.filter((c) => !c.is_archived);
  const archived = categories.filter((c) => c.is_archived);

  return (
    <Card id="fm-settings-budget-categories">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Categories</CardTitle>
        <CardDescription className="text-[11px]">
          Categories drive budget versions, line items, invoice classification, and reports. Add
          them here, then enter line items on the Study Budget Tracker tab for a draft version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px]">Code</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-xs h-9" placeholder="e.g. CRO" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="text-[11px]">Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="text-xs h-9" placeholder="Category name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-3">
                  <FormLabel className="text-[11px]">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} className="text-xs min-h-0 resize-y" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={formPending}>
                {formPending ? 'Adding…' : 'Add category'}
              </Button>
            </div>
          </form>
        </Form>

        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No categories yet. Add at least one category before you can plan line items on the
            Budget Tracker.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((cat) => (
              <li
                key={cat.id}
                className="border rounded-md p-2 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{cat.name}</div>
                  {cat.description ? (
                    <div className="text-[11px] text-muted-foreground truncate">{cat.description}</div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono">{cat.code}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={archivePending || editPending}
                      onClick={() => openEdit(cat)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-muted-foreground"
                      disabled={archivePending}
                      onClick={() => {
                        archiveTransition(async () => {
                          const { error: archErr } = await archiveBudgetCategory({
                            studyId,
                            categoryId: cat.id,
                            updatedAt: cat.updated_at,
                          });
                          if (archErr) {
                            toast.error(archErr);
                            return;
                          }
                          toast.success('Category archived.');
                          router.refresh();
                        });
                      }}
                    >
                      Archive
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[11px] font-medium text-muted-foreground">Archived categories</p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {archived.map((cat) => (
                <li
                  key={cat.id}
                  className="border rounded-md border-dashed p-2 flex items-start justify-between gap-2 opacity-90"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate text-muted-foreground">{cat.name}</div>
                    <span className="text-[10px] font-mono text-muted-foreground">{cat.code}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 text-[11px]"
                    disabled={restorePending}
                    onClick={() => {
                      restoreTransition(async () => {
                        const { error: rErr } = await restoreBudgetCategory({
                          studyId,
                          categoryId: cat.id,
                          updatedAt: cat.updated_at,
                        });
                        if (rErr) {
                          toast.error(rErr);
                          return;
                        }
                        toast.success('Category restored.');
                        router.refresh();
                      });
                    }}
                  >
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditCategoryId(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit category</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid gap-3">
                <FormField
                  control={editForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Code</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Sort order</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} className="text-xs min-h-0 resize-y" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" size="sm" disabled={editPending}>
                    {editPending ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
