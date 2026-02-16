'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink } from 'lucide-react';
import { getAllClinicalSites } from '@/lib/actions/clinical-sites';

interface SiteTrainingSitesListProps {
  companyId: string;
}

export function SiteTrainingSitesList({ companyId }: SiteTrainingSitesListProps) {
  const [sites, setSites] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAllClinicalSites(companyId).then((result) => {
      if (result.success && result.data) setSites(result.data);
      setIsLoading(false);
    });
  }, [companyId]);

  const filtered = sites.filter((s) => {
    const sn = s.site_number || '';
    const name = s.organization?.name || '';
    return sn.toLowerCase().includes(search.toLowerCase()) || name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select a site to manage its training plans and topics, and designate completion.
      </p>
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by site number or organization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-[12px]"
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sites found</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[12px]">Site Number</TableHead>
              <TableHead className="text-[12px]">Organization</TableHead>
              <TableHead className="text-[12px] w-24">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-[12px]">{s.site_number || '—'}</TableCell>
                <TableCell className="text-[12px]">{s.organization?.name || '—'}</TableCell>
                <TableCell>
                  <Link
                    href={`/protected/clinical-training/sites/${s.id}`}
                    className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
                  >
                    Training
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
