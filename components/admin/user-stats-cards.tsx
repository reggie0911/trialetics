'use client';

import { Users, Shield, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserStats } from '@/lib/actions/admin';

interface UserStatsCardsProps {
  stats: UserStats;
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  const statsData = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      iconColor: 'text-blue-500',
    },
    {
      title: 'Admin Users',
      value: stats.adminUsers,
      icon: Shield,
      iconColor: 'text-amber-500',
    },
    {
      title: 'Pending Invites',
      value: stats.pendingInvites,
      icon: Clock,
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
