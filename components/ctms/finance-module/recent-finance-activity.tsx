'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  FinanceActivityFeedToolbar,
  type FinanceActivityFeedFiltersState,
} from '@/components/ctms/finance-module/_shared/finance-activity-feed-toolbar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import {
  buildFinanceActivityHref,
  type FinanceAuditLogListFilters,
} from '@/lib/finance-module/activity-search-params';
import { buildFinanceAuditEntityHref } from '@/lib/finance-module/audit-entity-links';
import type { FmAuditLog } from '@/lib/finance-module/types';

interface RecentFinanceActivityProps {
  studyId: string;
  logs: FmAuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: FinanceAuditLogListFilters;
  entityTypeOptions: { value: string; label: string }[];
  actorOptions: { value: string; label: string }[];
}

const HUMAN_ACTION_LABELS: Record<string, string> = {
  initialize_workspace: 'Workspace initialized',
  update_workspace_settings: 'Workspace settings updated',
  create_budget: 'Budget created',
  create_budget_version: 'Budget version created',
  submit_budget_version: 'Budget version submitted for approval',
  approve_budget_version: 'Budget version approved',
  activate_budget_version: 'Budget version activated',
  reject_budget_version: 'Budget version rejected',
  supersede_budget_version: 'Budget version superseded',
  create_budget_category: 'Budget category created',
  create_budget_line_item: 'Budget line item created',
  archive_budget_line_item: 'Budget line item archived',
  create_vendor: 'Vendor added',
  update_vendor: 'Vendor updated',
  create_contract: 'Contract created',
  create_purchase_order: 'Purchase order created',
  close_purchase_order: 'Purchase order closed',
  create_invoice: 'Invoice created',
  replace_invoice_line_items: 'Invoice line items updated',
  submit_invoice: 'Invoice submitted',
  approve_invoice: 'Invoice approved',
  reject_invoice: 'Invoice rejected',
  record_payment: 'Payment recorded',
  create_site_payment_schedule: 'Site payment scheduled',
  update_site_payment_milestone: 'Site payment milestone updated',
  create_change_order: 'Change order created',
  submit_change_order: 'Change order submitted',
  approve_change_order: 'Change order approved',
  apply_change_order: 'Change order applied',
  approval_approve: 'Approval granted',
  approval_reject: 'Approval rejected',
  approval_escalate: 'Approval escalated',
};

export function RecentFinanceActivity({
  studyId,
  logs,
  totalCount,
  page,
  pageSize,
  filters,
  entityTypeOptions,
  actorOptions,
}: RecentFinanceActivityProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [qDraft, setQDraft] = useState(filters.q);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    setQDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (qDraft === filters.q) return;
    const id = window.setTimeout(() => {
      const f = filtersRef.current;
      startTransition(() => {
        router.push(
          buildFinanceActivityHref(pathname, {
            filters: { ...f, q: qDraft },
            page: 1,
            pageSize,
          }),
        );
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [qDraft, filters.q, pageSize, pathname, router]);

  function pushFilters(next: FinanceAuditLogListFilters, nextPage: number) {
    startTransition(() => {
      router.push(buildFinanceActivityHref(pathname, { filters: next, page: nextPage, pageSize }));
    });
  }

  function onToolbarChange(next: FinanceActivityFeedFiltersState) {
    const nonSearchChanged =
      next.entityType !== filters.entityType ||
      next.actorUserId !== filters.actorUserId ||
      next.dateFrom !== filters.dateFrom ||
      next.dateTo !== filters.dateTo;

    if (nonSearchChanged) {
      setQDraft(next.q);
      pushFilters(
        {
          q: next.q,
          entityType: next.entityType,
          actorUserId: next.actorUserId,
          dateFrom: next.dateFrom,
          dateTo: next.dateTo,
        },
        1,
      );
      return;
    }

    if (next.q !== qDraft) {
      setQDraft(next.q);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeFrom = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = totalCount === 0 ? 0 : Math.min(safePage * pageSize, totalCount);

  const prevHref =
    safePage > 1 ? buildFinanceActivityHref(pathname, { filters, page: safePage - 1, pageSize }) : null;
  const nextHref =
    safePage < totalPages
      ? buildFinanceActivityHref(pathname, { filters, page: safePage + 1, pageSize })
      : null;

  return (
    <Card className={isPending ? 'opacity-80 transition-opacity' : undefined}>
      <CardHeader className="space-y-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        <FinanceActivityFeedToolbar
          value={{ ...filters, q: qDraft }}
          onChange={onToolbarChange}
          entityTypeOptions={entityTypeOptions}
          actorOptions={actorOptions}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {totalCount === 0 ? (
          <p className="text-xs text-muted-foreground">No finance activity matches the current filters.</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rows on this page.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {logs.map((log) => {
              const href = buildFinanceAuditEntityHref(studyId, log.entity_type, log.entity_id);
              return (
                <li
                  key={`${log.id}-${log.entity_type}-${log.entity_id}-${log.created_at}-${log.action}-${log.actor_user_id ?? ''}`}
                  className="py-2 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-foreground">
                        {HUMAN_ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                      </span>
                      <div className="mt-0.5 text-[10px] text-muted-foreground font-mono truncate">
                        {log.entity_type}
                      </div>
                      {href ? (
                        <div className="mt-0.5">
                          <Link
                            href={href}
                            className="text-[11px] text-primary underline-offset-2 hover:underline"
                            scroll={false}
                          >
                            Open entity
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalCount > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              Showing {rangeFrom}–{rangeTo} of {totalCount}
              {totalPages > 1 ? (
                <>
                  {' '}
                  (page {safePage} of {totalPages})
                </>
              ) : null}
            </p>
            <Pagination className="mx-0 w-full justify-end">
              <PaginationContent>
                <PaginationItem>
                  {prevHref ? (
                    <PaginationPrevious href={prevHref} />
                  ) : (
                    <Button variant="ghost" size="default" disabled className="gap-1 pl-2!" type="button">
                      <CaretLeftIcon className="size-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                  )}
                </PaginationItem>
                <PaginationItem>
                  {nextHref ? (
                    <PaginationNext href={nextHref} />
                  ) : (
                    <Button variant="ghost" size="default" disabled className="gap-1 pr-2!" type="button">
                      <span className="hidden sm:inline">Next</span>
                      <CaretRightIcon className="size-4" />
                    </Button>
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
