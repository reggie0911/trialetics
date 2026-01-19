"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_HEADERS = [
  "SiteName",
  "SubjectId",
  "EventName",
  "EventStatus",
  "ProcedureDate",
  "DeathDate",
  "EventDate",
  "PlannedDate",
  "ProposedDate",
  "WindowStartDate",
  "WindowEndDate",
  "AlertStatus"
];

interface VWHeaderRelabelModalProps {
  currentMappings: Record<string, string>;
  onSave: (mappings: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}

export function VWHeaderRelabelModal({
  currentMappings,
  onSave,
  disabled = false,
}: VWHeaderRelabelModalProps) {
  const [open, setOpen] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    // Initialize mappings with current values or defaults
    const initialMappings: Record<string, string> = {};
    DEFAULT_HEADERS.forEach((header) => {
      initialMappings[header] = currentMappings[header] || header;
    });
    setMappings(initialMappings);
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(mappings);
      toast({
        title: "Success",
        description: "Column labels have been updated",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save mappings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const resetMappings: Record<string, string> = {};
    DEFAULT_HEADERS.forEach((header) => {
      resetMappings[header] = header;
    });
    setMappings(resetMappings);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      handleOpen();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={disabled}
        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
      >
        <Settings2 className="w-3 h-3 mr-1" />
        Customize Headers
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Customize Column Headers</DialogTitle>
          <DialogDescription className="text-xs">
            Rename column headers to match your preferred terminology. Changes apply to all future uploads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {DEFAULT_HEADERS.map((header) => (
            <div key={header} className="grid grid-cols-2 gap-3 items-center">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Original: <span className="font-mono">{header}</span>
                </Label>
              </div>
              <div>
                <Input
                  value={mappings[header] || ""}
                  onChange={(e) =>
                    setMappings({ ...mappings, [header]: e.target.value })
                  }
                  className="h-8 text-[11px]"
                  placeholder={header}
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-xs h-8"
            disabled={saving}
          >
            Reset to Default
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="text-xs h-8"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="text-xs h-8"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
