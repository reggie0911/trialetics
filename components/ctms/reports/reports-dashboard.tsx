'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  BarChart3,
  Activity,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type {
  KriDefinition,
  KriCategory,
  SavedReport,
  StudyPortfolioRow,
  ReportType,
} from '@/lib/types/ctms';
import {
  KRI_CATEGORY_OPTIONS,
  KRI_CATEGORY_LABEL,
  REPORT_TYPE_OPTIONS,
} from '@/lib/types/ctms';
import {
  getKriDefinitions,
  createKriDefinition,
  deleteKriDefinition,
  getSavedReports,
  createSavedReport,
  deleteSavedReport,
} from '@/lib/actions/reports';
import { KriGauge } from './kri-gauge';
import { PortfolioTable } from './portfolio-table';

interface ReportsDashboardProps {
  initialKris: KriDefinition[];
  initialReports: SavedReport[];
  portfolio: StudyPortfolioRow[];
}

export function ReportsDashboard({ initialKris, initialReports, portfolio }: ReportsDashboardProps) {
  const [kris, setKris] = useState(initialKris);
  const [reports, setReports] = useState(initialReports);
  const [, startTransition] = useTransition();

  const refreshData = useCallback(() => {
    startTransition(async () => {
      try {
        const [k, r] = await Promise.all([getKriDefinitions(), getSavedReports()]);
        setKris(k);
        setReports(r);
      } catch {
        toast.error('Failed to refresh data');
      }
    });
  }, []);

  const handleDeleteKri = async (id: string) => {
    const { error } = await deleteKriDefinition(id);
    if (error) { toast.error(error); return; }
    toast.success('KRI deleted');
    refreshData();
  };

  const handleDeleteReport = async (id: string) => {
    const { error } = await deleteSavedReport(id);
    if (error) { toast.error(error); return; }
    toast.success('Report deleted');
    refreshData();
  };

  const totalGreen = portfolio.reduce((s, p) => s + p.kriGreen, 0);
  const totalYellow = portfolio.reduce((s, p) => s + p.kriYellow, 0);
  const totalRed = portfolio.reduce((s, p) => s + p.kriRed, 0);
  const totalStudies = portfolio.length;
  const activeStudies = portfolio.filter((p) => p.status === 'active').length;
  const totalSubjects = portfolio.reduce((s, p) => s + p.totalSubjects, 0);
  const totalSites = portfolio.reduce((s, p) => s + p.totalSites, 0);

  return (
    <Tabs tabsId="reports-dashboard" defaultValue="portfolio" className="space-y-4">
      <TabsList>
        <TabsTrigger value="portfolio">
          <BarChart3 className="mr-1 h-3.5 w-3.5" />
          Portfolio
        </TabsTrigger>
        <TabsTrigger value="kris">
          <Activity className="mr-1 h-3.5 w-3.5" />
          KRI Definitions ({kris.length})
        </TabsTrigger>
        <TabsTrigger value="saved">
          <FileText className="mr-1 h-3.5 w-3.5" />
          Saved Reports ({reports.length})
        </TabsTrigger>
      </TabsList>

      {/* Portfolio Tab */}
      <TabsContent value="portfolio" className="space-y-4">
        <Card className="rounded-lg">
          <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
            {[
              { label: 'Studies', value: `${activeStudies}/${totalStudies} active`, markerColor: null as string | null },
              { label: 'Sites', value: String(totalSites), markerColor: 'bg-emerald-500' },
              { label: 'Subjects', value: String(totalSubjects), markerColor: 'bg-blue-500' },
              {
                label: 'KRI Health',
                value: null,
                markerColor: 'bg-violet-500' as string | null,
                customContent: (
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs"><span className="h-2 w-2 rounded-full bg-green-500" />{totalGreen}</span>
                    <span className="flex items-center gap-0.5 text-xs"><span className="h-2 w-2 rounded-full bg-yellow-400" />{totalYellow}</span>
                    <span className="flex items-center gap-0.5 text-xs"><span className="h-2 w-2 rounded-full bg-red-500" />{totalRed}</span>
                  </span>
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm font-medium text-foreground"
              >
                {item.markerColor && (
                  <span className={`h-2 w-4 shrink-0 rounded-full ${item.markerColor}`} aria-hidden />
                )}
                <span>
                  {'customContent' in item && item.customContent ? (
                    <span className="flex items-center gap-1.5">
                      {item.label} (
                      {item.customContent}
                      )
                    </span>
                  ) : (
                    `${item.label} (${item.value})`
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioTable studies={portfolio} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* KRI Definitions Tab */}
      <TabsContent value="kris" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Key Risk Indicators</h3>
            <p className="text-sm text-muted-foreground">
              Define KRIs to monitor study and site health.
            </p>
          </div>
          <KriFormDialog onSuccess={refreshData} />
        </div>

        {kris.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No KRIs defined</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create KRI definitions to track risk indicators across studies.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kris.map((kri) => (
              <Card key={kri.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{kri.name}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {KRI_CATEGORY_LABEL[kri.category]}
                      </Badge>
                      {kri.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{kri.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        {kri.threshold_yellow != null && (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            Yellow: ≥{kri.threshold_yellow}
                          </span>
                        )}
                        {kri.threshold_red != null && (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Red: ≥{kri.threshold_red}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={kri.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {kri.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete KRI</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete &ldquo;{kri.name}&rdquo; and all recorded values?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteKri(kri.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Saved Reports Tab */}
      <TabsContent value="saved" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Saved Reports</h3>
            <p className="text-sm text-muted-foreground">
              Your saved report configurations.
            </p>
          </div>
          <SaveReportDialog onSuccess={refreshData} />
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No saved reports</p>
              <p className="text-xs text-muted-foreground mt-1">
                Save report configurations for quick access.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const typeLabel = REPORT_TYPE_OPTIONS.find((o) => o.value === report.report_type)?.label ?? report.report_type;
              const author = report.profiles
                ? [report.profiles.first_name, report.profiles.last_name].filter(Boolean).join(' ')
                : 'Unknown';
              return (
                <Card key={report.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{report.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{typeLabel}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          by {author} &middot; {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Report</AlertDialogTitle>
                            <AlertDialogDescription>Remove &ldquo;{report.name}&rdquo;?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteReport(report.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// KRI Definition Form Dialog

const kriSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  calculation_method: z.string().optional(),
  threshold_yellow: z.string().optional(),
  threshold_red: z.string().optional(),
});

type KriFormValues = z.infer<typeof kriSchema>;

function KriFormDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<KriFormValues>({
    resolver: zodResolver(kriSchema),
    defaultValues: { name: '', description: '', category: 'enrollment', calculation_method: '', threshold_yellow: '', threshold_red: '' },
  });

  const onSubmit = async (values: KriFormValues) => {
    const { error } = await createKriDefinition({
      name: values.name,
      description: values.description,
      category: values.category as KriCategory,
      calculation_method: values.calculation_method,
      threshold_yellow: values.threshold_yellow ? parseFloat(values.threshold_yellow) : undefined,
      threshold_red: values.threshold_red ? parseFloat(values.threshold_red) : undefined,
    });
    if (error) { toast.error(error); return; }
    toast.success('KRI created');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />Add KRI
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Define KRI</DialogTitle>
          <DialogDescription>Create a new Key Risk Indicator definition.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g., Screen Failure Rate" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.watch('category')} onValueChange={(val) => form.setValue('category', val)}>
                <SelectTrigger className="w-full">
                <SelectValue
                  getDisplayLabel={(v) => KRI_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v}
                />
              </SelectTrigger>
                <SelectContent>
                  {KRI_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Calculation Method</Label>
              <Input placeholder="e.g., % screen failures" {...form.register('calculation_method')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Yellow Threshold</Label>
              <Input type="number" step="0.01" placeholder="e.g., 20" {...form.register('threshold_yellow')} />
            </div>
            <div className="space-y-2">
              <Label>Red Threshold</Label>
              <Input type="number" step="0.01" placeholder="e.g., 35" {...form.register('threshold_red')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Optional description..." rows={2} {...form.register('description')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating...' : 'Create KRI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Save Report Dialog

const reportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  report_type: z.string().min(1, 'Type is required'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

function SaveReportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { name: '', report_type: 'enrollment' },
  });

  const onSubmit = async (values: ReportFormValues) => {
    const { error } = await createSavedReport(values.name, values.report_type as ReportType, {});
    if (error) { toast.error(error); return; }
    toast.success('Report saved');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />Save Report
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Report</DialogTitle>
          <DialogDescription>Save a report configuration for quick access.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input placeholder="e.g., Monthly Enrollment Summary" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={form.watch('report_type')} onValueChange={(val) => form.setValue('report_type', val)}>
              <SelectTrigger className="w-full">
              <SelectValue
                getDisplayLabel={(v) => REPORT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
              />
            </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
