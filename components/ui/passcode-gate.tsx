"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasscodeDialog } from "./passcode-dialog";

export interface PasscodeGateProps {
  children: React.ReactNode;
  storageKey: string;
  envVarName: string;
  title?: string;
  description?: string;
}

/**
 * Wraps children and only renders them when the user has entered the correct passcode.
 * When not verified, shows a locked button that opens the passcode dialog.
 */
export function PasscodeGate({
  children,
  storageKey,
  envVarName,
  title = "Passcode Required",
  description = "This feature requires a passcode to access. Please enter the passcode to continue.",
}: PasscodeGateProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);

  useEffect(() => {
    const checkVerification = () => {
      try {
        const verified = sessionStorage.getItem(storageKey) === "true";
        setIsVerified(verified);
      } catch {
        setIsVerified(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkVerification();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setIsVerified(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey]);

  const handleVerified = () => {
    setIsVerified(true);
    setShowPasscodeDialog(false);
  };

  if (isChecking) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-xs">
        <Lock className="h-3 w-3 animate-pulse" />
        Loading...
      </Button>
    );
  }

  if (!isVerified) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPasscodeDialog(true)}
          className="gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Lock className="h-3 w-3" />
          Enter Passcode
        </Button>
        <PasscodeDialog
          open={showPasscodeDialog}
          onVerified={handleVerified}
          storageKey={storageKey}
          envVarName={envVarName}
          title={title}
          description={description}
        />
      </>
    );
  }

  return <>{children}</>;
}
