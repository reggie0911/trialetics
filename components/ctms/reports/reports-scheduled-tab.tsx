'use client';

import { useState } from 'react';
import { CalendarClock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { saveReportDefinition } from '@/lib/actions/reports';
import type { ReportDatasetKey } from '@/lib/types/reports';

interface ReportsScheduledTabProps {
  studyId: string;
  datasetKey: ReportDatasetKey;
  selectedFields: string[];
}

export function ReportsScheduledTab({ studyId, datasetKey, selectedFields }: ReportsScheduledTabProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [deliveryTarget, setDeliveryTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const saveScheduleConfig = async () => {
    if (!name.trim()) {
      toast.error('Name is required to save a schedule config.');
      return;
    }
    if (!selectedFields.length) {
      toast.error('Configure fields first in Custom Builder before saving schedule config.');
      return;
    }

    setSaving(true);
    const out = await saveReportDefinition({
      studyId,
      name: name.trim(),
      description: 'Scheduled delivery configuration (delivery pending activation)',
      datasetKey,
      selectedFields,
      scheduleConfig: {
        frequency,
        deliveryTarget,
        deliveryEnabled: false,
      },
      chartConfig: { type: 'table' },
      isShared: false,
    });
    setSaving(false);
    if (out.error) {
      toast.error(out.error);
      return;
    }
    toast.success('Schedule configuration saved (delivery pending activation).');
    setName('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure schedules now. Automated delivery is intentionally paused for this MVP and will be activated in a
            later phase.
          </p>

          <div className="space-y-2">
            <Label>Schedule Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly operations summary"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(value) => {
                      if (value === 'daily') return 'Daily';
                      if (value === 'weekly') return 'Weekly';
                      if (value === 'monthly') return 'Monthly';
                      return String(value);
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery Target (future)</Label>
              <Input
                value={deliveryTarget}
                onChange={(e) => setDeliveryTarget(e.target.value)}
                placeholder="email@example.com or webhook URL"
              />
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button onClick={saveScheduleConfig} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Schedule Config
                </Button>
              }
            />
            <TooltipContent side="top" className="max-w-xs text-xs">
              Save schedule settings now; delivery jobs remain disabled until scheduler rollout.
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          Delivery status: <span className="font-medium text-foreground">Coming soon</span>
        </CardContent>
      </Card>
    </div>
  );
}
