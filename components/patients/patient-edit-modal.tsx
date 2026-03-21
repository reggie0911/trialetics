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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PatientRecord, ColumnConfig } from "@/lib/types/patient-data";
import { PatientEditField } from "./patient-edit-field";
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
  const [showFieldIdsInline, setShowFieldIdsInline] = useState(false);

  // Update editedData when patient prop changes
  useEffect(() => {
    setEditedData(patient);
  }, [patient]);

  useEffect(() => {
    if (!isOpen) {
      setShowFieldIdsInline(false);
    }
  }, [isOpen]);

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
  const groupedColumns = columnConfigs.reduce(
    (acc, col) => {
      const group = col.visitGroup || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(col);
      return acc;
    },
    {} as Record<string, ColumnConfig[]>
  );

  const groups = Object.keys(groupedColumns).sort((a, b) => {
    const aOrder = groupedColumns[a][0]?.tableOrder || 999;
    const bOrder = groupedColumns[b][0]?.tableOrder || 999;
    return aOrder - bOrder;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl gap-4">
        <DialogHeader className="space-y-3">
          <div>
            <DialogTitle>Edit Patient Data</DialogTitle>
            <DialogDescription>
              Update patient information. Patient ID cannot be changed.
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/25">
            <div className="min-w-0 space-y-0.5 pr-2">
              <Label
                htmlFor="patient-edit-show-field-ids"
                className="text-sm font-medium text-foreground"
              >
                Show field IDs
              </Label>
              <p
                id="patient-edit-show-field-ids-desc"
                className="text-xs text-muted-foreground"
              >
                Show technical field keys below each input (for support and mapping checks).
              </p>
            </div>
            <Switch
              id="patient-edit-show-field-ids"
              checked={showFieldIdsInline}
              onCheckedChange={setShowFieldIdsInline}
              className="shrink-0"
              aria-describedby="patient-edit-show-field-ids-desc"
            />
          </div>
        </DialogHeader>

        {/* Patient ID Display */}
        <div className="border-b border-border pb-4">
          <Label className="text-sm font-medium">Patient ID</Label>
          <div className="mt-1 rounded-md bg-muted p-2 font-mono text-sm text-foreground">
            {patient.SubjectId || patient["Subject ID"] || "N/A"}
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-250px)] pr-4">
          <div className="space-y-6">
            {groups.map((group) => {
              const groupCols = groupedColumns[group];
              return (
                <div key={group} className="space-y-3">
                  <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
                    {group}
                  </h3>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 xl:grid-cols-2">
                    {groupCols
                      .sort((a, b) => (a.tableOrder || 0) - (b.tableOrder || 0))
                      .map((col) => {
                        if (col.id === "SubjectId" || col.id === "Subject ID") {
                          return null;
                        }

                        const isCalculatedField =
                          col.id === "COMMON_AE[1].LOG_AE.AE[1].PRDAT";

                        return (
                          <PatientEditField
                            key={col.id}
                            col={col}
                            value={editedData[col.id] || ""}
                            onChange={handleFieldChange}
                            showFieldIdsInline={showFieldIdsInline}
                            isCalculatedField={isCalculatedField}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
