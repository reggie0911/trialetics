"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ColumnConfig } from "@/lib/types/patient-data";
import { useToast } from "@/hooks/use-toast";
import { Copy, Info } from "lucide-react";

interface PatientEditFieldProps {
  col: ColumnConfig;
  value: string;
  onChange: (fieldId: string, value: string) => void;
  showFieldIdsInline: boolean;
  isCalculatedField: boolean;
}

export function PatientEditField({
  col,
  value,
  onChange,
  showFieldIdsInline,
  isCalculatedField,
}: PatientEditFieldProps) {
  const { toast } = useToast();
  const hasMappingNote = col.originalLabel !== col.label;

  const copyFieldKey = async () => {
    try {
      await navigator.clipboard.writeText(col.id);
      toast({ title: "Field key copied to clipboard" });
    } catch {
      toast({
        title: "Could not copy",
        description: "Clipboard access was denied.",
        variant: "destructive",
      });
    }
  };

  const detailsLabel = `Field details for ${col.label}`;

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-start gap-1.5">
        <Label
          htmlFor={col.id}
          className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground"
        >
          {col.label}
          {isCalculatedField && (
            <span className="ml-1 block text-xs font-normal text-muted-foreground sm:inline">
              (auto-calculated: DTHDAT - PEPDAT)
            </span>
          )}
        </Label>
        <Popover>
          <PopoverTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 text-muted-foreground hover:text-foreground"
            )}
            aria-label={detailsLabel}
          >
            <Info className="size-3.5" aria-hidden />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            className="w-[min(calc(100vw-2rem),22rem)] gap-3 p-3 text-xs"
          >
            <div className="space-y-2">
              <div>
                <p className="mb-1 font-medium text-foreground">Field key</p>
                <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">
                  {col.id}
                </p>
              </div>
              {hasMappingNote && (
                <div>
                  <p className="mb-1 font-medium text-foreground">Source header</p>
                  <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">
                    {col.originalLabel}
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full gap-1.5 text-xs"
                onClick={() => void copyFieldKey()}
              >
                <Copy className="size-3.5" aria-hidden />
                Copy field key
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Input
        id={col.id}
        type={col.dataType === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(col.id, e.target.value)}
        className="h-9 min-w-0 text-sm"
        placeholder={col.dataType === "date" ? "MM/DD/YYYY" : "—"}
        disabled={isCalculatedField}
        readOnly={isCalculatedField}
      />
      {showFieldIdsInline && (
        <div className="space-y-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-2 dark:bg-muted/30">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Field key
            </p>
            <p className="break-all font-mono text-[11px] leading-snug text-foreground">
              {col.id}
            </p>
          </div>
          {hasMappingNote && (
            <div className="border-t border-border pt-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Source header
              </p>
              <p className="break-all font-mono text-[11px] leading-snug text-muted-foreground">
                {col.originalLabel}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
