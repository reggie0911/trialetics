export type PdfNode =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; children: PdfInline[] }
  | { type: 'list'; ordered: boolean; items: PdfListItem[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; text: string }
  | { type: 'image'; src: string; alt: string }
  | { type: 'hr' }
  | { type: 'codeBlock'; text: string };

export type PdfInline =
  | { type: 'text'; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { type: 'link'; text: string; href: string };

export type PdfListItem = { children: PdfInline[] };

export function parseMarkdownToPdfNodes(markdown: string): PdfNode[] {
  const lines = markdown.split('\n');
  const nodes: PdfNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') { i++; continue; }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim())) {
      nodes.push({ type: 'hr' });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push({ type: 'codeBlock', text: codeLines.join('\n') });
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^\|[\s-:|]+\|/.test(lines[i + 1]?.trim())) {
      const headerCells = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        const row = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        rows.push(row);
        i++;
      }
      nodes.push({ type: 'table', headers: headerCells, rows });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].startsWith('#')))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
        if (i < lines.length && lines[i].trim() === '') break;
      }
      nodes.push({ type: 'blockquote', text: quoteLines.join(' ').trim() });
      continue;
    }

    // Ordered/unordered list
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[2]);
      const items: PdfListItem[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
        if (!itemMatch) break;
        items.push({ children: parseInline(itemMatch[3]) });
        i++;
      }
      nodes.push({ type: 'list', ordered, items });
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      nodes.push({ type: 'image', src: imgMatch[2], alt: imgMatch[1] });
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,6}\s/) && !lines[i].startsWith('```') && !lines[i].startsWith('>') && !lines[i].match(/^(\s*)([-*]|\d+\.)\s+/) && !lines[i].match(/^---+\s*$/)) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push({ type: 'paragraph', children: parseInline(paraLines.join(' ')) });
    }
  }

  return nodes;
}

function parseInline(text: string): PdfInline[] {
  const result: PdfInline[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      result.push({ type: 'text', text: match[2], bold: true });
    } else if (match[3]) {
      result.push({ type: 'text', text: match[3], italic: true });
    } else if (match[4]) {
      result.push({ type: 'text', text: match[4], code: true });
    } else if (match[5] && match[6]) {
      result.push({ type: 'link', text: match[5], href: match[6] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({ type: 'text', text: text.slice(lastIndex) });
  }

  if (result.length === 0) {
    result.push({ type: 'text', text });
  }

  return result;
}
