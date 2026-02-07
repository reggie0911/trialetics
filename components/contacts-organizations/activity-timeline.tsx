/**
 * Activity Timeline Component
 * Displays a timeline of activities for organizations or contacts
 */

'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Clock, Edit, Trash2, Plus, RefreshCw, CheckCircle, ArrowRight, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  status_changed: CheckCircle,
  type_changed: RefreshCw,
};

const activityColors = {
  created: 'bg-purple-100 text-purple-600',
  updated: 'bg-blue-100 text-blue-600',
  deleted: 'bg-red-100 text-red-600',
  status_changed: 'bg-amber-100 text-amber-600',
  type_changed: 'bg-indigo-100 text-indigo-600',
};

/**
 * Formats the activity timestamp
 */
function formatActivityTime(date: Date): string {
  if (isToday(date)) {
    const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hoursAgo < 1) {
      const minutesAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      return `${minutesAgo}m ago`;
    }
    return `${hoursAgo}h ago`;
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d, yyyy');
}

/**
 * Extracts the performer's name from email
 */
function getPerformerName(email: string | null | undefined): string {
  if (!email) return 'Unknown User';
  const namePart = email.split('@')[0];
  return namePart
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Formats the activity description for display
 */
function formatActivityDescription(activity: ActivityItem): { action: string; details: string | null } {
  const changedFields = activity.changed_fields;
  
  if (!changedFields || Object.keys(changedFields).length === 0) {
    return { action: activity.description.toLowerCase(), details: null };
  }

  const fieldEntries = Object.entries(changedFields);
  const firstField = fieldEntries[0];
  const [fieldName, values] = firstField;

  // Format field name for display
  const displayFieldName = fieldName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Special handling for different activity types
  if (activity.activity_type === 'status_changed') {
    return {
      action: `changed status from ${values.old} to ${values.new}`,
      details: null,
    };
  }

  if (activity.activity_type === 'created') {
    return {
      action: 'created the',
      details: displayFieldName,
    };
  }

  if (fieldEntries.length === 1) {
    // Single field change
    if (values.old === 'N/A' || values.old === null) {
      return {
        action: 'added',
        details: `${displayFieldName}: ${formatValue(values.new)}`,
      };
    }
    return {
      action: 'changed the',
      details: `${displayFieldName} to ${formatValue(values.new)}`,
    };
  }

  // Multiple fields changed
  return {
    action: 'edited the',
    details: displayFieldName,
  };
}

export function ActivityTimeline({ activities, emptyMessage = 'No activity history yet' }: ActivityTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) {
      return activities || [];
    }

    const query = searchQuery.toLowerCase().trim();
    
    return (activities || []).filter((activity) => {
      const performerName = getPerformerName(activity.performer_email).toLowerCase();
      const performerEmail = (activity.performer_email || '').toLowerCase();
      const description = activity.description.toLowerCase();
      const { action, details } = formatActivityDescription(activity);
      const actionText = action.toLowerCase();
      const detailsText = (details || '').toLowerCase();
      
      // Search in changed fields
      let changedFieldsText = '';
      if (activity.changed_fields) {
        changedFieldsText = Object.entries(activity.changed_fields)
          .map(([field, values]) => {
            const fieldName = field.replace(/_/g, ' ').toLowerCase();
            const oldValue = formatValue(values.old).toLowerCase();
            const newValue = formatValue(values.new).toLowerCase();
            return `${fieldName} ${oldValue} ${newValue}`;
          })
          .join(' ');
      }

      return (
        performerName.includes(query) ||
        performerEmail.includes(query) ||
        description.includes(query) ||
        actionText.includes(query) ||
        detailsText.includes(query) ||
        changedFieldsText.includes(query)
      );
    });
  }, [activities, searchQuery]);

  const hasActivities = activities && activities.length > 0;
  const hasSearchResults = filteredActivities.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  if (!hasActivities) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
          <p className="text-xs font-normal">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <div className="px-4 py-3 border-b border-gray-200 space-y-2">
        <h2 className="text-xs font-medium text-gray-900">Activity History</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs h-7 pl-8 pr-8 bg-gray-50 border-gray-200 focus:bg-white"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 hover:bg-gray-200"
            >
              <X className="h-3 w-3 text-gray-400" />
            </Button>
          )}
        </div>
        {isSearching && (
          <p className="text-xs text-gray-500">
            {hasSearchResults 
              ? `Found ${filteredActivities.length} ${filteredActivities.length === 1 ? 'result' : 'results'}`
              : 'No results found'}
          </p>
        )}
      </div>
      <ScrollArea className="h-[800px]">
        <div className="p-4">
          {hasSearchResults ? (
            filteredActivities.map((activity, index) => {
            const Icon = activityIcons[activity.activity_type];
            const colorClass = activityColors[activity.activity_type];
            const activityDate = new Date(activity.created_at);
            const timeDisplay = formatActivityTime(activityDate);
            const performerName = getPerformerName(activity.performer_email);
            const { action, details } = formatActivityDescription(activity);

            return (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-[15px] top-[36px] bottom-0 w-[1.5px] bg-gray-200" />
                )}

                <div className="flex gap-4 pb-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="mb-0.5">
                      <span className="text-xs font-semibold text-gray-900">{performerName}</span>
                      {' '}
                      <span className="text-xs font-normal text-gray-600">{action}</span>
                      {' '}
                      {details && (
                        <span className="text-xs font-normal text-gray-900">{details}</span>
                      )}
                    </div>
                    
                    <div className="text-xs font-normal text-gray-500">{timeDisplay}</div>

                    {/* Changed fields details */}
                    {activity.changed_fields && Object.keys(activity.changed_fields).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(activity.changed_fields).map(([field, values]) => (
                          <div key={field} className="text-xs font-normal text-gray-700">
                            <span className="capitalize">
                              {field.replace(/_/g, ' ')}:
                            </span>
                            {' '}
                            <span className="text-gray-500">{formatValue(values.old)}</span>
                            {' '}
                            <ArrowRight className="inline h-3 w-3 text-gray-400" />
                            {' '}
                            <span className="text-gray-900">{formatValue(values.new)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          ) : (
            <div className="py-12 text-center">
              <Search className="mx-auto h-8 w-8 mb-2 text-gray-400" />
              <p className="text-xs font-normal text-gray-600">No activities found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
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
