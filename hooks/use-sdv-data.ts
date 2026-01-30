"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getSDVSiteDetails,
  getSDVSubjectDetails,
  getSDVVisitDetails,
  getSDVCRFDetails,
  getSDVAggregations,
  getSDVFilterOptions,
  SDVFilters,
} from "@/lib/actions/sdv-tracker-data";

// Query keys factory
export const sdvQueryKeys = {
  all: (uploadId: string) => ["sdv", uploadId] as const,
  aggregations: (uploadId: string, filters: SDVFilters) =>
    ["sdv", uploadId, "aggregations", filters] as const,
  filterOptions: (uploadId: string) =>
    ["sdv", uploadId, "filterOptions"] as const,
  siteDetails: (uploadId: string, siteNumber: string, filters: SDVFilters) =>
    ["sdv", uploadId, "site", siteNumber, filters] as const,
  subjectDetails: (
    uploadId: string,
    siteNumber: string,
    subjectId: string,
    filters: SDVFilters
  ) =>
    [
      "sdv",
      uploadId,
      "subject",
      siteNumber,
      subjectId,
      filters,
    ] as const,
  visitDetails: (
    uploadId: string,
    siteNumber: string,
    subjectId: string,
    visitType: string,
    filters: SDVFilters
  ) =>
    [
      "sdv",
      uploadId,
      "visit",
      siteNumber,
      subjectId,
      visitType,
      filters,
    ] as const,
  crfDetails: (
    uploadId: string,
    siteNumber: string,
    subjectId: string,
    visitType: string,
    crfName: string,
    filters: SDVFilters
  ) =>
    [
      "sdv",
      uploadId,
      "crf",
      siteNumber,
      subjectId,
      visitType,
      crfName,
      filters,
    ] as const,
};

