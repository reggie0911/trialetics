'use client';

import { useState, useTransition } from 'react';
import { Copy, Trash2, FileDown, Loader2, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { StudyBudgetTemplate } from '@/lib/types/ctms';
import {
  cloneStudyBudgetTemplate,
  deleteStudyBudgetTemplate,
} from '@/lib/actions/study-budget-templates';
import { buildCtaBudgetCsv } from '@/lib/budget-cta-export';

interface BudgetTemplateLibraryProps {
  templates: StudyBudgetTemplate[];
  companyId: string;
  isAdmin: boolean;
  onChanged: () => void;
}

export function BudgetTemplateLibrary({
  templates,
  companyId,
  isAdmin,
  onChanged,
}: BudgetTemplateLibraryProps) {
  const [, startTransition] = useTransition();
  const [cloneDialogTemplateId, setCloneDialogTemplateId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloning, setCloning] = useState(false);

  const handleClone = () => {
    if (!cloneDialogTemplateId || !cloneName.trim()) return;
    setCloning(true);
    startTransition(async () => {
      const { error } = await cloneStudyBudgetTemplate(cloneDialogTemplateId, cloneName.trim(), companyId);
      setCloning(false);
      if (error) { toast.error(error); return; }
      toast.success('Template cloned');
      setCloneDialogTemplateId(null);
      setCloneName('');
      onChanged();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const { error } = await deleteStudyBudgetTemplate(id);
      if (error) { toast.error(error); return; }
      toast.success('Template deleted');
      onChanged();
    });
  };

  const handleDownloadCsv = (template: StudyBudgetTemplate) => {
    // Build a minimal budget-like object from the template for CSV export
    const sections = template.section_definitions.map((sd, i) => ({
      id: `s${i}`,
      budget_id: '',
      section_type: sd.section_type,
      name: sd.name,
      indirect_rate: sd.indirect_rate ?? null,
      sort_order: i,
      created_at: '',
    }));
    const lineItems = template.section_definitions.flatMap((sd, si) =>
      sd.default_lines.map((line, li) => ({
        id: `l${si}_${li}`,
        budget_id: '',
        section_id: `s${si}`,
        category: line.category,
        description: line.description,
        unit_cost: line.unit_cost,
        quantity: line.quantity,
        total_cost: line.unit_cost * line.quantity,
        direct_cost: null,
        indirect_cost: null,
        cost_basis: line.cost_basis ?? null,
        notes: null,
        sort_order: li,
        created_at: '',
      }))
    );
    const csv = buildCtaBudgetCsv({
      budget: {
        id: '',
        study_id: '',
        name: template.name,
        total_amount: 0,
        currency: 'USD',
        status: 'draft',
        template_id: null,
        indirect_rate: template.default_indirect_rate,
        planned_enrollment: null,
        study_duration_months: null,
        created_at: '',
        updated_at: '',
        budget_line_items: lineItems,
        study_budget_sections: sections,
      },
      sections,
      currency: 'USD',
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <LayoutTemplate className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No budget templates yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Templates are created from the Budget Wizard. Use &ldquo;Save as template&rdquo; in Step 4.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Sections</TableHead>
              <TableHead className="text-xs">Indirect rate</TableHead>
              <TableHead className="text-xs">Version</TableHead>
              <TableHead className="text-xs">Last updated</TableHead>
              <TableHead className="text-xs text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="text-xs font-medium">
                  {template.name}
                  {template.cloned_from_id && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">Cloned</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {template.section_definitions.length} section{template.section_definitions.length !== 1 ? 's' : ''}
                </TableCell>
                <TableCell className="text-xs">
                  {template.default_indirect_rate != null
                    ? `${(template.default_indirect_rate * 100).toFixed(0)}%`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs">v{template.version}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(template.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </TableCell>
                <TableCell className="p-2">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Download as CSV"
                      onClick={() => handleDownloadCsv(template)}
                    >
                      <FileDown className="h-3 w-3" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Clone template"
                          onClick={() => {
                            setCloneDialogTemplateId(template.id);
                            setCloneName(`${template.name} (copy)`);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &ldquo;{template.name}&rdquo; will be removed. Budgets generated from it are not affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(template.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Clone dialog */}
      <Dialog open={cloneDialogTemplateId != null} onOpenChange={(open) => { if (!open) setCloneDialogTemplateId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Clone Template</DialogTitle>
            <DialogDescription className="text-xs">Create a copy with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">New template name</Label>
            <Input
              className="text-xs h-9"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="Template name"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCloneDialogTemplateId(null)}>Cancel</Button>
            <Button size="sm" className="text-xs" disabled={cloning || !cloneName.trim()} onClick={handleClone}>
              {cloning && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
