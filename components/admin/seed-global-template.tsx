"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { seedGlobalTemplateData } from "@/lib/actions/document-management-data";

export function SeedGlobalTemplate() {
  const [file, setFile] = useState<File | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);
    setSeeded(false);
  };

  const handleSeed = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to seed",
        variant: "destructive",
      });
      return;
    }

    setSeeding(true);

    try {
      const result = await seedGlobalTemplateData(file);

      if (result.success && result.data) {
        toast({
          title: "Seed Successful",
          description: `Successfully seeded ${result.data.imported} global template records${result.data.errors.length > 0 ? `. ${result.data.errors.length} errors occurred.` : ''}`,
        });

        if (result.data.errors.length > 0) {
          console.warn('Seed errors:', result.data.errors);
        }

        setSeeded(true);
      } else {
        toast({
          title: "Seed Failed",
          description: result.error || "Failed to seed global template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">Seed Global TMF Template</h3>
        <p className="text-xs text-muted-foreground">
          Seed the global TMF template data that will be accessible to all users. This should only be done once.
        </p>
        {seeded && (
          <div className="mt-2 flex items-center gap-2 text-green-600 text-xs">
            <CheckCircle2 className="h-4 w-4" />
            <span>Global template has been seeded successfully</span>
          </div>
        )}
      </div>

      <div className="border-2 border-dashed rounded-lg p-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="text-xs font-medium">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setSeeded(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-xs"
              disabled={seeding}
            >
              Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-2">
              Select CSV file to seed global template
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
              disabled={seeding}
            >
              Select CSV File
            </Button>
          </>
        )}
      </div>

      {file && (
        <Button
          type="button"
          onClick={handleSeed}
          disabled={seeding || seeded}
          className="w-full text-xs"
        >
          {seeding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Seeding...
            </>
          ) : seeded ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Seeded Successfully
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Seed Global Template
            </>
          )}
        </Button>
      )}
    </div>
  );
}
