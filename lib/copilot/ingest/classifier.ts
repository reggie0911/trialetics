import 'server-only';

import type { ExtractedDocument } from './extractors';

/**
 * Heuristic doc-type classifier.
 *
 * Phase 6 ships with a deterministic keyword-driven classifier so the system
 * is useful without any LLM round-trip on upload. The optional LLM fallback
 * (cheap mini-model) lives in `classifyWithLlm` and is invoked by the
 * orchestrator only when heuristic confidence is < 0.55.
 *
 * Doc types match the taxonomy in the plan.
 */

export type DocType =
  | 'budget'
  | 'visit_report'
  | 'monitoring_report'
  | 'training_log'
  | 'site_roster'
  | 'regulatory_document'
  | 'irb_approval'
  | 'informed_consent'
  | 'protocol'
  | 'protocol_amendment'
  | 'invoice'
  | 'payment_packet'
  | 'tracker'
  | 'subject_list'
  | 'enrollment_log'
  | 'inventory_log'
  | 'accountability_log'
  | 'capa'
  | 'deviation'
  | 'risk_log'
  | 'startup_tracker'
  | 'executive_deck'
  | 'meeting_notes'
  | 'sop'
  | 'email_correspondence'
  | 'unknown';

export interface ClassificationResult {
  docType: DocType;
  confidence: number;
  signals: Record<string, unknown>;
}

interface Rule {
  docType: DocType;
  /** Each pattern adds `weight` if found; cumulative confidence capped at 0.95. */
  patterns: Array<{ regex: RegExp; weight: number }>;
  /** Filename hints get a smaller boost. */
  filenameHints?: RegExp[];
}

