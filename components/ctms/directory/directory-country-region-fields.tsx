'use client';

import { useMemo, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { countriesForSelectList } from '@/lib/data/countries';
import { regionsForCountry } from '@/lib/data/country-regions';

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50';

const countriesForSelect = countriesForSelectList();

export type DirectoryCountryRegionVariant = 'institutionAddress' | 'contactRow';

interface DirectoryCountryRegionFieldsProps {
  variant: DirectoryCountryRegionVariant;
  countryCode: string;
  region: string;
  onCountryChange: (code: string) => void;
  onRegionChange: (region: string) => void;
  disabled?: boolean;
  /** Only for `institutionAddress`: city field (e.g. uncontrolled Input with name="city"). */
  citySlot?: ReactNode;
}

export function DirectoryCountryRegionFields({
  variant,
  countryCode,
  region,
  onCountryChange,
  onRegionChange,
  disabled,
  citySlot,
}: DirectoryCountryRegionFieldsProps) {
  const regionOptions = useMemo(
    () => regionsForCountry(countryCode),
    [countryCode]
  );
  const hasRegionList = regionOptions.length > 0;
  const regionInList =
    hasRegionList && region !== '' && regionOptions.some((r) => r.name === region);
  const useRegionSelect =
    hasRegionList && (region === '' || regionInList);

  const handleCountryChange = (next: string) => {
    onCountryChange(next);
    onRegionChange('');
  };

  const countrySelect = (
    <div className="space-y-1">
      <Label className="text-xs">Country</Label>
      <select
        className={selectClass}
        disabled={disabled}
        value={countryCode}
        onChange={(e) => handleCountryChange(e.target.value)}
        aria-label="Country"
      >
        <option value="">Optional</option>
        {countriesForSelect.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );

  const regionField = (
    <div className="space-y-1">
      <Label className="text-xs">Region / state</Label>
      {hasRegionList ? (
        <select
          className={selectClass}
          disabled={disabled}
          value={regionOptions.some((r) => r.name === region) ? region : ''}
          onChange={(e) => onRegionChange(e.target.value)}
          aria-label="Region or state"
        >
          <option value="">Optional</option>
          {regionOptions.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      ) : (
        <Input
          className="text-xs h-9"
          disabled={disabled}
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          placeholder="State, province, or region"
          aria-label="Region or state"
        />
      )}
    </div>
  );

  if (variant === 'institutionAddress') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {citySlot}
          {countrySelect}
        </div>
        {regionField}
      </>
    );
  }

  // contactRow: country | region side by side
  return (
    <div className="grid grid-cols-2 gap-2">
      {countrySelect}
      {regionField}
    </div>
  );
}
