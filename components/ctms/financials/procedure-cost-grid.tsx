'use client';

import { useState, useMemo, useTransition } from 'react';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import type { ProcedureGrid, StudyVisitDefinition } from '@/lib/types/ctms';
import {
  upsertProcedureVisitCost,
  deleteProcedureRow,
  createStudyVisitDefinition,
  deleteStudyVisitDefinition,
} from '@/lib/actions/study-visit-definitions';

interface ProcedureCostGridProps {
  sectionId: string;
  studyId: string;
  currency: string;
  grid: ProcedureGrid;
  plannedEnrollment?: number | null;
  /** Actual enrolled subject count (from subjects table) */
  enrollmentActual?: number | null;
  isAdmin?: boolean;
  onChanged: () => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/**
 * Interactive procedure x visit cost grid for per_patient_procedure budget sections.
 * Uses Shadcn Table primitives with inline-editable cells.
 */
export function ProcedureCostGrid({
  sectionId,
  studyId,
  currency,
  grid,
  plannedEnrollment,
  enrollmentActual,
  isAdmin = false,
  onChanged,
}: ProcedureCostGridProps) {
  const [, startTransition] = useTransition();

  // Local optimistic state for cells being edited
  const [editingCell, setEditingCell] = useState<{ procedure: string; visitId: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState('');

  const [newProcedureName, setNewProcedureName] = useState('');
  const [addingProcedure, setAddingProcedure] = useState(false);

  const [newVisitName, setNewVisitName] = useState('');
  const [addingVisit, setAddingVisit] = useState(false);

  // ─── Calculations ──────────────────────────────────────────────────────────

  const { costPerVisit, costPerPatient, totalProcedureCost, forecastedTotal } = useMemo(() => {
    const costPerVisit: Record<string, number> = {};
    for (const visit of grid.visits) {
      costPerVisit[visit.id] = grid.procedures.reduce((sum, proc) => {
        const cell = grid.cells[`${proc}__${visit.id}`];
        if (!cell?.is_applicable) return sum;
        return sum + Number(cell.unit_cost);
      }, 0);
    }

    const costPerPatient = Object.values(costPerVisit).reduce((s, v) => s + v, 0);
    const planned = plannedEnrollment ?? 0;
    const actual = enrollmentActual ?? null;

    return {
      costPerVisit,
      costPerPatient,
      totalProcedureCost: costPerPatient * planned,
      forecastedTotal: actual != null ? costPerPatient * actual : null,
    };
  }, [grid, plannedEnrollment, enrollmentActual]);

  // ─── Cell editing ──────────────────────────────────────────────────────────

  const startEditing = (procedure: string, visitId: string) => {
    if (!isAdmin) return;
    const key = `${procedure}__${visitId}`;
    const cell = grid.cells[key];
    setEditingCell({ procedure, visitId });
    setEditingCellValue(cell?.is_applicable ? String(cell.unit_cost) : '');
  };

  const commitEdit = (procedure: string, visitId: string) => {
    const rawValue = editingCellValue.trim();
    const cost = rawValue === '' ? 0 : parseFloat(rawValue);
    if (Number.isNaN(cost)) {
      toast.error('Enter a valid number');
      return;
    }
    setEditingCell(null);
    startTransition(async () => {
      const { error } = await upsertProcedureVisitCost(sectionId, studyId, {
        procedure_name: procedure,
        visit_definition_id: visitId,
        is_applicable: cost > 0,
        unit_cost: cost,
      });
      if (error) toast.error(error);
      else onChanged();
    });
  };

  const cancelEdit = () => setEditingCell(null);

  // ─── Add procedure row ─────────────────────────────────────────────────────

  const handleAddProcedure = () => {
    if (!newProcedureName.trim()) return;
    const name = newProcedureName.trim();
    setAddingProcedure(true);
    startTransition(async () => {
      if (grid.visits.length > 0) {
        const { error } = await upsertProcedureVisitCost(sectionId, studyId, {
          procedure_name: name,
          visit_definition_id: grid.visits[0].id,
          is_applicable: false,
          unit_cost: 0,
          sort_order: grid.procedures.length,
        });
        setNewProcedureName('');
        setAddingProcedure(false);
        if (error) toast.error(error);
        else {
          toast.success('Procedure row added');
          onChanged();
        }
      } else {
        toast.info('Add a visit column first, then enter costs.');
        setNewProcedureName('');
        setAddingProcedure(false);
      }
    });
  };

  // ─── Add visit column ──────────────────────────────────────────────────────

  const handleAddVisit = () => {
    if (!newVisitName.trim()) return;
    const name = newVisitName.trim();
    setAddingVisit(true);
    startTransition(async () => {
      const { error } = await createStudyVisitDefinition(studyId, {
        visit_name: name,
        sort_order: grid.visits.length,
      });
      setNewVisitName('');
      setAddingVisit(false);
      if (error) toast.error(error);
      else {
        toast.success('Visit column added');
        onChanged();
      }
    });
  };

  // ─── Delete visit column ───────────────────────────────────────────────────

  const handleDeleteVisit = (visitId: string) => {
    startTransition(async () => {
      const { error } = await deleteStudyVisitDefinition(visitId, studyId);
      if (error) toast.error(error);
      else onChanged();
    });
  };

  // ─── Delete procedure row ──────────────────────────────────────────────────

  const handleDeleteProcedure = (procedureName: string) => {
    startTransition(async () => {
      const { error } = await deleteProcedureRow(sectionId, procedureName, studyId);
      if (error) toast.error(error);
      else onChanged();
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (grid.visits.length === 0 && grid.procedures.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground text-center py-4">
          No visit schedule defined. Add visit columns and procedure rows to build the grid.
        </p>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <AddVisitInput
              value={newVisitName}
              onChange={setNewVisitName}
              onAdd={handleAddVisit}
              disabled={addingVisit}
            />
            <AddProcedureInput
              value={newProcedureName}
              onChange={setNewProcedureName}
              onAdd={handleAddProcedure}
              disabled={addingProcedure || grid.visits.length === 0}
              noVisits={grid.visits.length === 0}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs min-w-[140px] sticky left-0 bg-background z-10">
                Procedure
              </TableHead>
              {grid.visits.map((visit) => (
                <TableHead key={visit.id} className="text-xs text-right min-w-[100px]">
                  <div className="flex flex-col items-end gap-0.5">
                    <span>{visit.visit_name}</span>
                    {visit.timepoint_days != null && (
                      <span className="text-[10px] text-muted-foreground">Day {visit.timepoint_days}</span>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
                        onClick={() => handleDeleteVisit(visit.id)}
                        title={`Remove ${visit.visit_name}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
              {isAdmin && (
                <TableHead className="text-xs min-w-[120px]">
                  <AddVisitInput
                    value={newVisitName}
                    onChange={setNewVisitName}
                    onAdd={handleAddVisit}
                    disabled={addingVisit}
                    compact
                  />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.procedures.map((proc) => (
              <TableRow key={proc}>
                <TableCell className="text-xs font-medium sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-1 min-w-0">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0 opacity-60 hover:opacity-100 hover:text-destructive"
                        onClick={() => handleDeleteProcedure(proc)}
                        title={`Remove ${proc}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <span className="truncate">{proc}</span>
                  </div>
                </TableCell>
                {grid.visits.map((visit) => {
                  const key = `${proc}__${visit.id}`;
                  const cell = grid.cells[key];
                  const isEditing =
                    editingCell?.procedure === proc && editingCell?.visitId === visit.id;

                  return (
                    <TableCell
                      key={visit.id}
                      className="text-xs text-right p-0"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-0.5 p-1">
                          <Input
                            className="h-7 w-20 text-xs text-right"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingCellValue}
                            onChange={(e) => setEditingCellValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(proc, visit.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => commitEdit(proc, visit.id)}
                          >
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={cancelEdit}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className={`w-full h-full px-3 py-2 text-right transition-colors ${
                            cell?.is_applicable
                              ? 'text-foreground'
                              : 'text-muted-foreground/40'
                          } ${isAdmin ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default'}`}
                          onClick={() => startEditing(proc, visit.id)}
                          disabled={!isAdmin}
                          title={isAdmin ? 'Click to edit' : undefined}
                        >
                          {cell?.is_applicable
                            ? formatCurrency(Number(cell.unit_cost), currency)
                            : '—'}
                        </button>
                      )}
                    </TableCell>
                  );
                })}
                {isAdmin && <TableCell />}
              </TableRow>
            ))}

            {/* Cost per visit footer */}
            <TableRow className="bg-muted/30 border-t-2">
              <TableCell className="text-xs font-semibold sticky left-0 bg-muted/30 z-10">
                Cost / visit
              </TableCell>
              {grid.visits.map((visit) => (
                <TableCell key={visit.id} className="text-xs text-right font-semibold">
                  {formatCurrency(costPerVisit[visit.id] ?? 0, currency)}
                </TableCell>
              ))}
              {isAdmin && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3 pt-1">
        <SummaryCard label="Cost / patient" value={formatCurrency(costPerPatient, currency)} />
        {plannedEnrollment != null && (
          <SummaryCard
            label={`Total (planned ${plannedEnrollment} pts)`}
            value={formatCurrency(totalProcedureCost, currency)}
          />
        )}
        {enrollmentActual != null && forecastedTotal != null && (
          <SummaryCard
            label={`Forecast (${enrollmentActual} enrolled)`}
            value={formatCurrency(forecastedTotal, currency)}
            variant={
              plannedEnrollment != null && enrollmentActual > plannedEnrollment * 1.1
                ? 'destructive'
                : plannedEnrollment != null && enrollmentActual > plannedEnrollment * 0.9
                ? 'warning'
                : 'success'
            }
          />
        )}
      </div>

      {/* Add procedure row */}
      {isAdmin && (
        <AddProcedureInput
          value={newProcedureName}
          onChange={setNewProcedureName}
          onAdd={handleAddProcedure}
          disabled={addingProcedure}
        />
      )}
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function AddVisitInput({
  value,
  onChange,
  onAdd,
  disabled,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'max-w-xs'}`}>
      <Input
        className="h-7 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+ Add visit"
        onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
        disabled={disabled}
      />
      {!compact && (
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0" onClick={onAdd} disabled={disabled || !value.trim()}>
          Add
        </Button>
      )}
      {compact && value.trim() && (
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onAdd} disabled={disabled}>
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function AddProcedureInput({
  value,
  onChange,
  onAdd,
  disabled,
  noVisits,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  disabled: boolean;
  noVisits?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 max-w-sm">
        <Input
          className="h-7 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., MRI, Labs, Informed Consent"
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
          disabled={disabled}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs shrink-0 whitespace-nowrap"
          onClick={onAdd}
          disabled={disabled || !value.trim()}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add row
        </Button>
      </div>
      {noVisits && (
        <p className="text-[10px] text-muted-foreground">Add a visit column first</p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const colorClass =
    variant === 'success'
      ? 'text-green-700 dark:text-green-400'
      : variant === 'warning'
      ? 'text-amber-700 dark:text-amber-400'
      : variant === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <div className="rounded-md border px-3 py-2 min-w-[140px]">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
}
