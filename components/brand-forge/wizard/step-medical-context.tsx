'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  THERAPEUTIC_AREAS,
  DEVICE_OR_DRUG_OPTIONS,
  SEVERITIES,
  brandForgeOptionLabel,
  therapeuticAreaDisplayLabel,
  type BrandBriefFormValues,
} from '@/lib/types/brand-forge';

interface StepMedicalContextProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepMedicalContext({ formData, updateField }: StepMedicalContextProps) {
  const [countryInput, setCountryInput] = useState('');

  const addCountry = () => {
    const c = countryInput.trim();
    if (c && !formData.countries.includes(c)) {
      updateField('countries', [...formData.countries, c]);
      setCountryInput('');
    }
  };

  const removeCountry = (c: string) => {
    updateField('countries', formData.countries.filter((x) => x !== c));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Medical Context</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Help us understand the clinical context so the brand feels appropriate for the therapeutic area and patient population.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="therapeutic_area" className="text-xs">Therapeutic Area</Label>
          <Select value={formData.therapeutic_area} onValueChange={(v) => updateField('therapeutic_area', v)}>
            <SelectTrigger id="therapeutic_area" className="text-xs">
              <SelectValue placeholder="Select therapeutic area" />
            </SelectTrigger>
            <SelectContent>
              {THERAPEUTIC_AREAS.map((ta) => (
                <SelectItem key={ta} value={ta} className="text-xs">{ta}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="indication" className="text-xs">Indication</Label>
          <Input
            id="indication"
            className="text-xs"
            placeholder="e.g. Non-small cell lung cancer"
            value={formData.indication}
            onChange={(e) => updateField('indication', e.target.value)}
            maxLength={300}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="patient_population" className="text-xs">Patient Population</Label>
          <Input
            id="patient_population"
            className="text-xs"
            placeholder="e.g. Adults aged 18-65 with moderate-to-severe symptoms"
            value={formData.patient_population}
            onChange={(e) => updateField('patient_population', e.target.value)}
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="device_or_drug" className="text-xs">Device or Drug</Label>
          <Select value={formData.device_or_drug} onValueChange={(v) => updateField('device_or_drug', v)}>
            <SelectTrigger id="device_or_drug" className="text-xs">
              <SelectValue
                placeholder="Select type"
                getDisplayLabel={(v) => brandForgeOptionLabel(DEVICE_OR_DRUG_OPTIONS, v)}
              />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_OR_DRUG_OPTIONS.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity" className="text-xs">Severity of Condition</Label>
          <Select value={formData.severity} onValueChange={(v) => updateField('severity', v)}>
            <SelectTrigger id="severity" className="text-xs">
              <SelectValue
                placeholder="Select severity"
                getDisplayLabel={(v) => brandForgeOptionLabel(SEVERITIES, v)}
              />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs">Countries / Regions</Label>
          <div className="flex gap-2">
            <Input
              className="text-xs"
              placeholder="Add a country or region"
              value={countryInput}
              onChange={(e) => setCountryInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCountry(); } }}
              maxLength={100}
            />
            <Button type="button" variant="outline" size="icon" onClick={addCountry}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.countries.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 pr-1 text-xs">
                  {c}
                  <button type="button" onClick={() => removeCountry(c)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
