# Clinical Trial Subject & Visit Setup - Implementation Status

## Summary

This document tracks the implementation status of the Oracle CTMS-compliant subject and visit management system.

## ✅ Completed Tasks

### 1. Database Migration Extensions (COMPLETED)
**File:** `supabase/migrations/20260207190000_create_clinical_trials_phase3_subjects.sql`

**Changes Made:**
- ✅ Extended subject_status enum with: rescreened, randomized, withdrawn, early_terminated
- ✅ Added template_status enum: in_progress, approved, obsolete
- ✅ Added time_unit enum: days, weeks, months
- ✅ Extended visit_type enum with: rescreening, enrollment, end_of_study
- ✅ Extended subjects table with Oracle CTMS fields:
  - enrollment_id, encounter_date
  - randomization_id, randomization_date
  - screen_failure_date, withdrawn_date/reason
  - early_terminated_date/reason, rescreening_date
  - informed_consent_versions (JSONB array)
  - use_last_completed_visit_for_reschedule flag
- ✅ Extended subject_visit_templates table:
  - status (template_status enum)
  - approval_date, start_date, end_date
  - change_summary, comments
- ✅ Extended template_visits table:
  - is_planned, is_status_tracking_visit flags
  - lead_time_value/unit
  - window_unit
  - crf_pages_count, payment_flag
  - visit_status for status tracking
- ✅ Extended template_activities table:
  - sequence, duration_value/unit
  - payment_flag, payment_amount
- ✅ Extended subject_visits table:
  - planned_date, due_date
  - window_start_date, window_end_date
  - is_planned flag
  - override_status
  - crf_pages_submitted
- ✅ Created subject_status_history table (MVG)
- ✅ Created subject_transfer_history table
- ✅ Added database functions:
  - generate_screening_number()
  - calculate_date_offset()
  - schedule_subject_visits()
  - update_subject_status_from_visit()

### 2. TypeScript Types (COMPLETED)
**File:** `lib/types/clinical-trials.ts`

**Added:**
- ✅ All Phase 3 enums and labels
- ✅ Core entity interfaces (Subject, SubjectVisitTemplate, TemplateVisit, TemplateActivity, etc.)
- ✅ Extended interfaces with relations
- ✅ Form data types for all entities
- ✅ Filter types for all queries
- ✅ Special types: InformedConsentVersion, StatusAccrual
- ✅ All label maps for human-readable display

### 3. Server Actions (COMPLETED)
**Files Created:**

#### `lib/actions/subject-visit-templates.ts` ✅
- getVisitTemplates() - List with filtering
- getVisitTemplate() - Single with relations
- createVisitTemplate() - Create new
- updateVisitTemplate() - Update (validates approval status)
- approveVisitTemplate() - Approve & lock
- copyTemplateVersion() - Copy to new version
- deleteVisitTemplate() - Delete (validates not in use)
- activateTemplate() - Set as active for protocol

#### `lib/actions/template-visits.ts` ✅
- getTemplateVisits() - List for template
- createTemplateVisit() - Add visit to template
- updateTemplateVisit() - Update visit
- deleteTemplateVisit() - Remove visit
- planAllVisits() - Mark all as planned
- unplanAllVisits() - Mark all as unplanned

#### `lib/actions/template-activities.ts` ✅
- getTemplateActivities() - List for visit
- createTemplateActivity() - Add activity
- updateTemplateActivity() - Update activity
- deleteTemplateActivity() - Remove activity

#### `lib/actions/subject-management.ts` ✅
- getSubjects() - List with filtering
- getSubject() - Single with all relations
- createSubject() - Create with screening number generation
- updateSubject() - Update subject
- deleteSubject() - Remove subject
- scheduleSubject() - Apply template to create visits
- rescheduleSubject() - Reschedule based on last completed or fixed date
- trackInformedConsent() - Add consent version
- randomizeSubject() - Assign random ID
- screenFailure() - Mark screen failure
- withdrawSubject() - Withdraw from study
- earlyTerminate() - Early termination
- transferSubject() - Transfer to another site
- getTransferHistory() - Get transfer audit trail

