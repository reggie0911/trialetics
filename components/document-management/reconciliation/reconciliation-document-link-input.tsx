"use client";

import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReconciliationDocumentLinkInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onView: () => void;
  className?: string;
}

export function ReconciliationDocumentLinkInput({
  value,
  onChange,
  onView,
  className,
}: ReconciliationDocumentLinkInputProps) {
  const hasValue = value && value.trim() !== "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.trim();
    onChange(newValue === "" ? null : newValue);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasValue) {
      onView();
    }
  };

  return (
    <div className="flex items-center gap-1 w-full">
      <Input
        type="url"
        value={value || ""}
        onChange={handleInputChange}
        placeholder="https://..."
        className={cn(
          "h-6 !text-[11px] border-0 shadow-none focus:ring-0 px-1.5 bg-transparent flex-1",
          className
        )}
      />
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-primary hover:text-primary/80 flex-shrink-0"
          onClick={handleViewClick}
          title="View document"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
