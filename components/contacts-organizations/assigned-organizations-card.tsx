'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ContactWithRelations } from '@/lib/types/contacts-organizations';

interface AssignedOrganizationsCardProps {
  contact: ContactWithRelations;
  onAssignClick: () => void;
  onRemoveClick: (params: { relationshipId: string; name: string }) => void;
}

export function AssignedOrganizationsCard({ contact, onAssignClick, onRemoveClick }: AssignedOrganizationsCardProps) {
  return (
    <Card className="w-[369px]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-xs md:text-xs font-medium">Assigned Organizations</CardTitle>
        <Button onClick={onAssignClick} size="sm" className="text-xs md:text-xs h-7">
          <Plus className="h-3 w-3 mr-1" />
          Assign Organization
        </Button>
      </CardHeader>
      <CardContent>
        {contact.organizations && contact.organizations.length > 0 ? (
          <div className="space-y-3">
            {contact.organizations.map((oc) => {
              const addr = (oc.organization as any)?.primary_address;
              const hasAddress =
                addr && (addr.street_1 || addr.street_2 || addr.city || addr.state || addr.postal_code || addr.country);
              const addressStr = hasAddress
                ? [
                    addr.street_1,
                    addr.street_2,
                    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
                    addr.country,
                  ].filter(Boolean).join(', ')
                : null;
              return (
                <div key={oc.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1 text-xs md:text-xs min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{oc.organization.name}</p>
                      {oc.is_primary && (
                        <Badge variant="default" className="text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                    {addressStr && (
                      <p className="text-muted-foreground mt-1">{addressStr}</p>
                    )}
                    {(oc.start_date || oc.end_date) && (
                      <p className="text-muted-foreground mt-0.5">
                        {oc.start_date && new Date(oc.start_date).toLocaleDateString()}
                        {' – '}
                        {oc.end_date ? new Date(oc.end_date).toLocaleDateString() : 'Present'}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveClick({ relationshipId: oc.id, name: oc.organization.name })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs md:text-xs text-muted-foreground text-center py-6">
            No organizations assigned
          </p>
        )}
      </CardContent>
    </Card>
  );
}
