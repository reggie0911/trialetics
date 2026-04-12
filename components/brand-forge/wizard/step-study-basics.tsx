'use client';

import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PHASES,
  TRIAL_TYPES,
  brandForgeOptionLabel,
  type BrandBriefFormValues,
} from '@/lib/types/brand-forge';
import { createClient } from '@/lib/client';

interface StepStudyBasicsProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

interface CTMSStudy {
  id: string;
  protocol_number: string;
  study_name: string;
  sponsor_name: string | null;
  therapeutic_area: string | null;
  phase: string | null;
  indication: string | null;
}

export function StepStudyBasics({ formData, updateField }: StepStudyBasicsProps) {
  const [ctmsStudies, setCtmsStudies] = useState<CTMSStudy[]>([]);

  useEffect(() => {
    async function loadStudies() {
      const supabase = createClient();
      const { data } = await supabase
        .from('studies')
        .select('id, protocol_number, study_name, sponsor_name, therapeutic_area, phase, indication')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setCtmsStudies(data as CTMSStudy[]);
    }
    loadStudies();
  }, []);

  const handleLinkStudy = (studyId: string) => {
    const study = ctmsStudies.find((s) => s.id === studyId);
    if (!study) return;
    if (study.study_name) updateField('study_name', study.study_name);
    if (study.protocol_number) updateField('protocol_number', study.protocol_number);
    if (study.sponsor_name) updateField('sponsor', study.sponsor_name);
    if (study.therapeutic_area) updateField('therapeutic_area', study.therapeutic_area);
    if (study.phase) updateField('phase', study.phase);
    if (study.indication) updateField('indication', study.indication);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Study Basics</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Provide core information about your clinical study. This shapes the brand identity we generate.
        </p>
      </div>

      {/* CTMS Study Linking */}
      {ctmsStudies.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-3 w-3 text-primary" />
              <Label className="text-xs font-medium">Link to Existing Study</Label>
            </div>
            <Select onValueChange={handleLinkStudy}>
              <SelectTrigger className="text-xs">
                <SelectValue
                  placeholder="Select a study to auto-populate fields"
                  getDisplayLabel={(v) => {
                    if (!v) return null;
                    const s = ctmsStudies.find((x) => x.id === v);
                    return s ? `${s.protocol_number} — ${s.study_name}` : null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {ctmsStudies.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.protocol_number} — {s.study_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="study_name" className="text-xs">Study Name</Label>
          <Input
            id="study_name"
            className="text-xs"
            placeholder="Enter the study name"
            value={formData.study_name}
            onChange={(e) => updateField('study_name', e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="protocol_number" className="text-xs">Protocol Number</Label>
          <Input
            id="protocol_number"
            className="text-xs"
            placeholder="e.g. ABC-001"
            value={formData.protocol_number}
            onChange={(e) => updateField('protocol_number', e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline" className="text-xs">Tagline (optional)</Label>
          <Input
            id="tagline"
            className="text-xs"
            placeholder="A short tagline for the study"
            value={formData.tagline}
            onChange={(e) => updateField('tagline', e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sponsor" className="text-xs">Sponsor</Label>
          <Input
            id="sponsor"
            className="text-xs"
            placeholder="Sponsor organization"
            value={formData.sponsor}
            onChange={(e) => updateField('sponsor', e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cro" className="text-xs">CRO</Label>
          <Input
            id="cro"
            className="text-xs"
            placeholder="Contract Research Organization"
            value={formData.cro}
            onChange={(e) => updateField('cro', e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phase" className="text-xs">Phase</Label>
          <Select value={formData.phase} onValueChange={(v) => updateField('phase', v)}>
            <SelectTrigger id="phase" className="text-xs">
              <SelectValue
                placeholder="Select phase"
                getDisplayLabel={(v) => brandForgeOptionLabel(PHASES, v)}
              />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trial_type" className="text-xs">Trial Type</Label>
          <Select value={formData.trial_type} onValueChange={(v) => updateField('trial_type', v)}>
            <SelectTrigger id="trial_type" className="text-xs">
              <SelectValue
                placeholder="Select trial type"
                getDisplayLabel={(v) => brandForgeOptionLabel(TRIAL_TYPES, v)}
              />
            </SelectTrigger>
            <SelectContent>
              {TRIAL_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
