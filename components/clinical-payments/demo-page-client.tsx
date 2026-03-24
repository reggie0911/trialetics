'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Play,
  RotateCcw,
  CheckCircle2,
  Circle,
  ArrowRight,
  AlertTriangle,
  Database,
  Eye,
  Banknote,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  seedDemoClinicalPayments,
  resetDemoClinicalPayments,
  getDemoClinicalPaymentsStatus,
} from '@/lib/actions/demo-clinical-payments';

interface DemoPageClientProps {
  companyId: string;
  profileId: string;
}

interface DemoStatus {
  is_seeded: boolean;
  protocol_id: string | null;
  site_count: number;
  activity_count: number;
  record_count: number;
}

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    title: 'Seed Demo Data',
    description:
      'Click "Seed Demo Data" to populate the database with a realistic clinical trial protocol, 3 research sites, investigators, contracts, and payment activities across different statuses.',
    icon: Database,
  },
  {
    step: 2,
    title: 'Explore the Payments Dashboard',
    description:
      'Navigate to Clinical Payments to see the overview: stats cards showing site counts, pending activities, pending records, and processed payments. Browse the Sites, Records, and Protocol Summary tabs.',
    icon: Eye,
  },
  {
    step: 3,
    title: 'Drill Into a Site',
    description:
      'Click any DEMO site to see its payment activities, exceptions, and splits. Mark activities as complete, adjust deviations, or create unplanned payments.',
    icon: Building2,
  },
  {
    step: 4,
    title: 'Generate Payment Records',
    description:
      'From the site detail page, select completed activities and generate a payment record. See how withholding amounts are calculated and how records flow through statuses.',
    icon: Banknote,
  },
  {
    step: 5,
    title: 'Review & Process',
    description:
      'In the Payment Records tab, update record statuses from "To Be Processed" to "In Progress" to "Processed". Add check numbers and dates to simulate real payment processing.',
    icon: FileText,
  },
];

export function DemoPageClient({ companyId, profileId }: DemoPageClientProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStatus = useCallback(async () => {
    const result = await getDemoClinicalPaymentsStatus(companyId);
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
    try {
      const result = await seedDemoClinicalPayments(companyId, profileId);
      if (result.success && result.data) {
        toast({
          title: 'Demo Data Seeded',
          description: `Created ${result.data.site_ids.length} sites, ${result.data.activity_count} activities, and ${result.data.record_count} payment records.`,
        });
        await fetchStatus();
      } else {
        toast({
          title: 'Seed Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while seeding demo data.',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetDemoClinicalPayments(companyId);
      if (result.success) {
        toast({
          title: 'Demo Data Reset',
          description: 'All demo data has been removed. You can re-seed at any time.',
        });
        await fetchStatus();
      } else {
        toast({
          title: 'Reset Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while resetting demo data.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={status?.is_seeded ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status?.is_seeded ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {status?.is_seeded ? 'Demo data is active' : 'No demo data found'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status?.is_seeded
                    ? `${status.site_count} sites, ${status.activity_count} activities, ${status.record_count} records`
                    : 'Click "Seed Demo Data" to get started.'}
                </p>
              </div>
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
                {status?.is_seeded ? 'Re-seed Demo Data' : 'Seed Demo Data'}
              </Button>

              {status?.is_seeded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSeeding || isResetting}
                  className="text-xs"
                >
                  {isResetting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Reset Demo Data
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation (only when seeded) */}
      {status?.is_seeded && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="w-full text-xs h-auto py-3 flex-1" render={<Link href="/protected/clinical-payments" />}>
                <Banknote className="mr-2 h-4 w-4" />
                Open Clinical Payments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full text-xs h-auto py-3 flex-1" render={<Link href="/protected/studies" />}>
                <Building2 className="mr-2 h-4 w-4" />
                View Studies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full text-xs h-auto py-3 flex-1" render={<Link href="/protected/contacts-organizations" />}>
                <FileText className="mr-2 h-4 w-4" />
                View Contacts & Orgs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Walkthrough Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Demo Walkthrough</CardTitle>
          <CardDescription className="text-xs">
            Follow these steps to present the Clinical Payments module. Estimated time: 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {WALKTHROUGH_STEPS.map((step) => {
              const isActive = status?.is_seeded
                ? step.step === 2
                : step.step === 1;
              const isComplete = status?.is_seeded && step.step === 1;

              return (
                <div
                  key={step.step}
                  className={`flex gap-4 p-4 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-primary/40 bg-primary/5'
                      : isComplete
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-muted'
                  }`}
                >
                  <div className="shrink-0 pt-0.5">
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isActive ? (
                      <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium">
                        Step {step.step}: {step.title}
                      </p>
                      {isActive && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Details (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">What Gets Created</CardTitle>
              <CardDescription className="text-xs">
                Details of the demo data that will be seeded.
              </CardDescription>
            </div>
            {showDetails ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium">Protocol & Structure</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>1 Protocol: DEMO-CP-001 (Phase III, Double-Blind)</li>
                  <li>1 Region: DEMO-North America</li>
                  <li>3 Organizations (research sites)</li>
                  <li>6 Contacts (PIs, coordinators, finance)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Sites & Payments</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>3 Clinical Sites: DEMO-101, DEMO-102, DEMO-103</li>
                  <li>4 Site Contracts (with payees)</li>
                  <li>24 Payment Activities (various statuses)</li>
                  <li>3 Payment Records (processed, in-progress, pending)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Data Isolation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>All demo entities use [DEMO] or DEMO- prefix</li>
                  <li>Scoped to your company_id via RLS</li>
                  <li>Reset removes only [DEMO]-prefixed records</li>
                  <li>No impact on existing production data</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Payment Scenarios</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Site 101: 10% withholding, split payments, processed record</li>
                  <li>Site 102: 5% + $500 withholding, pending record</li>
                  <li>Site 103: No withholding, no records yet</li>
                  <li>Activities with positive and negative deviations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
