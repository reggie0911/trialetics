// Supabase Edge Function: process-csv-upload
// Processes CSV files uploaded to Supabase Storage for SDV Tracker
// Uses Supabase client with optimized batch inserts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  jobId: string;
  filePath: string;
  fileType: "sdv_site_data_entry" | "sdv_data";
  companyId: string;
  profileId: string;
  primaryUploadId?: string;
}

// Generate merge key from record fields
function generateMergeKey(subjectId: string, eventName: string, formName: string, itemId: string): string {
  return `${subjectId}|${eventName}|${formName}|${itemId}`;
}

// Simple CSV line parser that handles quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// Transform Site Data Entry record for database insert
function transformSiteDataRecord(record: Record<string, string>, uploadId: string) {
  const subjectId = record["SubjectId"] || "";
  const eventName = record["EventName"] || "";
  const formName = record["FormName"] || "";
  const itemId = record["ItemId"] || "";
  
  return {
    upload_id: uploadId,
    merge_key: generateMergeKey(subjectId, eventName, formName, itemId),
    site_name: record["SiteName"] || null,
    subject_id: subjectId || null,
    event_name: eventName || null,
    form_name: formName || null,
    item_id: itemId || null,
    item_export_label: record["ItemExportLabel"] || null,
    edit_date_time: record["EditDateTime"] || null,
    edit_by: record["EditBy"] || null,
  };
}

