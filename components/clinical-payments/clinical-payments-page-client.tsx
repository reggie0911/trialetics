'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Building2, FileText, Banknote, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PaymentSitesTab } from './payment-sites-tab';
import { PaymentRecordsTab } from './payment-records-tab';
import {
  getClinicalPaymentsStats,
  getSitesWithPaymentData,
  getPaymentRecords,
  getPaymentSummaryByProtocol,
  generatePaymentRecordsForProtocol,
} from '@/lib/actions/clinical-payments';
import type {
  ClinicalPaymentsStats,
  PaymentRecordFilters,
  PaymentRecordWithRelations,
} from '@/lib/types/clinical-payments';

interface ClinicalPaymentsPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function ClinicalPaymentsPageClient({
  companyId,
  profileId,
  email,
}: ClinicalPaymentsPageClientProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'sites' | 'records' | 'summary'>('sites');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<ClinicalPaymentsStats | null>(null);
  const [sites, setSites] = useState<
    Array<{
      id: string;
      site_number: string | null;
      protocol: { protocol_number: string };
      organization: { name: string };
      pending_count: number;
    }>
  >([]);
  const [records, setRecords] = useState<PaymentRecordWithRelations[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [protocolSummary, setProtocolSummary] = useState<
    Array<{
      protocol_id: string;
      protocol_number: string;
      total_earned: number;
      total_paid: number;
      pending_count: number;
      record_count: number;
    }>
  >([]);
  const [recordFilters, setRecordFilters] = useState<PaymentRecordFilters>({
    page: 1,
    pageSize: 25,
  });
  const [mounted, setMounted] = useState(false);
  const [generatingProtocolId, setGeneratingProtocolId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const [statsResult, sitesResult] = await Promise.all([
        getClinicalPaymentsStats(companyId),
        getSitesWithPaymentData(companyId),
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
      if (sitesResult.success && sitesResult.data) {
        setSites(sitesResult.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load clinical payments data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId]);

  const fetchRecords = useCallback(async () => {
    const result = await getPaymentRecords(companyId, recordFilters);
    if (result.success && result.data) {
      setRecords(result.data.records);
      setRecordsTotal(result.data.total);
    }
  }, [companyId, recordFilters]);

  const fetchProtocolSummary = useCallback(async () => {
    const result = await getPaymentSummaryByProtocol(companyId);
    if (result.success && result.data) {
      setProtocolSummary(result.data);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchRecords();
    }
  }, [activeTab, fetchRecords]);

  useEffect(() => {
    if (activeTab === 'summary') {
      fetchProtocolSummary();
    }
  }, [activeTab, fetchProtocolSummary]);

  const handleRefresh = () => {
    fetchData(true);
    if (activeTab === 'records') {
      fetchRecords();
    }
    if (activeTab === 'summary') {
      fetchProtocolSummary();
    }
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Total Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_sites_with_payments ?? 0}</div>
            <p className="text-xs text-muted-foreground">Sites with payment setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Pending Activities</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_activities_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">Completed, awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Pending Records</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_records_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">To be processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Processed This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processed_this_month_count ?? 0}</div>
            <p className="text-xs text-muted-foreground">Payments processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
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

      {/* Tabs - deferred to client to avoid Radix ID hydration mismatch */}
      {mounted ? (
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sites' | 'records' | 'summary')} className="w-full">
        <TabsList className="grid w-full max-w-[500px] grid-cols-3">
          <TabsTrigger value="sites" className="text-xs">
            Sites
          </TabsTrigger>
          <TabsTrigger value="records" className="text-xs">
            Payment Records
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs">
            Protocol Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="mt-6">
          {activeTab === 'sites' && (
            <PaymentSitesTab
              sites={sites}
              onRefresh={handleRefresh}
              companyId={companyId}
            />
          )}
        </TabsContent>

        <TabsContent value="records" className="mt-6">
          {activeTab === 'records' && (
            <PaymentRecordsTab
              records={records}
              total={recordsTotal}
              filters={recordFilters}
              onFiltersChange={setRecordFilters}
              onRefresh={() => { handleRefresh(); fetchRecords(); }}
              companyId={companyId}
            />
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          {activeTab === 'summary' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Protocol Summary</CardTitle>
              <p className="text-xs text-muted-foreground">
                Payment summary by protocol. Earned vs paid amounts.
              </p>
            </CardHeader>
            <CardContent>
              {protocolSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  No payment data by protocol yet. Generate payments from site activities.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {protocolSummary.map((p) => (
                      <Button
                        key={p.protocol_id}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={!!generatingProtocolId}
                        onClick={async () => {
                          setGeneratingProtocolId(p.protocol_id);
                          const result = await generatePaymentRecordsForProtocol(companyId, p.protocol_id);
                          if (result.success && result.data) {
                            toast({
                              title: 'Success',
                              description: `Generated ${result.data.generated} payment record(s) for ${p.protocol_number}`,
                            });
                            handleRefresh();
                          } else {
                            toast({
                              title: 'Error',
                              description: result.error ?? 'Failed to generate',
                              variant: 'destructive',
                            });
                          }
                          setGeneratingProtocolId(null);
                        }}
                      >
                        {generatingProtocolId === p.protocol_id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Generate for {p.protocol_number}
                      </Button>
                    ))}
                  </div>
                  <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={protocolSummary.map((p) => ({
                        name: p.protocol_number,
                        Earned: p.total_earned,
                        Paid: p.total_paid,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Earned" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Paid" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
      ) : (
        <div className="h-24 rounded-lg bg-muted/50 animate-pulse mt-6" />
      )}
    </div>
  );
}
