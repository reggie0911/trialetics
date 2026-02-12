# Clinical Trial Management System - User Guide

## 📚 Welcome to Your CTMS

This guide explains how to use the Clinical Trial Management System to manage your clinical trials from setup through subject completion.

---

## 🎯 Getting Started

### **Accessing the System**
Navigate to: **`/protected/clinical-trials`**

You'll see the main dashboard with tabs:
- Programs
- Protocols  
- Regions
- Sites
- Subjects (if integrated)

---

## 📋 Module Overview

### **What is a Clinical Trial Hierarchy?**

```
Clinical Program
  └── Clinical Protocol(s)
       ├── Option A: With Regions
       │   └── Clinical Region(s)
       │        └── Clinical Site(s)
       │
       └── Option B: Direct Sites
            └── Clinical Site(s)
                 └── Subject(s)
```

---

## 🏗️ Setting Up Your First Trial

### **Step 1: Create a Program**
A program is the top-level container for related protocols.

**How to create:**
1. Click "Programs" tab
2. Click "Add Program" button
3. Fill in:
   - **Name*** (required): e.g., "Oncology Program"
   - **Mechanism**: Drug mechanism of action
   - **Application ID**: Regulatory application number
   - **Status**: Planned, In Progress, On Hold, Completed, Terminated
   - **Description**: Program overview
4. Click "Create"

**Tips:**
- Use descriptive names for easy identification
- Set status to "Planned" initially, update to "In Progress" when active

---

### **Step 2: Create a Protocol**
A protocol is a specific clinical study design.

**How to create:**
1. Click "Protocols" tab
2. Click "Add Protocol" button
3. Fill in:
   - **Protocol Number*** (required): Unique identifier (e.g., "ONCO-001")
   - **Title*** (required): Full protocol name
   - **Program**: Link to parent program (optional)
   - **Phase**: Phase I, II, III, IV, or Observational
   - **Design**: Randomized, Double Blind, etc.
   - **Regions Required**: Toggle ON if using geographic regions
   - **Planned Sites/Subjects**: Target enrollment numbers
   - **Dates**: Planned and actual start/end dates
4. Click "Create"

**Important:**
- ⚠️ The "Regions Required" toggle determines site structure
- If ON: Must create regions before sites
- If OFF: Sites link directly to protocol

---

### **Step 3a: Create Regions (Optional)**
Only needed if "Regions Required" = ON

**How to create:**
1. Click "Regions" tab
2. Click "Add Region" button
3. Fill in:
   - **Protocol*** (required): Select protocol
   - **Region Name*** (required): e.g., "North America", "Europe"
   - **Planned Sites**: Target number of sites
   - **Planned Subjects**: Target enrollment
4. Click "Create"

**Tips:**
- Create all regions before adding sites
- Use standard geographic names

---

### **Step 3b: Create Sites**
Sites are where subjects are enrolled and visits occur.

**How to create:**
1. Click "Sites" tab
2. Click "Add Site" button
3. Fill in:
   - **Protocol*** (required): Select protocol
   - **Region**: Required if protocol has regions_required=true
   - **Organization**: Select from existing organizations (type: Site)
   - **Principal Investigator**: Select from existing contacts
   - **Site Number**: Unique identifier (e.g., "001")
   - **Status**: Planned, Not Initiated, Initiated, Enrolling, Closed, Terminated
   - **IRB Information**: Approval date, number, institution
   - **Planned Subject Count**: Target enrollment for this site
5. Click "Create"

**Tips:**
- Link sites to existing organizations from Contacts & Organizations module
- Assign PIs from contacts with role="principal_investigator"
- Set status to "Initiated" when site is activated

---

## 👥 Team Management

### **Assigning Team Members**
Assign study staff at protocol, region, or site levels.

**Available Roles:**
- Study Manager
- Clinical Director
- CRA (Clinical Research Associate)
- Data Manager
- Medical Monitor
- Regulatory Specialist
- Quality Assurance
- Biostatistician
- Pharmacovigilance
- Site Coordinator

