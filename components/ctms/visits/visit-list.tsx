'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ClipboardCheck,
  CalendarDays,
  FileText,
  ExternalLink,
  TableProperties,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisitCalendar } from './visit-calendar';

import type {
  MonitoringVisitWithRelations,
  Study,
} from '@/lib/types/ctms';
import {
  VISIT_TYPE_OPTIONS,
  MONITORING_VISIT_STATUS_OPTIONS,
  VISIT_TYPE_LABEL,
} from '@/lib/types/ctms';

interface VisitListProps {
  visits: MonitoringVisitWithRelations[];
  studies: Pick<Study, 'id' | 'title'>[];
}

export function VisitList({ visits, studies }: VisitListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [studyFilter, setStudyFilter] = useState<string>('all');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const monitorName = (visit: MonitoringVisitWithRelations) => {
    if (!visit.profiles) return '—';
    return [visit.profiles.first_name, visit.profiles.last_name].filter(Boolean).join(' ') || '—';
  };

  const filteredVisits = visits.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (typeFilter !== 'all' && v.visit_type !== typeFilter) return false;
    if (studyFilter !== 'all' && v.study_id !== studyFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const siteName = (v.study_sites?.name ?? '').toLowerCase();
      const studyTitle = (v.studies?.title ?? '').toLowerCase();
      if (!siteName.includes(s) && !studyTitle.includes(s)) return false;
    }
    return true;
  });

  const counts = {
    total: visits.length,
    planned: visits.filter((v) => v.status === 'planned').length,
    confirmed: visits.filter((v) => v.status === 'confirmed').length,
    completed: visits.filter((v) => v.status === 'completed').length,
    cancelled: visits.filter((v) => v.status === 'cancelled').length,
  };

  const visitStatItems = [
    { label: 'Total', key: 'total' as const, markerColor: null as string | null, statusFilter: 'all' },
    { label: 'Planned', key: 'planned' as const, markerColor: 'bg-amber-500', statusFilter: 'planned' },
    { label: 'Confirmed', key: 'confirmed' as const, markerColor: 'bg-blue-500', statusFilter: 'confirmed' },
    { label: 'Completed', key: 'completed' as const, markerColor: 'bg-emerald-500', statusFilter: 'completed' },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {visitStatItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setStatusFilter(item.statusFilter)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {item.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${item.markerColor}`} aria-hidden />
              )}
              <span>
                {item.label} ({counts[item.key]})
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by site or study..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue
              placeholder="All Statuses"
              getDisplayLabel={(v) => {
                if (v === 'all') return 'All Statuses';
                return MONITORING_VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {MONITORING_VISIT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue
              placeholder="All Types"
              getDisplayLabel={(v) => {
                if (v === 'all') return 'All Types';
                return VISIT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {VISIT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {studies.length > 1 && (
          <Select value={studyFilter} onValueChange={setStudyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder="All Studies"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Studies';
                  return studies.find((s) => s.id === v)?.title ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Studies</SelectItem>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs tabsId="visit-list" defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">
            <TableProperties className="mr-1.5 h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {filteredVisits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No monitoring visits found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Visits can be scheduled from the study detail page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Monitor</TableHead>
                    <TableHead className="text-xs">Planned Date</TableHead>
                    <TableHead className="text-xs">Actual Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Report</TableHead>
                    <TableHead className="text-xs w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.map((visit) => {
                    const hasReport = visit.trip_reports && visit.trip_reports.length > 0;
                    return (
                      <TableRow key={visit.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {VISIT_TYPE_LABEL[visit.visit_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                          <Link href={`/protected/studies/${visit.study_id}`} className="hover:underline">
                            {visit.studies?.title ?? '—'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {visit.study_sites?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {monitorName(visit)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(visit.planned_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(visit.actual_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={visit.status} className="text-xs" />
                        </TableCell>
                        <TableCell>
                          {hasReport ? (
                            <FileText className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            render={<Link href={`/protected/visits/${visit.id}`} />}
                            nativeButton={false}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <VisitCalendar visits={filteredVisits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
