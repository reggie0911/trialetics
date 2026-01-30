"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface ReconciliationDatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Custom date picker that displays dates in "DD-MMM-YY" format
 * while providing a native date picker experience
 */
export function ReconciliationDatePicker({
  value,
  onChange,
  placeholder = "DD-MMM-YY",
  className,
}: ReconciliationDatePickerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Convert "DD-MMM-YY" to ISO "YYYY-MM-DD" for the native picker
  const displayToISO = (displayDate: string | null): string => {
    if (!displayDate) return "";
    
    // Handle various date formats from mock data
    // Format 1: "DD-MMM-YY" (e.g., "3-Oct-19")
    // Format 2: "DD/MM/YYYY" or similar (e.g., "10/23/2019")
    // Format 3: Complex strings with dates (e.g., "12/2/2020 (email12/2/2020)")
    
    // Try to parse DD-MMM-YY format first
    const ddMmmYyMatch = displayDate.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (ddMmmYyMatch) {
      const [, day, month, year] = ddMmmYyMatch;
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const monthNum = monthMap[month.toLowerCase()];
      const fullYear = `20${year}`;
      return `${fullYear}-${monthNum}-${day.padStart(2, "0")}`;
    }

    // Try to parse MM/DD/YYYY or DD/MM/YYYY format
    const slashDateMatch = displayDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashDateMatch) {
      const [, part1, part2, year] = slashDateMatch;
      // Assume MM/DD/YYYY format (US format)
      const month = part1.padStart(2, "0");
      const day = part2.padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return "";
  };

  // Convert ISO "YYYY-MM-DD" to "DD-MMM-YY"
  const isoToDisplay = (isoDate: string): string => {
    if (!isoDate) return "";
    
    try {
      const date = new Date(isoDate);
      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return "";
    }
  };

  const displayValue = value || "";
  const isoValue = displayToISO(value);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIsoDate = e.target.value;
    if (newIsoDate) {
      const newDisplayDate = isoToDisplay(newIsoDate);
      onChange(newDisplayDate);
    } else {
      onChange(null);
    }
    setIsPickerOpen(false);
  };

  const handleDisplayClick = () => {
    setIsPickerOpen(true);
    // Trigger the native date picker
    setTimeout(() => {
      dateInputRef.current?.showPicker?.();
    }, 0);
  };

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow manual text entry
    onChange(e.target.value || null);
  };

  return (
    <div className="relative">
      {/* Display input showing DD-MMM-YY format */}
      <Input
        type="text"
        value={displayValue}
        onChange={handleDisplayChange}
        onClick={handleDisplayClick}
        placeholder={placeholder}
        className={className}
      />
      
      {/* Hidden native date picker */}
      <input
        ref={dateInputRef}
        type="date"
        value={isoValue}
        onChange={handleDateChange}
        className="absolute inset-0 opacity-0 pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
}
