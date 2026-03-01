'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Loader2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getBudgetTemplate,
  updateBudgetTemplate,
  deleteBudgetTemplate,
  deleteBudgetTemplateItem,
} from '@/lib/actions/budget-templates';
import type {
  BudgetTemplateWithRelations,
  BudgetTemplateItem,
  BudgetTemplateStatus,
} from '@/lib/types/budget-templates';
import {
  BUDGET_TEMPLATE_STATUS_LABELS,
  BUDGET_CATEGORY_LABELS,
} from '@/lib/types/budget-templates';
import BudgetTemplateFormDialog from './budget-template-form-dialog';
import BudgetTemplateItemFormDialog from './budget-template-item-form-dialog';
import CloneToSiteBudgetDialog from './clone-to-site-budget-dialog';
import { useToast } from '@/hooks/use-toast';

interface BudgetTemplateDetailClientProps {
  templateId: string;
  companyId: string;
  profileId: string;
  protocols: { id: string; protocol_number: string; title: string }[];
  sites: { id: string; site_number: string | null; protocol_id: string }[];
  initialTemplate: BudgetTemplateWithRelations;
}

const statusVariant: Record<BudgetTemplateStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  archived: 'outline',
};

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

export default function BudgetTemplateDetailClient({
  templateId,
  companyId,
  profileId,
  protocols,
  sites,
  initialTemplate,
}: BudgetTemplateDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<BudgetTemplateWithRelations>(initialTemplate);
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetTemplateItem | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const items = template.items || [];
  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount), 0);

  const refreshTemplate = useCallback(async () => {
    setLoading(true);
    const result = await getBudgetTemplate(templateId);
    if (result.success && result.data) {
      setTemplate(result.data);
    }
    setLoading(false);
  }, [templateId]);

  useEffect(() => {
    setTemplate(initialTemplate);
  }, [initialTemplate]);

  const handleStatusChange = async (newStatus: BudgetTemplateStatus) => {
    const result = await updateBudgetTemplate(templateId, { status: newStatus });
    if (result.success) {
      toast({ title: 'Success', description: `Status changed to ${BUDGET_TEMPLATE_STATUS_LABELS[newStatus]}.` });
      refreshTemplate();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update status.', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async () => {
    const result = await deleteBudgetTemplate(templateId);
    if (result.success) {
      toast({ title: 'Success', description: 'Template deleted.' });
      router.push('/protected/budget-templates');
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete.', variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const result = await deleteBudgetTemplateItem(itemId);
    if (result.success) {
      toast({ title: 'Success', description: 'Item deleted.' });
      refreshTemplate();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete item.', variant: 'destructive' });
    }
  };

  const getCategoryLabel = (category: string) =>
    BUDGET_CATEGORY_LABELS[category as keyof typeof BUDGET_CATEGORY_LABELS] || category;

  return (
    <div className="min-h-screen bg-[#E9E9E9] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/protected/budget-templates')}
            className="text-xs"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Budget Templates
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloneDialog(true)}
              className="text-xs"
            >
              <Copy className="mr-2 h-3 w-3" />
              Clone to Site Budget
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="text-xs"
            >
              <Pencil className="mr-2 h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTemplate}
              className="text-xs"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>

        {/* Template Header */}
        <Card className="bg-white">
          <CardContent className="pt-4 pb-4 px-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold">{template.name}</h1>
                {template.protocol && (
                  <p className="text-xs text-muted-foreground">
                    Protocol: {template.protocol.protocol_number} - {template.protocol.title}
                  </p>
                )}
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[template.status]} className="text-[10px]">
                  {BUDGET_TEMPLATE_STATUS_LABELS[template.status]}
                </Badge>
                {template.is_default && (
                  <Badge variant="outline" className="text-[10px]">Default</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground border-t pt-3">
              <span>Version: {template.version}</span>
              <span>{items.length} line item{items.length !== 1 ? 's' : ''}</span>
              <span className="font-medium text-foreground">Total: {formatCurrency(totalAmount)}</span>

              {template.status === 'draft' && (
                <Button variant="outline" size="sm" className="text-xs h-6 ml-auto" onClick={() => handleStatusChange('active')}>
                  Activate
                </Button>
              )}
              {template.status === 'active' && (
                <Button variant="outline" size="sm" className="text-xs h-6 ml-auto" onClick={() => handleStatusChange('archived')}>
                  Archive
                </Button>
              )}
              {template.status === 'archived' && (
                <Button variant="outline" size="sm" className="text-xs h-6 ml-auto" onClick={() => handleStatusChange('draft')}>
                  Revert to Draft
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold">Line Items</CardTitle>
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={() => { setEditingItem(null); setShowItemDialog(true); }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No line items yet. Add items to define the budget structure.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Subcategory</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Currency</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.subcategory || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{item.description || '-'}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCurrency(Number(item.amount), item.currency)}
                      </TableCell>
                      <TableCell className="text-xs">{item.currency}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                            <MoreVertical className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => { setEditingItem(item); setShowItemDialog(true); }}
                            >
                              <Pencil className="mr-2 h-3 w-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs text-destructive"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={4} className="text-xs text-right">Total</TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <BudgetTemplateFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={refreshTemplate}
          protocols={protocols}
          companyId={companyId}
          template={template}
        />

        <BudgetTemplateItemFormDialog
          open={showItemDialog}
          onOpenChange={(open) => { setShowItemDialog(open); if (!open) setEditingItem(null); }}
          onSuccess={refreshTemplate}
          templateId={templateId}
          item={editingItem}
        />

        <CloneToSiteBudgetDialog
          open={showCloneDialog}
          onOpenChange={setShowCloneDialog}
          templateId={templateId}
          companyId={companyId}
          sites={sites}
          protocols={protocols}
          templateProtocolId={template.protocol_id}
        />
      </div>
    </div>
  );
}