const RULES: Rule[] = [
  {
    docType: 'budget',
    patterns: [
      { regex: /\bbudget\b/i, weight: 0.35 },
      { regex: /\b(rate|fees?|payment terms)\b/i, weight: 0.15 },
      { regex: /\b(per[- ]subject|per[- ]visit)\b/i, weight: 0.2 },
      { regex: /\b(USD|EUR|GBP|currency)\b/, weight: 0.1 },
    ],
    filenameHints: [/budget/i, /rate.?card/i, /fees?/i],
  },
  {
    docType: 'monitoring_report',
    patterns: [
      { regex: /\bmonitoring (visit|report)\b/i, weight: 0.45 },
      { regex: /\bSDV\b/, weight: 0.15 },
      { regex: /\baction items?\b/i, weight: 0.15 },
      { regex: /\bsite (overview|status)\b/i, weight: 0.1 },
    ],
    filenameHints: [/monitor/i, /(svr|imv|cov)/i],
  },
  {
    docType: 'visit_report',
    patterns: [
      { regex: /\bvisit (report|summary)\b/i, weight: 0.4 },
      { regex: /\bsubject visit\b/i, weight: 0.2 },
    ],
  },
  {
    docType: 'training_log',
    patterns: [
      { regex: /\btraining (log|record|completion)\b/i, weight: 0.5 },
      { regex: /\bGCP\b/, weight: 0.15 },
      { regex: /\bcompleted on\b/i, weight: 0.1 },
    ],
    filenameHints: [/training/i, /qualification/i],
  },
  {
    docType: 'site_roster',
    patterns: [
      { regex: /\bsite (roster|contacts?|directory)\b/i, weight: 0.45 },
      { regex: /\b(PI|principal investigator)\b/, weight: 0.15 },
      { regex: /\b(coordinator|study coordinator)\b/i, weight: 0.1 },
    ],
    filenameHints: [/roster/i, /contacts?/i, /directory/i],
  },
  {
    docType: 'irb_approval',
    patterns: [
      { regex: /\b(IRB|Institutional Review Board)\b/, weight: 0.5 },
      { regex: /\bapproval (letter|notification)\b/i, weight: 0.2 },
    ],
    filenameHints: [/irb/i, /ec.?approval/i],
  },
  {
    docType: 'regulatory_document',
    patterns: [
      { regex: /\bregulatory (submission|filing)\b/i, weight: 0.4 },
      { regex: /\b(FDA|EMA|MHRA|PMDA|Health Canada)\b/, weight: 0.2 },
    ],
  },
  {
    docType: 'informed_consent',
    patterns: [
      { regex: /\binformed consent\b/i, weight: 0.5 },
      { regex: /\bICF\b/, weight: 0.2 },
    ],
    filenameHints: [/icf/i, /consent/i],
  },
  {
    docType: 'protocol_amendment',
    patterns: [
      { regex: /\bprotocol amendment\b/i, weight: 0.6 },
      { regex: /\bamendment\s*(\d+|[ivx]+)/i, weight: 0.2 },
    ],
    filenameHints: [/amend/i],
  },
  {
    docType: 'protocol',
    patterns: [
      { regex: /\bclinical (trial )?protocol\b/i, weight: 0.4 },
      { regex: /\binclusion\/exclusion criteria\b/i, weight: 0.2 },
      { regex: /\bprimary endpoint\b/i, weight: 0.15 },
    ],
    filenameHints: [/protocol/i],
  },
  {
    docType: 'invoice',
    patterns: [
      { regex: /\binvoice\b/i, weight: 0.5 },
      { regex: /\b(amount due|total due|net 30|net 60)\b/i, weight: 0.2 },
    ],
    filenameHints: [/invoice/i],
  },
  {
    docType: 'payment_packet',
    patterns: [
      { regex: /\bpayment (packet|reconciliation|schedule)\b/i, weight: 0.45 },
      { regex: /\bsite payments?\b/i, weight: 0.2 },
    ],
  },
  {
    docType: 'subject_list',
    patterns: [
      { regex: /\b(subject|patient) (list|roster|enrollment)\b/i, weight: 0.4 },
      { regex: /\bsubject ID\b/i, weight: 0.2 },
    ],
  },
  {
    docType: 'enrollment_log',
    patterns: [
      { regex: /\benrollment (log|tracker|by site)\b/i, weight: 0.5 },
      { regex: /\bscreened\b/i, weight: 0.1 },
      { regex: /\brandomized\b/i, weight: 0.1 },
    ],
  },
  {
    docType: 'inventory_log',
    patterns: [
      { regex: /\b(inventory|drug|kit) (log|count)\b/i, weight: 0.5 },
    ],
  },
  {
    docType: 'accountability_log',
    patterns: [
      { regex: /\b(drug|product) accountability\b/i, weight: 0.55 },
    ],
  },
  {
    docType: 'capa',
    patterns: [
      { regex: /\bCAPA\b/, weight: 0.5 },
      { regex: /\bcorrective and preventive action\b/i, weight: 0.3 },
    ],
    filenameHints: [/capa/i],
  },
  {
    docType: 'deviation',
    patterns: [
      { regex: /\bprotocol deviation\b/i, weight: 0.5 },
      { regex: /\bdeviation (log|report)\b/i, weight: 0.3 },
    ],
    filenameHints: [/deviation/i],
  },
  {
    docType: 'risk_log',
    patterns: [
      { regex: /\brisk (log|register|matrix)\b/i, weight: 0.5 },
    ],
  },
  {
    docType: 'startup_tracker',
    patterns: [
      { regex: /\bsite (startup|activation) tracker\b/i, weight: 0.55 },
      { regex: /\b(startup|activation) milestone\b/i, weight: 0.15 },
    ],
  },
  {
    docType: 'executive_deck',
    patterns: [
      { regex: /\b(executive|leadership) (update|review|deck)\b/i, weight: 0.45 },
      { regex: /\b(steering committee|status)\b/i, weight: 0.15 },
    ],
  },
  {
    docType: 'meeting_notes',
    patterns: [
      { regex: /\b(meeting (notes|minutes)|action items?)\b/i, weight: 0.4 },
      { regex: /\battendees?\b/i, weight: 0.15 },
    ],
  },
  {
    docType: 'sop',
    patterns: [
      { regex: /\bstandard operating procedure\b/i, weight: 0.5 },
      { regex: /\bSOP[- ]?\d+/i, weight: 0.2 },
    ],
    filenameHints: [/sop/i],
  },
];

export function classifyHeuristic(filename: string, content: string): ClassificationResult {
  const text = content.slice(0, 8000); // first ~2k tokens is enough for keyword classification
  const scores: Record<string, { score: number; matches: string[] }> = {};

  for (const rule of RULES) {
    let score = 0;
    const matches: string[] = [];
    for (const { regex, weight } of rule.patterns) {
      const m = text.match(regex);
      if (m) {
        score += weight;
        matches.push(m[0].slice(0, 40));
      }
    }
    if (rule.filenameHints) {
      for (const re of rule.filenameHints) {
        if (re.test(filename)) {
          score += 0.15;
          matches.push(`[filename] ${filename}`);
          break;
        }
      }
    }
    if (score > 0) scores[rule.docType] = { score: Math.min(score, 0.95), matches };
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  if (ranked.length === 0) {
    return {
      docType: 'unknown',
      confidence: 0,
      signals: { reason: 'no rule matched', filename },
    };
  }
  const [topType, topData] = ranked[0];
  return {
    docType: topType as DocType,
    confidence: topData.score,
    signals: {
      matches: topData.matches.slice(0, 5),
      filename,
      runnerUp: ranked[1] ? { docType: ranked[1][0], score: ranked[1][1].score } : null,
    },
  };
}

export function classifyDocument(filename: string, doc: ExtractedDocument): ClassificationResult {
  return classifyHeuristic(filename, doc.plainText);
}
