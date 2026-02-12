# Phase 5: Testing Guide

## Testing Overview
This guide provides comprehensive testing procedures for the Clinical Trial Management System.

---

## 🧪 End-to-End Testing Workflows

### **Test 1: Create Trial Hierarchy**

**Objective:** Verify complete trial setup from program to sites

**Steps:**
1. Navigate to `/protected/clinical-trials`
2. Click "Programs" tab → "Add Program"
   - Enter name: "Oncology Program"
   - Enter mechanism: "Anti-PD1"
   - Select status: "In Progress"
   - Click "Create"
   - ✅ Verify: Program appears in table
3. Click "Protocols" tab → "Add Protocol"
   - Enter protocol number: "ONCO-001"
   - Enter title: "Phase III Anti-PD1 Study"
   - Link to program created above
   - Select phase: "Phase III"
   - Enable "Regions Required"
   - Click "Create"
   - ✅ Verify: Protocol appears in table
4. Click "Regions" tab → "Add Region"
   - Select protocol: "ONCO-001"
   - Enter region name: "North America"
   - Enter planned sites: 10
   - Click "Create"
   - ✅ Verify: Region appears in table
5. Click "Sites" tab → "Add Site"
   - Select protocol: "ONCO-001"
   - Select region: "North America"
   - Select organization from dropdown
   - Select PI from contacts dropdown
   - Enter site number: "001"
   - Select status: "Initiated"
   - Click "Create"
   - ✅ Verify: Site appears in table with org/PI info

**Expected Results:**
- All entities created successfully
- Relationships displayed correctly
- Dashboard stats updated

---

### **Test 2: Team Management with Rolldown**

**Objective:** Verify team rollup/rolldown cascading

**Steps:**
1. Go to Protocol detail page (needs implementation)
2. Click "Teams" tab → "Assign Team Member"
   - Select user from dropdown
   - Select role: "Study Manager"
   - Check "Primary Role"
   - Check "Rolldown to child entities"
   - Enter start date
   - Click "Assign"
   - ✅ Verify: Team member appears in protocol teams table
3. Go to Region detail page
   - Click "Teams" tab
   - ✅ Verify: Study Manager appears (rolled down from protocol)
4. Go to Site detail page
   - Click "Teams" tab
   - ✅ Verify: Study Manager appears (rolled down from protocol)
5. Click "History" tab
   - ✅ Verify: All assignments logged with timestamps

**Expected Results:**
- Team member assigned at protocol level
- Automatically appears at region and site levels
- History records all changes

---

### **Test 3: Subject Lifecycle**

**Objective:** Test complete subject workflow

**Steps:**
1. Click "Subjects" tab → "Add Subject"
   - Select site: "001"
   - Enter screening number: "SCR-001"
   - Status: "Screening"
   - Enter screening date: Today
   - Click "Create"
   - ✅ Verify: Subject appears with "Screening" badge (blue)
2. Click Edit on subject
   - Change status to: "Enrolled"
   - Enter subject number: "SUB-001"
   - Enter enrollment date: Today
   - Click "Update"
   - ✅ Verify: Status badge changes to "Enrolled" (green)
   - ✅ Verify: Site enrolled_subject_count incremented
   - ✅ Verify: Site first_subject_enrolled_date populated
3. Create another subject with status "Screen Failure"
   - Enter screen failure reason
   - Click "Create"
   - ✅ Verify: Status badge is red
   - ✅ Verify: Site screen_failure_count incremented

**Expected Results:**
- Subject status changes work
- Site milestones auto-update
- Status badges display correctly

---

### **Test 4: Account Associations**

**Objective:** Test organization associations at multiple levels

**Steps:**
1. Go to Protocol detail page → "Accounts" tab
   - Click "Associate Account"
   - Select organization (type: IRB)
   - Select account type: "Central IRB"
   - Check "Central Account"
   - Click "Associate"
   - ✅ Verify: IRB appears in accounts table
2. Go to Site detail page → "Accounts" tab
   - Click "Associate Account"
   - Select organization (type: Laboratory)
   - Select account type: "Laboratory"
   - Click "Associate"
   - ✅ Verify: Lab appears in accounts table

**Expected Results:**
- Accounts associated correctly
- Central/Regional flags display
- Organizations show with type info

---

### **Test 5: Visit Templates**

**Objective:** Test visit template creation

**Steps:**
1. Create visit template (needs UI integration)
   - Select protocol
   - Enter version: "1.0"
   - Enter name: "Standard Schedule"
   - Mark as "Active"
   - Click "Create"
   - ✅ Verify: Template created
2. Add visits to template (needs implementation)
   - Visit 1: Screening (Day -7)
   - Visit 2: Baseline (Day 0)
   - Visit 3: Week 4 (Day 28)
3. Add activities to visits (needs implementation)
   - Screening: Informed Consent, Medical History
   - Baseline: Lab Work, Vital Signs

**Expected Results:**
- Template created successfully
- Visits display in sequence
- Activities linked to visits

---

## 🔍 Edge Case Testing

