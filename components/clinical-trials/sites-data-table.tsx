'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight, ExternalLink, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';
import { deleteClinicalSite } from '@/lib/actions/clinical-sites';
import { useToast } from '@/hooks/use-toast';

interface SitesDataTableProps {
  sites: ClinicalSiteWithRelations[];
  isLoading: boolean;
  onEdit: (site: ClinicalSiteWithRelations) => void;
  onAssign?: (site: ClinicalSiteWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function SitesDataTable({
  sites,
  isLoading,
  onEdit,
  onAssign,
  onRefresh,
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
}: SitesDataTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const totalPages = Math.ceil(total / pageSize);
  const showPagination = total > 0 && totalPages > 1 && onPageChange;

  const handleDelete = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    const result = await deleteClinicalSite(siteId);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Site deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete site',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (sites.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No sites found. Click "Add Site" to create one.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Site #</TableHead>
            <TableHead className="text-xs">Project</TableHead>
            <TableHead className="text-xs">Organization</TableHead>
            <TableHead className="text-xs">Country Region</TableHead>
            <TableHead className="text-xs">Principal Investigator</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Enrolled</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => {
            const isOrgOnly = !site.protocol;
            return (
              <TableRow key={site.id}>
                <TableCell className="text-xs font-medium">
                  {site.site_number || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {site.protocol?.protocol_number || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {site.organization ? (
                    <Link
                      href={`/protected/contacts-organizations/${site.organization.id}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {site.organization.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {site.country_region ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {site.principal_investigator ? (
                    <Link
                      href={`/protected/contacts-organizations/contacts/${site.principal_investigator.id}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {site.principal_investigator.first_name} {site.principal_investigator.last_name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isOrgOnly ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {SITE_STATUS_LABELS[site.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {isOrgOnly ? <span className="text-muted-foreground">—</span> : site.enrolled_subject_count}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                      <MoreHorizontal className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {site.organization && (
                        <DropdownMenuItem onClick={() => router.push(`/protected/contacts-organizations/${site.organization!.id}`)}>
                          <ExternalLink className="mr-2 h-3 w-3" />
                          View Organization
                        </DropdownMenuItem>
                      )}
                      {isOrgOnly ? (
                        <DropdownMenuItem
                          onClick={() => onAssign?.(site)}
                          disabled={!onAssign}
                        >
                          <Link2 className="mr-2 h-3 w-3" />
                          Assign to Protocol
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(site)}>
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(site.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} sites
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="text-xs h-7"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="text-xs h-7"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
