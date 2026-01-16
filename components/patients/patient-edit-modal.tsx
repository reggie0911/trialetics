"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientRecord, ColumnConfig } from "@/lib/types/patient-data";
import { Loader2 } from "lucide-react";

interface PatientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord | null;
  columnConfigs: ColumnConfig[];
  onSave: (updatedPatient: PatientRecord) => Promise<void>;
}

export function PatientEditModal({
  isOpen,
  onClose,
  patient,
  columnConfigs,
  onSave,
}: PatientEditModalProps) {
  const [editedData, setEditedData] = useState<PatientRecord | null>(patient);
  const [isSaving, setIsSaving] = useState(false);

  // Update editedData when patient prop changes
  useEffect(() => {
    setEditedData(patient);
  }, [patient]);

  if (!patient || !editedData) return null;

  const handleFieldChange = (fieldId: string, value: string) => {
    setEditedData({
      ...editedData,
      [fieldId]: value,
    });
  };

  const handleSave = async () => {
    if (!editedData) return;
    
    setIsSaving(true);
    try {
      await onSave(editedData);
      onClose();
    } catch (error) {
      console.error("Error saving patient data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Group columns by visit group
  const groupedColumns = columnConfigs.reduce((acc, col) => {
    const group = col.visitGroup || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  const groups = Object.keys(groupedColumns).sort((a, b) => {
    const aOrder = groupedColumns[a][0]?.tableOrder || 999;
    const bOrder = groupedColumns[b][0]?.tableOrder || 999;
    return aOrder - bOrder;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Patient Data</DialogTitle>
          <DialogDescription>
            Update patient information. Patient ID cannot be changed.
          </DialogDescription>
        </DialogHeader>

        {/* Patient ID Display */}
        <div className="border-b pb-4">
          <Label className="text-sm font-medium">Patient ID</Label>
          <div className="mt-1 text-sm font-mono bg-muted p-2 rounded">
            {patient.SubjectId || patient['Subject ID'] || 'N/A'}
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-250px)] pr-4">
          <div className="space-y-6">
            {groups.map((group) => {
              const groupCols = groupedColumns[group];
              return (
                <div key={group} className="space-y-3">
                  <h3 className="font-semibold text-sm border-b pb-2">{group}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupCols
                      .sort((a, b) => (a.tableOrder || 0) - (b.tableOrder || 0))
                      .map((col) => {
                        // Skip Patient ID fields
                        if (
                          col.id === 'SubjectId' || 
                          col.id === 'Subject ID'
                        ) {
                          return null;
                        }

                        // Make PRDAT read-only (calculated field)
                        const isCalculatedField = col.id === 'COMMON_AE[1].LOG_AE.AE[1].PRDAT';

                        return (
                          <div key={col.id} className="space-y-1">
                            <Label htmlFor={col.id} className="text-xs">
                              {col.label}
                              {isCalculatedField && (
                                <span className="text-muted-foreground ml-1">(auto-calculated: DTHDAT - PEPDAT)</span>
                              )}
                            </Label>
                            <Input
                              id={col.id}
                              type={col.dataType === 'number' ? 'number' : 'text'}
                              value={editedData[col.id] || ''}
                              onChange={(e) => handleFieldChange(col.id, e.target.value)}
                              className="text-xs h-8"
                              placeholder={col.dataType === 'date' ? 'MM/DD/YYYY' : '—'}
                              disabled={isCalculatedField}
                              readOnly={isCalculatedField}
                            />
                            {col.originalLabel !== col.label && (
                              <p className="text-[10px] text-muted-foreground">
                                {col.originalLabel}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
