import type { ActivityEvent } from '@/lib/directory/activity-events';

/**
 * Mock fallback used by the Directory Activity tab so the redesign renders
 * fully even when there are no rows in `directory_audit_log` /
 * `directory_assignment_history`. Real audit + history rows replace this
 * once they exist.
 */

export interface ActivitySummary {
  lastActivityRelative: string;
  lastActivityAt: string;
  lastActivityActor: string;
  totalActivities: number;
  activeLast7Days: number;
  activePctOfTotal: number;
  inactivityDays: number;
  inactivityRisk: 'ok' | 'at_risk';
  status: 'Active' | 'Engaged' | 'Idle';
  lastVisit: string;
  lastVisitDate: string;
  lastStudyActivity: string;
  lastSiteActivity: string;
}

export interface ActivityAttentionItem {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: 'Log visit' | 'Review' | 'Create task';
  intent: 'visit' | 'review' | 'task';
}

export const MOCK_ACTIVITY_SUMMARY: ActivitySummary = {
  lastActivityRelative: 'Today, 2:52 PM',
  lastActivityAt: 'Today, 2:52 PM',
  lastActivityActor: 'By Sarah Thompson',
  totalActivities: 48,
  activeLast7Days: 12,
  activePctOfTotal: 25,
  inactivityDays: 97,
  inactivityRisk: 'at_risk',
  status: 'Active',
  lastVisit: 'May 10, 2026',
  lastVisitDate: 'May 10, 2026',
  lastStudyActivity: 'Today, 11:18 AM',
  lastSiteActivity: 'Today, 2:52 PM',
};

export const MOCK_ACTIVITY_ATTENTION: ActivityAttentionItem[] = [
  {
    id: 'visit-overdue',
    title: 'No recent monitoring visits',
    subtitle: 'Last visit was 3 days ago',
    ctaLabel: 'Log visit',
    intent: 'visit',
  },
  {
    id: 'role-unconfirmed',
    title: 'Review role at Mayo Clinic',
    subtitle: 'CRC role not confirmed',
    ctaLabel: 'Review',
    intent: 'review',
  },
  {
    id: 'task-stale',
    title: 'No tasks in last 90 days',
    subtitle: 'Consider assigning a task',
    ctaLabel: 'Create task',
    intent: 'task',
  },
];

/** 12-bucket weekly trend for the Activity Insights sparkline (Last 90 days). */
export const MOCK_ACTIVITY_INSIGHTS_TREND: number[] = [
  4, 6, 5, 9, 7, 11, 8, 14, 10, 13, 12, 17,
];

/** Tick labels under the sparkline (left → right). */
export const MOCK_ACTIVITY_INSIGHTS_TICKS = ['Feb 13', 'Mar 13', 'Apr 13', 'May 13'];

const NOW = new Date('2026-05-13T14:52:00-05:00');

function at(daysAgo: number, hour: number, minute: number = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function actor(initials: string, name: string, id: string): { id: string; name: string; initials: string } {
  return { id, name, initials };
}

export const MOCK_ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: 'mock-1',
    at: at(0, 14, 52),
    kind: 'site',
    title: 'Assigned to site',
    description: 'Assigned to Johns Hopkins Hospital as CRC',
    badge: 'LUMINA-201',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'building',
  },
  {
    id: 'mock-2',
    at: at(0, 11, 18),
    kind: 'study',
    title: 'Added to study',
    description: 'Added to LUMINA-201 study',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'study',
  },
  {
    id: 'mock-3',
    at: at(0, 9, 41),
    kind: 'role',
    title: 'Role updated',
    description: 'Role changed to Clinical Research Coordinator (CRC)',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'role',
  },
  {
    id: 'mock-4',
    at: at(1, 16, 15),
    kind: 'site',
    title: 'Assigned to site',
    description: 'Assigned to Mayo Clinic as CRC',
    badge: 'LUMINA-201',
    actor: actor('JD', 'James Davis', 'mock-actor-jd'),
    entity: { type: 'directory_contact', id: 'mock-c-mayo-1', href: '/protected/directory/contacts/mock-c-mayo-1' },
    icon: 'building',
  },
  {
    id: 'mock-5',
    at: at(1, 10, 7),
    kind: 'profile',
    title: 'Email updated',
    description: 'Email address was updated',
    actor: actor('JD', 'James Davis', 'mock-actor-jd'),
    entity: { type: 'directory_contact', id: 'mock-c-mayo-1', href: '/protected/directory/contacts/mock-c-mayo-1' },
    icon: 'mail',
  },
  {
    id: 'mock-6',
    at: at(3, 15, 22),
    kind: 'visits',
    title: 'Monitoring visit logged',
    description: 'Visit #3 logged for Johns Hopkins Hospital',
    badge: 'LUMINA-201 · Onsite Monitoring',
    actor: actor('RW', 'Robert White', 'mock-actor-rw'),
    entity: { type: 'directory_institution', id: 'mock-inst-jh', href: '/protected/directory/institutions/mock-inst-jh' },
    icon: 'visit',
  },
  {
    id: 'mock-7',
    at: at(4, 13, 10),
    kind: 'profile',
    title: 'Profile updated',
    description: 'Phone number was updated',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'mail',
  },
  {
    id: 'mock-8',
    at: at(14, 17, 3),
    kind: 'role',
    title: 'Role assigned',
    description: 'Assigned as CRC',
    badge: 'LUMINA-201',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'role',
  },
  {
    id: 'mock-9',
    at: at(21, 14, 50),
    kind: 'study',
    title: 'Added to study',
    description: 'Added to LUMINA-201 study',
    actor: actor('ST', 'Sarah Thompson', 'mock-actor-st'),
    entity: { type: 'directory_contact', id: 'mock-c-2', href: '/protected/directory/contacts/mock-c-2' },
    icon: 'study',
  },
];
