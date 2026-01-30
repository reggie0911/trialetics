"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasscodeDialogProps {
  open: boolean;
  onVerified: () => void;
}

const STORAGE_KEY = "document-management-passcode-verified";

export function PasscodeDialog({ open, onVerified }: PasscodeDialogProps) {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setPasscode("");
      setError(null);
      setShowPasscode(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Get passcode from environment variable
    const expectedPasscode = process.env.NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE;

    if (!expectedPasscode) {
      setError("Passcode configuration error. Please contact support.");
      setIsLoading(false);
      return;
    }

    // Simulate a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (passcode === expectedPasscode) {
      // Store verification in sessionStorage
      sessionStorage.setItem(STORAGE_KEY, "true");
      setPasscode("");
      setIsLoading(false);
      onVerified();
    } else {
      setError("Incorrect passcode. Please try again.");
      setPasscode("");
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault(); // Prevent closing dialog
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Document Management Access</DialogTitle>
          <DialogDescription className="text-center">
            This module requires a passcode to access. Please enter the passcode to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passcode">Passcode</Label>
            <div className="relative">
              <Input
                id="passcode"
                ref={inputRef}
                type={showPasscode ? "text" : "password"}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(null);
                }}
                placeholder="Enter passcode"
                disabled={isLoading}
                className="pr-10"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPasscode ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!passcode.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify & Access"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
