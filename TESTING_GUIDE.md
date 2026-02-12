# Testing Guide - Clinical Trial Subject & Visit Management

## Current Status
✅ Database migration applied successfully  
✅ Server actions ready  
✅ Core UI pages created  
⚠️ Dev server already running on port 3000 or 3001

## Testing Checklist

### Pre-Testing Setup
1. Your Next.js dev server should already be running
2. Navigate to: http://localhost:3000 (or 3001 if port 3000 is in use)
3. Make sure you're logged in to your application

---

## Test 1: Visit Templates Page ✅

### Navigate to Visit Templates
**URL:** http://localhost:3000/protected/visit-templates

### What You Should See:
- ✅ Page with #E9E9E9 gray background
- ✅ White card with "Visit Templates" title
- ✅ Filter controls:
  - Search box
  - Protocol dropdown
  - Status dropdown
  - "New Template" button
- ✅ Templates list section (may be empty if no templates exist yet)

### Test Creating a Template:
1. Click "New Template" button
2. Dialog should open with form fields:
   - Protocol (dropdown with existing protocols)
   - Version Number (default: "1.0")
   - Template Name
   - Description
   - Comments
3. **Try This:**
   - Select a protocol from the dropdown
   - Enter name: "Standard Visit Schedule"
   - Enter version: "1.0"
   - Add a description
   - Click "Create Template"
4. **Expected Result:** 
   - Success toast appears
   - Dialog closes
   - New template appears in the list

### What to Check:
- ✅ All text is 12px (text-xs)
- ✅ Input fields are height 32px (h-8)
- ✅ Labels are human-readable
- ✅ Poppins font is used
- ✅ Background is #E9E9E9

---

## Test 2: Subjects Page ✅

### Navigate to Subjects
**URL:** http://localhost:3000/protected/subjects

### What You Should See:
- ✅ Page with #E9E9E9 gray background
- ✅ White card with "Subjects" title
- ✅ Filter controls:
  - Search box
  - Site dropdown
  - Status dropdown
  - "New Subject" button
- ✅ Subjects list section

### Current Limitations:
⚠️ "New Subject" button is not wired up yet (dialog pending)
⚠️ Subject detail view not yet implemented

### What to Check:
- ✅ Filters work (site, status dropdowns)
- ✅ Search box appears
- ✅ List shows subjects if any exist from seed data
- ✅ Status badges are color-coded:
  - Green/Blue: Enrolled
  - Gray: Screening
  - Outline: Completed
  - Red: Terminated, Screen Failure, Withdrawn

---

## Test 3: Navigation Integration ✅

### Check Module Navbar
Look at the top navigation bar.

### What You Should See:
- ✅ "Dashboard" link
- ✅ "Clinical Trials" link
- ✅ **"Visit Templates" link** (NEW)
- ✅ **"Subjects" link** (NEW)
- ✅ "Contacts & Organizations" link
- ✅ (other existing links)

### Test Navigation:
1. Click "Visit Templates" - should go to /protected/visit-templates
2. Click "Subjects" - should go to /protected/subjects
3. Click "Clinical Trials" - should go back to clinical trials
4. Active link should be highlighted

---

## Test 4: Check for Errors

### Open Browser Console (F12)
Look for any errors in the console.

### Common Issues to Check:
- ✅ No TypeScript errors
- ✅ No server action errors
- ✅ No missing import errors
- ✅ No Supabase RLS policy errors

### If You See Errors:
Take a screenshot and share them - they'll help identify what needs fixing.

---

## Test 5: Server Actions (Backend Testing)

Even though the full UI isn't complete, we can test the backend is working:

### Test Template Creation via Form:
1. Go to Visit Templates page
2. Click "New Template"
3. Fill out the form and submit
4. Check if template appears in the list

**Expected Behavior:**
- ✅ Template is created in database
- ✅ Success toast notification
- ✅ Template appears in list with "In Progress" status

### Test Template Actions:
If a template appears in the list, click the three-dot menu (⋮).

**You Should See Options:**
- ✅ View Details (will 404 - detail page not built yet)
- ✅ Approve Template (if status is "In Progress")
- ✅ Activate Template (if status is "Approved" and not active)
- ✅ Copy to New Version
- ✅ Delete (if not approved)

**Try Approving a Template:**
1. Create a template
2. Click the three-dot menu
3. Select "Approve Template"
4. Badge should change to "Approved"
5. Status filter should now show it when you select "Approved"

---

## Test 6: Data Verification

### Check Supabase Database:
You can verify the data was created by checking your Supabase dashboard.

**Tables to Check:**
1. `subject_visit_templates` - Should have your created template
2. `template_visits` - Will be empty (visit editor not built yet)
3. `subjects` - Should have subjects from seed data
4. `subject_status_history` - Should have status records

---

## Known Limitations (Expected)

The following features are **NOT YET IMPLEMENTED** (this is expected):

### Visit Templates:
- ❌ Template detail page (clicking "View Details" will 404)
- ❌ Visit editor (can't add visits to template yet)
- ❌ Activity editor (can't add activities yet)
- ❌ Template approval dialog (uses simple action now)

### Subjects:
- ❌ Subject creation dialog (button not wired up)
- ❌ Subject detail page (can't click on subjects yet)
- ❌ Visit schedule view
- ❌ Status history display
- ❌ All workflow dialogs (schedule, randomize, etc.)

### This is NORMAL - these are the 21 components that remain to be built.

---

## Success Criteria

### You've successfully tested if:

1. ✅ Both pages load without errors
2. ✅ Navigation works between pages
3. ✅ Styling is correct (#E9E9E9 background, Poppins font, text-xs)
4. ✅ Template creation form works
5. ✅ Templates appear in the list after creation
6. ✅ Filters work on both pages
7. ✅ Template actions work (approve, delete)
8. ✅ No console errors

---

## What to Report Back

Please let me know:

1. **Did the pages load?** (Yes/No)
2. **Can you create a template?** (Yes/No)
3. **Does the template appear in the list?** (Yes/No)
4. **Any errors in the console?** (Share screenshot if yes)
5. **Does the styling look correct?** (Gray background, small text)

### Screenshots Requested:
1. Visit Templates page (full screen)
2. Subjects page (full screen)
3. Template creation dialog (if it opens)
4. Browser console (F12 → Console tab)

---

## Next Steps After Testing

Once we verify the core functionality works:

**Option A:** Build the remaining 21 UI components
**Option B:** Focus on a specific workflow (e.g., just template editing)
**Option C:** Create SQL seed data to populate test subjects/visits

Let me know what you find, and we'll proceed accordingly!
