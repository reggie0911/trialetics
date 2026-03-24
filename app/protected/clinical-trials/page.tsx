import { redirect } from 'next/navigation';

/** Legacy URL; CTMS studies live at `/protected/studies`. */
export default function ClinicalTrialsLegacyPage() {
  redirect('/protected/studies');
}
