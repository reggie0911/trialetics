'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getEnrollmentTargets,
  createEnrollmentTarget,
  getEnrollmentProjections,
  createEnrollmentProjection,
  getEnrollmentScenarios,
  createEnrollmentScenario,
  getEnrollmentActuals,
  getProtocolsForSelect,
} from '@/lib/actions/enrollment-forecasting';
import type { EnrollmentTarget, EnrollmentProjection, EnrollmentScenario, EnrollmentActual } from '@/lib/types/enrollment-forecasting';
import {
  ENROLLMENT_TARGET_TYPE_LABELS,
  ENROLLMENT_PROJECTION_METHOD_LABELS,
  ENROLLMENT_SCENARIO_TYPE_LABELS,
} from '@/lib/types/enrollment-forecasting';

interface EnrollmentForecastingClientProps {
  companyId: string;
}

export function EnrollmentForecastingClient({ companyId }: EnrollmentForecastingClientProps) {
  const [activeTab, setActiveTab] = useState('targets');
  const [targets, setTargets] = useState<EnrollmentTarget[]>([]);
  const [projections, setProjections] = useState<EnrollmentProjection[]>([]);
  const [scenarios, setScenarios] = useState<EnrollmentScenario[]>([]);
  const [actuals, setActuals] = useState<EnrollmentActual[]>([]);
  const [protocols, setProtocols] = useState<{ id: string; protocol_number: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [showProjectionDialog, setShowProjectionDialog] = useState(false);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const { toast } = useToast();

  const [targetProtocolId, setTargetProtocolId] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetType, setTargetType] = useState<'screen' | 'enroll' | 'complete'>('enroll');
  const [targetMilestone, setTargetMilestone] = useState('');

  const [projProtocolId, setProjProtocolId] = useState('');
  const [projDate, setProjDate] = useState('');
  const [projName, setProjName] = useState('');
  const [projMethod, setProjMethod] = useState<'linear' | 'historical' | 'custom'>('linear');
  const [projTotalCount, setProjTotalCount] = useState('');
  const [projTotalDate, setProjTotalDate] = useState('');

  const [scenarioProtocolId, setScenarioProtocolId] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioType, setScenarioType] = useState<'optimistic' | 'baseline' | 'pessimistic' | 'custom'>('baseline');
  const [scenarioTotal, setScenarioTotal] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [t, p, s, a, prot] = await Promise.all([
      getEnrollmentTargets(companyId),
      getEnrollmentProjections(companyId),
      getEnrollmentScenarios(companyId),
      getEnrollmentActuals(companyId),
      getProtocolsForSelect(companyId),
    ]);
    if (t.success && t.data) setTargets(t.data);
    if (p.success && p.data) setProjections(p.data);
    if (s.success && s.data) setScenarios(s.data);
    if (a.success && a.data) setActuals(a.data);
    if (prot.success && prot.data) setProtocols(prot.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const totalTargets = targets.length;
  const totalProjections = projections.length;
  const totalScenarios = scenarios.length;
  const totalActualEnrolled = actuals.reduce((sum, a) => sum + a.total_enrolled, 0);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Targets</p>
          <p className="text-xl font-semibold">{totalTargets}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Projections</p>
          <p className="text-xl font-semibold">{totalProjections}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Scenarios</p>
          <p className="text-xl font-semibold">{totalScenarios}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Enrolled (Actual)</p>
          <p className="text-xl font-semibold text-green-600">{totalActualEnrolled}</p>
        </div>
      </div>

      <Card>
        <Tabs tabsId="enrollment-forecasting" value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="targets">Targets</TabsTrigger>
              <TabsTrigger value="projections">Projections</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => {
              if (activeTab === 'targets') setShowTargetDialog(true);
              else if (activeTab === 'projections') setShowProjectionDialog(true);
              else setShowScenarioDialog(true);
            }}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="targets" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target Count</TableHead>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Milestone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : targets.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No targets yet</TableCell></TableRow>
                    ) : targets.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.clinical_protocols?.protocol_number || t.protocol_id}</TableCell>
                        <TableCell><Badge variant="secondary">{ENROLLMENT_TARGET_TYPE_LABELS[t.target_type]}</Badge></TableCell>
                        <TableCell className="text-sm">{t.target_count}</TableCell>
                        <TableCell className="text-sm">{t.target_date}</TableCell>
                        <TableCell className="text-sm">{t.milestone_label || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="projections" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Projected Count</TableHead>
                      <TableHead>Projected Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projections.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No projections yet</TableCell></TableRow>
                    ) : projections.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.clinical_protocols?.protocol_number || p.protocol_id}</TableCell>
                        <TableCell className="text-sm">{p.projection_name || '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{ENROLLMENT_PROJECTION_METHOD_LABELS[p.method]}</Badge></TableCell>
                        <TableCell className="text-sm">{p.total_projected_count ?? '—'}</TableCell>
                        <TableCell className="text-sm">{p.total_projected_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Projected Total</TableHead>
                      <TableHead>First / Last Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No scenarios yet</TableCell></TableRow>
                    ) : scenarios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">{s.clinical_protocols?.protocol_number || s.protocol_id}</TableCell>
                        <TableCell className="text-sm">{s.scenario_name}</TableCell>
                        <TableCell><Badge variant="secondary">{ENROLLMENT_SCENARIO_TYPE_LABELS[s.scenario_type]}</Badge></TableCell>
                        <TableCell className="text-sm">{s.projected_total ?? '—'}</TableCell>
                        <TableCell className="text-sm">{s.projected_first_enrolled || '—'} / {s.projected_last_enrolled || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Target Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Enrollment Target</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={targetProtocolId} onValueChange={setTargetProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'screen' | 'enroll' | 'complete')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENROLLMENT_TARGET_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Count</Label>
                <Input type="number" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Milestone Label (optional)</Label>
              <Input value={targetMilestone} onChange={(e) => setTargetMilestone(e.target.value)} placeholder="e.g. 50% enrollment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTargetDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createEnrollmentTarget({
                protocol_id: targetProtocolId,
                target_count: parseInt(targetCount, 10),
                target_date: targetDate,
                target_type: targetType,
                milestone_label: targetMilestone || undefined,
              });
              if (r.success) {
                setShowTargetDialog(false);
                setTargetProtocolId(''); setTargetCount(''); setTargetDate(''); setTargetMilestone('');
                load(); toast({ title: 'Target added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!targetProtocolId || !targetCount || !targetDate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Projection Dialog */}
      <Dialog open={showProjectionDialog} onOpenChange={setShowProjectionDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Enrollment Projection</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={projProtocolId} onValueChange={setProjProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projection Name (optional)</Label>
              <Input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="e.g. Q1 2025" />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={projMethod} onValueChange={(v) => setProjMethod(v as 'linear' | 'historical' | 'custom')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENROLLMENT_PROJECTION_METHOD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projection Date</Label>
              <Input type="date" value={projDate} onChange={(e) => setProjDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Projected Count</Label>
                <Input type="number" value={projTotalCount} onChange={(e) => setProjTotalCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Total Projected Date</Label>
                <Input type="date" value={projTotalDate} onChange={(e) => setProjTotalDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectionDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createEnrollmentProjection({
                protocol_id: projProtocolId,
                projection_date: projDate,
                projection_name: projName || undefined,
                method: projMethod,
                total_projected_count: projTotalCount ? parseInt(projTotalCount, 10) : undefined,
                total_projected_date: projTotalDate || undefined,
              });
              if (r.success) {
                setShowProjectionDialog(false);
                setProjProtocolId(''); setProjDate(''); setProjName(''); setProjTotalCount(''); setProjTotalDate('');
                load(); toast({ title: 'Projection added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!projProtocolId || !projDate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scenario Dialog */}
      <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Enrollment Scenario</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={scenarioProtocolId} onValueChange={setScenarioProtocolId}>
                <SelectTrigger><SelectValue placeholder="Select protocol..." /></SelectTrigger>
                <SelectContent>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.protocol_number} – {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scenario Name</Label>
              <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="e.g. Best case" />
            </div>
            <div className="space-y-2">
              <Label>Scenario Type</Label>
              <Select value={scenarioType} onValueChange={(v) => setScenarioType(v as 'optimistic' | 'baseline' | 'pessimistic' | 'custom')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENROLLMENT_SCENARIO_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projected Total (optional)</Label>
              <Input type="number" value={scenarioTotal} onChange={(e) => setScenarioTotal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={scenarioNotes} onChange={(e) => setScenarioNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScenarioDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createEnrollmentScenario({
                protocol_id: scenarioProtocolId,
                scenario_name: scenarioName,
                scenario_type: scenarioType,
                projected_total: scenarioTotal ? parseInt(scenarioTotal, 10) : undefined,
                notes: scenarioNotes || undefined,
              });
              if (r.success) {
                setShowScenarioDialog(false);
                setScenarioProtocolId(''); setScenarioName(''); setScenarioTotal(''); setScenarioNotes('');
                load(); toast({ title: 'Scenario added' });
              } else toast({ title: 'Error', description: r.error, variant: 'destructive' });
            }} disabled={!scenarioProtocolId || !scenarioName}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
