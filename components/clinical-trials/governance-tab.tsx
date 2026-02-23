'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getProtocolGovernance,
  createProtocolGovernance,
  deleteProtocolGovernance,
  type ProtocolGovernance,
} from '@/lib/actions/protocol-governance';
import { getContacts } from '@/lib/actions/contacts';

const GOVERNANCE_ROLES = [
  { value: 'medical_monitor', label: 'Medical Monitor' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'project_lead', label: 'Project Lead' },
  { value: 'data_manager', label: 'Data Manager' },
  { value: 'statistician', label: 'Statistician' },
];

interface GovernanceTabProps {
  protocolId: string;
  companyId: string;
}

export function GovernanceTab({ protocolId, companyId }: GovernanceTabProps) {
  const [members, setMembers] = useState<ProtocolGovernance[]>([]);
  const [contacts, setContacts] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('medical_monitor');
  const [selectedContactId, setSelectedContactId] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const [govResult, contactsResult] = await Promise.all([
      getProtocolGovernance(protocolId),
      getContacts(companyId, { pageSize: 200 }),
    ]);
    if (govResult.success && govResult.data) setMembers(govResult.data);
    if (contactsResult.success && contactsResult.data) {
      const list = (contactsResult.data as { contacts: { id: string; first_name: string | null; last_name: string | null }[] }).contacts || contactsResult.data;
      setContacts(Array.isArray(list) ? list : []);
    }
    setIsLoading(false);
  }, [protocolId, companyId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!selectedContactId) return;
    const result = await createProtocolGovernance({
      protocol_id: protocolId,
      role: selectedRole,
      contact_id: selectedContactId,
    });
    if (result.success) {
      setShowDialog(false);
      setSelectedContactId('');
      load();
      toast({ title: 'Governance member added' });
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this governance assignment?')) return;
    await deleteProtocolGovernance(id);
    load();
    toast({ title: 'Governance member removed' });
  };

  const roleLabel = (role: string) => GOVERNANCE_ROLES.find(r => r.value === role)?.label || role;
  const formatName = (contact: { first_name: string | null; last_name: string | null } | null | undefined) => {
    if (!contact) return '—';
    return [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Study Governance Team</h3>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="mr-1 h-4 w-4" /> Assign Member
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : members.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No governance assignments yet</TableCell></TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-sm">{roleLabel(m.role)}</TableCell>
                  <TableCell className="text-sm">{formatName(m.contact)}</TableCell>
                  <TableCell className="text-xs">{m.assigned_date || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {m.is_active ? 'Active' : 'Removed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Assign Governance Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOVERNANCE_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger><SelectValue placeholder="Select contact..." /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{formatName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!selectedContactId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
