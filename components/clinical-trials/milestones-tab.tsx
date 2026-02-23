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
  getProtocolMilestones,
  createProtocolMilestone,
  updateProtocolMilestone,
  deleteProtocolMilestone,
  type ProtocolMilestone,
  type MilestoneType,
  type MilestoneStatus,
} from '@/lib/actions/protocol-milestones';

const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  regulatory: 'Regulatory',
  enrollment: 'Enrollment',
  data: 'Data',
  reporting: 'Reporting',
  closeout: 'Closeout',
};

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  completed: 'Completed',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-100 text-yellow-700',
  delayed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

interface MilestonesTabProps {
  protocolId: string;
}

export function MilestonesTab({ protocolId }: MilestonesTabProps) {
  const [milestones, setMilestones] = useState<ProtocolMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<MilestoneType>('regulatory');
  const [baselineDate, setBaselineDate] = useState('');
  const [forecastDate, setForecastDate] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await getProtocolMilestones(protocolId);
    if (result.success && result.data) setMilestones(result.data);
    setIsLoading(false);
  }, [protocolId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const result = await createProtocolMilestone({
      protocol_id: protocolId,
      name: name.trim(),
      milestone_type: type,
      baseline_date: baselineDate || undefined,
      forecast_date: forecastDate || undefined,
    });
    if (result.success) {
      setShowDialog(false);
      setName('');
      setBaselineDate('');
      setForecastDate('');
      load();
      toast({ title: 'Milestone created' });
    }
  };

  const handleStatusChange = async (id: string, status: MilestoneStatus) => {
    const updates: Partial<ProtocolMilestone> = { status };
    if (status === 'completed') updates.actual_date = new Date().toISOString().split('T')[0];
    await updateProtocolMilestone(id, updates);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    await deleteProtocolMilestone(id);
    load();
    toast({ title: 'Milestone deleted' });
  };

  const getVariance = (baseline: string | null, actual: string | null, forecast: string | null) => {
    const target = actual || forecast;
    if (!baseline || !target) return null;
    const diff = Math.round((new Date(target).getTime() - new Date(baseline).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return null;
    return diff > 0 ? `+${diff}d` : `${diff}d`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Protocol Milestones</h3>
        <Button size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Milestone
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Baseline</TableHead>
              <TableHead>Forecast</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : milestones.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No milestones defined</TableCell></TableRow>
            ) : (
              milestones.map((m) => {
                const variance = getVariance(m.baseline_date, m.actual_date, m.forecast_date);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm">{m.name}</TableCell>
                    <TableCell className="text-xs">{MILESTONE_TYPE_LABELS[m.milestone_type]}</TableCell>
                    <TableCell className="text-xs">{m.baseline_date || '—'}</TableCell>
                    <TableCell className="text-xs">{m.forecast_date || '—'}</TableCell>
                    <TableCell className="text-xs">{m.actual_date || '—'}</TableCell>
                    <TableCell className={`text-xs font-medium ${variance && variance.startsWith('+') ? 'text-red-600' : variance ? 'text-green-600' : ''}`}>
                      {variance || '—'}
                    </TableCell>
                    <TableCell>
                      <Select value={m.status} onValueChange={(v) => handleStatusChange(m.id, v as MilestoneStatus)}>
                        <SelectTrigger className="h-7 w-[110px]">
                          <Badge variant="secondary" className={statusColors[m.status]}>
                            {MILESTONE_STATUS_LABELS[m.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First Patient In" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as MilestoneType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MILESTONE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Baseline Date</Label>
                <Input type="date" value={baselineDate} onChange={(e) => setBaselineDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Forecast Date</Label>
                <Input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!name.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
