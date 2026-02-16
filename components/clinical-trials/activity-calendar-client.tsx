'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProtocolActivitiesForCalendar } from '@/lib/actions/protocol-activities';
import type { ProtocolActivityWithProtocol } from '@/lib/actions/protocol-activities';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
} from 'date-fns';

interface ActivityCalendarClientProps {
  companyId: string;
}

export function ActivityCalendarClient({ companyId }: ActivityCalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ProtocolActivityWithProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const result = await getProtocolActivitiesForCalendar(
        companyId,
        startDate,
        endDate,
        protocolId
      );
      if (result.success && result.data) {
        setActivities(result.data);
      } else {
        setActivities([]);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId, startDate, endDate, protocolId]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ProtocolActivityWithProtocol[]>();
    for (const a of activities) {
      const start = a.planned_start_date ? parseISO(a.planned_start_date) : null;
      const end = a.planned_end_date ? parseISO(a.planned_end_date) : null;
      if (start) {
        const dates: Date[] = [];
        let d = start;
        const endDateObj = end || start;
        while (d <= endDateObj) {
          dates.push(d);
          d = addDays(d, 1);
        }
        for (const d of dates) {
          const key = format(d, 'yyyy-MM-dd');
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(a);
        }
      }
    }
    return map;
  }, [activities]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weeks: Date[][] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {format(currentMonth, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {weekDays.map((d) => (
                    <th key={d} className="border p-2 text-xs font-medium text-muted-foreground">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day) => {
                      const key = format(day, 'yyyy-MM-dd');
                      const dayActivities = activitiesByDate.get(key) || [];
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());
                      return (
                        <td
                          key={key}
                          className={`border p-1 align-top min-h-[100px] ${
                            !isCurrentMonth ? 'bg-muted/30' : ''
                          } ${isToday ? 'ring-1 ring-primary' : ''}`}
                        >
                          <div className="text-xs font-medium text-muted-foreground p-1">
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayActivities.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-foreground truncate hover:bg-primary/25"
                                title={`${a.name}${a.protocol ? ` (${a.protocol.protocol_number})` : ''}`}
                              >
                                {a.name}
                              </div>
                            ))}
                            {dayActivities.length > 3 && (
                              <div className="text-[10px] text-muted-foreground px-1">
                                +{dayActivities.length - 3} more
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
