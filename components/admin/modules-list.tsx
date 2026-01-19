'use client';

import { Boxes, Users, CheckCircle, XCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ModuleWithUserCount } from '@/lib/actions/admin';

interface ModulesListProps {
  modules: ModuleWithUserCount[];
}

export function ModulesList({ modules }: ModulesListProps) {
  const activeCount = modules.filter(m => m.active).length;
  const totalUsers = modules.reduce((sum, m) => sum + m.user_count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          Modules
        </CardTitle>
        <CardDescription>
          {activeCount} active {activeCount === 1 ? 'module' : 'modules'} • {totalUsers} total user assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No modules configured
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map(module => (
              <div
                key={module.id}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <div
                  className={`mt-0.5 rounded-full p-1 ${
                    module.active
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {module.active ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{module.name}</h4>
                    <Badge
                      variant={module.active ? 'default' : 'secondary'}
                      className="text-[10px] shrink-0"
                    >
                      {module.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {module.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {module.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>
                      {module.user_count} {module.user_count === 1 ? 'user' : 'users'} with access
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
