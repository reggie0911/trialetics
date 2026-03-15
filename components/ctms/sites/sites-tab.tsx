'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Building2,
  MapPin,
  User,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import type { StudySite } from '@/lib/types/ctms';
import { getStudySites, deleteSite } from '@/lib/actions/sites';

interface SitesTabProps {
  studyId: string;
  initialSites: StudySite[];
}

export function SitesTab({ studyId, initialSites }: SitesTabProps) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [, startTransition] = useTransition();

  const refreshSites = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudySites(studyId);
        setSites(data);
      } catch {
        toast.error('Failed to refresh site data');
      }
    });
  }, [studyId]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteSite(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Site deleted');
    refreshSites();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Sites</h3>
          <p className="text-sm text-muted-foreground">
            Manage investigator sites participating in this study.
          </p>
        </div>
        <Button
          size="sm"
          render={<Link href={`/protected/sites/new?studyId=${studyId}`} />}
          nativeButton={false}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No sites added</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add investigator sites to begin the activation process.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Site Number</TableHead>
                <TableHead className="text-xs">Site Name</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">PI</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Target</TableHead>
                <TableHead className="text-xs w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow
                  key={site.id}
                  className="cursor-pointer h-[40px]"
                  onClick={() => router.push(`/protected/sites/${site.id}`)}
                >
                  <TableCell className="text-xs font-medium">
                    {site.site_number}
                  </TableCell>
                  <TableCell className="text-xs">{site.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[site.city, site.state].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {site.pi_name || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={site.status} className="text-xs" />
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {site.target_enrollment}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Site</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {site.name} ({site.site_number})
                            and all associated contacts and checklist items. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(site.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
