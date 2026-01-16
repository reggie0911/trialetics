"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditableTableHeaderProps {
  columnId: string;
  label: string;
  originalLabel: string;
  onLabelChange: (columnId: string, newLabel: string) => void;
}

export function EditableTableHeader({
  columnId,
  label,
  originalLabel,
  onLabelChange,
}: EditableTableHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== label) {
      onLabelChange(columnId, trimmedValue);
    } else {
      setEditValue(label);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full min-w-[100px] px-1 py-0.5 text-xs border border-primary rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className="flex items-center gap-1 cursor-pointer group"
        onClick={() => setIsEditing(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="select-none">{label}</span>
        <Pencil
          className={`w-2.5 h-2.5 transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">Original: {originalLabel}</p>
          <p className="text-muted-foreground">Click to edit label</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
