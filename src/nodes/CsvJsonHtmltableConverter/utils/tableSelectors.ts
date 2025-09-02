import * as cheerio from 'cheerio';
import type { ConversionOptions, TablePreset } from '../types';

// Reference cheerio to retain types when compiling with noUnusedLocals
void cheerio;

/**
 * Maps preset options to corresponding selectors
 */
export function getPresetSelectors(
  preset: TablePreset,
  options: ConversionOptions,
): { elementSelector: string; tableSelector: string } {
  switch (preset) {
    case 'all-tables':
      return { elementSelector: 'html', tableSelector: 'table' };
    case 'first-table':
      return { elementSelector: 'html', tableSelector: 'table:first-of-type' };
    case 'last-table':
      return { elementSelector: 'html', tableSelector: 'table:last-of-type' };
    case 'table-under-heading': {
      // Get the heading level (default to 1 if not specified)
      let headingLevel = typeof options.headingLevel === 'number' ? options.headingLevel : 1;
      if (headingLevel < 1 || headingLevel > 999) headingLevel = 1;
      const headingSelector = `h${headingLevel}`;
      // Get the table index (default to 1 if not specified)
      const tableIndex = options.tableIndex || 1;
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify({
          headingLevel,
          headingSelector,
          headingText: options.headingText?.trim() || '',
          tableIndex,
        }),
      };
    }
    case 'custom':
      // For custom, we'll use the provided tableSelector
      return { elementSelector: 'html', tableSelector: '' };
    case 'table-with-caption': {
      // For table-with-caption, return a special selector and pass captionText
      return {
        elementSelector: 'special:table-with-caption',
        tableSelector: JSON.stringify({
          captionText: options.captionText?.trim() || '',
        }),
      };
    }
    default:
      return { elementSelector: 'html', tableSelector: 'table' };
  }
}

/**
 * Helper: Traverse DOM in document order after a given element, collecting <table> elements
 */
export function findTablesAfterElement(startElem: cheerio.Element): cheerio.Element[] {
  const tables: cheerio.Element[] = [];
  let foundStart = false;
  function walk(node: cheerio.Element) {
    if (node === startElem) {
      foundStart = true;
    } else if (foundStart && node.type === 'tag' && node.tagName === 'table') {
      tables.push(node);
    }
    if (
      typeof node === 'object' &&
      node !== null &&
      'children' in node &&
      Array.isArray((node as { children?: unknown }).children)
    ) {
      for (const child of (node as { children: cheerio.Element[] }).children) {
        walk(child);
      }
    }
  }
  // Start from the root
  let root = startElem;
  while (root.parent) {
    root = root.parent;
  }
  walk(root);
  return tables;
}
