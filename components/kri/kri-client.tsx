'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getKRIDashboard,
  getKRIDefinitions,
  getActiveAlerts,
  createKRIDefinition,
  acknowledgeAlert,
} from '@/lib/actions/kri';
import type {
  KRIDefinition,
  KRIValue,
  KRIAlert,
  KRIDashboardData,
} from '@/lib/types/kri';
import {
  KRI_CATEGORY_LABELS,
  KRI_ALERT_LEVEL_LABELS,
} from '@/lib/types/kri';

interface KriClientProps {
  companyId: string;
}

export function KriClient({ companyId }: KriClientProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<KRIDashboardData | null>(null);
  const [definitions, setDefinitions] = useState<KRIDefinition[]>([]);
  const [alerts, setAlerts] = useState<KRIAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'enrollment' as const,
    calculation_method: '',
    unit: '',
    data_source: '',
  });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [dashResult, defsResult, alertsResult] = await Promise.all([
      getKRIDashboard(companyId),
      getKRIDefinitions(companyId, false),
      getActiveAlerts(companyId),
    ]);

    if (dashResult.success && dashResult.data) setDashboard(dashResult.data);
    if (defsResult.success && defsResult.data) setDefinitions(defsResult.data);
    if (alertsResult.success && alertsResult.data) setAlerts(alertsResult.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDefinition = async () => {
    if (!createForm.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const result = await createKRIDefinition({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      category: createForm.category,
      calculation_method: createForm.calculation_method.trim() || undefined,
      unit: createForm.unit.trim() || undefined,
      data_source: createForm.data_source.trim() || undefined,
    });
    if (result.success) {
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '', category: 'enrollment', calculation_method: '', unit: '', data_source: '' });
      loadData();
      toast({ title: 'KRI definition created' });
    } else {
      toast({ title: result.error || 'An error occurred', variant: 'destructive' });
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    const result = await acknowledgeAlert(alertId);
    if (result.success) {
      loadData();
      toast({ title: 'Alert acknowledged' });
    } else {
      toast({ title: result.error || 'An error occurred', variant: 'destructive' });
    }
  };

  const alertBadgeClass = (level: string) => {
    if (level === 'red') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  return (
    <div className="space-y-6">
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="definitions">Definitions</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New KRI Definition
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="dashboard" className="mt-0">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : dashboard ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="KRI Definitions" value={dashboard.total_definitions} />
                    <StatCard label="Total Values" value={dashboard.total_values} />
                    <StatCard label="Active Alerts" value={dashboard.active_alerts} color="text-red-600" />
                    <StatCard label="Acknowledged" value={dashboard.acknowledged_alerts} color="text-green-600" />
                    <StatCard label="Yellow" value={dashboard.yellow_alerts} color="text-yellow-600" />
                    <StatCard label="Red" value={dashboard.red_alerts} color="text-red-700" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recent Values</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dashboard.recent_values.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No values recorded yet</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>KRI</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dashboard.recent_values.map((v) => (
                                <TableRow key={v.id}>
                                  <TableCell className="font-medium">
                                    {(v as KRIValue & { kri_definition?: { name?: string } }).kri_definition?.name ?? '—'}
                                  </TableCell>
                                  <TableCell>
                                    {v.value}
                                    {(v as KRIValue & { kri_definition?: { unit?: string } }).kri_definition?.unit && (
                                      <span className="text-muted-foreground ml-1">
                                        {(v as KRIValue & { kri_definition?: { unit?: string } }).kri_definition?.unit}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{v.measurement_date}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dashboard.recent_alerts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No alerts</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Level</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dashboard.recent_alerts.map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell>
                                    <Badge variant="outline" className={alertBadgeClass(a.alert_level)}>
                                      {KRI_ALERT_LEVEL_LABELS[a.alert_level]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">{a.message}</TableCell>
                                  <TableCell>
                                    {a.acknowledged ? (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800">Acknowledged</Badge>
                                    ) : (
                                      <Badge variant="secondary">Active</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">No dashboard data</div>
              )}
            </TabsContent>

            <TabsContent value="definitions" className="mt-0">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : definitions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No KRI definitions yet. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Data Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{KRI_CATEGORY_LABELS[d.category]}</TableCell>
                        <TableCell className="text-muted-foreground">{d.unit ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{d.data_source ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={d.is_active ? 'default' : 'secondary'}>
                            {d.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-0">
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No alerts</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>KRI</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Badge variant="outline" className={alertBadgeClass(a.alert_level)}>
                            {a.alert_level === 'red' ? (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            ) : (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {KRI_ALERT_LEVEL_LABELS[a.alert_level]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(a as KRIAlert & { kri_value?: { kri_definition?: { name?: string } } }).kri_value?.kri_definition?.name ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[220px]">{a.message}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(a as KRIAlert & { protocol?: { protocol_number?: string } }).protocol?.protocol_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(a as KRIAlert & { site?: { site_number?: string } }).site?.site_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(a.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {!a.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(a.id)}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Acknowledge
                            </Button>
                          )}
                          {a.acknowledged && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Acknowledged
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create KRI Definition</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Enrollment Rate"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={createForm.category}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, category: v as typeof createForm.category }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KRI_CATEGORY_LABELS) as (keyof typeof KRI_CATEGORY_LABELS)[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {KRI_CATEGORY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. %"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data_source">Data Source</Label>
                <Input
                  id="data_source"
                  value={createForm.data_source}
                  onChange={(e) => setCreateForm((f) => ({ ...f, data_source: e.target.value }))}
                  placeholder="e.g. EDC"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="calculation_method">Calculation Method</Label>
              <Input
                id="calculation_method"
                value={createForm.calculation_method}
                onChange={(e) => setCreateForm((f) => ({ ...f, calculation_method: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDefinition}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${color || ''}`}>{value}</p>
    </div>
  );
}
