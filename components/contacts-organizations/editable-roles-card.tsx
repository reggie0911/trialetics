'use client';

import { useState, useEffect } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCtmsRoles, getContactRoleAssignments, setContactRoleAssignments } from '@/lib/actions/contact-roles';
import { RoleMultiSelect } from './role-multi-select';
import type { CtmsRole } from '@/lib/types/contacts-organizations';

interface EditableRolesCardProps {
  contactId: string;
  initialRoleIds?: string[];
  onSuccess: () => void;
}

export function EditableRolesCard({ contactId, initialRoleIds = [], onSuccess }: EditableRolesCardProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allRoles, setAllRoles] = useState<CtmsRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialRoleIds);
  const [draftRoleIds, setDraftRoleIds] = useState<string[]>(initialRoleIds);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCtmsRoles().then((r) => {
      if (r.success && r.data) setAllRoles(r.data);
    });
    getContactRoleAssignments(contactId).then((r) => {
      if (r.success && r.data) {
        const ids = r.data.map((a) => a.role_id);
        setSelectedRoleIds(ids);
        setDraftRoleIds(ids);
      }
      setLoaded(true);
    });
  }, [contactId]);

  const handleEdit = () => {
    setDraftRoleIds(selectedRoleIds);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraftRoleIds(selectedRoleIds);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await setContactRoleAssignments(contactId, draftRoleIds);
    setSaving(false);
    if (result.success) {
      setSelectedRoleIds(draftRoleIds);
      toast({ title: 'Roles updated' });
      setEditing(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const selectedRoles = allRoles.filter((r) => selectedRoleIds.includes(r.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-xs font-medium">Roles</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleEdit} title="Edit">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <RoleMultiSelect
              value={draftRoleIds}
              onChange={setDraftRoleIds}
              roles={allRoles}
              placeholder="Select roles"
              className="text-xs"
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs h-7">
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving} className="text-xs h-7">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {!loaded ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : selectedRoles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedRoles.map((role) => (
                  <Badge key={role.id} variant="secondary" className="text-xs">
                    {role.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No roles assigned</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
