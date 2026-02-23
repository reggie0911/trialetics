'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getProtocolRiskResolutionActivities,
  createProtocolRiskResolutionActivity,
  updateProtocolRiskResolutionActivity,
  deleteProtocolRiskResolutionActivity,
} from '@/lib/actions/protocol-risk-resolution-activities';
import type { ProtocolRisk } from '@/lib/types/risk-management';
import { RISK_LEVEL_LABELS, RESOLUTION_STATUS_LABELS } from '@/lib/types/risk-management';
import type { ProtocolRiskResolutionActivity } from '@/lib/actions/protocol-risk-resolution-activities';

interface RiskResolutionPanelProps {
  risk: ProtocolRisk;
  onClose: () => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function RiskResolutionPanel({ risk, onClose, onRefresh }: RiskResolutionPanelProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ProtocolRiskResolutionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    const res = await getProtocolRiskResolutionActivities(risk.id);
    if (res.success && res.data) setActivities(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadActivities();
  }, [risk.id]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await createProtocolRiskResolutionActivity({
      protocol_risk_id: risk.id,
      name: newName.trim(),
      sort_order: activities.length,
    });
    setAdding(false);
    if (res.success) {
      setNewName('');
      loadActivities();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleStatusToggle = async (activity: ProtocolRiskResolutionActivity) => {
    const nextStatus = activity.status === 'completed' ? 'pending' : 'completed';
    const res = await updateProtocolRiskResolutionActivity(activity.id, {
      status: nextStatus,
      completed_date: nextStatus === 'completed' ? new Date().toISOString() : null,
    });
    if (res.success) {
      loadActivities();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteProtocolRiskResolutionActivity(id);
    if (res.success) loadActivities();
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium">{risk.title}</h4>
          <p className="text-xs text-muted-foreground">Resolution activities</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded border p-2">
              <button
                className={`h-4 w-4 shrink-0 rounded border ${
                  a.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}
                onClick={() => handleStatusToggle(a)}
              />
              <span className={`flex-1 text-sm ${a.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {a.name}
              </span>
              <Badge variant="outline" className={statusColors[a.status]}>
                {RESOLUTION_STATUS_LABELS[a.status as keyof typeof RESOLUTION_STATUS_LABELS] || a.status}
              </Badge>
              {a.due_date && (
                <span className="text-xs text-muted-foreground">
                  Due {new Date(a.due_date).toLocaleDateString()}
                </span>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => handleDelete(a.id)}>
                ×
              </Button>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New resolution activity..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
