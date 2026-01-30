"use client";

import { useState, useEffect } from "react";
import { PasscodeDialog } from "./passcode-dialog";

interface PasscodeProtectionProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "document-management-passcode-verified";

export function PasscodeProtection({ children }: PasscodeProtectionProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check sessionStorage for verification status
    const checkVerification = () => {
      try {
        const verified = sessionStorage.getItem(STORAGE_KEY) === "true";
        setIsVerified(verified);
      } catch (error) {
        // If sessionStorage is not available, default to not verified
        setIsVerified(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkVerification();

    // Listen for storage changes (in case of multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setIsVerified(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleVerified = () => {
    setIsVerified(true);
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show passcode dialog if not verified
  if (!isVerified) {
    return (
      <>
        <PasscodeDialog open={true} onVerified={handleVerified} />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Access Restricted</div>
        </div>
      </>
    );
  }

  // Render children if verified
  return <>{children}</>;
}
