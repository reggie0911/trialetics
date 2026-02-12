'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { getVisitTemplates } from '@/lib/actions/subject-visit-templates';
import { getAllClinicalProtocols } from '@/lib/actions/clinical-protocols';
import type { SubjectVisitTemplateWithRelations, ClinicalProtocol } from '@/lib/types/clinical-trials';
import TemplateList from '@/components/visit-templates/template-list';
import TemplateFormDialog from '@/components/visit-templates/template-form-dialog';

interface VisitTemplatesPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export default function VisitTemplatesPageClient({ companyId, profileId, email }: VisitTemplatesPageClientProps) {
  const [templates, setTemplates] = useState<SubjectVisitTemplateWithRelations[]>([]);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [selectedActive, setSelectedActive] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, protocolsRes] = await Promise.all([
        getVisitTemplates(companyId, {
          protocol_id: selectedProtocol !== 'all' ? selectedProtocol : undefined,
          is_active: selectedActive === 'active' ? true : selectedActive === 'inactive' ? false : undefined,
        }),
        getAllClinicalProtocols(companyId),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data.templates);
      }

      if (protocolsRes.success && protocolsRes.data) {
        setProtocols(protocolsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedProtocol, selectedActive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.version_number.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#E9E9E9] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-xs font-semibold">Visit Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Search</label>
                <div className="relative">
                  <MagnifyingGlass className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
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
                <Select value={selectedProtocol} onValueChange={(v) => setSelectedProtocol(v ?? '')}>
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
                    {protocols.map((protocol) => (
                      <SelectItem key={protocol.id} value={protocol.id} className="text-xs">
                        {protocol.protocol_number} - {protocol.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <Select value={selectedActive} onValueChange={(v) => setSelectedActive(v ?? '')}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue
                      placeholder="All"
                      getDisplayLabel={(value) => {
                        if (value === 'all') return 'All';
                        if (value === 'active') return 'Active';
                        if (value === 'inactive') return 'Inactive';
                        return value;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
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

        {/* Templates List */}
        <TemplateList
          templates={filteredTemplates}
          loading={loading}
          onRefresh={loadData}
          companyId={companyId}
          profileId={profileId}
          email={email}
        />

        {/* Create Dialog */}
        <TemplateFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={loadData}
          protocols={protocols}
          companyId={companyId}
          profileId={profileId}
          email={email}
        />
      </div>
    </div>
  );
}
