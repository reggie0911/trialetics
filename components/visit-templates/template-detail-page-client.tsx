'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, ListChecks, Plus, Pencil, Trash, DotsThree } from '@phosphor-icons/react';
import type { ClinicalProtocol } from '@/lib/types/clinical-trials';
import TemplateFormDialog from '@/components/visit-templates/template-form-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SubjectVisitTemplateWithRelations } from '@/lib/types/clinical-trials';
import type { TemplateVisit } from '@/lib/actions/template-visits';
import type { TemplateActivity } from '@/lib/actions/template-activities';
import { deleteTemplateVisit } from '@/lib/actions/template-visits';
import { deleteTemplateActivity } from '@/lib/actions/template-activities';
import { useToast } from '@/hooks/use-toast';
import VisitFormDialog from '@/components/visit-templates/visit-form-dialog';
import ActivityFormDialog from '@/components/visit-templates/activity-form-dialog';

interface TemplateDetailPageClientProps {
  templateId: string;
  companyId: string;
  profileId: string;
  email: string;
  protocols: ClinicalProtocol[];
  initialTemplate: SubjectVisitTemplateWithRelations;
}

export default function TemplateDetailPageClient({ 
  templateId, 
  companyId,
  profileId,
  email,
  protocols,
  initialTemplate 
}: TemplateDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<TemplateActivity | null>(null);
  const [selectedVisitForActivity, setSelectedVisitForActivity] = useState<string | null>(null);

  const template = initialTemplate;
  const visits = template.visits || [];

  const handleRefresh = () => {
    router.refresh();
  };

  const handleAddVisit = () => {
    setSelectedVisit(null);
    setShowVisitDialog(true);
  };

  const handleEditVisit = (visit: any) => {
    setSelectedVisit(visit);
    setShowVisitDialog(true);
  };

  const handleDeleteVisit = async (visitId: string, visitName: string) => {
    if (!confirm(`Are you sure you want to delete "${visitName}"? This will also delete all activities for this visit.`)) {
      return;
    }

    const result = await deleteTemplateVisit(companyId, visitId);
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Visit deleted successfully',
      });
      handleRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete visit',
        variant: 'destructive',
      });
    }
  };

  const handleAddActivity = (visitId: string) => {
    setSelectedActivity(null);
    setSelectedVisitForActivity(visitId);
    setShowActivityDialog(true);
  };

  const handleEditActivity = (activity: TemplateActivity, visitId: string) => {
    setSelectedActivity(activity);
    setSelectedVisitForActivity(visitId);
    setShowActivityDialog(true);
  };

  const handleDeleteActivity = async (activityId: string, activityName: string) => {
    if (!confirm(`Are you sure you want to delete "${activityName}"?`)) {
      return;
    }

    const result = await deleteTemplateActivity(companyId, activityId);
    
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
      handleRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete activity',
        variant: 'destructive',
      });
    }
  };

  if (!template) {
    return (
      <div className="p-6 bg-[#E9E9E9] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-6 text-center text-xs text-muted-foreground">
              Template not found
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#E9E9E9] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-xs"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditTemplateDialog(true)}
            className="text-xs"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Template
          </Button>
        </div>

        {/* Template Overview */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-base font-semibold">
                  {template.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={template.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.description && (
              <p className="text-xs text-muted-foreground">{template.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Version</div>
                <div className="text-xs font-medium">{template.version_number}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Protocol</div>
                <div className="text-xs font-medium">
                  {template.protocol?.protocol_number || 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Total Visits</div>
                <div className="text-xs font-medium">{visits.length}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-xs font-medium">
                  {template.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visits List */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Visit Schedule ({visits.length} visits)
              </CardTitle>
              <Button
                size="sm"
                onClick={handleAddVisit}
                className="h-8 text-xs"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Visit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="mb-2">No visits defined for this template</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddVisit}
                  className="h-8 text-xs"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Visit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.map((visit: any) => (
                  <div key={visit.id} className="border rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Visit {visit.sequence}
                            </Badge>
                            <h3 className="text-xs font-semibold">{visit.visit_name}</h3>
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {visit.visit_type}
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-gray-100">
                            <DotsThree className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleEditVisit(visit)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Visit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddActivity(visit.id)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteVisit(visit.id, visit.visit_name)}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Visit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Day from baseline:</span>{' '}
                          <span className="font-medium">{visit.day_from_baseline}</span>
                        </div>
                        {visit.visit_window_before !== null && (
                          <div>
                            <span className="text-muted-foreground">Window before:</span>{' '}
                            <span className="font-medium">{visit.visit_window_before} days</span>
                          </div>
                        )}
                        {visit.visit_window_after !== null && (
                          <div>
                            <span className="text-muted-foreground">Window after:</span>{' '}
                            <span className="font-medium">{visit.visit_window_after} days</span>
                          </div>
                        )}
                      </div>

                      {visit.description && (
                        <p className="text-xs text-muted-foreground">{visit.description}</p>
                      )}

                      {/* Activities for this visit */}
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <ListChecks className="h-3 w-3" />
                            Activities ({visit.activities?.length || 0})
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddActivity(visit.id)}
                            className="h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Activity
                          </Button>
                        </div>
                        
                        {visit.activities && visit.activities.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {visit.activities.map((activity: any) => (
                              <div
                                key={activity.id}
                                className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded p-2"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge
                                    variant={activity.is_required ? 'default' : 'outline'}
                                    className="text-[10px] px-1.5 py-0 shrink-0"
                                  >
                                    {activity.is_required ? 'Required' : 'Optional'}
                                  </Badge>
                                  <span className="text-muted-foreground capitalize shrink-0">
                                    {activity.activity_type}:
                                  </span>
                                  <span className="font-medium truncate">{activity.activity_name}</span>
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex items-center justify-center h-6 w-6 p-0 rounded-md hover:bg-gray-200 shrink-0">
                                    <DotsThree className="h-3 w-3" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem onClick={() => handleEditActivity(activity, visit.id)}>
                                      <Pencil className="mr-2 h-3 w-3" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteActivity(activity.id, activity.activity_name)}
                                      className="text-destructive"
                                    >
                                      <Trash className="mr-2 h-3 w-3" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-4 border-2 border-dashed rounded">
                            No activities added yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <VisitFormDialog
          open={showVisitDialog}
          onOpenChange={setShowVisitDialog}
          onSuccess={handleRefresh}
          companyId={companyId}
          templateId={templateId}
          visit={selectedVisit}
        />

        <ActivityFormDialog
          open={showActivityDialog}
          onOpenChange={setShowActivityDialog}
          onSuccess={handleRefresh}
          companyId={companyId}
          visitId={selectedVisitForActivity || ''}
          activity={selectedActivity}
        />

        <TemplateFormDialog
          open={showEditTemplateDialog}
          onOpenChange={setShowEditTemplateDialog}
          onSuccess={handleRefresh}
          protocols={protocols}
          companyId={companyId}
          profileId={profileId}
          email={email}
          template={template}
        />
      </div>
    </div>
  );
}
