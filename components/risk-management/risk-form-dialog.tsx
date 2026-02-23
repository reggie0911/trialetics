'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createProtocolRisk, updateProtocolRisk } from '@/lib/actions/protocol-risks';
import type { ProtocolRisk, RiskCategory } from '@/lib/types/risk-management';
import {
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_CATEGORY_LABELS,
} from '@/lib/types/risk-management';

interface RiskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: ProtocolRisk | null;
  companyId: string;
  onSuccess: () => void;
}

export function RiskFormDialog({ open, onOpenChange, risk, companyId, onSuccess }: RiskFormDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [impact, setImpact] = useState('');
  const [identifiedDate, setIdentifiedDate] = useState('');
  const [protocolId, setProtocolId] = useState('');

  useEffect(() => {
    if (risk) {
      setTitle(risk.title);
      setDescription(risk.description || '');
      setRiskLevel(risk.risk_level || '');
      setStatus(risk.status);
      setCategory(risk.category || '');
      setLikelihood(risk.likelihood?.toString() || '');
      setImpact(risk.impact?.toString() || '');
      setIdentifiedDate(risk.identified_date || '');
      setProtocolId(risk.protocol_id);
    } else {
      setTitle('');
      setDescription('');
      setRiskLevel('');
      setStatus('open');
      setCategory('');
      setLikelihood('');
      setImpact('');
      setIdentifiedDate(new Date().toISOString().split('T')[0]);
      setProtocolId('');
    }
  }, [risk, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    if (risk) {
      const res = await updateProtocolRisk(risk.id, {
        title,
        description: description || null,
        risk_level: riskLevel ? (riskLevel as ProtocolRisk['risk_level']) : null,
        status: status as ProtocolRisk['status'],
        identified_date: identifiedDate || null,
      });
      if (res.success) {
        toast({ title: 'Risk updated' });
        onSuccess();
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } else {
      if (!protocolId) {
        toast({ title: 'Protocol ID is required for new risks', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const res = await createProtocolRisk({
        protocol_id: protocolId,
        title,
        description: description || null,
        risk_level: riskLevel ? (riskLevel as ProtocolRisk['risk_level']) : null,
        identified_date: identifiedDate || null,
      });
      if (res.success) {
        toast({ title: 'Risk created' });
        onSuccess();
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!risk && (
            <div className="space-y-1">
              <Label>Protocol ID</Label>
              <Input
                value={protocolId}
                onChange={(e) => setProtocolId(e.target.value)}
                placeholder="Enter protocol ID"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Risk title" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the risk..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Identified Date</Label>
              <Input
                type="date"
                value={identifiedDate}
                onChange={(e) => setIdentifiedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Likelihood (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={likelihood}
                onChange={(e) => setLikelihood(e.target.value)}
                placeholder="1-5"
              />
            </div>
            <div className="space-y-1">
              <Label>Impact (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="1-5"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : risk ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
