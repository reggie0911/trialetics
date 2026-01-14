import { ModuleMetric } from '@/lib/types/module-metrics';

export const mockModuleMetrics: ModuleMetric[] = [
  {
    id: 'team-task-status',
    title: 'Team Task Status',
    status: 'success',
    stats: [
      { label: 'Total Tasks', value: 0 },
      { label: 'Not Started', value: 0 },
      { label: 'At Risk', value: 0 },
    ],
    detailsLink: '/protected/dashboard/team-tasks',
  },
  {
    id: 'site-task-status',
    title: 'Site Task Status',
    status: 'success',
    stats: [
      { label: 'Total Tasks', value: 0 },
      { label: 'Not Started', value: 0 },
      { label: 'At Risk', value: 0 },
    ],
    detailsLink: '/protected/dashboard/site-tasks',
  },
  {
    id: 'my-task-status',
    title: 'My Task Status',
    status: 'success',
    stats: [
      { label: 'Total Tasks', value: 0 },
      { label: 'Not Started', value: 0 },
      { label: 'At Risk', value: 0 },
    ],
    detailsLink: '/protected/dashboard/my-tasks',
  },
  {
    id: 'team-calendar',
    title: 'Team Calendar',
    status: 'success',
    stats: [
      { label: 'Total Visits YTD', value: 1 },
      { label: 'Upcoming Visits', value: 0 },
    ],
    detailsLink: '/protected/dashboard/calendar',
  },
  {
    id: 'expense-report',
    title: 'Expense Report',
    status: 'danger',
    stats: [
      { label: 'Approved', value: 4 },
      { label: 'Submitted', value: 7 },
      { label: 'Returned', value: 0 },
    ],
    detailsLink: '/protected/dashboard/expenses',
  },
  {
    id: 'inventory-management',
    title: 'Inventory Management',
    status: 'success',
    stats: [
      { label: 'At Risk', value: 4 },
      { label: 'Expired', value: 0 },
    ],
    detailsLink: '/protected/dashboard/inventory',
  },
  {
    id: 'm-projections',
    title: 'M-Projections',
    status: 'success',
    stats: [
      { label: 'Total Tasks', value: 4 },
      { label: 'Not Started', value: 4 },
      { label: 'At Risk', value: 4 },
    ],
    detailsLink: '/protected/dashboard/projections',
  },
  {
    id: 'site-allocations',
    title: 'Site Allocations',
    status: 'danger',
    stats: [
      { label: 'Unassigned Sites', value: 0 },
    ],
    detailsLink: '/protected/dashboard/allocations',
  },
  {
    id: 'etmf',
    title: 'eTMF',
    status: 'success',
    stats: [
      { label: 'Unassigned Documents', value: 4 },
      { label: 'Review Needed', value: 4 },
      { label: 'Returned', value: 0 },
    ],
    detailsLink: '/protected/dashboard/etmf',
  },
  {
    id: 'payments',
    title: 'Payments',
    status: 'danger',
    stats: [
      { label: 'Total Tasks', value: 4 },
      { label: 'Not Started', value: 4 },
      { label: 'At Risk', value: 4 },
    ],
    detailsLink: '/protected/dashboard/payments',
  },
  {
    id: 'timesheet',
    title: 'Timesheet',
    status: 'danger',
    stats: [
      { label: 'Approved', value: 4 },
      { label: 'Submitted', value: 7 },
      { label: 'Returned', value: 0 },
    ],
    detailsLink: '/protected/dashboard/timesheet',
  },
  {
    id: 'trip-report-status',
    title: 'Trip Report Status',
    status: 'success',
    stats: [
      { label: 'Report Pending', value: 1 },
      { label: 'Authoring', value: 0 },
      { label: 'Submitted', value: 0 },
      { label: 'In Review', value: 0 },
      { label: 'Returned', value: 0, highlight: true, delta: 0 },
      { label: 'Approved', value: 0 },
    ],
    detailsLink: '/protected/dashboard/trip-reports',
  },
];
