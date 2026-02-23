'use client';

import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { getCriteria, createCriterion, deleteCriterion } from '@/lib/actions/feasibility';
import type { FeasibilityCriterion, FeasibilityCriteriaCategory } from '@/lib/types/feasibility';
import { CRITERIA_CATEGORY_LABELS } from '@/lib/types/feasibility';

interface FeasibilityCriteriaEditorProps {
  studyId: string;
}

export function FeasibilityCriteriaEditor({ studyId }: FeasibilityCriteriaEditorProps) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<FeasibilityCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FeasibilityCriteriaCategory>('therapeutic_experience');
  const [weight, setWeight] = useState('1');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getCriteria(studyId);
    if (res.success && res.data) setCriteria(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [studyId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    const res = await createCriterion({
      feasibility_study_id: studyId,
      name: name.trim(),
      category,
      weight: parseFloat(weight) || 1,
      sort_order: criteria.length,
    });
    setAdding(false);
    if (res.success) {
      setName('');
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCriterion(id);
    if (res.success) load();
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-medium mb-3">Evaluation Criteria</h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {criteria.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded border p-2">
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {CRITERIA_CATEGORY_LABELS[c.category]}
                </span>
                <span className="text-xs text-muted-foreground">
                  Weight: {c.weight} | Max: {c.max_score}
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => handleDelete(c.id)}>
                  ×
                </Button>
              </div>
            ))}
            {criteria.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No criteria defined. Add criteria to start evaluating sites.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                className="w-48"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Criterion name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FeasibilityCriteriaCategory)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITERIA_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight</Label>
              <Input className="w-20" type="number" min={0.1} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding || !name.trim()}>
              Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
