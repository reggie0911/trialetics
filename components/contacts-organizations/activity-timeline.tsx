/**
 * Activity Timeline Component
 * Displays a timeline of activities for organizations or contacts
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock, User, Edit, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
  id: string;
  activity_type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'type_changed';
  description: string;
  changed_fields?: Record<string, { old: any; new: any }>;
  performer_email?: string | null;
  created_at: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  emptyMessage?: string;
}

const activityIcons = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  status_changed: RefreshCw,
  type_changed: RefreshCw,
};

const activityColors = {
  created: 'text-green-600 bg-green-50',
  updated: 'text-blue-600 bg-blue-50',
  deleted: 'text-red-600 bg-red-50',
  status_changed: 'text-amber-600 bg-amber-50',
  type_changed: 'text-purple-600 bg-purple-50',
};

export function ActivityTimeline({ activities, emptyMessage = 'No activity history yet' }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p className="text-xs md:text-xs">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.activity_type];
          const colorClass = activityColors[activity.activity_type];
          const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline line */}
              {index < activities.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
              )}

              {/* Icon */}
              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-xs md:text-xs font-medium">{activity.description}</p>
                      {activity.performer_email && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{activity.performer_email}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {timeAgo}
                    </Badge>
                  </div>

                  {/* Changed fields details */}
                  {activity.changed_fields && Object.keys(activity.changed_fields).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(activity.changed_fields).map(([field, values]) => (
                        <div key={field} className="text-xs border-l-2 border-muted pl-3 py-1">
                          <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground line-through">
                              {formatValue(values.old)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{formatValue(values.new)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/**
 * Helper to format field values for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'None';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
