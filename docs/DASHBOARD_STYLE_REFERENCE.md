# Dashboard Style Reference

Use this guide to keep new and existing dashboards visually consistent with the Site Overview and Monitoring cards.

## Visual System

### Card container
- Use `bg-card` with `border-border` (or `border-border/80`) and `rounded-lg`.
- Use subtle elevation (`shadow-sm`) only where surrounding cards also use it.
- Prefer compact sizing for KPI cards: `min-h-[9rem]` and `p-3.5 sm:p-4`.
- Keep responsive grid rhythm consistent: `gap-3 sm:gap-4`.

### Typography hierarchy
- **Label/title:** `text-[10px]` to `text-xs`, `font-medium` or `font-semibold`.
- **Primary metric value (standard KPI):** `text-[24px] font-semibold leading-[1.12] tracking-tight tabular-nums`.
- **Primary metric value (compact KPI):** `text-[18px] font-medium leading-tight tabular-nums`.
- **Supporting text:** `text-[10px]` or `text-xs`, `font-normal`, `text-muted-foreground`.
- **CTA link/button:** `text-[10px] font-normal` with underline-on-hover behavior.

### Color scheme and semantic tones
- Base text: `text-foreground`.
- Secondary/supporting text: `text-muted-foreground`.
- Label contrast (when needed): `text-black dark:text-foreground`.
- Semantic states:
  - Success: emerald tones
  - Warning: amber/orange tones
  - Risk/destructive: red/destructive tones
  - CTA/link emphasis: sky tones (`text-sky-500` with hover variants)
- Always use theme tokens for light/dark compatibility (`bg-card`, `border-border`, etc.).

### Spacing and gaps
- Keep a tight vertical rhythm inside KPI cards:
  - Label to value: around `mt-1`
  - Value to support line: around `mt-1.5`
  - Support line to CTA: small top gap (for compact cards, ~`mt-[0.2125rem]` plus `pt-0.5`)
- Keep icon-to-label spacing compact (`gap-1.5` to `gap-2`).
- Avoid extra dead vertical space; cards should feel dense but readable.

## Reuse Existing Tokens

When available, reuse shared metric classes from:
- `components/ctms/metric-stat-tokens.ts`

This keeps typography and CTA behavior consistent across dashboards.

## Copy-Paste Prompt For Dashboard Styling

```text
Apply the Trialetics KPI dashboard visual system to this dashboard (new or existing), matching the existing Site Overview and Monitoring cards.

Design system requirements:
1) Card container
- Use bg-card + border-border (or border-border/80), rounded-lg, subtle shadow-sm.
- Use compact spacing: p-3.5 sm:p-4 for dense cards; min-h around 9rem unless content requires more.
- Preserve responsive grid rhythm (gap-3 sm:gap-4, consistent columns at breakpoints).

2) Typography hierarchy
- Card label/title: text-[10px] to text-xs, font-medium/semibold.
- Primary metric value: tabular-nums, high contrast.
  - Standard KPI: text-[24px] font-semibold leading-[1.12] tracking-tight.
  - Compact KPI: text-[18px] font-medium leading-tight.
- Supporting text: text-[10px]/text-xs, font-normal, muted.
- CTA links/buttons: text-[10px] font-normal, compact underline-on-hover behavior.

3) Color and semantics
- Base text: text-foreground; secondary text: text-muted-foreground.
- Keep theme-token colors for light/dark compatibility.
- Semantic states:
  - success: emerald
  - warning: amber/orange
  - destructive/risk: red/destructive
  - interactive links: sky (hover darker/brighter by theme)

4) Spacing details (important)
- Tighten vertical rhythm: label->value (mt-1), value->support (mt-1.5), support->CTA (~mt-0.2rem + small top padding).
- Keep icon-to-label gaps compact (about gap-1.5 to gap-2).
- Remove unnecessary vertical dead space; keep cards dense but readable.

5) Consistency rules
- Reuse existing metric tokens/classes where available (do not invent a new style system).
- Keep border radius, stroke weights, and icon sizes visually aligned with existing cards.
- Ensure all text remains readable in dark mode and at small sizes.

Deliverables:
- Update styles/classes only where needed.
- Keep behavior and data logic unchanged.
- Provide a brief before/after summary of spacing, typography, and color consistency improvements.
```