#### `lib/actions/subject-visit-management.ts` ✅
- getSubjectVisits() - List with filtering
- getSubjectVisitsByType() - Group by type
- completeVisit() - Mark complete & trigger status tracking
- missVisit() - Mark missed
- overrideVisitStatus() - Override status
- createUnscheduledVisit() - Add unscheduled visit
- planVisitsByType() - Batch plan by type
- unplanVisitsByType() - Batch unplan by type
- deleteVisitsByType() - Batch delete by type

#### `lib/actions/subject-status-tracking.ts` ✅
- getStatusHistory() - Get MVG for subject
- updatePrimaryStatus() - Change primary status
- getStatusAccrualsBySite() - Rollup for site
- getStatusAccrualsByRegion() - Rollup for region
- getStatusAccrualsByProtocol() - Rollup for protocol

### 4. Navigation Integration (COMPLETED)
**File:** `components/layout/module-navbar.tsx`

**Changes:**
- ✅ Added "Visit Templates" link to /protected/visit-templates
- ✅ Added "Subjects" link to /protected/subjects
- ✅ Positioned after "Clinical Trials" in navigation

## 🚧 Remaining Tasks

### 5. Visit Templates Page (PENDING)
**Files Needed:**
- `app/protected/visit-templates/page.tsx` - Server component
- `components/visit-templates/visit-templates-page-client.tsx` - Main client
- `components/visit-templates/template-list.tsx` - Table of templates
- `components/visit-templates/template-form-dialog.tsx` - Create/edit dialog
- `components/visit-templates/visits-editor.tsx` - Manage visits
- `components/visit-templates/activities-editor.tsx` - Manage activities
- `components/visit-templates/template-approval-dialog.tsx` - Approval workflow

**Features:**
- Filter by protocol, status
- Create template with version number
- Add/edit/delete visits with sequence, type, windows
- Mark visits as status tracking
- Add/edit/delete activities with payment info
- Approve template (makes read-only)
- Copy to new version
- Activate template for protocol

### 6. Subjects Page (PENDING)
**Files Needed:**
- `app/protected/subjects/page.tsx` - Server component
- `components/subjects/subjects-page-client.tsx` - Main client
- `components/subjects/subject-list-tab.tsx` - Subjects table
- `components/subjects/subject-form-dialog.tsx` - Create subject
- `components/subjects/subject-detail-page.tsx` - Detail view
- `components/subjects/visit-schedule-view.tsx` - Visit list/calendar
- `components/subjects/status-history-table.tsx` - Status MVG display

**Features:**
- Filter by site, protocol, status
- Create subject with auto-generated screening number
- View subject details with visits and status history
- Display informed consent versions

### 7. Subject Workflow Dialogs (PENDING)
**Files Needed:**
- `components/subjects/schedule-dialog.tsx` - Schedule visits from template
- `components/subjects/reschedule-dialog.tsx` - Reschedule options
- `components/subjects/informed-consent-dialog.tsx` - Track consent
- `components/subjects/randomization-dialog.tsx` - Randomize subject
- `components/subjects/screen-failure-dialog.tsx` - Mark screen failure
- `components/subjects/withdraw-dialog.tsx` - Withdraw subject
- `components/subjects/early-terminate-dialog.tsx` - Early termination
- `components/subjects/transfer-dialog.tsx` - Transfer to site

**Features:**
- Schedule: Select date, preview visits to be created
- Reschedule: Choose fixed date or last completed visit method
- Informed Consent: Select template version, enter date
- Randomization: Enter random ID and date
- Screen Failure: Select reason, enter date
- Withdraw: Enter reason and date
- Early Terminate: Select reason, enter date
- Transfer: Select destination site, enter reason

### 8. Visit Management Components (PENDING)
**Files Needed:**
- `components/subjects/visit-completion-dialog.tsx` - Complete visit
- `components/subjects/visit-override-dialog.tsx` - Override status
- `components/subjects/unscheduled-visit-dialog.tsx` - Add unscheduled
- `components/subjects/visit-types-tab.tsx` - Batch operations by type

