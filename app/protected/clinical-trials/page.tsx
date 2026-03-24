import { redirect } from 'next/navigation';

/** Legacy / marketing path; CTMS study portfolio lives at `/protected/studies`. */
export default function ClinicalTrialsRedirectPage() {
  redirect('/protected/studies');
}
