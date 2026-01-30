"use client";

import { useState, useMemo } from "react";
import { ReconciliationHeader } from "./reconciliation-header";
import { ReconciliationCategoryNav } from "./reconciliation-category-nav";
import { ReconciliationCategorySection } from "./reconciliation-category-section";
import { ReconciliationKPIBar } from "./reconciliation-kpi-bar";
import {
  MOCK_RECONCILIATION_DATA,
  calculateKPIMetrics,
} from "./reconciliation-mock-data";
import {
  ReconciliationCategory,
  ReconciliationDocument,
  ReconciliationStatus,
} from "./reconciliation-types";

interface ReconciliationPageClientProps {
  companyId: string;
}

export function ReconciliationPageClient({ companyId }: ReconciliationPageClientProps) {
  // State for selected site
  const [selectedSiteId, setSelectedSiteId] = useState(
    MOCK_RECONCILIATION_DATA.sites[0]?.id || ""
  );

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(MOCK_RECONCILIATION_DATA.categories.map((c) => c.id))
  );

  // State for categories data (editable)
  const [categories, setCategories] = useState<ReconciliationCategory[]>(
    MOCK_RECONCILIATION_DATA.categories
  );

  // State for active category in navigation
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Get selected site
  const selectedSite = useMemo(
    () => MOCK_RECONCILIATION_DATA.sites.find((s) => s.id === selectedSiteId),
    [selectedSiteId]
  );

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => calculateKPIMetrics(categories), [categories]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(categories.map((c) => c.id)));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Handle document field update
  const handleFieldUpdate = (
    categoryId: string,
    documentId: string,
    fieldId: string,
    value: string | null
  ) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          documents: category.documents.map((doc) => {
            if (doc.id !== documentId) return doc;
            return {
              ...doc,
              fields: {
                ...doc.fields,
                [fieldId]: value,
              },
            };
          }),
        };
      })
    );
  };

  // Handle status update
  const handleStatusUpdate = (
    categoryId: string,
    documentId: string,
    statusType: "presentOnSite" | "presentInTMF",
    value: ReconciliationStatus
  ) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          documents: category.documents.map((doc) => {
            if (doc.id !== documentId) return doc;
            return {
              ...doc,
              [statusType]: value,
            };
          }),
        };
      })
    );
  };

  // Handle collected date update
  const handleCollectedDateUpdate = (
    categoryId: string,
    documentId: string,
    value: string | null
  ) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          documents: category.documents.map((doc) => {
            if (doc.id !== documentId) return doc;
            return {
              ...doc,
              collectedDate: value,
            };
          }),
        };
      })
    );
  };

  // Handle add document
  const handleAddDocument = (categoryId: string, newDocument: ReconciliationDocument) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          documents: [...category.documents, newDocument],
        };
      })
    );
  };

  // Handle delete document
  const handleDeleteDocument = (categoryId: string, documentId: string) => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          documents: category.documents.filter((doc) => doc.id !== documentId),
        };
      })
    );
  };

  // Navigate to category
  const navigateToCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    // Ensure category is expanded
    setExpandedCategories((prev) => new Set(prev).add(categoryId));
    // Scroll to category
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with site selector */}
      <ReconciliationHeader
        studyName={MOCK_RECONCILIATION_DATA.studyName}
        sites={MOCK_RECONCILIATION_DATA.sites}
        selectedSiteId={selectedSiteId}
        onSiteChange={setSelectedSiteId}
        lastUpdated={selectedSite?.lastUpdated || ""}
      />

      {/* KPI Summary Bar */}
      <ReconciliationKPIBar metrics={kpiMetrics} />

      {/* Main content with sidebar */}
      <div className="flex gap-4">
        {/* Category Navigation Sidebar */}
        <div className="w-64 flex-shrink-0">
          <ReconciliationCategoryNav
            categories={categories}
            activeCategoryId={activeCategoryId}
            onNavigate={navigateToCategory}
            expandedCategories={expandedCategories}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
          />
        </div>

        {/* Document Categories */}
        <div className="flex-1 space-y-4 overflow-x-auto">
          {categories.map((category) => (
            <ReconciliationCategorySection
              key={category.id}
              category={category}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              onFieldUpdate={handleFieldUpdate}
              onStatusUpdate={handleStatusUpdate}
              onCollectedDateUpdate={handleCollectedDateUpdate}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
