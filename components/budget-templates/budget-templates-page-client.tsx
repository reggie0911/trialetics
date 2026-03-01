'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Loader2, Trash2, Eye, Pencil } from 'lucide-react';
import { getBudgetTemplates, deleteBudgetTemplate } from '@/lib/actions/budget-templates';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import type { BudgetTemplateWithRelations } from '@/lib/types/budget-templates';
import type { BudgetTemplateStatus } from '@/lib/types/budget-templates';
import { BUDGET_TEMPLATE_STATUS_LABELS } from '@/lib/types/budget-templates';
import BudgetTemplateFormDialog from './budget-template-form-dialog';
import { useToast } from '@/hooks/use-toast';

interface Protocol {
  id: string;
  protocol_number: string;
  title: string;
}

interface BudgetTemplatesPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

const statusVariant: Record<BudgetTemplateStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  archived: 'outline',
};

export default function BudgetTemplatesPageClient({ companyId }: BudgetTemplatesPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<BudgetTemplateWithRelations[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplateWithRelations | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, protocolsRes] = await Promise.all([
        getBudgetTemplates(
          companyId,
          selectedProtocol !== 'all' ? selectedProtocol : undefined
        ),
        getAllClinicalProtocols(companyId),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }

      if (protocolsRes.success && protocolsRes.data) {
        setProtocols(protocolsRes.data as Protocol[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedProtocol]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    const result = await deleteBudgetTemplate(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Budget template deleted.' });
      loadData();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete', variant: 'destructive' });
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.protocol?.protocol_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="min-h-screen bg-[#E9E9E9] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-xs font-semibold">Budget Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs h-8 pl-8"
                  />
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <label className="text-xs font-medium">Protocol</label>
                <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                  <SelectTrigger className="text-xs h-8 w-full min-w-0 [&_[data-slot=select-value]]:truncate">
                    <SelectValue
                      placeholder="All Protocols"
                      getDisplayLabel={(value) => {
                        if (value === 'all') return 'All Protocols';
                        const p = protocols.find((pr) => pr.id === value);
                        return p ? `${p.protocol_number} - ${p.title}` : value;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Protocols</SelectItem>
                    {protocols.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.protocol_number} - {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue
                      placeholder="All"
                      getDisplayLabel={(value) => {
                        if (value === 'all') return 'All';
                        if (value === 'draft') return 'Draft';
                        if (value === 'active') return 'Active';
                        if (value === 'archived') return 'Archived';
                        return value;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex flex-col">
                <label className="text-xs font-medium invisible">Action</label>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full h-8 text-xs"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-xs text-muted-foreground">
                {searchQuery || selectedStatus !== 'all'
                  ? 'No templates match your filters.'
                  : 'No budget templates yet. Create one to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const totalAmount = template.items?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;
              const itemCount = template.items?.length ?? 0;

              return (
                <Card
                  key={template.id}
                  className="bg-white hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/protected/budget-templates/${template.id}`)}
                >
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-xs font-semibold truncate">{template.name}</h3>
                        {template.protocol && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {template.protocol.protocol_number} - {template.protocol.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Badge variant={statusVariant[template.status]} className="text-[10px]">
                          {BUDGET_TEMPLATE_STATUS_LABELS[template.status]}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                            <MoreVertical className="h-3 w-3" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => router.push(`/protected/budget-templates/${template.id}`)}
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => setEditingTemplate(template)}
                            >
                              <Pencil className="mr-2 h-3 w-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs text-destructive"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {template.description && (
                      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2 mt-2">
                      <span>v{template.version}</span>
                      <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      {totalAmount > 0 && <span className="font-medium text-foreground">{formatCurrency(totalAmount)}</span>}
                      {template.is_default && (
                        <Badge variant="outline" className="text-[9px] h-4">Default</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <BudgetTemplateFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={loadData}
          protocols={protocols}
          companyId={companyId}
        />

        {editingTemplate && (
          <BudgetTemplateFormDialog
            open={!!editingTemplate}
            onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
            onSuccess={loadData}
            protocols={protocols}
            companyId={companyId}
            template={editingTemplate}
          />
        )}
      </div>
    </div>
  );
}
