import * as cheerio from 'cheerio';
import type { ConversionOptions, TablePreset } from '../types';
import { minify } from 'html-minifier';
import { DEFAULT_PRETTY_PRINT } from './constants';
import { debug, debugSample } from './debug';

/**
 * Maps preset options to corresponding selectors
 * This is reused from htmlConverter.ts
 */
function getPresetSelectors(preset: TablePreset, options: ConversionOptions): { elementSelector: string; tableSelector: string } {
  switch (preset) {
    case 'all-tables':
      return { elementSelector: 'html', tableSelector: 'table' };
    case 'first-table':
      return { elementSelector: 'html', tableSelector: 'table:first-of-type' };
    case 'last-table':
      return { elementSelector: 'html', tableSelector: 'table:last-of-type' };
    case 'table-under-heading': {
      // Get the heading level (default to h2 if not specified)
      const headingLevel = options.headingLevel || 'h2';
      // Get the table index (default to 1 if not specified)
      const tableIndex = options.tableIndex || 1;

      // For table-under-heading, we'll return a special value that will be handled
      // in the findTable function with a custom implementation
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify({
          headingLevel,
          headingText: options.headingText?.trim() || '',
          tableIndex
        })
      };
    }
    case 'custom':
      // For custom, we'll use the provided tableSelector
      return { elementSelector: 'html', tableSelector: '' };
    default:
      return { elementSelector: 'html', tableSelector: 'table' };
  }
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
      const headingText = config.headingText;
      const tableIndex = config.tableIndex;

      // Find all tables that come after the specified heading
      const tablesAfterHeading: cheerio.Element[] = [];

      // Find all headings with the specified text
      $(headingLevel).each((_, heading) => {
        const headingContent = $(heading).text().trim();

        // Check if the heading contains the specified text (case-insensitive)
        if (headingText === '' || headingContent.toLowerCase().includes(headingText.toLowerCase())) {
          // Find all tables that come after this heading in the document
          let currentElement = heading;
          let nextElement = currentElement.next;

          while (nextElement !== null) {
            // If we hit another heading of the same or higher level, stop
            if (nextElement.type === 'tag' &&
                nextElement.name &&
                nextElement.name.match(/^h[1-6]$/) &&
                Number.parseInt(nextElement.name.substring(1), 10) <= Number.parseInt(headingLevel.substring(1), 10)) {
              break;
            }

            // If current element is a table or contains tables, add them
            if (nextElement.type === 'tag') {
              if (nextElement.name === 'table') {
                tablesAfterHeading.push(nextElement);
              } else {
                $(nextElement).find('table').each((_, table) => {
                  tablesAfterHeading.push(table);
                });
              }
            }

            currentElement = nextElement;
            nextElement = currentElement.next;
          }
        }
      });

      // Return the table at the specified index (if available)
      if (tablesAfterHeading.length >= tableIndex) {
        return tablesAfterHeading[tableIndex - 1];
      }

      // If table index is out of range but we found some tables, use the first one
      if (tablesAfterHeading.length > 0) {
        return tablesAfterHeading[0];
      }

      // No tables found after matching headings
      throw new Error(`No tables found after heading ${headingLevel} containing "${headingText || 'any text'}". Please check your HTML structure or try another preset.`);
    }

    // If elementSelector is empty, use the root element
    const elements = elementSelector ? $(elementSelector) : $.root();

    if (elements.length === 0) {
      throw new Error(`No elements found matching the selector: "${elementSelector}". Try using a more general selector like "html" or "body".`);
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
      const helpfulMessage = options.selectorMode === 'simple' && options.tablePreset !== 'custom'
        ? '\nTry another preset or switch to Advanced mode for more control.'
        : '\nHere are some suggestions:\n- Check if your HTML actually contains <table> elements\n- Try using a more general selector like "table" or "div table"\n- Switch to Simple mode and try the different presets\n- Use browser developer tools to identify the correct selectors';

      const elementSelectorMsg = elementSelector ? ` matching: "${elementSelector}"` : '';
      throw new Error(`No tables found matching the selector: "${tableSelector}" within elements${elementSelectorMsg}.${helpfulMessage}`);
    }

    return foundTable;
  } catch (error) {
    // Rethrow the error with a clear message
    if (error.message.includes('SyntaxError') || error.message.includes('sub-selector')) {
      // Handle syntax errors with helpful messages
      const helpfulMessage = '\nCommon issues include:'
        + '\n- Incorrect CSS syntax (missing quotes, brackets, etc.)'
        + '\n- Using JavaScript-specific selectors not supported by Cheerio'
        + '\n- Using complex pseudo-selectors'
        + '\nTry switching to Simple mode and using a preset, or see Cheerio documentation for supported selectors.';

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
  // Add explicit return to fix "not all code paths return a value" error
  return null;
}

/**
 * Replaces a table in HTML content with new content
 */
export async function replaceTable(
  html: string,
  replacementContent: string,
  options: ConversionOptions
): Promise<string> {
  debug('replaceTable.ts', 'replaceTable - Input', { html: html?.slice(0, 150) + (html.length > 150 ? '...' : ''), replacementContent: replacementContent?.slice(0, 150) + (replacementContent.length > 150 ? '...' : ''), options });
  const $ = cheerio.load(html);
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;
  const isReplaceAll = options.selectorMode === 'simple' && options.tablePreset === 'all-tables';

  try {
    // --- Logic to find and replace tables ---
    let tablesFound = 0;

    // Determine selectors based on mode
    let elementSelector: string;
    let tableSelector: string;

    if (options.selectorMode === 'simple') {
      const preset = options.tablePreset || 'all-tables';
      const presetSelectors = getPresetSelectors(preset, options);
      elementSelector = presetSelectors.elementSelector;
      tableSelector = (preset === 'custom' ? options.tableSelector?.trim() : presetSelectors.tableSelector) || 'table';
      debug('replaceTable.ts', 'SelectorMode: simple', { preset, elementSelector, tableSelector });
    } else { // Advanced mode
      elementSelector = options.elementSelector?.trim() || 'html';
      tableSelector = options.tableSelector?.trim() || 'table';
      debug('replaceTable.ts', 'SelectorMode: advanced', { elementSelector, tableSelector });
    }

    // Special handling for table-under-heading (finds only one specific table)
    if (elementSelector === 'special:table-under-heading') {
      const tableToReplace = findTable($, options); // findTable handles the logic for this preset
      if (!tableToReplace) {
        debug('replaceTable.ts', 'No table found for table-under-heading');
        throw new Error('No table found matching the \'table-under-heading\' criteria.'); // Error from findTable will be more specific
      }
      $(tableToReplace).replaceWith(replacementContent);
      tablesFound = 1;
      debug('replaceTable.ts', 'Replaced table-under-heading');
    } else {
      // Handle all other presets/modes
      const elements = elementSelector ? $(elementSelector) : $.root();
      if (elements.length === 0 && elementSelector) {
        debug('replaceTable.ts', 'No elements found for selector', elementSelector);
        throw new Error(`No elements found matching the container selector: \"${elementSelector}\".`);
      }

      // Process elements to find and replace tables
      elements.each((_, element) => {
        const tablesInElement = $(element).find(tableSelector);
        debug('replaceTable.ts', 'Tables found in element', tablesInElement.length);

        if (tablesInElement.length > 0) {
          if (isReplaceAll) {
            // Replace ALL tables found within this element
            tablesInElement.each((idx, table) => {
              $(table).replaceWith(replacementContent);
              tablesFound++;
            });
            debug('replaceTable.ts', 'Replaced all tables in element', tablesInElement.length);
            // Don't return false here - continue processing all elements
          } else {
            // Replace only the FIRST table found (for first-table, last-table, custom)
            // Note: findTable handles first/last logic more specifically if needed, but this covers custom/default
            const tableToReplace = tablesInElement.first(); // Use first() for clarity
            $(tableToReplace).replaceWith(replacementContent);
            tablesFound++;
            debug('replaceTable.ts', 'Replaced first table in element');
            return false; // Stop searching after replacing the first one
          }
        }
        return true; // Continue to next element regardless (ensures explicit return for all paths)
      });
    }

    debug('replaceTable.ts', 'Total tables replaced', tablesFound);

    // Throw error if no tables were replaced
    if (tablesFound === 0) {
      debug('replaceTable.ts', 'No tables replaced, throwing error');
      // Use the detailed error generation logic from findTable if possible, or craft a new one.
      // Re-running findTable just for the error message might be inefficient.
      // Let's craft a message based on the selectors used.
      const elementMsg = elementSelector && elementSelector !== 'html' ? ` within elements matching \"${elementSelector}\"` : '';
      const presetMsg = options.selectorMode === 'simple' && options.tablePreset ? ` using preset '${options.tablePreset}'` : '';
      throw new Error(`No tables found to replace matching selector \"${tableSelector}\"${elementMsg}${presetMsg}. Check your selectors and HTML structure.`);
    }

    // Get the updated HTML
    let result = $.html();

    // Apply minification if pretty print is disabled
    if (!prettyPrint) {
      result = minify(result, {
        collapseWhitespace: true,
        removeComments: true,
        removeEmptyAttributes: true,
        removeRedundantAttributes: true
      });
    }

    debugSample('replaceTable.ts', 'replaceTable - Output sample', result?.slice(0, 150) + (result.length > 150 ? '...' : ''));
    return result;
  } catch (error) {
    debug('replaceTable.ts', 'Error in replaceTable', error);
    throw new Error(`Table replacement error: ${error.message}`);
  }
}
