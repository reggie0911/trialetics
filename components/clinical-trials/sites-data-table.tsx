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
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations } from '@/lib/types/clinical-trials';
import { deleteClinicalSite } from '@/lib/actions/clinical-sites';
import { useToast } from '@/hooks/use-toast';

interface SitesDataTableProps {
  sites: ClinicalSiteWithRelations[];
  isLoading: boolean;
  onEdit: (site: ClinicalSiteWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
}

export function SitesDataTable({
  sites,
  isLoading,
  onEdit,
  onRefresh,
}: SitesDataTableProps) {
  const { toast } = useToast();

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
            <TableHead className="text-xs">Protocol</TableHead>
            <TableHead className="text-xs">Organization</TableHead>
            <TableHead className="text-xs">Principal Investigator</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Enrolled</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.map((site) => (
            <TableRow key={site.id}>
              <TableCell className="text-xs font-medium">
                {site.site_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.protocol?.protocol_number || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.organization?.name || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs">
                {site.principal_investigator ? (
                  `${site.principal_investigator.first_name} ${site.principal_investigator.last_name}`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {SITE_STATUS_LABELS[site.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{site.enrolled_subject_count}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
