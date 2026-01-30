"use client";

import { cn } from "@/lib/utils";
import { ReconciliationStatus } from "./reconciliation-types";

interface ReconciliationStatusCellProps {
  value: ReconciliationStatus;
  onChange: (value: ReconciliationStatus) => void;
  showNA?: boolean;
  highlightNo?: boolean;
}

export function ReconciliationStatusCell({
  value,
  onChange,
  showNA = true,
  highlightNo = false,
}: ReconciliationStatusCellProps) {
  // Cycle through states on click
  const handleClick = () => {
    if (showNA) {
      // Cycle: null -> yes -> no -> na -> null
      const cycle: ReconciliationStatus[] = [null, "yes", "no", "na"];
      const currentIndex = cycle.indexOf(value);
      const nextIndex = (currentIndex + 1) % cycle.length;
      onChange(cycle[nextIndex]);
    } else {
      // Cycle: null -> yes -> no -> null
      const cycle: ReconciliationStatus[] = [null, "yes", "no"];
      const currentIndex = cycle.indexOf(value);
      const nextIndex = (currentIndex + 1) % cycle.length;
      onChange(cycle[nextIndex]);
    }
  };

  // Get display text and styles
  const getDisplay = () => {
    switch (value) {
      case "yes":
        return {
          text: "Yes",
          bgClass: "bg-green-100 text-green-800",
        };
      case "no":
        return {
          text: "No",
          bgClass: highlightNo
            ? "bg-red-600 text-white font-bold"
            : "bg-red-100 text-red-800",
        };
      case "na":
        return {
          text: "N/A",
          bgClass: "bg-gray-200 text-gray-600",
        };
      default:
        return {
          text: "—",
          bgClass: "bg-transparent text-muted-foreground",
        };
    }
  };

  const display = getDisplay();

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full h-6 flex items-center justify-center rounded-sm text-[11px] font-medium transition-colors cursor-pointer",
        display.bgClass
      )}
    >
      {display.text}
    </button>
  );
}
