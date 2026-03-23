'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { createEisfRule, deleteEisfRule } from '@/lib/actions/eisf';
import type { EisfDocumentCategory, EisfRequiredDocumentRule } from '@/lib/types/eisf';
import type { EtmfStudyOption } from '@/lib/types/etmf';
import type { StudySite } from '@/lib/types/ctms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function EisfRulesClient({
  studies,
  initialStudyId,
  initialRules,
  categories,
  sites,
}: {
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialRules: EisfRequiredDocumentRule[];
  categories: EisfDocumentCategory[];
  sites: StudySite[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studyId, setStudyId] = useState<string>(initialStudyId ?? '');
  const [ruleLabel, setRuleLabel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [siteScope, setSiteScope] = useState<string>('__all__');
  const [roleName, setRoleName] = useState('');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onStudyChange = (v: string) => {
    setStudyId(v);
    const p = new URLSearchParams(searchParams.toString());
    p.set('study', v);
    router.replace(`/protected/eisf/rules?${p.toString()}`);
  };

  const addRule = () => {
    if (!studyId) return;
    setErr(null);
    if (!ruleLabel.trim()) {
      setErr('Rule label is required');
      return;
    }
    startTransition(async () => {
      const res = await createEisfRule({
        study_id: studyId,
        study_site_id: siteScope === '__all__' ? null : siteScope,
        role_name: roleName.trim() || null,
        category_id: categoryId || null,
        tmf_ref_id: null,
        rule_label: ruleLabel.trim(),
      });
      if (!res.success) {
        setErr(res.error ?? 'Failed');
        return;
      }
      setRuleLabel('');
      setRoleName('');
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteEisfRule(id);
      router.refresh();
    });
  };

  const studyLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of studies) {
      m.set(s.id, `${s.protocol_number} — ${s.title}`);
    }
    return m;
  }, [studies]);

  const categoryLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categories]);

  const siteLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sites) {
      m.set(s.id, `${s.site_number} — ${s.name}`);
    }
    return m;
  }, [sites]);

  const studySelectLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '') return null;
      return studyLabelById.get(value) ?? 'Study';
    },
    [studyLabelById]
  );

  const categorySelectLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '' || value === '__none__') return 'No Category';
      return categoryLabelById.get(value) ?? 'Category';
    },
    [categoryLabelById]
  );

  const siteScopeSelectLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '__all__') return 'All Sites in Study';
      return siteLabelById.get(value) ?? 'Site';
    },
    [siteLabelById]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[240px]">
          <Label className="text-xs text-muted-foreground">Study</Label>
          <Select value={studyId} onValueChange={onStudyChange} disabled={!studies.length}>
            <SelectTrigger className="text-[12px] h-9 w-[280px] min-w-[280px]">
              <SelectValue placeholder="Select Study" getDisplayLabel={studySelectLabel} />
            </SelectTrigger>
            <SelectContent>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-[12px]">
                  {s.protocol_number} — {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {studyId && (
        <div className="rounded-lg border p-4 space-y-3 max-w-xl">
          <h2 className="text-sm font-medium">Add Rule</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">What Should the Site Provide?</Label>
            <Input
              value={ruleLabel}
              onChange={(e) => setRuleLabel(e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Signed delegation log"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category (Optional)</Label>
            <Select value={categoryId || '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-[12px] h-9 min-w-[200px]">
                <SelectValue placeholder="Select Category" getDisplayLabel={categorySelectLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[12px]">
                  No Category
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[12px]">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Limit to One Site (Optional)</Label>
            <Select value={siteScope} onValueChange={setSiteScope}>
              <SelectTrigger className="text-[12px] h-9 min-w-[220px]">
                <SelectValue placeholder="All Sites in Study" getDisplayLabel={siteScopeSelectLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-[12px]">
                  All Sites in Study
                </SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.site_number} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Staff Role Hint (Optional)</Label>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="text-[12px] h-9"
              placeholder="e.g. Principal Investigator"
            />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button type="button" size="sm" className="text-[12px]" disabled={pending} onClick={addRule}>
            Add rule
          </Button>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Site scope</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!studyId ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                  Select a study to view rules.
                </TableCell>
              </TableRow>
            ) : initialRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                  No rules for this study yet.
                </TableCell>
              </TableRow>
            ) : (
              initialRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-[12px] font-medium">{r.rule_label}</TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {r.study_site_id ? siteLabelById.get(r.study_site_id) ?? 'Site' : 'All Sites in Study'}
                  </TableCell>
                  <TableCell className="text-[12px]">{r.role_name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[12px] text-destructive"
                      disabled={pending}
                      onClick={() => remove(r.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
