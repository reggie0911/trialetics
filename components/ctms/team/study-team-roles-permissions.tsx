'use client';

import { Check, Minus, ShieldCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TEAM_ROLE_OPTIONS, type TeamMemberRole } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

type Capability = 'sites' | 'subjects' | 'visits' | 'etmf' | 'team';

const CAPABILITY_LABEL: Record<Capability, string> = {
  sites: 'Sites',
  subjects: 'Subjects',
  visits: 'Visits',
  etmf: 'eTMF',
  team: 'Team',
};

/**
 * Static read-only matrix of which team roles typically operate which CTMS
 * surfaces. This is a heuristic derived from clinical operations practice and
 * mirrors the reference image; it is not enforcement (RLS is the source of
 * truth) but gives operators a quick reference while the real RBAC matrix is
 * being wired up.
 */
const ROLE_PERMISSIONS: Partial<Record<TeamMemberRole, Capability[]>> = {
  clinical_project_manager: ['sites', 'subjects', 'visits', 'etmf', 'team'],
  clinical_research_associate: ['sites', 'subjects', 'visits', 'etmf'],
  clinical_trial_assistant: ['sites', 'subjects', 'etmf'],
  clinical_data_manager: ['subjects', 'visits'],
  cra_manager: ['sites', 'subjects', 'visits', 'team'],
  study_coordinator: ['subjects', 'visits'],
  principal_investigator: ['subjects', 'visits'],
  biostatistician: ['subjects'],
  finance_director: ['team'],
  finance_reviewer: ['team'],
  accounts_payable_specialist: ['team'],
  site_budget_specialist: ['sites'],
  contracts_manager: ['etmf'],
  clinical_contracts_specialist: ['etmf'],
  regulatory_specialist: ['etmf'],
  safety_specialist: ['subjects'],
  inventory_specialist: ['sites'],
  medical_writer: ['etmf'],
  executive_director: ['sites', 'subjects', 'visits', 'etmf', 'team'],
  vendor_manager: ['sites', 'etmf'],
  study_startup_specialist: ['sites', 'etmf'],
};

const CAPABILITIES: Capability[] = ['sites', 'subjects', 'visits', 'etmf', 'team'];

export function StudyTeamRolesPermissions() {
  const visibleRoles = TEAM_ROLE_OPTIONS.filter((opt) => opt.value !== 'custom');

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-100/70 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Roles &amp; Permissions
              <Badge variant="secondary" className="ml-2 text-[10px]">
                Reference
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Suggested capability mapping per study role. Enforcement is handled by
              row-level security and access reviews — this matrix is a guide.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">
                Study Role
              </TableHead>
              {CAPABILITIES.map((c) => (
                <TableHead
                  key={c}
                  className="text-center text-xs font-medium text-muted-foreground"
                >
                  {CAPABILITY_LABEL[c]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRoles.map((opt) => {
              const caps = ROLE_PERMISSIONS[opt.value] ?? [];
              return (
                <TableRow key={opt.value} className="h-10">
                  <TableCell className="text-xs font-medium">{opt.label}</TableCell>
                  {CAPABILITIES.map((c) => {
                    const has = caps.includes(c);
                    return (
                      <TableCell key={c} className="text-center">
                        <span
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded-full',
                            has
                              ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'text-muted-foreground/40'
                          )}
                          aria-hidden
                        >
                          {has ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </span>
                        <span className="sr-only">
                          {has ? 'Has access' : 'No access'} to {CAPABILITY_LABEL[c]}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
