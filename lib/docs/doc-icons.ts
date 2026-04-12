import type { LucideIcon } from 'lucide-react';
import {
  Rocket,
  BarChart3,
  Users,
  FileQuestion,
  ClipboardCheck,
  Calendar,
  Pill,
  CreditCard,
  Shield,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import type { DocIconKey } from './registry';

const DOC_ICON_MAP: Record<DocIconKey, LucideIcon> = {
  rocket: Rocket,
  barChart3: BarChart3,
  users: Users,
  fileQuestion: FileQuestion,
  clipboardCheck: ClipboardCheck,
  calendar: Calendar,
  pill: Pill,
  creditCard: CreditCard,
  shield: Shield,
  bookOpen: BookOpen,
  flaskConical: FlaskConical,
};

export function getDocIcon(key: DocIconKey): LucideIcon {
  return DOC_ICON_MAP[key];
}
