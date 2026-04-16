import type { OnboardingStepDef } from './types';

const welcome: OnboardingStepDef = {
  id: 'welcome',
  title: 'Welcome',
  body:
    'Here is a quick map of the workspace: your tasks, monitoring visits, and where trip reports live. You can turn off these tips in Profile settings.',
  kind: 'welcome',
  nextId: 'my_tasks',
};

const myTasks: OnboardingStepDef = {
  id: 'my_tasks',
  title: 'My tasks',
  body:
    'Open a study from the list, then use My tasks in the study menu. Work assigned to you appears there; check due dates and status as your studies progress.',
  kind: 'coach',
  routePrefix: '/protected/studies',
  anchor: 'page-my-tasks',
  nextId: 'visits',
  requiresCtms: true,
};

const visits: OnboardingStepDef = {
  id: 'visits',
  title: 'Monitoring visits',
  body:
    'Open a study, then Visits in the study menu. Review scheduled and completed site visits for that protocol.',
  kind: 'coach',
  routePrefix: '/protected/studies',
  anchor: 'page-visits',
  nextId: 'trip_reports_user',
  requiresCtms: true,
};

const tripReportsUser: OnboardingStepDef = {
  id: 'trip_reports_user',
  title: 'Trip reports',
  body:
    'Open a study, then Trip reports in the study menu to work on visit reports and see items in the queue, depending on your role.',
  kind: 'coach',
  routePrefix: '/protected/studies',
  anchor: 'page-trip-reports',
  nextId: 'complete',
  requiresCtms: true,
};

const modulesOverview: OnboardingStepDef = {
  id: 'modules_overview',
  title: 'Your workspace',
  body:
    'Use the navigation at the top to move between the tools your administrator enabled for your organization.',
  kind: 'coach',
  routeExact: '/protected',
  anchor: 'page-dashboard',
  nextId: 'complete',
};

const complete: OnboardingStepDef = {
  id: 'complete',
  title: 'All set',
  body:
    'Replay this tour from Profile settings → Guided setup whenever you like.',
  kind: 'complete',
  nextId: null,
};

export const USER_CTMS_STEPS: OnboardingStepDef[] = [
  welcome,
  myTasks,
  visits,
  tripReportsUser,
  complete,
];

export const USER_NO_CTMS_STEPS: OnboardingStepDef[] = [
  { ...welcome, nextId: 'modules_overview' },
  { ...modulesOverview, nextId: 'complete' },
  complete,
];
