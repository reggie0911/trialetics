/**
 * Path segment under `/protected/trip-reports/[visitId]/` that assigns the current CPM as reviewer
 * (and starts review if submitted). Uses a route handler so revalidatePath is not run during RSC render.
 */
export const TRIP_REPORT_CLAIM_REVIEW_PATH = '/claim-review';

export const SITE_ATTENDEE_ROLE_OPTIONS = [
  'Cath Lab Technician',
  'Co-Investigator',
  'Device Specialist',
  'Fellow',
  'Lab Technician',
  'Lead Study Coordinator',
  'Pharmacist',
  'Principal Investigator (PI)',
  'Radiology Technician',
  'Research Assistant',
  'Research Nurse',
  'Site Data Manager',
  'Site Regulatory Coordinator',
  'Study Coordinator',
  'Sub-Investigator',
] as const;

export const SPONSOR_ATTENDEE_ROLE_OPTIONS = [
  'Biostatistician',
  'Biostatistics Director',
  'Chief Medical Officer (CMO)',
  'Clinical Data Manager',
  'Clinical Program Director',
  'Clinical Project Manager',
  'Clinical Research Associate',
  'Clinical Systems Administrator',
  'Clinical Trial Assistant',
  'Clinical Trial Manager',
  'Data Management Director',
  'Director Clinical Operations',
  'Lead CRA',
  'Medical Monitor',
  'Monitoring Manager',
  'Pharmacovigilance Manager',
  'Project Manager',
  'Quality Assurance Auditor',
  'Quality Assurance Director',
  'Regulatory Affairs Director',
  'Regulatory Affairs Manager',
  'Safety Physician',
  'VP Clinical',
] as const;

export const SECTION_HEADER_STYLE =
  'border-b border-border bg-muted/30 px-1.5 py-[3px] text-xs font-semibold uppercase tracking-wide text-muted-foreground';
