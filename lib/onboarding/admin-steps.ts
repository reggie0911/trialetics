import type { OnboardingStepDef } from './types';

const welcome: OnboardingStepDef = {
  id: 'welcome',
  title: 'Welcome',
  body:
    'This short tour shows where to set up your organization, define studies and visit report templates, and invite your team. You can turn off tips anytime in Profile settings.',
  kind: 'welcome',
  nextId: 'company',
};

const company: OnboardingStepDef = {
  id: 'company',
  title: 'Company profile',
  body:
    'Open the menu on your profile photo in the top-right, choose Settings, then Company to update your organization name and logo.',
  kind: 'coach',
  anchor: 'nav-profile-menu',
  nextId: 'studies',
};

const studies: OnboardingStepDef = {
  id: 'studies',
  title: 'Studies',
  body:
    'Create and manage clinical studies here. Use “New study” when you are ready to add your first protocol.',
  kind: 'coach',
  routePrefix: '/protected/studies',
  anchor: 'page-studies',
  nextId: 'trip_reports',
  requiresCtms: true,
};

const tripReports: OnboardingStepDef = {
  id: 'trip_reports',
  title: 'Trip reports',
  body:
    'Use the Trip Report Admin tab to build visit report templates and manage template lifecycle. Templates can be linked to your studies.',
  kind: 'coach',
  routePrefix: '/protected/trip-reports',
  routeSearch: 'tab=admin',
  anchor: 'page-trip-reports',
  nextId: 'team',
  requiresCtms: true,
};

const team: OnboardingStepDef = {
  id: 'team',
  title: 'Team',
  body:
    'Invite colleagues and manage who can access each study. Company administrators can manage invitations from this directory.',
  kind: 'coach',
  routePrefix: '/protected/team',
  anchor: 'page-team',
  nextId: 'complete',
  requiresCtms: true,
};

const modulesOverview: OnboardingStepDef = {
  id: 'modules_overview',
  title: 'Your workspace',
  body:
    'Use the top navigation to open the modules your organization has enabled (for example study trackers, eTMF, or eISF). Documentation is under Docs.',
  kind: 'coach',
  routeExact: '/protected',
  anchor: 'page-dashboard',
  nextId: 'complete',
};

const complete: OnboardingStepDef = {
  id: 'complete',
  title: 'You are set',
  body:
    'You can replay this tour anytime from Profile settings → Guided setup. Open the help docs from the Docs link if you need more detail.',
  kind: 'complete',
  nextId: null,
};

/** Full admin path when CTMS is enabled for the company. */
export const ADMIN_CTMS_STEPS: OnboardingStepDef[] = [
  welcome,
  company,
  studies,
  tripReports,
  team,
  complete,
];

const companyNoCtms: OnboardingStepDef = {
  ...company,
  nextId: 'modules_overview',
};

/** Short admin path when CTMS is not licensed — focus on company + modules. */
export const ADMIN_NO_CTMS_STEPS: OnboardingStepDef[] = [
  welcome,
  companyNoCtms,
  { ...modulesOverview, nextId: 'complete' },
  complete,
];
