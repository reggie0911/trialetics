'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsThree, Eye, Copy, Check, Trash } from '@phosphor-icons/react';
import type { SubjectVisitTemplateWithRelations } from '@/lib/types/clinical-trials';
import { deleteVisitTemplate, activateTemplate } from '@/lib/actions/subject-visit-templates';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import CopyVersionDialog from '@/components/visit-templates/copy-version-dialog';

interface TemplateListProps {
  templates: SubjectVisitTemplateWithRelations[];
  loading: boolean;
  onRefresh: () => void;
  companyId: string;
  profileId: string;
  email: string;
}

export default function TemplateList({ templates, loading, onRefresh, companyId, profileId, email }: TemplateListProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTemplate, setCopyTemplate] = useState<SubjectVisitTemplateWithRelations | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeletingId(id);
    const result = await deleteVisitTemplate(companyId, id);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete template',
        variant: 'destructive',
      });
    }
    setDeletingId(null);
  };

  const handleActivate = async (id: string) => {
    const result = await activateTemplate(companyId, id);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Template activated successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to activate template',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          Loading templates...
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No templates found. Create a new template to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-xs font-semibold">
          Templates ({templates.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold">{template.name}</h3>
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Version:</span> {template.version_number}
                    </div>
                    <div>
                      <span className="font-medium">Protocol:</span>{' '}
                      {template.protocol?.protocol_number || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Visits:</span> {template.visits_count || 0}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-gray-100">
                    <DotsThree className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem
                      onClick={() => router.push(`/protected/visit-templates/${template.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>

                    {!template.is_active && (
                      <DropdownMenuItem onClick={() => handleActivate(template.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        Activate Template
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => {
                        setCopyTemplate(template);
                        setShowCopyDialog(true);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to New Version
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CopyVersionDialog
        open={showCopyDialog && !!copyTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCopyDialog(false);
            setCopyTemplate(null);
          }
        }}
        onSuccess={() => {
          onRefresh();
          setCopyTemplate(null);
          setShowCopyDialog(false);
        }}
        companyId={companyId}
        profileId={profileId}
        email={email}
        templateId={copyTemplate?.id ?? ''}
        templateName={copyTemplate?.name}
        currentVersion={copyTemplate?.version_number}
        navigateToNew={true}
      />
    </Card>
  );
}
