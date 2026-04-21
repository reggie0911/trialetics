import type { Study } from '@/lib/types/ctms';

/** Label for study pickers: short name when set, else protocol, else full title. */
export function studySelectLabel(s: Pick<Study, 'study_name' | 'protocol_number' | 'title'>): string {
  const name = s.study_name?.trim();
  if (name) return name;
  const proto = s.protocol_number?.trim();
  if (proto) return proto;
  return s.title;
}
