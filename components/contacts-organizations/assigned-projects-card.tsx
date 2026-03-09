'use client';

import { format } from 'date-fns';
import { Plus, Pencil, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContactWithRelations } from '@/lib/types/contacts-organizations';

type ProjectAssignmentRow = {
  id: string;
  protocol_id: string;
  protocol?: { id: string; protocol_number: string | null; title: string | null; status: string | null };
  role: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

interface AssignedProjectsCardProps {
  contact: ContactWithRelations;
  onAssignClick: () => void;
  onEditClick: (pc: ProjectAssignmentRow) => void;
  onDeactivateClick: (params: { relationshipId: string; name: string }) => void;
  onReactivateClick?: (params: { relationshipId: string; name: string }) => void;
}

export function AssignedProjectsCard({ contact, onAssignClick, onEditClick, onDeactivateClick, onReactivateClick }: AssignedProjectsCardProps) {
  const projects = (contact as any).projects ?? [];

  return (
    <Card className="w-[369px]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xs md:text-xs font-medium">Assigned Projects</CardTitle>
        <Button onClick={onAssignClick} size="sm" className="text-xs md:text-xs h-7" title="Assign Project">
          <Plus className="h-3 w-3 mr-1" />
          Assign Project
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((pc: ProjectAssignmentRow) => {
              const protocolName = pc.protocol?.title || pc.protocol?.protocol_number || 'Unknown Project';
              const isInactive = pc.status === 'inactive';

              return (
                <div key={pc.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1 text-xs md:text-xs min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{protocolName}</p>
                      <Badge
                        variant={isInactive ? 'secondary' : 'default'}
                        className="text-[10px] capitalize"
                      >
                        {pc.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5 text-muted-foreground">
                      <p className="text-xs">
                        Start date:{' '}
                        {pc.start_date ? format(new Date(pc.start_date), 'dd-MMM-yyyy') : 'Not set'}
                      </p>
                      <p className="text-xs">
                        End date:{' '}
                        {pc.end_date ? format(new Date(pc.end_date), 'dd-MMM-yyyy') : 'Present'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      onClick={() => onEditClick(pc)}
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!isInactive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => onDeactivateClick({ relationshipId: pc.id, name: protocolName })}
                        title="Deactivate"
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                    {isInactive && onReactivateClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onReactivateClick({ relationshipId: pc.id, name: protocolName })}
                        title="Reactivate"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs md:text-xs text-muted-foreground text-center py-6">
            No projects assigned
          </p>
        )}
      </CardContent>
    </Card>
  );
}
