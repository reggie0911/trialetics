'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SiteForm } from '@/components/ctms/sites/site-form';
import { getSiteById } from '@/lib/actions/sites';
import { getStudyCountries } from '@/lib/actions/countries';
import type { StudySiteWithDetails } from '@/lib/types/ctms';

interface EditSiteModalProps {
  siteId: string;
  studyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSiteModal({
  siteId,
  studyId,
  open,
  onOpenChange,
  onSuccess,
}: EditSiteModalProps) {
  const [site, setSite] = useState<StudySiteWithDetails | null>(null);
  const [countryOptions, setCountryOptions] = useState<{ id: string; country_name: string; country_code: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !siteId || !studyId) return;
    setLoading(true);
    setError(null);
    Promise.all([getSiteById(siteId), getStudyCountries(studyId)])
      .then(([siteData, countriesData]) => {
        setSite(siteData);
        setCountryOptions((countriesData ?? []).map((c) => ({
          id: c.id,
          country_name: c.country_name,
          country_code: c.country_code,
        })));
        if (!siteData) setError('Site not found');
      })
      .catch(() => setError('Failed to load site'))
      .finally(() => setLoading(false));
  }, [open, siteId, studyId]);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Site</DialogTitle>
          <DialogDescription>
            Update site details. Changes will refresh the page.
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && site && (
          <SiteForm
            studyId={studyId}
            site={site}
            countries={countryOptions}
            mode="edit"
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
