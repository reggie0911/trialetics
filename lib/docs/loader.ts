import fs from 'fs';
import path from 'path';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface ParsedDoc {
  frontmatter: Record<string, string>;
  content: string;
  toc: TocItem[];
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };

  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      fm[key] = value;
    }
  }
  return { frontmatter: fm, content: match[2] };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      items.push({ id: slugify(text), text, level });
    }
  }
  return items;
}

/** Parse markdown string (with optional YAML frontmatter) into structured doc + TOC. */
export function parseMarkdownDocument(raw: string): ParsedDoc {
  const { frontmatter, content } = parseFrontmatter(raw);
  const toc = extractToc(content);
  return { frontmatter, content, toc };
}

export function loadDoc(filePath: string): ParsedDoc | null {
  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;

  const raw = fs.readFileSync(fullPath, 'utf-8');
  return parseMarkdownDocument(raw);
}

export function loadDocContent(filePath: string): string | null {
  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { content } = parseFrontmatter(raw);
  return content;
}

export function loadAllDocsContent(filePaths: string[]): string {
  return filePaths
    .map((fp) => loadDocContent(fp))
    .filter(Boolean)
    .join('\n\n---\n\n');
}
