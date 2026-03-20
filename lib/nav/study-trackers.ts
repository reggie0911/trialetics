import type { LucideIcon } from 'lucide-react';
import {
  Users,
  BarChart3,
  FileQuestion,
  ClipboardCheck,
  Calendar,
  Pill,
} from 'lucide-react';

export type StudyTrackerNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Routes under Custom → Study trackers; keys are stored on companies.enabled_study_tracker_keys */
export const studyTrackerNavItems: StudyTrackerNavItem[] = [
  { key: 'patients', label: 'MRace Tracker', href: '/protected/patients', icon: Users },
  { key: 'ae', label: 'AE Metrics', href: '/protected/ae', icon: BarChart3 },
  { key: 'ecrf-query-tracker', label: 'eCRF Query Tracker', href: '/protected/ecrf-query-tracker', icon: FileQuestion },
  { key: 'sdv-tracker', label: 'SDV Tracker', href: '/protected/sdv-tracker', icon: ClipboardCheck },
  { key: 'vw', label: 'Visit Window', href: '/protected/vw', icon: Calendar },
  { key: 'mc', label: 'Med Compliance', href: '/protected/mc', icon: Pill },
];

export const allStudyTrackerKeys: readonly string[] = studyTrackerNavItems.map((i) => i.key);
