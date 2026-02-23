'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_LABELS,
  type FindingCategory,
  type FindingSeverity,
  type StandardizedFinding,
} from '@/lib/types/trip-reports';

const categoryColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  major: 'bg-orange-100 text-orange-700',
  minor: 'bg-yellow-100 text-yellow-700',
  observation: 'bg-blue-100 text-blue-700',
};

interface TripReportStructuredFindingsProps {
  findings: StandardizedFinding[];
  onAddFinding: (finding: Omit<StandardizedFinding, 'id'>) => void;
  readOnly?: boolean;
}

export function TripReportStructuredFindings({ findings, onAddFinding, readOnly }: TripReportStructuredFindingsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [category, setCategory] = useState<FindingCategory>('minor');
  const [severity, setSeverity] = useState<FindingSeverity>('medium');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [requiresCapa, setRequiresCapa] = useState(false);

  const handleAdd = () => {
    onAddFinding({
      category,
      severity,
      description,
      area,
      recommendation,
      requires_capa: requiresCapa,
    });
    setShowDialog(false);
    setDescription('');
    setArea('');
    setRecommendation('');
  };

  const criticalCount = findings.filter(f => f.category === 'critical').length;
  const majorCount = findings.filter(f => f.category === 'major').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-sm font-medium">Structured Findings</CardTitle>
          {(criticalCount > 0 || majorCount > 0) && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount > 0 && `${criticalCount} critical`}
              {criticalCount > 0 && majorCount > 0 && ', '}
              {majorCount > 0 && `${majorCount} major`}
            </div>
          )}
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Finding
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No findings recorded</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>CAPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant="secondary" className={categoryColors[f.category]}>
                        {FINDING_CATEGORY_LABELS[f.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{FINDING_SEVERITY_LABELS[f.severity]}</TableCell>
                    <TableCell className="text-xs">{f.area}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{f.description}</TableCell>
                    <TableCell>
                      {f.requires_capa && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Add Finding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as FindingCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINDING_CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as FindingSeverity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Informed Consent, Source Documents" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Recommendation</Label>
              <Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires-capa"
                checked={requiresCapa}
                onChange={(e) => setRequiresCapa(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="requires-capa" className="text-sm">Requires CAPA</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!description.trim()}>Add Finding</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
