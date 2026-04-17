import { describe, expect, it } from 'vitest';

import { chunkDocument } from './chunker';
import type { ExtractedDocument } from './extractors';

function makeDoc(sections: ExtractedDocument['sections']): ExtractedDocument {
  return {
    plainText: sections.map(s => s.content).join('\n\n'),
    sections,
    metadata: {},
    warnings: [],
  };
}

describe('chunkDocument', () => {
  it('emits one chunk per small section', () => {
    const doc = makeDoc([
      { kind: 'text', label: 'Body', content: 'Short paragraph one.\n\nShort paragraph two.' },
    ]);
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].ordinal).toBe(0);
    expect(chunks[0].content).toContain('paragraph one');
  });

  it('splits a long section into multiple chunks at paragraph boundaries', () => {
    const para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(80); // ~4500 chars
    const sections = Array.from({ length: 4 }).map(() => para);
    const doc = makeDoc([
      { kind: 'text', label: 'Body', content: sections.join('\n\n') },
    ]);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => {
      expect(c.tokenEstimate).toBeLessThanOrEqual(2000);
    });
    expect(chunks.map(c => c.ordinal)).toEqual([...Array(chunks.length).keys()]);
  });

  it('preserves sheet/page metadata on every chunk', () => {
    const doc = makeDoc([
      {
        kind: 'sheet',
        label: 'Sheet: Budget',
        content: 'col1 | col2\n'.repeat(2000),
        sheetName: 'Budget',
        structured: { headers: ['col1', 'col2'] },
      },
    ]);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.sheetName).toBe('Budget'));
    expect(chunks[0].structured).toBeTruthy();
    chunks.slice(1).forEach(c => expect(c.structured).toBeUndefined());
  });

  it('attaches pageOrSlide for paginated documents', () => {
    const doc = makeDoc([
      { kind: 'text', label: 'Page 1', content: 'Page one content', pageOrSlide: 1 },
      { kind: 'text', label: 'Page 2', content: 'Page two content', pageOrSlide: 2 },
    ]);
    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].pageOrSlide).toBe(1);
    expect(chunks[1].pageOrSlide).toBe(2);
  });

  it('hard-splits a single oversized paragraph', () => {
    const oneLine = 'X'.repeat(20_000);
    const doc = makeDoc([{ kind: 'text', label: 'Body', content: oneLine }]);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => {
      expect(c.tokenEstimate).toBeLessThanOrEqual(2000);
    });
  });
});
