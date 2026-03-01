'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building2,
  FileText,
  Banknote,
  ChevronRight,
  FlaskConical,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  seedDemoData,
  resetDemoData,
  getDemoStatus,
  type DemoStatus,
} from '@/lib/actions/demo-clinical-payments';

interface DemoModeClientProps {
  companyId: string;
  profileId: string;
}

export function DemoModeClient({ companyId, profileId }: DemoModeClientProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [seedResult, setSeedResult] = useState<{
    site_ids: string[];
    payment_activity_count: number;
    payment_record_count: number;
    payment_exception_count: number;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    const result = await getDemoStatus(companyId);
    if (result.success && result.data) {
      setStatus(result.data);
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    const result = await seedDemoData(companyId, profileId);
    if (result.success && result.data) {
      setSeedResult({
        site_ids: result.data.site_ids,
        payment_activity_count: result.data.payment_activity_count,
        payment_record_count: result.data.payment_record_count,
        payment_exception_count: result.data.payment_exception_count,
      });
      toast({
        title: 'Demo Data Seeded',
        description: `Created ${result.data.site_ids.length} sites, ${result.data.payment_activity_count} activities, ${result.data.payment_record_count} records`,
      });
      fetchStatus();
    } else {
      toast({
        title: 'Seed Failed',
        description: result.error ?? 'Unknown error',
        variant: 'destructive',
      });
    }
    setIsSeeding(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    setSeedResult(null);
    const result = await resetDemoData(companyId);
    if (result.success) {
      toast({ title: 'Demo Data Reset', description: 'All demo data has been removed.' });
      fetchStatus();
    } else {
      toast({
        title: 'Reset Failed',
        description: result.error ?? 'Unknown error',
        variant: 'destructive',
      });
    }
    setIsResetting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Demo Status Banner */}
      <Card className={status?.seeded ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full p-2 bg-white shadow-sm">
              {status?.seeded ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                {status?.seeded ? 'Demo Data Active' : 'No Demo Data'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {status?.seeded
                  ? `${status.site_count} demo sites, ${status.activity_count} payment activities, ${status.record_count} payment records, ${status.exception_count} exceptions`
                  : 'Click "Seed Demo Data" below to populate the system with realistic clinical payment records.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSeed}
                disabled={isSeeding || isResetting}
                className="text-xs"
              >
                {isSeeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {status?.seeded ? 'Reseed' : 'Seed Demo Data'}
              </Button>
              {status?.seeded && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSeeding || isResetting}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  {isResetting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seed Result */}
      {seedResult && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-900">Seed Complete</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Sites</span>
                <p className="font-semibold text-lg">{seedResult.site_ids.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Activities</span>
                <p className="font-semibold text-lg">{seedResult.payment_activity_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Records</span>
                <p className="font-semibold text-lg">{seedResult.payment_record_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Exceptions</span>
                <p className="font-semibold text-lg">{seedResult.payment_exception_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Demo Script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Live Demo Walkthrough
          </CardTitle>
          <CardDescription className="text-xs">
            Follow these steps to demonstrate the Clinical Payments module. Estimated time: 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div className="mt-2 h-full w-px bg-border" />
              </div>
              <div className="flex-1 pb-6">
                <h4 className="text-sm font-semibold">Seed Demo Data</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the <strong>Seed Demo Data</strong> button above. This creates a complete demo
                  environment with 3 clinical sites, 10 subjects, payment activities at various stages,
                  payment records, exceptions, and contracts. All demo records are prefixed with
                  <Badge variant="outline" className="mx-1 text-[10px] py-0">[DEMO]</Badge>
                  for easy identification.
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  What to show: the confirmation banner with counts of created records.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <div className="mt-2 h-full w-px bg-border" />
              </div>
              <div className="flex-1 pb-6">
                <h4 className="text-sm font-semibold">Explore the Payments Dashboard</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Navigate to the <strong>Clinical Payments</strong> main page to see the overview dashboard.
                  Point out the four KPI cards (Total Sites, Pending Activities, Pending Records,
                  Processed This Month). Switch between the Sites, Payment Records, and Protocol Summary tabs.
                </p>
                {status?.seeded && (
                  <Link
                    href="/protected/clinical-payments"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                  >
                    Open Clinical Payments Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                <div className="mt-3 rounded-lg border p-3 bg-muted/30 text-xs space-y-2">
                  <p className="font-medium">Key talking points:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Sites tab: shows all demo sites with pending payment counts</li>
                    <li>Payment Records tab: shows generated interim payments in various statuses</li>
                    <li>Protocol Summary tab: bar chart comparing earned vs. paid amounts</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <div className="mt-2 h-full w-px bg-border" />
              </div>
              <div className="flex-1 pb-6">
                <h4 className="text-sm font-semibold">Drill into a Site</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Click on a demo site (e.g., <strong>[DEMO] SITE-101</strong>) to see the site-level detail.
                  Walk through the three tabs:
                </p>
                {status?.seeded && seedResult?.site_ids?.[0] && (
                  <Link
                    href={`/protected/clinical-payments/sites/${seedResult.site_ids[0]}`}
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                  >
                    Open Demo Site SITE-101
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                <div className="mt-3 rounded-lg border p-3 bg-muted/30 text-xs space-y-2">
                  <p className="font-medium">Demo actions to perform:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong>Payment Activities:</strong> Mark an activity as complete, add an unplanned payment</li>
                    <li><strong>Payment Exceptions:</strong> Show site-specific amount overrides</li>
                    <li><strong>Payment Records:</strong> Generate a payment record from completed activities, then update its status</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  4
                </div>
                <div className="mt-2 h-full w-px bg-border" />
              </div>
              <div className="flex-1 pb-6">
                <h4 className="text-sm font-semibold">Show Payment Processing Workflow</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Navigate back to the main payments page. On the Payment Records tab,
                  demonstrate the full lifecycle:
                </p>
                <div className="mt-3 rounded-lg border p-3 bg-muted/30 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">To Be Processed</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="secondary" className="text-[10px]">In Progress</Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="secondary" className="text-[10px]">Processed</Badge>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground mt-2">
                    <li>Edit a payment record to change status and add check details</li>
                    <li>Show the Protocol Summary chart updating with new paid amounts</li>
                    <li>Demonstrate the revert action on an in-progress record</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold">Reset (Optional)</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  When finished, click <strong>Reset</strong> to cleanly remove all demo data.
                  This only removes records tagged with the <Badge variant="outline" className="mx-1 text-[10px] py-0">[DEMO]</Badge> prefix
                  and does not affect any existing production data.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      {status?.seeded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle>
            <CardDescription className="text-xs">Jump directly to demo pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Link
                href="/protected/clinical-payments"
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Payments Dashboard</p>
                    <p className="text-xs text-muted-foreground">Overview with stats, sites, and records</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {seedResult?.site_ids?.map((siteId, i) => (
                <Link
                  key={siteId}
                  href={`/protected/clinical-payments/sites/${siteId}`}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Site {101 + i}</p>
                      <p className="text-xs text-muted-foreground">
                        [DEMO] SITE-{101 + i} — Activities, exceptions, records
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Verification Checklist
          </CardTitle>
          <CardDescription className="text-xs">
            Manual checks to confirm the demo is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {[
              'Seed button creates demo data without errors',
              'Clinical Payments dashboard shows updated stats (Total Sites, Pending Activities)',
              'Sites tab lists 3 demo sites with [DEMO] prefix',
              'Clicking a site shows Payment Activities, Exceptions, and Records tabs',
              'Payment activities show a mix of completed and pending items',
              'Payment exceptions display site-specific amount overrides',
              'Payment records exist in To Be Processed and Processed statuses',
              'Protocol Summary tab shows earned vs paid bar chart',
              'Reset button removes all demo data cleanly',
              'After reset, no [DEMO] records remain in any tab',
              'Non-demo records (if any) are unaffected by seed/reset',
            ].map((item, idx) => (
              <label key={idx} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded" />
                <span className="text-muted-foreground">{item}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
