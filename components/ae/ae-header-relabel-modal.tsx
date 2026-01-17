"use client";

import { useState, useEffect } from "react";
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
import { Settings, RotateCcw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLUMN_HEADERS = [
  { original: "SiteName", default: "Site Name" },
  { original: "SubjectId", default: "Patient ID" },
  { original: "AEDECOD", default: "Event Category" },
  { original: "AEEXP", default: "Expectedness" },
  { original: "AEOUT", default: "Outcome" },
  { original: "AESER", default: "Seriousness" },
  { original: "AESERCAT1", default: "Serious Category" },
  { original: "AESTDAT", default: "Start Date" },
  { original: "DS_AEREL", default: "Device Study Relation" },
  { original: "EventDate", default: "Event Date" },
  { original: "IM_AEREL", default: "Implant Relation" },
  { original: "IS_AEREL", default: "Sheath Relation" },
  { original: "LT_AEREL", default: "Loading Tools Relation" },
  { original: "PR_AEREL", default: "Procedure Relation" },
  { original: "PRDAT", default: "Procedure Date" },
  { original: "RWOSDAT", default: "Resolution Date" },
];

interface AEHeaderRelabelModalProps {
  currentMappings: Record<string, string>;
  onSave: (mappings: Record<string, string>) => Promise<void>;
  disabled?: boolean;
}

export function AEHeaderRelabelModal({ 
  currentMappings, 
  onSave,
  disabled = false 
}: AEHeaderRelabelModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize local state when modal opens or currentMappings change
  useEffect(() => {
    if (isOpen) {
      const initialMappings: Record<string, string> = {};
      COLUMN_HEADERS.forEach(({ original, default: defaultLabel }) => {
        initialMappings[original] = currentMappings[original] || defaultLabel;
      });
      setLocalMappings(initialMappings);
    }
  }, [isOpen, currentMappings]);

  const handleInputChange = (original: string, value: string) => {
    setLocalMappings(prev => ({
      ...prev,
      [original]: value
    }));
  };

  const handleResetSingle = (original: string) => {
    const defaultLabel = COLUMN_HEADERS.find(h => h.original === original)?.default || original;
    setLocalMappings(prev => ({
      ...prev,
      [original]: defaultLabel
    }));
  };

  const handleResetAll = () => {
    const resetMappings: Record<string, string> = {};
    COLUMN_HEADERS.forEach(({ original, default: defaultLabel }) => {
      resetMappings[original] = defaultLabel;
    });
    setLocalMappings(resetMappings);
  };

  const handleSave = async () => {
    // Validate: no empty labels
    const hasEmpty = Object.values(localMappings).some(val => !val.trim());
    if (hasEmpty) {
      toast({
        title: "Validation Error",
        description: "All header labels must have a value",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localMappings);
      toast({
        title: "Success",
        description: "Header labels saved successfully",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save header labels",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 text-[11px] h-8" 
        asChild 
        disabled={disabled}
      >
        <DialogTrigger>
          <Settings className="h-3 w-3" />
          Relabel Headers
        </DialogTrigger>
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Customize Column Headers</DialogTitle>
          <DialogDescription className="text-[11px]">
            Edit the display names for table column headers. Changes will be saved for your company.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Reset All Button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="text-[11px] h-7"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset All to Default
              </Button>
            </div>

            {/* Grid of inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COLUMN_HEADERS.map(({ original, default: defaultLabel }) => (
                <div key={original} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`header-${original}`} className="text-[11px] text-muted-foreground">
                      {original}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetSingle(original)}
                      className="h-5 w-5 p-0"
                      title="Reset to default"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    id={`header-${original}`}
                    value={localMappings[original] || ""}
                    onChange={(e) => handleInputChange(original, e.target.value)}
                    className="h-8 text-[11px]"
                    placeholder={defaultLabel}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="text-[11px] h-8"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="text-[11px] h-8"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
