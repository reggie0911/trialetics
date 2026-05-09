'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type FinanceMutationResult<T> = {
  data?: T | null;
  error: string | null;
  code?: 'STALE_RECORD' | string;
};

function isStaleRecord(r: FinanceMutationResult<unknown>): boolean {
  return r.code === 'STALE_RECORD';
}

/**
 * Wraps TanStack `useMutation` for finance server actions that return
 * `{ data, error, code? }` instead of throwing.
 */
export function useFinanceMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<FinanceMutationResult<TData>>,
  options?: {
    successToast?: string;
    /** Query keys to invalidate after a successful mutation. */
    invalidateKeys?: readonly (readonly unknown[])[];
    /** Called after error/success handling (e.g. `router.refresh()`). */
    onResult?: (result: FinanceMutationResult<TData>) => void;
  },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      if (result.error) {
        if (isStaleRecord(result)) {
          toast.error(result.error, { description: 'Reload the page to see the latest data.' });
        } else {
          toast.error(result.error);
        }
        options?.onResult?.(result);
        return;
      }
      if (options?.successToast) toast.success(options.successToast);
      for (const key of options?.invalidateKeys ?? []) {
        await qc.invalidateQueries({ queryKey: [...key] });
      }
      options?.onResult?.(result);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });
}
