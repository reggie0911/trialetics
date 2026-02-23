'use client';

import { useState, useEffect } from 'react';
import { checkPermission } from '@/lib/actions/rbac';
import type { PermissionKey } from '@/lib/types/rbac';

export function usePermission(
  userId: string | undefined,
  moduleId: string | undefined,
  permissionKey: PermissionKey
): { allowed: boolean; loading: boolean } {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !moduleId) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      setLoading(true);
      const result = await checkPermission(userId, moduleId, permissionKey);
      if (!cancelled) {
        setAllowed(result.success ? !!result.data : false);
        setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [userId, moduleId, permissionKey]);

  return { allowed, loading };
}