**How to assign:**
1. Go to entity detail page (Protocol/Region/Site)
2. Click "Teams" tab
3. Click "Assign Team Member"
4. Select:
   - **User**: Team member from your company
   - **Role**: Position/responsibility
   - **Start Date**: When assignment begins
   - **Primary Role**: Check if this is their main responsibility
5. **Cascade Options:**
   - ✅ **Rolldown**: Assign to all child entities (Protocol → Regions → Sites)
   - ✅ **Rollup**: Assign to parent entities (Site → Region → Protocol)
6. Click "Assign"

**Example - Rolldown:**
```
Assign Study Manager at Protocol
  ↓ Rolldown enabled
Study Manager automatically assigned to:
  → All Regions under Protocol
  → All Sites under those Regions
```

---

## 🏢 Account Associations

### **Associating Organizations**
Link IRBs, CROs, laboratories, and vendors to trials.

**Account Types:**
- IRB / Central IRB
- CRO / Regional CRO
- Laboratory / Central Laboratory
- Vendor
- Pharmacy
- Imaging Center

**How to associate:**
1. Go to entity detail page (Protocol/Region/Site)
2. Click "Accounts" tab
3. Click "Associate Account"
4. Select:
   - **Organization**: From existing organizations
   - **Account Type**: Type of service provider
   - **Central/Regional**: Toggle if applicable
   - **Start/End Dates**: Contract period
5. Click "Associate"

**Tips:**
- Use "Central IRB" for multi-site IRB approval
- Use "Regional CRO" for region-specific monitoring
- Track contract dates with start/end dates

---

## 📝 Protocol Versions

### **Tracking Amendments**
Maintain version history for protocol changes.

**How to create version:**
1. Go to Protocol detail page
2. Click "Versions" tab
3. Click "Create Version"
4. Fill in:
   - **Version Number**: e.g., "1.0", "2.0"
   - **Amendment Version**: e.g., "A", "B", "C"
   - **IRB Approval Date**: When approved
   - **Description**: What changed
   - **Original Protocol**: Check if this is the first version
5. Click "Create"

**Example:**
- Version 1.0 (Original)
- Version 2.0 Amendment A (Added inclusion criteria)
- Version 2.1 Amendment B (Changed visit schedule)

---

## 👤 Subject Management

### **Subject Lifecycle**

```
Screening → Enrolled → Completed
     ↓           ↓
Screen Failure  Terminated
```

### **Screening a Subject**

**How to screen:**
1. Click "Subjects" tab
2. Click "Add Subject"
3. Fill in:
   - **Site*** (required): Select enrollment site
   - **Status**: Screening
   - **Screening Number**: e.g., "SCR-001"
   - **Screening Date**: Date screened
4. Click "Create"

**Result:**
- Subject created with blue "Screening" badge
- Site screen count updated

### **Enrolling a Subject**

**How to enroll:**
1. Find subject in table
2. Click Edit button
3. Update:
   - **Status**: Enrolled
   - **Subject Number**: Assign unique ID (e.g., "SUB-001")
   - **Enrollment Date**: Date enrolled
4. Click "Update"

**Result:**
- Status badge changes to green "Enrolled"
- Site `enrolled_subject_count` increments
- Site `first_subject_enrolled_date` populates (if first)

### **Screen Failures**

**How to record:**
1. Edit subject
2. Change status to: "Screen Failure"
3. Enter **Screen Failure Reason**
4. Click "Update"

**Result:**
- Status badge changes to red
- Site `screen_failure_count` increments
- Reason recorded for audit

### **Completing a Subject**

**How to complete:**
1. Edit subject
2. Change status to: "Completed"
3. Enter **Completion Date**
4. Click "Update"

**Result:**
- Status badge changes to purple
- Site `completed_subject_count` increments

### **Early Termination**

**How to terminate:**
1. Edit subject
2. Change status to: "Terminated"
3. Enter **Termination Date** and **Reason**
4. Click "Update"

**Result:**
- Status badge changes to orange
- Site `early_terminated_count` increments
- Termination reason recorded

---

## 📊 Site Milestones

### **Auto-Calculated Fields**
These fields update automatically when subjects change:

