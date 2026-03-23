'use client';

import { useState, useTransition } from 'react';
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
import { addEtmfCountry } from '@/lib/actions/etmf';
import { toast } from 'sonner';
import { getNames, getAlpha2Code } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import * as countries from 'i18n-iso-countries';

countries.registerLocale(en);

const countryNames = getNames('en');
const countryOptions = Object.entries(countryNames)
  .map(([code, name]) => ({ code, name: name as string }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface AddCountryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string | null;
  onSuccess: () => void;
}

export function AddCountryModal({ open, onOpenChange, studyId, onSuccess }: AddCountryModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!studyId || !selectedCountry) return;

    const countryName = countryNames[selectedCountry] as string;

    startTransition(async () => {
      const { success, error } = await addEtmfCountry({
        study_id: studyId,
        country_code: selectedCountry,
        country_name: countryName,
      });

      if (success) {
        toast.success(`Added ${countryName}`);
        setSelectedCountry('');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(error || 'Failed to add country');
      }
    });
  };

  const handleClose = () => {
    setSelectedCountry('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Country</DialogTitle>
          <DialogDescription>
            Add a country to the study for eTMF document management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-xs">
              Country Name
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select a country..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countryOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedCountry || isPending}>
            {isPending ? 'Adding...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
