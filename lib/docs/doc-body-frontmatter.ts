const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Split optional YAML frontmatter from the documentation body.
 * The WYSIWYG editor only edits `body`; `prefix` is preserved verbatim on save.
 */
export function splitDocFrontmatter(full: string): { prefix: string; body: string } {
  const m = full.match(FRONTMATTER_RE);
  if (!m || m.index === undefined) {
    return { prefix: '', body: full };
  }
  const prefix = full.slice(0, m.index + m[0].length);
  const body = full.slice(m.index + m[0].length);
  return { prefix, body };
}

export function mergeDocFrontmatter(prefix: string, body: string): string {
  const p = prefix;
  const b = body.replace(/^\n+/, '');
  if (!p) return b;
  return p.endsWith('\n') ? `${p}${b}` : `${p}\n${b}`;
}

/** Body text after optional YAML frontmatter, trimmed (for preview). */
export function docBodyWithoutFrontmatter(md: string): string {
  return splitDocFrontmatter(md).body.trim();
}
