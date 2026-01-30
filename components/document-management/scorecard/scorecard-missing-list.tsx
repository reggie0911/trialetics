"use client";

import { FileX, MapPin, Archive, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteComplianceScore, MissingDocument } from "./scorecard-types";

interface ScorecardMissingListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteComplianceScore | null;
}

export function ScorecardMissingList({
  open,
  onOpenChange,
  site,
}: ScorecardMissingListProps) {
  if (!site) return null;

  // Group missing documents by category
  const groupedByCategory = site.missingDocumentsList.reduce(
    (acc, doc) => {
      if (!acc[doc.categoryId]) {
        acc[doc.categoryId] = {
          categoryName: doc.categoryName,
          documents: [],
        };
      }
      acc[doc.categoryId].documents.push(doc);
      return acc;
    },
    {} as Record<string, { categoryName: string; documents: MissingDocument[] }>
  );

  const getMissingBadge = (missingFrom: MissingDocument["missingFrom"]) => {
    switch (missingFrom) {
      case "both":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700">
            <FileX className="h-2.5 w-2.5" />
            Both
          </span>
        );
      case "site":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">
            <MapPin className="h-2.5 w-2.5" />
            Site
          </span>
        );
      case "tmf":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
            <Archive className="h-2.5 w-2.5" />
            TMF
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileX className="h-5 w-5 text-red-500" />
            Missing Documents - {site.siteName}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Site {site.siteNumber} has {site.missingDocuments} document(s)
            missing from site binder or TMF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedByCategory).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileX className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No missing documents</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByCategory).map(
                ([categoryId, { categoryName, documents }]) => (
                  <div
                    key={categoryId}
                    className="border rounded-sm overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-muted/50 border-b">
                      <h3 className="text-[11px] font-semibold">
                        {categoryName}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        {documents.length} document(s) missing
                      </span>
                    </div>
                    <div className="divide-y">
                      {documents.map((doc) => (
                        <div
                          key={doc.documentId}
                          className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/20"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">
                              {doc.documentName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getMissingBadge(doc.missingFrom)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-600" />
              <span>Missing from Site</span>
            </div>
            <div className="flex items-center gap-1">
              <Archive className="h-3 w-3 text-blue-600" />
              <span>Missing from TMF</span>
            </div>
            <div className="flex items-center gap-1">
              <FileX className="h-3 w-3 text-red-600" />
              <span>Missing from Both</span>
            </div>
          </div>
          <Link
            href={`/protected/document-management/reconciliation?siteId=${site.siteId}`}
          >
            <Button variant="outline" size="sm" className="text-[11px] h-7">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Reconciliation Tracker
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
