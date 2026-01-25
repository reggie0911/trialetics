"use client";

import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
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
import {
  getSDVCalculationSettings,
  saveSDVCalculationSettings,
  SDVCalculationSettings,
} from "@/lib/actions/sdv-tracker-data";

interface SDVCalculationSettingsModalProps {
  companyId: string;
  disabled?: boolean;
}

export function SDVCalculationSettingsModal({
  companyId,
  disabled,
}: SDVCalculationSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SDVCalculationSettings>({
    minutes_per_field: 60,
    hours_per_day: 7,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load settings when modal opens
  useEffect(() => {
    if (open && companyId) {
      loadSettings();
    }
  }, [open, companyId]);

  const loadSettings = async () => {
    setIsLoading(true);
    const result = await getSDVCalculationSettings(companyId);
    if (result.success && result.data) {
      setSettings(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load settings",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    // Validate inputs
    if (settings.minutes_per_field <= 0 || settings.hours_per_day <= 0) {
      toast({
        title: "Invalid Input",
        description: "Values must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveSDVCalculationSettings(companyId, settings);
      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Calculation settings have been updated",
        });
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8 hover:bg-accent/80 hover:scale-[1.02] transition-all duration-150"
            disabled={disabled}
          />
        }
      >
        <Calculator className="h-3 w-3 mr-2" />
        Calculation Settings
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>SDV Calculation Settings</DialogTitle>
          <DialogDescription className="text-[11px]">
            Configure how estimate hours and days are calculated. Changes will apply to all calculations for your company.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading settings...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minutes_per_field" className="text-sm">
                Minutes per Field
              </Label>
              <div className="space-y-1">
                <Input
                  id="minutes_per_field"
                  type="number"
                  min="1"
                  step="0.1"
                  value={settings.minutes_per_field}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      minutes_per_field: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Time (in minutes) required to verify one field. Used to calculate Estimate Hours.
                  <br />
                  <strong>Formula:</strong> Estimate Hours = (Data Needing Review) ÷ {settings.minutes_per_field}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours_per_day" className="text-sm">
                Hours per Day
              </Label>
              <div className="space-y-1">
                <Input
                  id="hours_per_day"
                  type="number"
                  min="1"
                  step="0.1"
                  value={settings.hours_per_day}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hours_per_day: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Number of working hours per day. Used to calculate Estimate Days.
                  <br />
                  <strong>Formula:</strong> Estimate Days = (Estimate Hours) ÷ {settings.hours_per_day}
                </p>
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 space-y-2">
              <p className="text-[11px] font-semibold">Example Calculation:</p>
              <p className="text-[11px] text-muted-foreground">
                If you have <strong>3,438 fields</strong> needing review:
                <br />
                • Estimate Hours = 3,438 ÷ {settings.minutes_per_field} ={" "}
                <strong>{(3438 / settings.minutes_per_field).toFixed(2)} hours</strong>
                <br />
                • Estimate Days = {(3438 / settings.minutes_per_field).toFixed(2)} ÷ {settings.hours_per_day} ={" "}
                <strong>{(3438 / settings.minutes_per_field / settings.hours_per_day).toFixed(2)} days</strong>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
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
            disabled={isSaving || isLoading}
            className="text-[11px]"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
