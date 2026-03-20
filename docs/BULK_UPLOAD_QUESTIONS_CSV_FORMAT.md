# Bulk Upload Questions - CSV Format

## Context

The **Bulk Upload** button lives in [template-builder-client.tsx](../components/ctms/trip-reports/template-builder-client.tsx) on the Template Builder page. It opens a dialog ("Bulk Upload Report Questions") where users upload a CSV to add multiple questions to a visit report template at once.

The flow: **Download Sample** → edit CSV → **Upload File** → `parseBulkUploadCsv()` → `bulkUploadTemplateQuestions()` → `visit_report_template_questions` table.

---

## CSV Columns (Current Implementation)

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| **Question** | Yes | The checklist question text. Rows with empty question are skipped. | `"Was the ISF reviewed for completeness?"` |
| **Report Sub Section** | No | Sub-section label used to group questions in the report. Accepts `null` if blank. | `"Documentation"`, `"SECTION A"` |
| **Report Order** | No | Integer for ordering within the report. Defaults to `0` if blank or invalid. | `1`, `2`, `10` |

### Header Matching (from [parse-bulk-upload-csv.ts](../lib/utils/parse-bulk-upload-csv.ts))

Headers are matched case-insensitively and with some flexibility:

- **Question**: `question` or any header containing `question`
- **Report Sub Section**: `report sub section`, `subsection`, or similar
- **Report Order**: `report order`, `order` (when combined with `report`), etc.

Column positions default to 0, 1, 2 if headers are not found.

---

## Sample CSV

The sample downloaded by "Download Sample" is:

```csv
Question,Report Sub Section,Report Order
"Sample question text?","SECTION A",1
```

Users can add more rows. Use double quotes around values that contain commas. Empty rows or rows with no question text are ignored.

---

## Database Mapping

| CSV Column | → | DB Field | Notes |
|------------|---|----------|-------|
| Question | → | `question_text` | Required, stored as-is |
| Report Sub Section | → | `report_sub_section` | Nullable |
| Report Order | → | `report_order` | Integer, default 0 |
| — | → | `report_section` | Not in CSV; stays `null` |
| — | → | `sort_order` | Auto-incremented from existing max |
| — | → | `template_id` | Set by the template being edited |

---

## UX Improvements

1. **In-dialog field list** – Add a small bullet list in the Bulk Upload dialog describing the columns (required vs optional) so users don't need to rely solely on the sample.
2. **Sample template** – Optionally include 2–3 example rows with different sub-sections and orders to better illustrate the format.
3. **Error feedback** – The parser returns a single error string; per-row validation or highlighting could improve debugging.

---

## Summary: Required CSV Fields

**Minimum required:** One non-empty column for the question text, with a header that includes `question` (or similar).

**Recommended columns:**

```csv
Question,Report Sub Section,Report Order
"Your question text here",Optional section label,Optional integer order
```
