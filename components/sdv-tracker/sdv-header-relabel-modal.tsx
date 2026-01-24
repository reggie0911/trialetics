"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SDVHeaderRelabelModalProps {
  currentMappings: Record<string, string>;
  onSave: (mappings: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}

export function SDVHeaderRelabelModal({
  currentMappings,
  onSave,
  disabled,
}: SDVHeaderRelabelModalProps) {
  const [open, setOpen] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Default column headers for SDV Tracker
  const defaultHeaders = [
    "site_number",
    "site_name",
    "subject_id",
    "visit_type",
    "crf_name",
    "crf_field",
    "sdv_percent",
    "data_verified",
    "data_needing_review",
    "data_expected",
    "data_entered",
    "opened_queries",
    "answered_queries",
    "estimate_hours",
    "estimate_days",
  ];

  const handleOpen = () => {
    setMappings({ ...currentMappings });
    setOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(mappings);
      toast({
        title: "Headers Updated",
        description: "Column headers have been customized successfully",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error saving header mappings:", error);
      toast({
        title: "Error",
        description: "Failed to save header mappings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setMappings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    const resetMappings: Record<string, string> = {};
    defaultHeaders.forEach((header) => {
      // Convert snake_case to Title Case
      resetMappings[header] = header
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });
    setMappings(resetMappings);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8"
            disabled={disabled}
            onClick={handleOpen}
          />
        }
      >
        <Settings2 className="h-3 w-3 mr-2" />
        Customize Headers
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Column Headers</DialogTitle>
          <DialogDescription className="text-[11px]">
            Customize the display labels for table columns. Changes will apply to all users in your company.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {defaultHeaders.map((header) => (
              <div key={header} className="space-y-2">
                <Label className="text-[11px] text-muted-foreground">
                  {header}
                </Label>
                <Input
                  value={mappings[header] || header.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  onChange={(e) => handleInputChange(header, e.target.value)}
                  className="text-[11px] h-8"
                  placeholder={header}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
            className="text-[11px]"
          >
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
            className="text-[11px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="text-[11px]"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