// Transform SDV Data record for database insert
function transformSdvDataRecord(record: Record<string, string>, uploadId: string) {
  const subjectId = record["SubjectId"] || "";
  const eventName = record["EventName"] || "";
  const formName = record["FormName"] || "";
  const itemId = record["ItemId"] || "";
  
  return {
    upload_id: uploadId,
    merge_key: generateMergeKey(subjectId, eventName, formName, itemId),
    site_name: record["SiteName"] || null,
    subject_id: subjectId || null,
    event_name: eventName || null,
    form_name: formName || null,
    item_id: itemId || null,
    item_name: record["ItemName"] || null,
    sdv_by: record["SdvBy"] || null,
    sdv_date: record["SdvDate"] || null,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let jobId: string | undefined;

  try {
    console.log("[INIT] Starting Edge Function...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log(`[INIT] SUPABASE_URL: ${supabaseUrl ? "set" : "NOT SET"}`);
    console.log(`[INIT] SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "set" : "NOT SET"}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Create Supabase client with service role key (bypasses RLS)
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("[INIT] Supabase client created");

    // Parse request body
    const body: ProcessRequest = await req.json();
    jobId = body.jobId;
    const { filePath, fileType, companyId, profileId, primaryUploadId } = body;

    console.log(`[START] Processing job ${jobId}: ${fileType} from ${filePath}`);

    // Update job status to processing
    await supabase
      .from("upload_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Download CSV file from storage
    console.log(`[DOWNLOAD] Starting file download...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("csv-uploads")
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const fileSize = fileData.size;
    console.log(`[DOWNLOAD] File downloaded, size: ${fileSize} bytes`);

    // Create upload record first
    let uploadId: string;

    if (fileType === "sdv_site_data_entry") {
      const { data: uploadData, error: uploadError } = await supabase
        .from("sdv_uploads")
        .insert({
          company_id: companyId,
          uploaded_by: profileId,
          upload_type: "site_data_entry",
          file_name: filePath.split("/").pop() || "unknown.csv",
          row_count: 0,
          column_count: 8,
          filter_preferences: {},
          merge_status: "pending",
        })
        .select("id")
        .single();

      if (uploadError || !uploadData) {
        throw new Error(`Failed to create upload record: ${uploadError?.message}`);
      }
      uploadId = uploadData.id;
      console.log(`[UPLOAD] Created site data upload record: ${uploadId}`);
    } else {
      if (!primaryUploadId) {
        throw new Error("primaryUploadId required for SDV data upload");
      }

      const { data: sdvUploadData, error: sdvUploadError } = await supabase
        .from("sdv_uploads")
        .insert({
          company_id: companyId,
          uploaded_by: profileId,
          upload_type: "sdv_data",
          file_name: filePath.split("/").pop() || "unknown.csv",
          row_count: 0,
          column_count: 8,
          primary_upload_id: primaryUploadId,
          filter_preferences: {},
          merge_status: "pending",
        })
        .select("id")
        .single();

      if (sdvUploadError || !sdvUploadData) {
        throw new Error(`Failed to create SDV upload record: ${sdvUploadError?.message}`);
      }
      uploadId = sdvUploadData.id;
      console.log(`[UPLOAD] Created SDV data upload record: ${uploadId}`);

      // Update the primary upload to link to this SDV upload
      await supabase
        .from("sdv_uploads")
        .update({ sdv_upload_id: uploadId })
        .eq("id", primaryUploadId);
    }

    // Update job with upload ID
    await supabase
      .from("upload_jobs")
      .update({ upload_id: uploadId })
      .eq("id", jobId);

    // Get CSV text and split into lines
    console.log(`[PARSE] Reading CSV content...`);
    const csvText = await fileData.text();
    const lines = csvText.split("\n").filter(line => line.trim());
    
    console.log(`[PARSE] Total lines: ${lines.length}`);

    if (lines.length < 2) {
      throw new Error("CSV file must have at least 2 rows (header row + column names)");
    }

    // Row 0 is human-readable header (skip), Row 1 is column headers
    const headers = parseCsvLine(lines[1]);
    const dataLines = lines.slice(2);
    const totalRecords = dataLines.length;

    console.log(`[PARSE] Headers: ${headers.join(", ")}`);
    console.log(`[PARSE] Data rows to process: ${totalRecords}`);

    // Update job with total count
    await supabase
      .from("upload_jobs")
      .update({ 
        total_records: totalRecords,
        progress: 5,
      })
      .eq("id", jobId);

    // Determine table and transformer based on file type
    const tableName = fileType === "sdv_site_data_entry" ? "sdv_site_data_raw" : "sdv_data_raw";
    const transformer = fileType === "sdv_site_data_entry" ? transformSiteDataRecord : transformSdvDataRecord;

    console.log(`[INSERT] Starting batch inserts to ${tableName}...`);
    const startTime = Date.now();

    // Process in batches of 1000 for optimal performance
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
      const batchLines = dataLines.slice(i, i + BATCH_SIZE);
      const batchRecords: ReturnType<typeof transformSiteDataRecord>[] = [];

      // Parse and transform each line in the batch
      for (const line of batchLines) {
        try {
          const fields = parseCsvLine(line);
          
          // Convert to record object
          const record: Record<string, string> = {};
          headers.forEach((header, idx) => {
            record[header] = fields[idx] || "";
          });
          
          // Transform for database
          batchRecords.push(transformer(record, uploadId));
        } catch (parseError) {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`[PARSE] Error parsing line: ${parseError}`);
          }
        }
      }

      // Insert batch into database
      if (batchRecords.length > 0) {
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(batchRecords);

        if (insertError) {
          console.error(`[INSERT] Batch error at row ${i}: ${insertError.message}`);
          errorCount += batchRecords.length;
        } else {
          processedCount += batchRecords.length;
        }
      }

      // Update progress every batch
      const progress = Math.min(95, Math.round(5 + ((i + BATCH_SIZE) / dataLines.length) * 90));
      await supabase
        .from("upload_jobs")
        .update({ 
          progress,
          processed_records: processedCount,
        })
        .eq("id", jobId);

      // Log progress every 10 batches (10,000 rows)
      if (i > 0 && i % (BATCH_SIZE * 10) === 0) {
        const elapsed = Date.now() - startTime;
        const rowsPerSecond = Math.round(processedCount / (elapsed / 1000));
        console.log(`[INSERT] Progress: ${processedCount}/${totalRecords} rows (${rowsPerSecond} rows/sec)`);
      }
    }

    const duration = Date.now() - startTime;
    const rowsPerSecond = duration > 0 ? Math.round(processedCount / (duration / 1000)) : processedCount;
    console.log(`[INSERT] Completed in ${duration}ms (${rowsPerSecond} rows/sec)`);

    // Update upload record with final row count
    await supabase
      .from("sdv_uploads")
      .update({ row_count: processedCount })
      .eq("id", uploadId);

    // Mark job as completed
    await supabase
      .from("upload_jobs")
      .update({
        status: "completed",
        progress: 100,
        processed_records: processedCount,
        total_records: totalRecords,
        failed_records: errorCount,
        completed_at: new Date().toISOString(),
        upload_id: uploadId,
      })
      .eq("id", jobId);

    // If this was an SDV data upload, update the primary upload's merge_status to 'completed'
    // since the view automatically calculates metrics once data is linked
    if (fileType === "sdv_data" && primaryUploadId) {
      console.log(`[STATUS] Updating primary upload ${primaryUploadId} merge_status to 'completed'`);
      await supabase
        .from("sdv_uploads")
        .update({ 
          merge_status: "completed",
          merged_at: new Date().toISOString(),
        })
        .eq("id", primaryUploadId);
    }

    // Clean up: delete the CSV file from storage
    await supabase.storage.from("csv-uploads").remove([filePath]);

    console.log(`[SUCCESS] Job ${jobId} completed: ${processedCount} records in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadId, 
        processedRecords: processedCount,
        duration,
        rowsPerSecond,
        message: `Uploaded ${processedCount.toLocaleString()} records (${rowsPerSecond} rows/sec).`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ERROR] Processing CSV:", error);

    // Try to mark job as failed
    if (supabase && jobId) {
      try {
        await supabase
          .from("upload_jobs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } catch (updateError) {
        console.error("[ERROR] Failed to update job status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