### **Edge Case 1: Cascade Deletes**
**Test:** Delete protocol with sites
- ✅ Expected: Sites should remain (foreign key ON DELETE CASCADE on protocol)
- ⚠️ Action: Verify cascade behavior or add validation

### **Edge Case 2: Duplicate Prevention**
**Test:** Create protocol with existing protocol_number
- ✅ Expected: Error message "Protocol number already exists"
- Verify: Error displays correctly in UI

### **Edge Case 3: Missing Required Relationships**
**Test:** Create site without selecting protocol
- ✅ Expected: Validation error "Protocol is required"
- Verify: Form prevents submission

### **Edge Case 4: Regions Required Toggle**
**Test:** Create site for protocol with regions_required=true without selecting region
- ✅ Expected: Validation error "Region is required for this protocol"
- Verify: Logic enforced in form

### **Edge Case 5: Team Assignment with No Children**
**Test:** Assign team member with rolldown when no children exist
- ✅ Expected: Only assigns to parent, no errors
- Verify: Graceful handling

---

## 🔒 Security Testing

### **Test: Row Level Security (RLS)**

**Objective:** Verify multi-tenant data isolation

**Steps:**
1. Create test data for Company A
2. Create test data for Company B
3. Log in as Company A user
   - ✅ Verify: Can see Company A data only
   - ✅ Verify: Cannot see Company B data
4. Try direct API calls to access Company B data
   - ✅ Verify: RLS blocks access
5. Test all entity types (programs, protocols, regions, sites, subjects)

**Expected Results:**
- Complete data isolation between companies
- No cross-company data leakage
- RLS enforced on all tables

---

## ⚡ Performance Testing

### **Test: Large Dataset Performance**

**Scenarios:**
1. **100+ Programs**
   - ✅ Pagination works
   - ✅ Search responsive
   - ✅ Page load < 2 seconds

2. **1000+ Subjects**
   - ✅ Table renders quickly
   - ✅ Filtering works
   - ✅ No performance degradation

3. **Concurrent Operations**
   - Multiple users creating subjects
   - ✅ Site milestones update correctly
   - ✅ No race conditions

---

## 🎨 UI/UX Testing

### **Validation Testing**
- [ ] All required fields marked with asterisks
- [ ] Error messages display below fields
- [ ] Toast notifications for success/error
- [ ] Loading states during async operations
- [ ] Disabled state for buttons during submission

### **Accessibility Testing**
- [ ] All forms keyboard navigable
- [ ] Tab order logical
- [ ] Error messages screen-reader friendly
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

### **Responsive Testing**
- [ ] Test on desktop (1920×1080)
- [ ] Test on tablet (768×1024)
- [ ] Test on mobile (375×667)
- [ ] Tables scroll horizontally if needed
- [ ] Dialogs fit on small screens

---

## 🐛 Known Issues & Limitations

### **To Address:**
1. **Subjects Tab Integration**
   - Status: Needs to be added to main page
   - Action: Integrate SubjectsTab into clinical-trials-page-client.tsx

2. **Detail Pages**
   - Status: Not yet implemented
   - Action: Create detail pages for protocols, regions, sites

3. **Chart Components**
   - Status: Database ready, UI not implemented
   - Action: Implement Recharts components

4. **Risk Assessment UI**
   - Status: Database ready, UI not implemented
   - Action: Build assessment execution forms

---

## 📋 Testing Checklist

### **Phase 1 Testing**
- [ ] Create/Edit/Delete Programs
- [ ] Create/Edit/Delete Protocols
- [ ] Create/Edit/Delete Regions
- [ ] Create/Edit/Delete Sites
- [ ] Verify program-protocol linking
- [ ] Verify protocol-region linking
- [ ] Verify site-organization linking
- [ ] Verify site-PI linking
- [ ] Test regions_required toggle

### **Phase 2 Testing**
- [ ] Assign team member with rolldown
- [ ] Assign team member with rollup
- [ ] View team assignment history
- [ ] Associate account (IRB, CRO, Lab)
- [ ] Create protocol version
- [ ] Verify duplicate version prevention

### **Phase 3 Testing**
- [ ] Screen subject
- [ ] Enroll subject
- [ ] Complete subject
- [ ] Terminate subject with reason
- [ ] Screen failure with reason
- [ ] Verify site milestones auto-update
- [ ] Create visit template
- [ ] Verify duplicate subject number prevention

### **Phase 4 Testing**
- [ ] Create risk assessment template
- [ ] Add questions with weights
- [ ] Add question values with scores
- [ ] Execute assessment
- [ ] Verify score calculation
- [ ] Verify risk level assignment

---

## 📊 Test Status

**Total Tests Defined:** 50+  
**Critical Path Tests:** 20+  
**Edge Case Tests:** 10+  
**Security Tests:** 5+  
**Performance Tests:** 5+

---

## Next Steps

1. Run manual tests in browser
2. Fix any discovered bugs
3. Complete integration (subjects tab, detail pages)
4. Create user documentation
5. Create developer documentation

---

**Status:** Testing phase in progress. System is functional and ready for validation.
