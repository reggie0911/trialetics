'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UsersTable } from './users-table';
import { InviteUserForm } from './invite-user-form';
import { ModulesList } from './modules-list';
import { UserStatsCards } from './user-stats-cards';
import {
  getCompanyUsers,
  getActiveModules,
  getCompanyUserStats,
  UserWithModules,
  ModuleWithUserCount,
  UserStats,
} from '@/lib/actions/admin';

interface AdminPageClientProps {
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function AdminPageClient({
  companyId,
  profileId,
  userEmail,
}: AdminPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<UserWithModules[]>([]);
  const [modules, setModules] = useState<ModuleWithUserCount[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      // Fetch users, modules, and stats in parallel
      const [usersResult, modulesResult, statsResult] = await Promise.all([
        getCompanyUsers(companyId),
        getActiveModules(companyId),
        getCompanyUserStats(companyId),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      } else if (!usersResult.success) {
        toast({
          title: 'Error loading users',
          description: usersResult.error || 'Failed to load users',
          variant: 'destructive',
        });
      }

      if (modulesResult.success && modulesResult.data) {
        setModules(modulesResult.data);
      } else if (!modulesResult.success) {
        toast({
          title: 'Error loading modules',
          description: modulesResult.error || 'Failed to load modules',
          variant: 'destructive',
        });
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else if (!statsResult.success) {
        toast({
          title: 'Error loading statistics',
          description: statsResult.error || 'Failed to load statistics',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId]); // Removed toast from dependencies

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
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
      {/* User Statistics */}
      {stats && <UserStatsCards stats={stats} />}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/protected')}
        >
          <Home className="mr-2 h-4 w-4" />
          Go to Homepage
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Users Table (spans 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <UsersTable
            users={users}
            currentUserId={profileId}
            companyId={companyId}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Right Column - Invite Form and Modules */}
        <div className="space-y-6">
          <InviteUserForm
            companyId={companyId}
            profileId={profileId}
            modules={modules}
            onSuccess={handleRefresh}
          />
          
          <ModulesList modules={modules} />
        </div>
      </div>
    </div>
  );
}
