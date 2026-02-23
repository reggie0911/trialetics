'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RiskAssessment {
  id: string;
  template_id: string | null;
  protocol_id: string;
  name: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  template?: { name: string } | null;
}

interface RiskAssessmentListProps {
  companyId: string;
}

export function RiskAssessmentList({ companyId }: RiskAssessmentListProps) {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('risk_assessments')
        .select('*, template:risk_assessment_templates(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      setAssessments((data || []) as RiskAssessment[]);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading assessments...</p>;
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Risk Assessments</h3>
        <p className="text-xs text-muted-foreground">Completed and in-progress risk assessments</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No risk assessments found
              </TableCell>
            </TableRow>
          ) : (
            assessments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{a.template?.name || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {a.status === 'completed' ? 'Completed' : a.status === 'in_progress' ? 'In Progress' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
