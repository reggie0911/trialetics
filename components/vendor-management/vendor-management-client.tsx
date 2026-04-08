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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getVendorProfiles,
  createVendorProfile,
  deleteVendorProfile,
  getVendorContracts,
  createVendorContract,
  getVendorKPIs,
  createVendorKPI,
  getVendorPerformanceSummary,
} from '@/lib/actions/vendor-management';
import type { VendorProfile, VendorContract, VendorKPI } from '@/lib/types/vendor-management';
import {
  VENDOR_CATEGORY_LABELS,
  VENDOR_CONTRACT_STATUS_LABELS,
  VENDOR_KPI_STATUS_LABELS,
} from '@/lib/types/vendor-management';

interface VendorManagementClientProps {
  companyId: string;
}

export function VendorManagementClient({ companyId }: VendorManagementClientProps) {
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [kpis, setKpis] = useState<VendorKPI[]>([]);
  const [summary, setSummary] = useState<{ total_vendors: number; active_contracts: number; pending_deliverables: number; at_risk_kpis: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const { toast } = useToast();

  // Form states
  const [orgId, setOrgId] = useState('');
  const [vendorCat, setVendorCat] = useState<import('@/lib/types/vendor-management').VendorCategory>('other');
  const [servicesDesc, setServicesDesc] = useState('');
  const [contractVendorId, setContractVendorId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [kpiVendorId, setKPIVendorId] = useState('');
  const [kpiName, setKPIName] = useState('');
  const [kpiTarget, setKPITarget] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [v, c, k, s] = await Promise.all([
      getVendorProfiles(companyId),
      getVendorContracts(companyId),
      getVendorKPIs(companyId),
      getVendorPerformanceSummary(companyId),
    ]);
    if (v.success && v.data) setVendors(v.data);
    if (c.success && c.data) setContracts(c.data);
    if (k.success && k.data) setKpis(k.data);
    if (s.success && s.data) setSummary(s.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700', terminated: 'bg-red-100 text-red-700',
      on_track: 'bg-green-100 text-green-700', at_risk: 'bg-yellow-100 text-yellow-700',
      behind: 'bg-red-100 text-red-700',
    };
    return map[status] || '';
  };

  return (
    <>
      {summary && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Vendors</p>
            <p className="text-xl font-semibold">{summary.total_vendors}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Contracts</p>
            <p className="text-xl font-semibold text-green-600">{summary.active_contracts}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending Deliverables</p>
            <p className="text-xl font-semibold text-yellow-600">{summary.pending_deliverables}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">At-Risk KPIs</p>
            <p className="text-xl font-semibold text-red-600">{summary.at_risk_kpis}</p>
          </div>
        </div>
      )}

      <Card>
        <Tabs tabsId="vendor-management" value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="kpis">KPIs</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => {
              if (activeTab === 'vendors') setShowVendorDialog(true);
              else if (activeTab === 'contracts') setShowContractDialog(true);
              else setShowKPIDialog(true);
            }}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="vendors" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Qualified</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : vendors.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No vendors yet</TableCell></TableRow>
                    ) : vendors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium text-sm">{v.organization?.name || '—'}</TableCell>
                        <TableCell className="text-xs">{VENDOR_CATEGORY_LABELS[v.vendor_category]}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusColor(v.contract_status)}>{VENDOR_CONTRACT_STATUS_LABELS[v.contract_status]}</Badge></TableCell>
                        <TableCell className="text-xs">{v.qualified_date || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={async () => { await deleteVendorProfile(v.id); load(); }}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="contracts" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No contracts yet</TableCell></TableRow>
                    ) : contracts.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.title}</TableCell>
                        <TableCell className="text-xs">{c.contract_number || '—'}</TableCell>
                        <TableCell className="text-xs">{c.total_value ? `${c.currency} ${Number(c.total_value).toLocaleString()}` : '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusColor(c.status)}>{VENDOR_CONTRACT_STATUS_LABELS[c.status]}</Badge></TableCell>
                        <TableCell className="text-xs">{c.start_date || '—'} — {c.end_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="kpis" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No KPIs yet</TableCell></TableRow>
                    ) : kpis.map(k => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium text-sm">{k.kpi_name}</TableCell>
                        <TableCell className="text-xs">{k.target_value ?? '—'}{k.unit ? ` ${k.unit}` : ''}</TableCell>
                        <TableCell className="text-xs">{k.actual_value ?? '—'}{k.unit ? ` ${k.unit}` : ''}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusColor(k.status)}>{VENDOR_KPI_STATUS_LABELS[k.status]}</Badge></TableCell>
                        <TableCell className="text-xs">{k.measurement_period_start || '—'} — {k.measurement_period_end || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Vendor Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization ID</Label>
              <Input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="Paste organization UUID" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={vendorCat} onValueChange={(v) => setVendorCat(v as import('@/lib/types/vendor-management').VendorCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VENDOR_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Services Description</Label>
              <Textarea value={servicesDesc} onChange={(e) => setServicesDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createVendorProfile({ organization_id: orgId, vendor_category: vendorCat, services_description: servicesDesc || undefined });
              if (r.success) { setShowVendorDialog(false); setOrgId(''); setServicesDesc(''); load(); toast({ title: 'Vendor added' }); }
            }} disabled={!orgId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Dialog */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Contract</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={contractVendorId} onValueChange={setContractVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.organization?.name || v.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={contractTitle} onChange={(e) => setContractTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Value</Label>
              <Input type="number" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createVendorContract({ vendor_profile_id: contractVendorId, title: contractTitle, total_value: contractValue ? Number(contractValue) : undefined });
              if (r.success) { setShowContractDialog(false); setContractTitle(''); setContractValue(''); load(); toast({ title: 'Contract added' }); }
            }} disabled={!contractVendorId || !contractTitle}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Dialog */}
      <Dialog open={showKPIDialog} onOpenChange={setShowKPIDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add KPI</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={kpiVendorId} onValueChange={setKPIVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.organization?.name || v.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KPI Name</Label>
              <Input value={kpiName} onChange={(e) => setKPIName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target Value</Label>
              <Input type="number" value={kpiTarget} onChange={(e) => setKPITarget(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKPIDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const r = await createVendorKPI({ vendor_profile_id: kpiVendorId, kpi_name: kpiName, target_value: kpiTarget ? Number(kpiTarget) : undefined });
              if (r.success) { setShowKPIDialog(false); setKPIName(''); setKPITarget(''); load(); toast({ title: 'KPI added' }); }
            }} disabled={!kpiVendorId || !kpiName}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
