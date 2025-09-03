import * as cheerio from 'cheerio';
import type { ConversionOptions, TablePreset, SelectorConfig, TableUnderHeadingConfig, TableWithCaptionConfig } from '../types';

// Reference cheerio to retain types when compiling with noUnusedLocals
void cheerio;

/**
 * Maps preset options to corresponding selector configurations
 */
export function getPresetSelectors(
  preset: TablePreset,
  options: ConversionOptions,
): SelectorConfig {
  switch (preset) {
    case 'all-tables':
      return {
        type: 'standard',
        elementSelector: 'html',
        tableSelector: 'table'
      };
    case 'first-table':
      return {
        type: 'standard',
        elementSelector: 'html',
        tableSelector: 'table:first-of-type'
      };
    case 'last-table':
      return {
        type: 'standard',
        elementSelector: 'html',
        tableSelector: 'table:last-of-type'
      };
    case 'table-under-heading': {
      // Get the heading level (default to 1 if not specified)
      let headingLevel = typeof options.headingLevel === 'number' ? options.headingLevel : 1;
      if (headingLevel < 1 || headingLevel > 999) headingLevel = 1;
      const headingSelector = `h${headingLevel}`;
      // Get the table index (default to 1 if not specified)
      const tableIndex = options.tableIndex || 1;

      const config: TableUnderHeadingConfig = {
        headingLevel,
        headingSelector,
        headingText: options.headingText?.trim() || '',
        tableIndex,
      };

      return {
        type: 'table-under-heading',
        tableUnderHeading: config,
      };
    }
    case 'custom':
      // For custom, we'll use the provided tableSelector
      return {
        type: 'standard',
        elementSelector: 'html',
        tableSelector: options.tableSelector || 'table',
      };
    case 'table-with-caption': {
      const config: TableWithCaptionConfig = {
        captionText: options.captionText?.trim() || '',
      };

      return {
        type: 'table-with-caption',
        tableWithCaption: config,
      };
    }
    default:
      return {
        type: 'standard',
        elementSelector: 'html',
        tableSelector: 'table'
      };
  }
}

/**
 * Legacy function for backward compatibility - converts SelectorConfig to old format
 * TODO: Remove this once all callers are updated to use SelectorConfig
 */
export function getPresetSelectorsLegacy(
  preset: TablePreset,
  options: ConversionOptions,
): { elementSelector: string; tableSelector: string } {
  const config = getPresetSelectors(preset, options);

  switch (config.type) {
    case 'standard':
      return {
        elementSelector: config.elementSelector || 'html',
        tableSelector: config.tableSelector || 'table',
      };
    case 'table-under-heading':
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify(config.tableUnderHeading),
      };
    case 'table-with-caption':
      return {
        elementSelector: 'special:table-with-caption',
        tableSelector: JSON.stringify(config.tableWithCaption),
      };
    default:
      return {
        elementSelector: 'html',
        tableSelector: 'table',
      };
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