// Hook for aggregations with prefetching support
export function useSDVAggregations(uploadId: string | null, filters: SDVFilters) {
  return useQuery({
    queryKey: uploadId ? sdvQueryKeys.aggregations(uploadId, filters) : [],
    queryFn: async () => {
      if (!uploadId) throw new Error("No upload ID");
      const result = await getSDVAggregations(uploadId, filters);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch aggregations");
      }
      return result.data;
    },
    enabled: !!uploadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for filter options
export function useSDVFilterOptions(uploadId: string | null) {
  return useQuery({
    queryKey: uploadId ? sdvQueryKeys.filterOptions(uploadId) : [],
    queryFn: async () => {
      if (!uploadId) throw new Error("No upload ID");
      const result = await getSDVFilterOptions(uploadId);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch filter options");
      }
      return result.data;
    },
    enabled: !!uploadId,
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
  });
}

// Hook for site details with prefetching
export function useSDVSiteDetails(
  uploadId: string | null,
  siteNumber: string | null,
  filters: SDVFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      uploadId && siteNumber
        ? sdvQueryKeys.siteDetails(uploadId, siteNumber, filters)
        : [],
    queryFn: async () => {
      if (!uploadId || !siteNumber) throw new Error("Missing parameters");
      const result = await getSDVSiteDetails(uploadId, siteNumber, filters);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch site details");
      }
      return result.data;
    },
    enabled: !!uploadId && !!siteNumber && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for subject details with prefetching
export function useSDVSubjectDetails(
  uploadId: string | null,
  siteNumber: string | null,
  subjectId: string | null,
  filters: SDVFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      uploadId && siteNumber && subjectId
        ? sdvQueryKeys.subjectDetails(uploadId, siteNumber, subjectId, filters)
        : [],
    queryFn: async () => {
      if (!uploadId || !siteNumber || !subjectId)
        throw new Error("Missing parameters");
      const result = await getSDVSubjectDetails(
        uploadId,
        siteNumber,
        subjectId,
        filters
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch subject details");
      }
      return result.data;
    },
    enabled: !!uploadId && !!siteNumber && !!subjectId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for visit details with prefetching
export function useSDVVisitDetails(
  uploadId: string | null,
  siteNumber: string | null,
  subjectId: string | null,
  visitType: string | null,
  filters: SDVFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      uploadId && siteNumber && subjectId && visitType
        ? sdvQueryKeys.visitDetails(
            uploadId,
            siteNumber,
            subjectId,
            visitType,
            filters
          )
        : [],
    queryFn: async () => {
      if (!uploadId || !siteNumber || !subjectId || !visitType)
        throw new Error("Missing parameters");
      const result = await getSDVVisitDetails(
        uploadId,
        siteNumber,
        subjectId,
        visitType,
        filters
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch visit details");
      }
      return result.data;
    },
    enabled:
      !!uploadId && !!siteNumber && !!subjectId && !!visitType && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for CRF details with prefetching
export function useSDVCRFDetails(
  uploadId: string | null,
  siteNumber: string | null,
  subjectId: string | null,
  visitType: string | null,
  crfName: string | null,
  filters: SDVFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      uploadId && siteNumber && subjectId && visitType && crfName
        ? sdvQueryKeys.crfDetails(
            uploadId,
            siteNumber,
            subjectId,
            visitType,
            crfName,
            filters
          )
        : [],
    queryFn: async () => {
      if (!uploadId || !siteNumber || !subjectId || !visitType || !crfName)
        throw new Error("Missing parameters");
      const result = await getSDVCRFDetails(
        uploadId,
        siteNumber,
        subjectId,
        visitType,
        crfName
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch CRF details");
      }
      return result.data;
    },
    enabled:
      !!uploadId &&
      !!siteNumber &&
      !!subjectId &&
      !!visitType &&
      !!crfName &&
      enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Prefetching utility hook
export function useSDVPrefetch() {
  const queryClient = useQueryClient();

  const prefetchSiteDetails = useCallback(
    async (uploadId: string, siteNumber: string, filters: SDVFilters) => {
      await queryClient.prefetchQuery({
        queryKey: sdvQueryKeys.siteDetails(uploadId, siteNumber, filters),
        queryFn: async () => {
          const result = await getSDVSiteDetails(uploadId, siteNumber, filters);
          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to prefetch site details");
          }
          return result.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchSubjectDetails = useCallback(
    async (
      uploadId: string,
      siteNumber: string,
      subjectId: string,
      filters: SDVFilters
    ) => {
      await queryClient.prefetchQuery({
        queryKey: sdvQueryKeys.subjectDetails(
          uploadId,
          siteNumber,
          subjectId,
          filters
        ),
        queryFn: async () => {
          const result = await getSDVSubjectDetails(
            uploadId,
            siteNumber,
            subjectId,
            filters
          );
          if (!result.success || !result.data) {
            throw new Error(
              result.error || "Failed to prefetch subject details"
            );
          }
          return result.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchVisitDetails = useCallback(
    async (
      uploadId: string,
      siteNumber: string,
      subjectId: string,
      visitType: string,
      filters: SDVFilters
    ) => {
      await queryClient.prefetchQuery({
        queryKey: sdvQueryKeys.visitDetails(
          uploadId,
          siteNumber,
          subjectId,
          visitType,
          filters
        ),
        queryFn: async () => {
          const result = await getSDVVisitDetails(
            uploadId,
            siteNumber,
            subjectId,
            visitType,
            filters
          );
          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to prefetch visit details");
          }
          return result.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchCRFDetails = useCallback(
    async (
      uploadId: string,
      siteNumber: string,
      subjectId: string,
      visitType: string,
      crfName: string,
      filters: SDVFilters
    ) => {
      await queryClient.prefetchQuery({
        queryKey: sdvQueryKeys.crfDetails(
          uploadId,
          siteNumber,
          subjectId,
          visitType,
          crfName,
          filters
        ),
        queryFn: async () => {
          const result = await getSDVCRFDetails(
            uploadId,
            siteNumber,
            subjectId,
            visitType,
            crfName
          );
          if (!result.success || !result.data) {
            throw new Error(result.error || "Failed to prefetch CRF details");
          }
          return result.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    prefetchSiteDetails,
    prefetchSubjectDetails,
    prefetchVisitDetails,
    prefetchCRFDetails,
  };
}