**Features:**
- Complete Visit: Enter actual date, notes, trigger status tracking
- Override: Change to completed or missed
- Unscheduled: Add new visit outside template
- Visit Types: Plan/unplan/delete all visits of a type

### 9. Charts (PENDING)
**Files Needed:**
- `components/subjects/enrollment-rate-chart.tsx` - Enrollment over time
- `components/subjects/status-accrual-chart.tsx` - Status breakdown

**Features:**
- Use Recharts with complementary color palette
- Colors: #4F46E5 (Indigo), #7C3AED (Violet), #EC4899 (Pink), #F59E0B (Amber), #10B981 (Emerald)
- Interactive filtering
- Responsive design

### 10. Styling Application (PENDING)
**Apply to all new components:**
- Background: #E9E9E9 for page backgrounds
- Font: Poppins (already configured globally)
- Text size: text-xs (12px) as base
- Labels: Human-readable display labels from type maps
- Cards: bg-white with proper spacing
- Inputs: h-8 height, text-xs size
- Badges: text-xs with status colors

### 11. Testing (PENDING)
**End-to-End Workflow:**
1. Create visit template with 5 visits
2. Add activities to each visit
3. Approve template
4. Create subject at site
5. Schedule subject (verify visits created)
6. Complete screening visit (verify status → Screened)
7. Complete enrollment visit (verify status → Enrolled)
8. Reschedule using last completed visit
9. Create unscheduled visit
10. Test screen failure workflow
11. Test subject transfer
12. View status history

## Implementation Notes

### Key Features Implemented

1. **Template Versioning:** Full version control with approval workflow
2. **Status Tracking:** Automatic status updates from visit completion
3. **Subject Scheduling:** Database function copies template to create visit plan
4. **Rescheduling:** Two modes - fixed date or based on last completed visit
5. **Status History (MVG):** Complete audit trail with primary status tracking
6. **Subject Transfer:** Full transfer workflow with history tracking
7. **Informed Consent:** Multi-version tracking per subject
8. **Randomization:** Separate from enrollment per Oracle CTMS
9. **Early Termination:** Screen failure, withdrawal, early termination with reason tracking
10. **Batch Operations:** Plan/unplan/delete visits by type

### Database Design

The implementation follows Oracle CTMS patterns:
- Templates are protocol-level, versions with approval
- Status tracking visits trigger automatic MVG updates
- Visit windows calculated from lead time + baseline
- Subject screening number auto-generated from site + ID + date
- Transfer history maintains audit trail
- Status accruals roll up from subject → site → region → protocol

### API Design

All server actions follow consistent patterns:
- `ActionResponse<T>` return type
- Company-level RLS enforcement
- Validation before mutations
- Path revalidation after changes
- Detailed error logging

## Next Steps

To complete the implementation:

1. **Create UI Components** - Build the 25+ React components for pages and dialogs
2. **Apply Styling** - Ensure all components use #E9E9E9 background, Poppins font, text-xs
3. **Test Workflows** - Run through complete subject lifecycle
4. **Deploy Migration** - Run `supabase db push` to apply schema changes
5. **Seed Data** - Create sample templates and subjects for testing

## Files Modified/Created

### Modified:
- `supabase/migrations/20260207190000_create_clinical_trials_phase3_subjects.sql`
- `lib/types/clinical-trials.ts`
- `components/layout/module-navbar.tsx`

### Created:
- `lib/actions/subject-visit-templates.ts`
- `lib/actions/template-visits.ts`
- `lib/actions/template-activities.ts`
- `lib/actions/subject-management.ts`
- `lib/actions/subject-visit-management.ts`
- `lib/actions/subject-status-tracking.ts`

### To Be Created: (25+ files)
- All component files listed in sections 5-9 above

## Conclusion

The backend infrastructure is **100% complete**:
- ✅ Database schema extended
- ✅ All TypeScript types defined
- ✅ All server actions implemented
- ✅ Navigation integrated

The frontend UI components remain to be built (sections 5-9). This represents approximately 40-50% of the total implementation work. The foundation is solid and follows all Oracle CTMS patterns from the documentation.
