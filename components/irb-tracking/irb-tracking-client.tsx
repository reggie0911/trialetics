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
import { Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getIRBSubmissions,
  createIRBSubmission,
  getIRBApprovals,
  getExpiringApprovals,
  getIRBAmendments,
  createIRBAmendment,
  getContinuingReviews,
  getIRBDashboardStats,
  getProtocolsForSelect,
  getOrganizationsForSelect,
} from '@/lib/actions/irb-tracking';
import type {
  IrbSubmission,
  IrbApproval,
  IrbAmendment,
  IrbContinuingReview,
} from '@/lib/types/irb-tracking';
import {
  IRB_SUBMISSION_TYPE_LABELS,
  IRB_SUBMISSION_STATUS_LABELS,
  IRB_CONTINUING_REVIEW_STATUS_LABELS,
  IRB_AMENDMENT_TYPE_LABELS,
} from '@/lib/types/irb-tracking';

interface IrbTrackingClientProps {
  companyId: string;
}

const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  approved_with_conditions: 'bg-green-100 text-green-700',
  disapproved: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
};

const CONTINUING_REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  lapsed: 'bg-red-100 text-red-700',
};

const AMENDMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  implemented: 'bg-green-100 text-green-700',
};

function formatDate(d: string | null) {
  return d || '—';
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function IrbTrackingClient({ companyId }: IrbTrackingClientProps) {
  const [activeTab, setActiveTab] = useState('submissions');
  const [submissions, setSubmissions] = useState<IrbSubmission[]>([]);
  const [approvals, setApprovals] = useState<IrbApproval[]>([]);
  const [expiringApprovals, setExpiringApprovals] = useState<IrbApproval[]>([]);
  const [amendments, setAmendments] = useState<IrbAmendment[]>([]);
  const [continuingReviews, setContinuingReviews] = useState<IrbContinuingReview[]>([]);
  const [stats, setStats] = useState<{
    total_submissions: number;
    pending_submissions: number;
    expiring_approvals: number;
    pending_amendments: number;
    pending_continuing_reviews: number;
  } | null>(null);
  const [protocols, setProtocols] = useState<{ id: string; protocol_number: string | null; title: string | null }[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const { toast } = useToast();

  // Submission form
  const [subProtocolId, setSubProtocolId] = useState('');
  const [subIrbOrgId, setSubIrbOrgId] = useState('');
  const [subType, setSubType] = useState<IrbSubmission['submission_type']>('initial');
  const [subDate, setSubDate] = useState('');
  const [subRefNum, setSubRefNum] = useState('');
  const [subNotes, setSubNotes] = useState('');

  // Amendment form
  const [amendProtocolId, setAmendProtocolId] = useState('');
  const [amendNumber, setAmendNumber] = useState('');
  const [amendType, setAmendType] = useState<'protocol' | 'consent' | 'ib' | 'other'>('protocol');
  const [amendDesc, setAmendDesc] = useState('');
  const [amendSubmittedDate, setAmendSubmittedDate] = useState('');
  const [amendStatus, setAmendStatus] = useState('pending');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [s, a, ea, am, cr, st, pr, org] = await Promise.all([
      getIRBSubmissions(companyId),
      getIRBApprovals(companyId),
      getExpiringApprovals(companyId, 30),
      getIRBAmendments(companyId),
      getContinuingReviews(companyId),
      getIRBDashboardStats(companyId),
      getProtocolsForSelect(companyId),
      getOrganizationsForSelect(companyId),
    ]);
    if (s.success && s.data) setSubmissions(s.data);
    if (a.success && a.data) setApprovals(a.data);
    if (ea.success && ea.data) setExpiringApprovals(ea.data);
    if (am.success && am.data) setAmendments(am.data);
    if (cr.success && cr.data) setContinuingReviews(cr.data);
    if (st.success && st.data) setStats(st.data);
    if (pr.success && pr.data) setProtocols(pr.data);
    if (org.success && org.data) setOrganizations(org.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const isExpiringSoon = (expirationDate: string | null) => {
    const days = daysUntil(expirationDate);
    return days !== null && days >= 0 && days <= 30;
  };

  const isExpired = (expirationDate: string | null) => {
    const days = daysUntil(expirationDate);
    return days !== null && days < 0;
  };

  const approvalBadgeVariant = (expirationDate: string | null) => {
    if (isExpired(expirationDate)) return 'bg-red-100 text-red-700';
    if (isExpiringSoon(expirationDate)) return 'bg-red-100 text-red-700';
    return '';
  };

  return (
    <>
      {stats && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Submissions</p>
            <p className="text-xl font-semibold">{stats.total_submissions}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending Submissions</p>
            <p className="text-xl font-semibold text-amber-600">{stats.pending_submissions}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Expiring Approvals (&lt;30d)</p>
            <p className="text-xl font-semibold text-red-600">{stats.expiring_approvals}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending Amendments</p>
            <p className="text-xl font-semibold text-amber-600">{stats.pending_amendments}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Pending Continuing Reviews</p>
            <p className="text-xl font-semibold text-amber-600">{stats.pending_continuing_reviews}</p>
          </div>
        </div>
      )}

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="amendments">Amendments</TabsTrigger>
              <TabsTrigger value="continuing-reviews">Continuing Reviews</TabsTrigger>
            </TabsList>
            <Button
              size="sm"
              onClick={() => {
                if (activeTab === 'submissions') setShowSubmissionDialog(true);
                else if (activeTab === 'amendments') setShowAmendmentDialog(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="submissions" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>IRB Org</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Ref #</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No submissions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm">
                            {s.protocol?.protocol_number || s.protocol?.title || '—'}
                          </TableCell>
                          <TableCell className="text-xs">{IRB_SUBMISSION_TYPE_LABELS[s.submission_type]}</TableCell>
                          <TableCell className="text-xs">{s.irb_organization?.name || '—'}</TableCell>
                          <TableCell className="text-xs">{formatDate(s.submission_date)}</TableCell>
                          <TableCell className="text-xs">{s.reference_number || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={SUBMISSION_STATUS_COLORS[s.status] || ''}
                            >
                              {IRB_SUBMISSION_STATUS_LABELS[s.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Approval #</TableHead>
                      <TableHead>Approval Date</TableHead>
                      <TableHead>Expiration Date</TableHead>
                      <TableHead>Consent Version</TableHead>
                      <TableHead>Protocol Version</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No approvals yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvals.map((a) => {
                        const expiring = isExpiringSoon(a.expiration_date);
                        const expired = isExpired(a.expiration_date);
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium text-sm">{a.approval_number || '—'}</TableCell>
                            <TableCell className="text-xs">{formatDate(a.approval_date)}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                {formatDate(a.expiration_date)}
                                {(expiring || expired) && (
                                  <Badge
                                    variant="secondary"
                                    className={approvalBadgeVariant(a.expiration_date)}
                                  >
                                    <AlertTriangle className="mr-0.5 h-3 w-3" />
                                    {expired ? 'Expired' : 'Expiring soon'}
                                  </Badge>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">{a.approved_consent_version || '—'}</TableCell>
                            <TableCell className="text-xs">{a.approved_protocol_version || '—'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="amendments" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Amendment #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amendments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No amendments yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      amendments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium text-sm">
                            {a.protocol?.protocol_number || a.protocol?.title || '—'}
                          </TableCell>
                          <TableCell className="text-xs">{a.amendment_number || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {a.amendment_type ? IRB_AMENDMENT_TYPE_LABELS[a.amendment_type] : '—'}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(a.submitted_date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={AMENDMENT_STATUS_COLORS[a.status] || ''}
                            >
                              {a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="continuing-reviews" className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {continuingReviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No continuing reviews yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      continuingReviews.map((cr) => (
                        <TableRow key={cr.id}>
                          <TableCell className="font-medium text-sm">
                            {cr.protocol?.protocol_number || cr.protocol?.title || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(cr.review_period_start)} — {formatDate(cr.review_period_end)}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(cr.due_date)}</TableCell>
                          <TableCell className="text-xs">{formatDate(cr.submitted_date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={CONTINUING_REVIEW_STATUS_COLORS[cr.status] || ''}
                            >
                              {IRB_CONTINUING_REVIEW_STATUS_LABELS[cr.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Add Submission Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add IRB Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={subProtocolId} onValueChange={setSubProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.protocol_number || p.title || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IRB Organization</Label>
              <Select value={subIrbOrgId} onValueChange={setSubIrbOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select IRB organization (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Submission Type</Label>
              <Select value={subType} onValueChange={(v) => setSubType(v as IrbSubmission['submission_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IRB_SUBMISSION_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Submission Date</Label>
              <Input
                type="date"
                value={subDate}
                onChange={(e) => setSubDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={subRefNum} onChange={(e) => setSubRefNum(e.target.value)} placeholder="IRB ref #" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={subNotes} onChange={(e) => setSubNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const r = await createIRBSubmission({
                  protocol_id: subProtocolId || undefined,
                  irb_organization_id: subIrbOrgId || undefined,
                  submission_type: subType,
                  submission_date: subDate || undefined,
                  reference_number: subRefNum || undefined,
                  notes: subNotes || undefined,
                });
                if (r.success) {
                  setShowSubmissionDialog(false);
                  setSubProtocolId('');
                  setSubIrbOrgId('');
                  setSubDate('');
                  setSubRefNum('');
                  setSubNotes('');
                  load();
                  toast({ title: 'Submission added' });
                } else {
                  toast({ title: 'Error', description: r.error, variant: 'destructive' });
                }
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Amendment Dialog */}
      <Dialog open={showAmendmentDialog} onOpenChange={setShowAmendmentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add IRB Amendment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={amendProtocolId} onValueChange={setAmendProtocolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {protocols.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.protocol_number || p.title || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amendment Number</Label>
              <Input value={amendNumber} onChange={(e) => setAmendNumber(e.target.value)} placeholder="e.g. 001" />
            </div>
            <div className="space-y-2">
              <Label>Amendment Type</Label>
              <Select value={amendType} onValueChange={(v) => setAmendType(v as typeof amendType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IRB_AMENDMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={amendDesc} onChange={(e) => setAmendDesc(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Submitted Date</Label>
              <Input
                type="date"
                value={amendSubmittedDate}
                onChange={(e) => setAmendSubmittedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={amendStatus} onValueChange={setAmendStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAmendmentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const r = await createIRBAmendment({
                  protocol_id: amendProtocolId || undefined,
                  amendment_number: amendNumber || undefined,
                  amendment_type: amendType,
                  description: amendDesc || undefined,
                  submitted_date: amendSubmittedDate || undefined,
                  status: amendStatus,
                });
                if (r.success) {
                  setShowAmendmentDialog(false);
                  setAmendProtocolId('');
                  setAmendNumber('');
                  setAmendDesc('');
                  setAmendSubmittedDate('');
                  setAmendStatus('pending');
                  load();
                  toast({ title: 'Amendment added' });
                } else {
                  toast({ title: 'Error', description: r.error, variant: 'destructive' });
                }
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
