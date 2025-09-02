import * as cheerio from 'cheerio';
import type { ConversionOptions, TablePreset } from '../types';
import minifyHtml from '@minify-html/node';
import { DEFAULT_PRETTY_PRINT, MINIFY_OPTIONS } from './constants';
import { debug, debugSample } from './debug';

/**
 * Maps preset options to corresponding selectors
 * This is reused from htmlConverter.ts
 */
function getPresetSelectors(
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
      // For table-under-heading, we'll return a special value that will be handled
      // in the findTable function with a custom implementation
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify({
          headingLevel: headingLevel,
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
function findTablesAfterElement(startElem: cheerio.Element): cheerio.Element[] {
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

/**
 * Finds a table in the HTML document based on selectors and options
 * Returns the cheerio element or null if not found
 */
function findTable($: cheerio.Root, options: ConversionOptions): cheerio.Element | null {
  // Determine which selectors to use based on mode
  let elementSelector: string;
  let tableSelector: string;

  if (options.selectorMode === 'simple') {
    // Use preset selectors for simple mode
    const preset = options.tablePreset || 'all-tables';
    const presetSelectors = getPresetSelectors(preset, options);

    elementSelector = presetSelectors.elementSelector;

    // If custom preset, use the provided tableSelector
    if (preset === 'custom') {
      tableSelector = options.tableSelector?.trim() || 'table';
    } else {
      tableSelector = presetSelectors.tableSelector;
    }
  } else {
    // Use advanced mode with separate selectors
    elementSelector = options.elementSelector?.trim() || '';
    tableSelector = options.tableSelector?.trim() || 'table';
  }

  try {
    // Special handling for table-under-heading preset
    if (elementSelector === 'special:table-under-heading') {
      const config = JSON.parse(tableSelector);
      const headingLevel = config.headingLevel;
      const headingSelector = config.headingSelector || `h${headingLevel}`;
      const headingText = config.headingText;
      const tableIndex = config.tableIndex;
      // Validate headingLevel
      if (typeof headingLevel !== 'number' || headingLevel < 1 || headingLevel > 999) {
        throw new Error('Heading Level must be a number between 1 and 999.');
      }
      // Find all headings with the specified text
      let foundTable = null;
      $(headingSelector).each((_, heading) => {
        const headingContent = $(heading).text().trim();
        if (
          headingText === '' ||
          headingContent.toLowerCase().includes(headingText.toLowerCase())
        ) {
          // Traverse DOM in document order after the heading to find tables
          const tablesAfterHeading = findTablesAfterElement(heading);
          if (tablesAfterHeading.length >= tableIndex) {
            foundTable = tablesAfterHeading[tableIndex - 1];
            return false; // Stop after finding the correct heading and table
          }
        }
        return true;
      });
      if (foundTable) {
        return foundTable;
      }
      // No tables found after matching headings
      throw new Error(
        `No tables found after heading level h${headingLevel} containing "${
          headingText || 'any text'
        }" at index ${tableIndex}. Please check your HTML structure or try another preset.`,
      );
    }

    // Special handling for table-with-caption preset
    if (elementSelector === 'special:table-with-caption') {
      const config = JSON.parse(tableSelector);
      const captionText = config.captionText;
      let foundTable: cheerio.Element | null = null;

      $('table').each((_, table) => {
        const caption = $(table).find('caption').first();

        if (caption.length > 0) {
          const captionContent = caption.text().trim();

          if (
            captionText === '' ||
            captionContent.toLowerCase().includes(captionText.toLowerCase())
          ) {
            foundTable = table;
            return false; // Break out of .each()
          }
        }

        return true; // Continue the .each() loop
      });

      if (!foundTable) {
        throw new Error(
          `No tables found with <caption> containing "${
            captionText || 'any text'
          }". Please check your HTML or try another preset.`,
        );
      }
      return foundTable;
    }

    // If elementSelector is empty, use the root element
    const elements = elementSelector ? $(elementSelector) : $.root();

    if (elements.length === 0) {
      throw new Error(
        `No elements found matching the selector: "${elementSelector}". Try using a more general selector like "html" or "body".`,
      );
    }

    // Find tables within those elements
    let foundTable: cheerio.Element | null = null;

    elements.each((_, element) => {
      // Find tables using tableSelector (defaults to 'table' if empty)
      const tablesInElement = $(element).find(tableSelector);

      if (tablesInElement.length > 0) {
        // Return the first table found
        foundTable = tablesInElement[0];
        return false; // Break each loop after finding the first table
      }

      return true; // Continue the each() loop
    });

    if (!foundTable) {
      // Prepare helpful error message with suggestions
      const helpfulMessage =
        options.selectorMode === 'simple' && options.tablePreset !== 'custom'
          ? '\nTry another preset or switch to Advanced mode for more control.'
          : '\nHere are some suggestions:\n- Check if your HTML actually contains <table> elements\n- Try using a more general selector like "table" or "div table"\n- Switch to Simple mode and try the different presets\n- Use browser developer tools to identify the correct selectors';

      const elementSelectorMsg = elementSelector ? ` matching: "${elementSelector}"` : '';
      throw new Error(
        `No tables found matching the selector: "${tableSelector}" within elements${elementSelectorMsg}.${helpfulMessage}`,
      );
    }

    return foundTable;
  } catch (error) {
    // Rethrow the error with a clear message
    if (error.message.includes('SyntaxError') || error.message.includes('sub-selector')) {
      // Handle syntax errors with helpful messages
      const helpfulMessage =
        '\nCommon issues include:' +
        '\n- Incorrect CSS syntax (missing quotes, brackets, etc.)' +
        '\n- Using JavaScript-specific selectors not supported by Cheerio' +
        '\n- Using complex pseudo-selectors' +
        '\nTry switching to Simple mode and using a preset, or see Cheerio documentation for supported selectors.';

      if (elementSelector && error.message.includes(elementSelector)) {
        throw new Error(`Invalid element selector syntax: "${elementSelector}".${helpfulMessage}`);
      }
      if (tableSelector && error.message.includes(tableSelector)) {
        throw new Error(`Invalid table selector syntax: "${tableSelector}".${helpfulMessage}`);
      }
      throw new Error(`Invalid selector syntax. Please check your selectors.${helpfulMessage}`);
    }
    throw error;
  }
}

/**
 * Replaces a table in HTML content with new content
 */
export async function replaceTable(
  html: string,
  replacementContent: string,
  options: ConversionOptions,
): Promise<string> {
  // Detect if input is a fragment (no <html> or <body> tags)
  const isFragment = !(/<html[\s>]/i.test(html) || /<body[\s>]/i.test(html));

  const $ = cheerio.load(html);
  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  debug(
    'replaceTable.ts',
    `Input - replacementContent length: ${replacementContent.length}, prettyPrint: ${prettyPrint}`,
    options,
  );

  try {
    // Find the table to replace
    const tableToReplace = findTable($, options);

    debug('replaceTable.ts', `Table to replace found: ${!!tableToReplace}`);

    if (!tableToReplace) {
      throw new Error('No table found to replace. Please check your selectors.');
    }

    // Replace the table with the new content
    $(tableToReplace).replaceWith(replacementContent);

    debugSample('replaceTable.ts', 'Replacement content sample', replacementContent);

    // Get the updated HTML
    let result = $.root().html() || '';

    debugSample('replaceTable.ts', 'Updated HTML sample (pre-minify)', result);

    // Apply minification only when needed and pretty print is disabled
    if (!prettyPrint && /\s{2,}/.test(result)) {
      result = minifyHtml.minify(Buffer.from(result), MINIFY_OPTIONS).toString();
      debugSample('replaceTable.ts', 'Updated HTML sample (minified)', result);
    }

    // If the input was a fragment, strip <html> and <body> tags from the output
    if (isFragment) {
      const $result = cheerio.load(result, { xmlMode: false });
      // If <body> exists, return its contents; otherwise, return the whole result
      if ($result('body').length > 0) {
        result = $result('body').html() || '';
      } else if ($result('html').length > 0) {
        result = $result('html').html() || '';
      }
    }

    debug('replaceTable.ts', 'Returning updated HTML', { length: result.length });
    return result;
  } catch (error) {
    debug('replaceTable.ts', `Error in replaceTable: ${error.message}`, error);
    throw new Error(`Table replacement error: ${error.message}`);
  }
}
