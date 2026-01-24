// Supabase Edge Function: merge-sdv-data
// Merges Site Data Entry and SDV Data after both are uploaded
// Performs all calculations and writes to sdv_merged_records

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MergeRequest {
  siteDataUploadId: string; // The primary Site Data Entry upload ID
  companyId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: MergeRequest = await req.json();
    const { siteDataUploadId, companyId } = body;

    console.log(`Starting merge for upload ${siteDataUploadId}`);

    // Update merge status to processing
    await supabase
      .from("sdv_uploads")
      .update({ merge_status: "processing" })
      .eq("id", siteDataUploadId);

    // 1. Get the linked SDV upload ID
    const { data: siteUpload, error: siteUploadError } = await supabase
      .from("sdv_uploads")
      .select("id, sdv_upload_id, company_id")
      .eq("id", siteDataUploadId)
      .single();

    if (siteUploadError || !siteUpload) {
      throw new Error(`Site Data Entry upload not found: ${siteUploadError?.message}`);
    }

    const sdvUploadId = siteUpload.sdv_upload_id;

    // 2. Fetch all raw Site Data Entry records using pagination (bypass 1000 limit)
    let allSiteDataRaw: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageRecords, error: siteDataError } = await supabase
        .from("sdv_site_data_raw")
        .select("*")
        .eq("upload_id", siteDataUploadId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (siteDataError) {
        throw new Error(`Failed to fetch Site Data Entry: ${siteDataError.message}`);
      }

      if (!pageRecords || pageRecords.length === 0) {
        hasMore = false;
      } else {
        allSiteDataRaw = allSiteDataRaw.concat(pageRecords);
        if (pageRecords.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const siteDataRaw = allSiteDataRaw;
    console.log(`Fetched ${siteDataRaw?.length || 0} Site Data Entry records`);

    // 3. Fetch all raw SDV Data records using pagination (if SDV upload exists)
    let sdvDataMap = new Map<string, { sdv_by: string; sdv_date: string; item_name: string }>();
    
    if (sdvUploadId) {
      let allSdvDataRaw: any[] = [];
      page = 0;
      hasMore = true;

      while (hasMore) {
        const { data: pageRecords, error: sdvDataError } = await supabase
          .from("sdv_data_raw")
          .select("*")
          .eq("upload_id", sdvUploadId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (sdvDataError) {
          throw new Error(`Failed to fetch SDV Data: ${sdvDataError.message}`);
        }

        if (!pageRecords || pageRecords.length === 0) {
          hasMore = false;
        } else {
          allSdvDataRaw = allSdvDataRaw.concat(pageRecords);
          if (pageRecords.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      const sdvDataRaw = allSdvDataRaw;
      console.log(`Fetched ${sdvDataRaw?.length || 0} SDV Data records`);

      // Build lookup map by merge_key
      for (const record of sdvDataRaw || []) {
        sdvDataMap.set(record.merge_key, {
          sdv_by: record.sdv_by || "",
          sdv_date: record.sdv_date || "",
          item_name: record.item_name || "",
        });
      }
    }

    // 4. Fetch eCRF query records for the company using pagination (for query counts)
    let allEcrfRecords: any[] = [];
    page = 0;
    hasMore = true;

    while (hasMore) {
      const { data: pageRecords, error: ecrfError } = await supabase
        .from("ecrf_records")
        .select("merge_key, query_state")
        .eq("company_id", companyId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (ecrfError) {
        console.error(`Error fetching eCRF records: ${ecrfError.message}`);
        hasMore = false;
      } else if (!pageRecords || pageRecords.length === 0) {
        hasMore = false;
      } else {
        allEcrfRecords = allEcrfRecords.concat(pageRecords);
        if (pageRecords.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const ecrfRecords = allEcrfRecords;

    // Build query lookup maps
    const openedQueriesMap = new Map<string, number>();
    const answeredQueriesMap = new Map<string, number>();

    if (ecrfRecords && ecrfRecords.length > 0) {
      for (const record of ecrfRecords) {
        const key = record.merge_key;
        if (record.query_state === "Query Raised") {
          openedQueriesMap.set(key, (openedQueriesMap.get(key) || 0) + 1);
        } else if (record.query_state === "Query Resolved") {
          answeredQueriesMap.set(key, (answeredQueriesMap.get(key) || 0) + 1);
        }
      }
    }

    // 5. Clear existing merged records for this upload
    await supabase
      .from("sdv_merged_records")
      .delete()
      .eq("upload_id", siteDataUploadId);

    // 6. Process and merge records
    const BATCH_SIZE = 500;
    let processedCount = 0;
    const mergedRecords: any[] = [];

    for (const siteRecord of siteDataRaw || []) {
      const mergeKey = siteRecord.merge_key;
      
      // Get SDV data for this record
      const sdvData = sdvDataMap.get(mergeKey);
      
      // Calculate data_entered: 1 if EditDateTime not empty
      const dataEntered = siteRecord.edit_date_time?.trim() ? 1 : 0;
      
      // Calculate data_verified: 1 if SdvDate not empty
      const dataVerified = sdvData?.sdv_date?.trim() ? 1 : 0;
      
      // Calculate data_expected: 1 if EditDateTime is empty
      const dataExpected = siteRecord.edit_date_time?.trim() ? 0 : 1;
      
      // Calculate data_needing_review: entered but not verified
      const dataNeedingReview = dataEntered - dataVerified;
      
      // Calculate SDV%: (data_verified / data_entered) * 100
      const sdvPercent = dataEntered > 0 ? (dataVerified / dataEntered) * 100 : 0;
      
      // Get query counts
      const openedQueries = openedQueriesMap.get(mergeKey) || 0;
      const answeredQueries = answeredQueriesMap.get(mergeKey) || 0;
      
      // Calculate estimate hours and days
      const estimateHours = dataNeedingReview / 60;
      const estimateDays = estimateHours / 7;

      mergedRecords.push({
        upload_id: siteDataUploadId,
        merge_key: mergeKey,
        site_number: null, // TODO: Get from patient table if needed
        site_name: siteRecord.site_name,
        subject_id: siteRecord.subject_id,
        visit_type: siteRecord.event_name,
        crf_name: siteRecord.form_name,
        crf_field: siteRecord.item_export_label,
        data_verified: dataVerified,
        data_entered: dataEntered,
        data_expected: dataExpected,
        data_needing_review: dataNeedingReview,
        sdv_percent: Math.round(sdvPercent * 100) / 100, // Round to 2 decimals
        opened_queries: openedQueries,
        answered_queries: answeredQueries,
        estimate_hours: Math.round(estimateHours * 100) / 100,
        estimate_days: Math.round(estimateDays * 100) / 100,
        extra_fields: {
          edit_date_time: siteRecord.edit_date_time,
          edit_by: siteRecord.edit_by,
          sdv_by: sdvData?.sdv_by || null,
          sdv_date: sdvData?.sdv_date || null,
          item_name: sdvData?.item_name || null,
        },
      });

      // Batch insert when we hit the batch size
      if (mergedRecords.length >= BATCH_SIZE) {
        const { error: insertError } = await supabase
          .from("sdv_merged_records")
          .insert(mergedRecords);

        if (insertError) {
          console.error(`Batch insert error: ${insertError.message}`);
        }

        processedCount += mergedRecords.length;
        mergedRecords.length = 0; // Clear array
        
        console.log(`Processed ${processedCount} merged records...`);
      }
    }

    // Insert remaining records
    if (mergedRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("sdv_merged_records")
        .insert(mergedRecords);

      if (insertError) {
        console.error(`Final batch insert error: ${insertError.message}`);
      }

      processedCount += mergedRecords.length;
    }

    console.log(`Total merged records: ${processedCount}`);

    // 7. Update merge status to completed
    await supabase
      .from("sdv_uploads")
      .update({ 
        merge_status: "completed",
        merged_at: new Date().toISOString(),
      })
      .eq("id", siteDataUploadId);

    // Also update SDV upload status if it exists
    if (sdvUploadId) {
      await supabase
        .from("sdv_uploads")
        .update({ 
          merge_status: "completed",
          merged_at: new Date().toISOString(),
        })
        .eq("id", sdvUploadId);
    }

    console.log(`Merge completed for upload ${siteDataUploadId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        mergedRecords: processedCount,
        message: "Merge completed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error merging data:", error);

    // Try to mark merge as failed
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const body = await req.clone().json();
      if (body.siteDataUploadId) {
        await supabase
          .from("sdv_uploads")
          .update({
            merge_status: "failed",
            merge_error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", body.siteDataUploadId);
      }
    } catch (e) {
      console.error("Failed to update merge status:", e);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
