"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentHeaderRelabelModalProps {
  currentMappings: Record<string, string>;
  onSave: (newMappings: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}

const DEFAULT_COLUMNS = [
  "DocumentName",
  "DocumentType",
  "DocumentCategory",
  "Version",
  "Status",
  "SiteName",
  "ProjectId",
  "UploadDate",
  "ApprovalDate",
  "ExpirationDate",
  "ApprovedBy",
  "FileUrl",
  "FileSize",
];

export function DocumentHeaderRelabelModal({
  currentMappings,
  onSave,
  disabled = false,
}: DocumentHeaderRelabelModalProps) {
  const [open, setOpen] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>(currentMappings);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setMappings(currentMappings);
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(mappings);
      toast({
        title: "Success",
        description: "Column headers have been updated",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save column headers",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const resetMappings: Record<string, string> = {};
    DEFAULT_COLUMNS.forEach((col) => {
      resetMappings[col] = col;
    });
    setMappings(resetMappings);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="text-[11px] h-8"
          />
        }
      >
        <Settings2 className="h-3 w-3 mr-2" />
        Customize Headers
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Customize Column Headers</DialogTitle>
          <DialogDescription className="text-xs">
            Customize the display labels for each column. Original column names will be preserved in the data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3 py-2">
            {DEFAULT_COLUMNS.map((columnId) => (
              <div key={columnId} className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Original: <span className="font-mono text-foreground">{columnId}</span>
                  </Label>
                </div>
                <div>
                  <Input
                    value={mappings[columnId] || columnId}
                    onChange={(e) =>
                      setMappings((prev) => ({
                        ...prev,
                        [columnId]: e.target.value,
                      }))
                    }
                    placeholder={columnId}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="text-xs"
          >
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