- **Enrolled Subject Count**: Total enrolled + completed
- **Screen Failure Count**: Total screen failures
- **Completed Subject Count**: Total completed
- **Early Terminated Count**: Total terminated
- **First Subject Enrolled Date**: Date of first enrollment
- **Last Subject Enrolled Date**: Date of most recent enrollment

**No manual updates needed!** 🎉

---

## 📅 Visit Templates

### **Creating Visit Schedules**
Visit templates define the standard visit schedule for subjects.

**How to create:**
1. Navigate to Protocol detail page
2. Click "Templates" tab (if implemented)
3. Click "Create Template"
4. Fill in:
   - **Version Number**: e.g., "1.0"
   - **Name**: e.g., "Standard Visit Schedule"
   - **IRB Approval Date**: When approved
   - **Active**: Toggle to enable at sites
5. Click "Create"

**Next Steps:**
- Add visits to template (Screening, Baseline, Follow-ups)
- Add activities to each visit (Procedures, labs, assessments)
- Activate at sites for use

---

## ⚠️ Common Issues & Solutions

### **Issue: "Region is required for this protocol"**
**Solution:** The protocol has "Regions Required" enabled. Create a region first, or edit the protocol to disable regions.

### **Issue: "Protocol number already exists"**
**Solution:** Protocol numbers must be unique. Choose a different number.

### **Issue: "Subject number already exists at this site"**
**Solution:** Subject numbers must be unique per site. Use a different number.

### **Issue: Can't see data from another company**
**Solution:** This is expected! The system isolates data by company for security.

### **Issue: Team member not showing after rolldown**
**Solution:** Verify "Rolldown to child entities" was checked during assignment. Check region/site team tabs.

---

## 🔍 Search & Filtering

### **Search Capabilities**
Every tab includes a search bar that searches:
- Programs: Name
- Protocols: Protocol number, title
- Regions: Region name
- Sites: Site number, organization name
- Subjects: Screening number, subject number

### **Tips:**
- Search is case-insensitive
- Partial matches work (searching "onco" finds "Oncology")
- Results update as you type

---

## 📈 Dashboard Statistics

The dashboard shows key metrics:
- Total Programs
- Total Protocols
- Total Regions
- Total Sites
- Active Protocols
- Enrolling Sites
- Protocols by Phase
- Protocols by Status
- Sites by Status

**Updates automatically** when data changes! 🔄

---

## 💡 Best Practices

### **Naming Conventions**
- Programs: Use therapeutic area (e.g., "Cardiology", "Oncology")
- Protocol Numbers: Use structured format (e.g., "CARD-2024-001")
- Site Numbers: Sequential by region (e.g., "001", "002")
- Subject Numbers: Sequential by site (e.g., "SUB-001")

### **Team Management**
- Use rolldown for protocol-wide assignments
- Use rollup when adding site-specific roles that should be visible at protocol level
- Mark primary roles for main responsibilities

### **Data Entry**
- Complete required fields (marked with *)
- Use consistent date formats
- Enter descriptions for audit trails
- Update statuses as trials progress

---

## 🆘 Support

### **Technical Issues**
- Check browser console for errors
- Verify network connectivity
- Ensure logged in with active account

### **Data Questions**
- Review testing guide: `PHASE5_TESTING_GUIDE.md`
- Check developer notes: `DEVELOPER_GUIDE.md`

---

## 📊 System Capabilities Summary

**What You Can Manage:**
- ✅ Clinical Programs & Protocols
- ✅ Geographic Regions
- ✅ Sites with Organizations & PIs
- ✅ Team Assignments (10 roles)
- ✅ Account Associations (9 types)
- ✅ Protocol Versions & Amendments
- ✅ Subject Screening & Enrollment
- ✅ Visit Templates
- ✅ Risk Assessments

**Automatic Features:**
- ✅ Site milestone calculations
- ✅ Team rollup/rolldown cascading
- ✅ Data validation
- ✅ Multi-tenant security
- ✅ Audit trails

---

**Your CTMS is ready to manage clinical trials!** 🎉

For detailed testing procedures, see `PHASE5_TESTING_GUIDE.md`
For technical details, see `DEVELOPER_GUIDE.md`
