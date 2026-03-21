"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { AuthError } from "@supabase/supabase-js";
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
import { createClient } from "@/lib/client";

export type PasscodeDialogMode = "shared_passcode" | "account_password";

export interface PasscodeDialogProps {
  open: boolean;
  onVerified: () => void;
  onDismiss?: () => void;
  storageKey: string;
  mode: PasscodeDialogMode;
  /** Required when mode is shared_passcode */
  envVarName?: string;
  title?: string;
  description?: string;
}

function mapSignInError(error: AuthError): string {
  const m = (error.message || "").toLowerCase();
  if (
    m.includes("rate") ||
    m.includes("too many") ||
    m.includes("429") ||
    m.includes("over_request_rate")
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials")
  ) {
    return "Incorrect password. If you only use Google or another sign-in provider, add a password to your account in settings or ask an administrator for help.";
  }
  return "Could not verify. Please try again or sign in again.";
}

export function PasscodeDialog({
  open,
  onVerified,
  onDismiss,
  storageKey,
  mode,
  envVarName,
  title,
  description,
}: PasscodeDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAccountMode = mode === "account_password";
  const effectiveTitle =
    title ??
    (isAccountMode ? "Confirm your identity" : "Passcode required");
  const effectiveDescription =
    description ??
    (isAccountMode
      ? "Enter your login password to continue."
      : "This feature requires a passcode to access. Please enter the passcode to continue.");

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setShowPassword(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (mode === "shared_passcode") {
      const expectedPasscode =
        envVarName === "NEXT_PUBLIC_PATIENTS_MAPPING_PASSCODE"
          ? process.env.NEXT_PUBLIC_PATIENTS_MAPPING_PASSCODE
          : envVarName === "NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE"
            ? process.env.NEXT_PUBLIC_DOCUMENT_MANAGEMENT_PASSCODE
            : undefined;

      if (!envVarName || !expectedPasscode) {
        setError("Passcode configuration error. Please contact support.");
        setIsLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (password === expectedPasscode) {
        sessionStorage.setItem(storageKey, "true");
        setPassword("");
        setIsLoading(false);
        onVerified();
      } else {
        setError("Incorrect passcode. Please try again.");
        setPassword("");
        setIsLoading(false);
        inputRef.current?.focus();
      }
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setError("Could not verify your session. Please sign in again.");
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password.trim(),
    });

    if (!signInError) {
      sessionStorage.setItem(storageKey, "true");
      setPassword("");
      setIsLoading(false);
      onVerified();
      return;
    }

    setError(mapSignInError(signInError));
    setPassword("");
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const inputId = isAccountMode ? "account-reauth-password" : "passcode";
  const labelText = isAccountMode ? "Password" : "Passcode";
  const placeholder = isAccountMode
    ? "Enter your login password"
    : "Enter passcode";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss?.();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">{effectiveTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {effectiveDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={inputId}>{labelText}</Label>
            <div className="relative">
              <Input
                id={inputId}
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder={placeholder}
                disabled={isLoading}
                className="pr-10"
                autoComplete={isAccountMode ? "current-password" : "off"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
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

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {onDismiss && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={() => onDismiss()}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify & continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
