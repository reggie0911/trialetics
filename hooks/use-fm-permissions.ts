'use client';

import { useQuery } from '@tanstack/react-query';

import type { FinanceApprovalLimitCents } from '@/lib/actions/study-finance-module';
import { getFinancePermissionFlags } from '@/lib/actions/study-finance-module';

export interface FmPermissionFlags {
  canWrite: boolean;
  studyStatus: string;
  baseCurrency: string;
  approvalLimits: FinanceApprovalLimitCents;
  nextApproverRoutingHint: string;
}

/**
 * Study-scoped finance permissions for row menus and mutation guards.
 * Extend the server action when finer-grained roles are introduced.
 */
export function useFmPermissions(studyId: string | undefined) {
  return useQuery({
    queryKey: ['finance-permissions', studyId ?? ''],
    queryFn: async (): Promise<FmPermissionFlags> => {
      if (!studyId) throw new Error('Missing studyId.');
      const r = await getFinancePermissionFlags(studyId);
      if (r.error) throw new Error(r.error);
      return r.data as FmPermissionFlags;
    },
    enabled: Boolean(studyId),
    staleTime: 60_000,
  });
}
