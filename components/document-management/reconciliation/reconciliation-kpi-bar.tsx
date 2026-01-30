"use client";

import { FileCheck, FileX, FileWarning, Files } from "lucide-react";

interface ReconciliationKPIBarProps {
  metrics: {
    totalDocuments: number;
    presentInTMF: number;
    missingFromTMF: number;
    presentOnSite: number;
    pendingCollection: number;
  };
}

export function ReconciliationKPIBar({ metrics }: ReconciliationKPIBarProps) {
  const kpiItems = [
    {
      label: "Total Documents",
      value: metrics.totalDocuments,
      icon: Files,
      color: "bg-blue-500",
    },
    {
      label: "Present in TMF",
      value: metrics.presentInTMF,
      icon: FileCheck,
      color: "bg-green-500",
    },
    {
      label: "Missing from TMF",
      value: metrics.missingFromTMF,
      icon: FileX,
      color: "bg-red-500",
    },
    {
      label: "Present On-Site",
      value: metrics.presentOnSite,
      icon: FileCheck,
      color: "bg-teal-500",
    },
    {
      label: "Pending Collection",
      value: metrics.pendingCollection,
      icon: FileWarning,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="bg-white rounded-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {kpiItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`p-1.5 rounded-sm ${item.color}`}>
              <item.icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="text-base font-bold">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
