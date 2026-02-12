'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PaymentActivityTable } from './payment-activity-table';
import { PaymentExceptionDialog } from './payment-exception-dialog';
import { UnplannedPaymentDialog } from './unplanned-payment-dialog';
import {
  getPaymentActivities,
  getPaymentExceptions,
  getPaymentRecords,
  syncPaymentActivitiesForSite,
  createFinalPaymentRecord,
} from '@/lib/actions/clinical-payments';
import type { PaymentActivityWithRelations, PaymentExceptionWithRelations } from '@/lib/types/clinical-payments';

interface PaymentSiteDetailPageClientProps {
  siteId: string;
  site: {
    id: string;
    site_number: string | null;
    protocol_id: string;
    clinical_protocols?: { id: string; protocol_number: string; title: string } | { id: string; protocol_number: string; title: string }[];
    template_visits?: unknown[];
  };
  companyId: string;
  profileId: string;
  email: string;
}

export function PaymentSiteDetailPageClient({
  siteId,
  site,
  companyId,
  profileId,
  email,
}: PaymentSiteDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'activities' | 'exceptions' | 'records'>('activities');
  const [activities, setActivities] = useState<PaymentActivityWithRelations[]>([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [exceptions, setExceptions] = useState<PaymentExceptionWithRelations[]>([]);
  const [records, setRecords] = useState<unknown[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [isUnplannedDialogOpen, setIsUnplannedDialogOpen] = useState(false);
  const [isCreatingFinal, setIsCreatingFinal] = useState(false);

  const fetchActivities = useCallback(async () => {
    const result = await getPaymentActivities(companyId, siteId);
    if (result.success && result.data) {
      setActivities(result.data.activities);
      setActivitiesTotal(result.data.total);
    }
  }, [companyId, siteId]);

  const fetchExceptions = useCallback(async () => {
    const result = await getPaymentExceptions(companyId, siteId);
    if (result.success && result.data) {
      setExceptions(result.data);
    }
  }, [companyId, siteId]);

  const fetchRecords = useCallback(async () => {
    const result = await getPaymentRecords(companyId, { site_id: siteId });
    if (result.success && result.data) {
      setRecords(result.data.records);
      setRecordsTotal(result.data.total);
    }
  }, [companyId, siteId]);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setIsLoading(true);
    try {
      const syncResult = await syncPaymentActivitiesForSite(companyId, siteId);
      if (syncResult.success && syncResult.data?.created && syncResult.data.created > 0) {
        toast({
          title: 'Synced',
          description: `Created ${syncResult.data.created} payment activities from subject activities.`,
        });
      }
      await Promise.all([fetchActivities(), fetchExceptions(), fetchRecords()]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, siteId, fetchActivities, fetchExceptions, fetchRecords]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'records' && !isLoading) {
      fetchRecords();
    }
  }, [activeTab, fetchRecords, isLoading]);

  const handleBack = () => {
    router.push('/protected/clinical-payments');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clinical Payments
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll(true)}
          disabled={isRefreshing}
          className="text-xs"
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'activities' | 'exceptions' | 'records')}>
        <TabsList className="grid w-full max-w-[500px] grid-cols-3">
          <TabsTrigger value="activities" className="text-xs">
            Payment Activities
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="text-xs">
            Payment Exceptions
          </TabsTrigger>
          <TabsTrigger value="records" className="text-xs">
            Payment Records
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-6">
          <div className="space-y-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsUnplannedDialogOpen(true)}
              className="text-xs"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unplanned Payment
            </Button>
            <PaymentActivityTable
              activities={activities}
              total={activitiesTotal}
              siteId={siteId}
              companyId={companyId}
              onRefresh={fetchAll}
            />
          </div>
        </TabsContent>

        <TabsContent value="exceptions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Payment Exceptions</CardTitle>
              <p className="text-xs text-muted-foreground">
                Site-specific overrides for standard payment amounts from visit templates.
              </p>
              <Button
                size="sm"
                onClick={() => setIsExceptionDialogOpen(true)}
                className="mt-2 text-xs"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Exception
              </Button>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  No payment exceptions. Add site-specific amount overrides here.
                </p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map((ex) => {
                    const ta = (ex as { template_activity?: { activity_name: string } | { activity_name: string }[] })
                      .template_activity;
                    const activityName =
                      Array.isArray(ta) ? ta[0]?.activity_name : ta?.activity_name;
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded border text-xs"
                      >
                        <span>
                          {activityName ?? 'Activity'}
                          {' - '}
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: ex.currency_code,
                          }).format(ex.exception_amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Payment Records</CardTitle>
              <p className="text-xs text-muted-foreground">
                Generated payment records for this site. Create final payment when all activities are complete.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs"
                disabled={isCreatingFinal}
                onClick={async () => {
                  setIsCreatingFinal(true);
                  const result = await createFinalPaymentRecord(companyId, siteId);
                  if (result.success) {
                    toast({ title: 'Success', description: 'Final payment record created' });
                    fetchAll();
                  } else {
                    toast({
                      title: 'Error',
                      description: result.error ?? 'Failed to create final payment',
                      variant: 'destructive',
                    });
                  }
                  setIsCreatingFinal(false);
                }}
              >
                {isCreatingFinal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Generate Final Payment
              </Button>
            </CardHeader>
            <CardContent>
              {recordsTotal === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  No payment records generated yet. Complete payment activities and generate payments.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {recordsTotal} payment record(s). View in the Payment Records tab on the main page.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentExceptionDialog
        open={isExceptionDialogOpen}
        onOpenChange={setIsExceptionDialogOpen}
        onSuccess={() => {
          setIsExceptionDialogOpen(false);
          fetchExceptions();
        }}
        siteId={siteId}
        companyId={companyId}
        protocolId={site.protocol_id}
      />

      <UnplannedPaymentDialog
        open={isUnplannedDialogOpen}
        onOpenChange={setIsUnplannedDialogOpen}
        onSuccess={fetchAll}
        siteId={siteId}
        companyId={companyId}
      />
    </div>
  );
}
