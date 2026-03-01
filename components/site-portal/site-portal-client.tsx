'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getPaymentActivities,
  updatePaymentActivity,
  getSiteFinancialSummary,
} from '@/lib/actions/clinical-payments';
import type { PaymentActivityWithRelations, SiteFinancialSummary } from '@/lib/types/clinical-payments';
import { createClient } from '@/lib/client';

interface SitePortalClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function SitePortalClient({ companyId, profileId, email }: SitePortalClientProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState<Array<{ id: string; site_number: string | null; protocol_id: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [activities, setActivities] = useState<PaymentActivityWithRelations[]>([]);
  const [summary, setSummary] = useState<SiteFinancialSummary | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSites() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('clinical_sites')
          .select('id, site_number, protocol_id')
          .eq('company_id', companyId)
          .order('site_number');
        setSites(data || []);
        if (data && data.length > 0) {
          setSelectedSiteId(data[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchSites();
  }, [companyId]);

  const fetchData = useCallback(async () => {
    if (!selectedSiteId) return;
    setIsLoading(true);
    try {
      const [activitiesResult, summaryResult] = await Promise.all([
        getPaymentActivities(companyId, selectedSiteId),
        getSiteFinancialSummary(companyId, selectedSiteId),
      ]);

      if (activitiesResult.success && activitiesResult.data) {
        setActivities(activitiesResult.data.activities);
      }
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedSiteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkComplete = async (activity: PaymentActivityWithRelations) => {
    setUpdatingId(activity.id);
    const result = await updatePaymentActivity(activity.id, {
      is_completed: true,
    });
    if (result.success) {
      toast({ title: 'Activity marked as complete' });
      fetchData();
    } else {
      toast({ title: 'Error', description: result.error ?? 'Failed to update', variant: 'destructive' });
    }
    setUpdatingId(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const pendingActivities = activities.filter((a) => !a.is_completed && !a.payment_record_id);
  const completedActivities = activities.filter((a) => a.is_completed || a.payment_record_id);

  if (isLoading && sites.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
          <SelectTrigger className="w-64 text-xs">
            <SelectValue placeholder="Select a site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id} className="text-xs">
                Site {site.site_number || site.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="text-xs">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Earned</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(summary.earned_to_date)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Paid</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(summary.paid_to_date)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-orange-600" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Remaining</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(summary.remaining_balance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                <p className="text-[10px] text-muted-foreground font-medium uppercase">VAT</p>
              </div>
              <p className="text-lg font-semibold">{formatCurrency(summary.vat_to_date)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Pending Activities ({pendingActivities.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Mark activities as complete when the procedure has been performed.
          </p>
        </CardHeader>
        <CardContent>
          {pendingActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No pending activities.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-12">Complete</TableHead>
                  <TableHead className="text-xs">Activity</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingActivities.map((a) => {
                  const sa = a.subject_activity;
                  const actName = sa
                    ? (Array.isArray(sa) ? sa[0]?.activity_name : sa?.activity_name) ?? 'Activity'
                    : a.is_unplanned
                    ? 'Unplanned Payment'
                    : 'Activity';
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleMarkComplete(a)}
                          disabled={!!updatingId}
                        />
                      </TableCell>
                      <TableCell className="text-xs">{actName}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(a.actual_amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {a.is_unplanned ? 'Unplanned' : 'Scheduled'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Completed Activities ({completedActivities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No completed activities yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Activity</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedActivities.map((a) => {
                  const sa = a.subject_activity;
                  const actName = sa
                    ? (Array.isArray(sa) ? sa[0]?.activity_name : sa?.activity_name) ?? 'Activity'
                    : a.is_unplanned
                    ? 'Unplanned Payment'
                    : 'Activity';
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{actName}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(a.actual_amount)}</TableCell>
                      <TableCell>
                        {a.payment_record_id ? (
                          <Badge className="text-xs bg-green-100 text-green-800">Paid</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Awaiting Payment</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
