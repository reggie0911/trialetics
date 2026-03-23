'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addEtmfSite, getEtmfCountries } from '@/lib/actions/etmf';
import { toast } from 'sonner';
import type { EtmfCountryOption } from '@/lib/types/etmf';

interface AddSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string | null;
  countryId: string | null;
  onSuccess: () => void;
}

export function AddSiteModal({ open, onOpenChange, studyId, countryId, onSuccess }: AddSiteModalProps) {
  const [countries, setCountries] = useState<EtmfCountryOption[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>(countryId || '');
  const [siteName, setSiteName] = useState('');
  const [siteNumber, setSiteNumber] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && studyId) {
      startTransition(async () => {
        const { data } = await getEtmfCountries(studyId);
        setCountries(data || []);
      });
    }
  }, [open, studyId]);

  useEffect(() => {
    if (countryId) {
      setSelectedCountryId(countryId);
    }
  }, [countryId]);

  const selectedCountry = countries.find((c) => c.id === selectedCountryId);

  const handleSubmit = () => {
    if (!studyId || !selectedCountryId || !siteName.trim() || !siteNumber.trim()) return;

    startTransition(async () => {
      const { success, placeholders_created, error } = await addEtmfSite({
        study_id: studyId,
        study_country_id: selectedCountryId,
        site_number: siteNumber.trim(),
        name: siteName.trim(),
      });

      if (success) {
        toast.success(`Added site with ${placeholders_created || 0} placeholders created`);
        handleClose();
        onSuccess();
      } else {
        toast.error(error || 'Failed to add site');
      }
    });
  };

  const handleClose = () => {
    setSiteName('');
    setSiteNumber('');
    setSelectedCountryId(countryId || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Site</DialogTitle>
          <DialogDescription>
            Add a site to the country. Placeholder documents will be generated from the Expected Document List.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="country-select" className="text-xs">
              Country Name
            </Label>
            <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select Country...">
                  {selectedCountry?.country_name || 'Select Country...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.country_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site-id" className="text-xs">
                Site ID
              </Label>
              <Input
                id="site-id"
                value={siteNumber}
                onChange={(e) => setSiteNumber(e.target.value)}
                placeholder="Enter site ID..."
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-name-input" className="text-xs">
                Site Name
              </Label>
              <Input
                id="site-name-input"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Enter site name..."
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCountryId || !siteName.trim() || !siteNumber.trim() || isPending}
          >
            {isPending ? 'Adding...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
