"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EditableCellType = "text" | "date" | "select" | "readonly";

interface EditableCellProps {
  value: string | null | undefined;
  type?: EditableCellType;
  options?: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  isEdited?: boolean;
  readOnly?: boolean;
}

export function EditableCell({
  value,
  type = "text",
  options = [],
  onChange,
  placeholder = "",
  className,
  isEdited = false,
  readOnly = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && type === "text") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleClick = () => {
    if (!readOnly && type !== "readonly") {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value && onChange) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setLocalValue(value || "");
      setIsEditing(false);
    }
  };

  const handleChange = (newValue: string | null) => {
    const value = newValue || "";
    setLocalValue(value);
    if (onChange) {
      onChange(value);
    }
  };

  if (readOnly || type === "readonly") {
    return (
      <div className={cn("text-xs px-2 py-1 truncate w-full", className)}>
        {value || "—"}
      </div>
    );
  }

  if (type === "select") {
    return (
      <div className={cn("w-full", className)}>
        <Select
          value={value || ""}
          onValueChange={handleChange}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditing(false);
            }
          }}
        >
          <SelectTrigger
            className={cn(
              "h-7 text-xs border-0 shadow-none focus:ring-0 focus-visible:ring-0 px-2 py-1 w-full",
              isEdited && "bg-yellow-50 border-yellow-200"
            )}
            onClick={handleClick}
          >
            <SelectValue placeholder={placeholder || "Select..."} className="text-xs">
              {(selectedValue) => {
                // Find the label for the selected value
                const option = options.find(opt => opt.value === selectedValue);
                return option ? option.label : (selectedValue || placeholder || "");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.length > 0 ? (
              options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled className="text-xs text-muted-foreground">
                No options available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "date") {
    return (
      <Input
        ref={inputRef}
        type="date"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-7 !text-[12px] border-0 shadow-none focus:ring-0 focus-visible:ring-0 px-2 py-1 w-full",
          isEdited && "bg-yellow-50 border-yellow-200",
          className
        )}
        onClick={handleClick}
      />
    );
  }

  // Text input
  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-7 text-xs border-0 shadow-none focus:ring-0 focus-visible:ring-0 px-2 py-1 w-full",
          isEdited && "bg-yellow-50 border-yellow-200",
          className
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      className={cn(
        "text-xs px-2 py-1 truncate cursor-pointer hover:bg-muted/50 rounded w-full",
        isEdited && "bg-yellow-50 border border-yellow-200",
        className
      )}
      onClick={handleClick}
      title={value || ""}
    >
      {value || placeholder || "—"}
    </div>
  );
}
