'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getSiteTrainingPlans,
  getSiteTrainingTopics,
  addTrainingPlanToSite,
  removeTrainingPlanFromSite,
  addTopicToSite,
  removeTopicFromSite,
  markAllContactsCompleteForTopic,
  markContactTrainingComplete,
  getContactCompletionForSiteTopic,
} from '@/lib/actions/site-training';
import {
  getTrainingPlans,
  getApprovedVersionForPlan,
} from '@/lib/actions/training-plans';
import { getActiveTrainingTopics } from '@/lib/actions/training-topics';
import type { TrainingPlan } from '@/lib/types/clinical-training';

interface SiteTrainingClientProps {
  clinicalSiteId: string;
  siteNumber: string;
  companyId: string;
}

export function SiteTrainingClient({ clinicalSiteId, siteNumber, companyId }: SiteTrainingClientProps) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<{ plan: TrainingPlan; versionId: string }[]>([]);
  const [availableTopics, setAvailableTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPlanDialog, setShowAddPlanDialog] = useState(false);
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [contactCompletions, setContactCompletions] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [plansRes, topicsRes, planListRes, topicListRes] = await Promise.all([
      getSiteTrainingPlans(clinicalSiteId),
      getSiteTrainingTopics(clinicalSiteId),
      getTrainingPlans(companyId),
      getActiveTrainingTopics(companyId),
    ]);

    if (plansRes.success && plansRes.data) setPlans(plansRes.data);
    if (topicsRes.success && topicsRes.data) setTopics(topicsRes.data);

    const approved: { plan: TrainingPlan; versionId: string }[] = [];
    if (planListRes.success && planListRes.data) {
      for (const p of planListRes.data) {
        const vRes = await getApprovedVersionForPlan(p.id);
        if (vRes.success && vRes.data) {
          const existing = plansRes.data?.some((sp: any) => sp.plan?.training_plan_version_id === vRes.data!.id);
          if (!existing) approved.push({ plan: p, versionId: vRes.data.id });
        }
      }
      setAvailablePlans(approved);
    }

    const existingTopicIds = (topicsRes.data || []).map((t: any) => t.stt?.training_topic_id).filter(Boolean);
    const avail = (topicListRes.data || []).filter((t: any) => !existingTopicIds.includes(t.id));
    setAvailableTopics(avail);

    setIsLoading(false);
  }, [clinicalSiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadContactCompletions = useCallback(async (siteTrainingTopicId: string) => {
    const result = await getContactCompletionForSiteTopic(siteTrainingTopicId);
    if (result.success && result.data) setContactCompletions(result.data);
  }, []);

  useEffect(() => {
    if (expandedTopicId) loadContactCompletions(expandedTopicId);
    else setContactCompletions([]);
  }, [expandedTopicId, loadContactCompletions]);

  const handleAddPlan = async () => {
    if (!selectedPlanVersionId) return;
    const result = await addTrainingPlanToSite(clinicalSiteId, selectedPlanVersionId);
    if (result.success) {
      toast({ title: 'Success', description: 'Training plan added to site' });
      loadData();
      setShowAddPlanDialog(false);
      setSelectedPlanVersionId('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemovePlan = async (siteTrainingPlanId: string) => {
    if (!confirm('Remove this training plan from the site?')) return;
    const result = await removeTrainingPlanFromSite(clinicalSiteId, siteTrainingPlanId);
    if (result.success) {
      toast({ title: 'Success', description: 'Training plan removed' });
      loadData();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddTopic = async () => {
    if (!selectedTopicId) return;
    const result = await addTopicToSite(clinicalSiteId, selectedTopicId);
    if (result.success) {
      toast({ title: 'Success', description: 'Training topic added' });
      loadData();
      setShowAddTopicDialog(false);
      setSelectedTopicId('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveTopic = async (siteTrainingTopicId: string) => {
    const result = await removeTopicFromSite(siteTrainingTopicId);
    if (result.success) {
      toast({ title: 'Success', description: 'Training topic removed' });
      loadData();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleCompleteAll = async (siteTrainingTopicId: string) => {
    const result = await markAllContactsCompleteForTopic(siteTrainingTopicId);
    if (result.success) {
      toast({ title: 'Success', description: 'All contacts marked complete' });
      loadData();
      if (expandedTopicId === siteTrainingTopicId) loadContactCompletions(siteTrainingTopicId);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/protected/clinical-training"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clinical Training
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Plans</CardTitle>
            <CardDescription className="text-[12px]">
              Plans assigned to this site (topics are copied from the approved version)
            </CardDescription>
            <Button
              size="sm"
              className="mt-2 text-[12px]"
              onClick={() => setShowAddPlanDialog(true)}
              disabled={availablePlans.length === 0}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Plan
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-[12px] text-muted-foreground">Loading...</p>
            ) : plans.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No training plans assigned</p>
            ) : (
              <ul className="space-y-2">
                {plans.map((item: any) => (
                  <li key={item.plan?.id} className="flex items-center justify-between rounded border p-2 text-[12px]">
                    <span>{item.training_plan?.name || 'Plan'} (v{item.version?.version_number})</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemovePlan(item.plan?.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training Topics</CardTitle>
            <CardDescription className="text-[12px]">
              Topics assigned to this site (add manually or from plans)
            </CardDescription>
            <Button
              size="sm"
              className="mt-2 text-[12px]"
              onClick={() => setShowAddTopicDialog(true)}
              disabled={availableTopics.length === 0}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Topic
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-[12px] text-muted-foreground">Loading...</p>
            ) : topics.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No training topics assigned</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[12px]">Topic</TableHead>
                    <TableHead className="text-[12px]">Completed</TableHead>
                    <TableHead className="text-[12px]">Source</TableHead>
                    <TableHead className="text-[12px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topics.map((item: any) => (
                    <>
                      <TableRow key={item.stt?.id}>
                        <TableCell className="text-[12px]">
                          <button
                            className="text-left hover:underline"
                            onClick={() => setExpandedTopicId(expandedTopicId === item.stt?.id ? null : item.stt?.id)}
                          >
                            {item.topic?.name || '—'}
                          </button>
                        </TableCell>
                        <TableCell className="text-[12px]">
                          {item.contacts_completed}/{item.contacts_completed + item.contacts_not_completed}
                        </TableCell>
                        <TableCell className="text-[12px]">{item.stt?.source || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[12px]"
                              onClick={() => handleCompleteAll(item.stt?.id)}
                              disabled={item.contacts_not_completed === 0}
                            >
                              Complete All
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveTopic(item.stt?.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedTopicId === item.stt?.id && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/30">
                            <div className="p-2 space-y-2">
                              <p className="text-[12px] font-medium">Contacts</p>
                              {contactCompletions.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between text-[12px]">
                                  <span>
                                    {c.protocol_contacts?.contacts?.first_name} {c.protocol_contacts?.contacts?.last_name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={async () => {
                                      const r = await markContactTrainingComplete(c.id, !c.completed);
                                      if (r.success) loadContactCompletions(item.stt?.id);
                                    }}
                                  >
                                    {c.completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddPlanDialog} onOpenChange={setShowAddPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Training Plan</DialogTitle>
            <DialogDescription>Select a training plan to add to this site</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[12px]">Training Plan</label>
              <Select value={selectedPlanVersionId} onValueChange={(v) => setSelectedPlanVersionId(v ?? '')}>
                <SelectTrigger className="mt-1 text-[12px]">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map(({ plan, versionId }) => (
                    <SelectItem key={versionId} value={versionId} className="text-[12px]">
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlanDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleAddPlan} disabled={!selectedPlanVersionId} className="text-[12px]">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTopicDialog} onOpenChange={setShowAddTopicDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Training Topic</DialogTitle>
            <DialogDescription>Select a training topic to add manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-[12px]">Training Topic</label>
              <Select value={selectedTopicId} onValueChange={(v) => setSelectedTopicId(v ?? '')}>
                <SelectTrigger className="mt-1 text-[12px]">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="text-[12px]">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTopicDialog(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button onClick={handleAddTopic} disabled={!selectedTopicId} className="text-[12px]">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
