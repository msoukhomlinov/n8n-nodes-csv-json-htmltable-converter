import * as cheerio from 'cheerio';
import * as Papa from 'papaparse';
// Removed @minify-html/node import - using simpleHtmlMinify instead
import type { ConversionOptions, TableData, FormatType, HeadingInfo } from '../types';
import {
  DEFAULT_INCLUDE_HEADERS,
  DEFAULT_PRETTY_PRINT,
  simpleHtmlMinify,
} from './constants';
import { debug, debugSample } from './debug';
import { getPresetSelectorsLegacy, findTablesAfterElement } from './tableSelectors';
import type { TableUnderHeadingConfig, TableWithCaptionConfig } from '../types';
import { ValidationError } from './errors';
import { sanitizeHtml, validateHtmlInput } from './htmlSanitizer';
import { TableExtractor, DOMPerformanceMonitor } from './domOptimizer';


/**
 * Extracts table data from HTML
 */
function extractTableData(html: string, options: ConversionOptions, target: FormatType): TableData[] {
  // Validate and sanitize HTML input for security
  validateHtmlInput(html);
  const sanitizedHtml = sanitizeHtml(html);
  const $ = cheerio.load(sanitizedHtml);
  const tables: TableData[] = [];
  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;
  const multipleItems = options.multipleItems !== undefined ? options.multipleItems : false;

  debug('htmlConverter.ts', `extractTableData - includeTableHeaders: ${includeHeaders}`, {
    originalOption: options.includeTableHeaders,
    default: DEFAULT_INCLUDE_HEADERS,
  });

  // Determine which selectors to use based on mode
  let elementSelector: string;
  let tableSelector: string;

  if (options.selectorMode === 'simple') {
    // Use preset selectors for simple mode
    const preset = options.tablePreset || 'all-tables';
    const presetSelectors = getPresetSelectorsLegacy(preset, options);

    elementSelector = presetSelectors.elementSelector || 'html';

    // If custom preset, use the provided tableSelector
    if (preset === 'custom') {
      tableSelector = options.tableSelector?.trim() || 'table';
    } else {
      tableSelector = presetSelectors.tableSelector || 'table';
    }
  } else {
    // Use advanced mode with separate selectors
    elementSelector = options.elementSelector?.trim() || 'html';
    tableSelector = options.tableSelector?.trim() || 'table';
  }

  try {
    // Special handling for table-under-heading preset
    if (elementSelector === 'special:table-under-heading') {
      const config: TableUnderHeadingConfig = JSON.parse(tableSelector);
      const headingLevel = config.headingLevel;
      const headingSelector = config.headingSelector || `h${headingLevel}`;
      const headingText = config.headingText;
      const tableIndex = config.tableIndex;
      // Validate headingLevel
      if (typeof headingLevel !== 'number' || headingLevel < 1 || headingLevel > 999) {
        throw new ValidationError('Heading Level must be a number between 1 and 999.', {
          source: 'html',
          target,
        });
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
        processTable($, foundTable, includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
      } else {
        throw new Error(
          `No tables found after heading level h${headingLevel} containing "${
            headingText || 'any text'
          }" at index ${tableIndex}. Please check your HTML structure or try another preset.`,
        );
      }
      return tables;
    }

    // Special handling for table-with-caption preset
    if (elementSelector === 'special:table-with-caption') {
      const config: TableWithCaptionConfig = JSON.parse(tableSelector);
      const captionText = config.captionText;
      const matchingTables: cheerio.Element[] = [];
      $('table').each((_, table) => {
        const caption = $(table).find('caption').first();
        if (caption.length > 0) {
          const captionContent = caption.text().trim();
          if (
            captionText === '' ||
            captionContent.toLowerCase().includes(captionText.toLowerCase())
          ) {
            matchingTables.push(table);
          }
        }
      });
      if (matchingTables.length === 0) {
        throw new Error(
          `No tables found with <caption> containing "${
            captionText || 'any text'
          }". Please check your HTML or try another preset.`,
        );
      }
      if (multipleItems) {
        for (const table of matchingTables) {
          processTable($, table, includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
        }
      } else {
        processTable($, matchingTables[0], includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
      }
      return tables;
    }

    // If elementSelector is empty, use the root element
    const elements = elementSelector ? $(elementSelector) : $.root();

    if (elements.length === 0) {
      throw new Error(
        `No elements found matching the selector: "${elementSelector}". Try using a more general selector like "html" or "body".`,
      );
    }

    // Find tables within those elements
    let foundTables = false;

    elements.each((_, element) => {
      // Find tables using tableSelector (defaults to 'table' if empty)
      const tablesInElement = $(element).find(tableSelector);

      if (tablesInElement.length > 0) {
        foundTables = true;

        // If multipleItems is false and we're not using "all-tables" preset, only process the first table
        if (
          !multipleItems &&
          !(options.selectorMode === 'simple' && options.tablePreset === 'all-tables')
        ) {
          // For 'last-table' preset, process the last table found
          if (options.selectorMode === 'simple' && options.tablePreset === 'last-table') {
            processTable($, tablesInElement[tablesInElement.length - 1], includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
          } else {
            processTable($, tablesInElement[0], includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
          }
          return false; // Break each loop after processing the table
        }

        // Process all tables if multipleItems is true or we're using "all-tables" preset
        tablesInElement.each((_, table) => {
          processTable($, table, includeHeaders, tables, options.enableHeadingDetection, options.headingSelector);
        });
      }

      return true; // Continue the each() loop
    });

    if (!foundTables) {
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

    // If we found a large number of tables, add a note to the first table
    if (tables.length > 10 && multipleItems) {
      tables[0].headers.push(
        `NOTE: Found ${tables.length} tables. Consider using a more specific selector.`,
      );
    }
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
        throw new ValidationError(`Invalid element selector syntax: "${elementSelector}".${helpfulMessage}`, {
          source: 'html',
          target,
        });
      }
      if (tableSelector && error.message.includes(tableSelector)) {
        throw new ValidationError(`Invalid table selector syntax: "${tableSelector}".${helpfulMessage}`, {
          source: 'html',
          target,
        });
      }
      throw new ValidationError(`Invalid selector syntax. Please check your selectors.${helpfulMessage}`, {
        source: 'html',
        target,
      });
    }
    throw error;
  }

  return tables;
}

/**
 * Find the preceding heading element before a table
 */
function findPrecedingHeading(
  $: cheerio.Root,
  table: cheerio.Element,
  selector: string,
): string | null {
  if (!selector || selector.trim() === '') {
    return null;
  }

  try {
    // Get all elements matching the selector
    const allMatchingElements = $(selector);

    if (allMatchingElements.length === 0) {
      return null;
    }

    // Get all elements in document order to find positions
    const allElements = $('*');
    let tablePosition = -1;

    // Find table's position in document order
    allElements.each((index, elem) => {
      if (elem === table) {
        tablePosition = index;
        return false;
      }
      return true;
    });

    if (tablePosition === -1) {
      return null;
    }

    // Find the last matching element that appears before this table
    let foundHeading: cheerio.Element | null = null;
    let foundHeadingPosition = -1;

    allMatchingElements.each((_, elem) => {
      let elemPosition = -1;
      allElements.each((index, e) => {
        if (e === elem) {
          elemPosition = index;
          return false;
        }
        return true;
      });

      // Check if element comes before table in DOM order
      if (elemPosition !== -1 && elemPosition < tablePosition && elemPosition > foundHeadingPosition) {
        foundHeading = elem;
        foundHeadingPosition = elemPosition;
      }
      return true;
    });

    if (foundHeading) {
      return $(foundHeading).text().trim();
    }

    return null;
  } catch (error) {
    debug('htmlConverter.ts', `Error finding preceding heading: ${error.message}`);
    return null;
  }
}

/**
 * Find all preceding headings (h1-h5) before a table and return them as a hierarchy
 */
function findPrecedingHeadingHierarchy(
  $: cheerio.Root,
  table: cheerio.Element,
  selector?: string,
): HeadingInfo[] {
  const headingPath: HeadingInfo[] = [];

  // Get table position in document
  const allElements = $('*');
  let tablePosition = -1;
  allElements.each((index, elem) => {
    if (elem === table) {
      tablePosition = index;
      return false;
    }
    return true;
  });

  if (tablePosition === -1) return [];

  // Find all h1-h5 headings before the table, in document order
  const headingLevels = [1, 2, 3, 4, 5];
  const foundHeadings: Array<{position: number, level: number, text: string}> = [];

  headingLevels.forEach(level => {
    $(`h${level}`).each((_, heading) => {
      let headingPosition = -1;
      allElements.each((index, elem) => {
        if (elem === heading) {
          headingPosition = index;
          return false;
        }
        return true;
      });

      if (headingPosition !== -1 && headingPosition < tablePosition) {
        foundHeadings.push({
          position: headingPosition,
          level,
          text: $(heading).text().trim()
        });
      }
    });
  });

  // Sort by position and build hierarchy (only include headings that are in proper order)
  foundHeadings.sort((a, b) => a.position - b.position);

  // Build path: maintain proper hierarchy
  // If h2 comes after h1, include both. If h3 comes after h2, include all three.
  // If a higher level heading appears (e.g., h2 after h3), reset from that level
  let lastLevel = 0;
  foundHeadings.forEach(h => {
    if (h.level === 1) {
      // New top-level section - clear and start fresh
      headingPath.length = 0;
      headingPath.push({ level: h.level, text: h.text });
      lastLevel = 1;
    } else if (h.level > lastLevel) {
      // Next level in hierarchy - add it
      headingPath.push({ level: h.level, text: h.text });
      lastLevel = h.level;
    } else if (h.level <= lastLevel) {
      // Same or higher level - remove deeper levels and add this one
      while (headingPath.length > 0 && headingPath[headingPath.length - 1].level >= h.level) {
        headingPath.pop();
      }
      headingPath.push({ level: h.level, text: h.text });
      lastLevel = h.level;
    }
  });

  return headingPath;
}

/**
 * Sanitize heading text to be a valid JavaScript object key
 */
function sanitizeHeadingForKey(heading: string): string {
  if (!heading) return '';

  // Remove special characters, keep alphanumeric, spaces, hyphens, underscores
  let sanitized = heading.replace(/[^\w\s-]/g, '');

  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  return sanitized || '';
}

/**
 * Process a table element and extract its data
 */
function processTable(
  $: cheerio.Root,
  table: cheerio.Element,
  includeHeaders: boolean,
  tables: TableData[],
  enableHeadingDetection?: boolean,
  headingSelector?: string,
): void {
  debug('htmlConverter.ts', `processTable - includeHeaders: ${includeHeaders}`);

  // Use optimized table extractor with performance monitoring
  const extractor = new TableExtractor($.html());
  const tableData = DOMPerformanceMonitor.timeOperation(
    `extractTableData`,
    () => extractor.extractTableData(table, includeHeaders)
  );

  // Detect heading hierarchy if enabled
  if (enableHeadingDetection) {
    const headingPath = findPrecedingHeadingHierarchy($, table, headingSelector);
    if (headingPath.length > 0) {
      tableData.headingPath = headingPath;
      // Set heading for backward compatibility (last item in path)
      tableData.heading = headingPath[headingPath.length - 1].text;
    }
  } else if (headingSelector && headingSelector.trim() !== '') {
    // Legacy behaviour: use single heading if selector provided but detection not enabled
    const heading = findPrecedingHeading($, table, headingSelector);
    if (heading) {
      tableData.heading = heading;
    }
  }

  tables.push(tableData);
}


/**
 * Utility function to convert TableData to HTML string for debugging using Cheerio construction
 */
function tableDataToHtml(table: TableData): string {
  const $ = cheerio.load('');
  const tableElement = $('<table></table>');

  // Add headers if present
  if (table.headers.length > 0) {
    const thead = $('<thead></thead>');
    const headerRow = $('<tr></tr>').appendTo(thead);

    table.headers.forEach(header => {
      $('<th></th>').text(header).appendTo(headerRow);
    });

    tableElement.append(thead);
  }

  // Add rows
  const tbody = $('<tbody></tbody>');
  if (table.rows.length > 0) {
    // Only include first few rows for debugging
    const sampleRows = table.rows.slice(0, 3);
    sampleRows.forEach(rowData => {
      const row = $('<tr></tr>').appendTo(tbody);
      rowData.forEach(cell => {
        $('<td></td>').text(cell).appendTo(row);
      });
    });

    if (table.rows.length > 3) {
      const ellipsisRow = $('<tr></tr>').appendTo(tbody);
      $('<td></td>').attr('colspan', '100').text('...').appendTo(ellipsisRow);
    }
  }
  tableElement.append(tbody);

  return tableElement.toString();
}

/**
 * Utility function to build a complete table from TableData using Cheerio construction
 */
function buildTableFromTableData(table: TableData, $: any): any {
  const tableElement = $('<table></table>');

  // Add caption if present
  if (table.caption) {
    $('<caption></caption>').text(table.caption).appendTo(tableElement);
  }

  // Add headers if present
  if (table.headers.length > 0) {
    const thead = $('<thead></thead>');
    const headerRow = $('<tr></tr>').appendTo(thead);

    table.headers.forEach(header => {
      $('<th></th>').text(header).appendTo(headerRow);
    });

    tableElement.append(thead);
  }

  // Add rows
  const tbody = $('<tbody></tbody>');
  table.rows.forEach(rowData => {
    const row = $('<tr></tr>').appendTo(tbody);
    rowData.forEach(cell => {
      $('<td></td>').text(cell).appendTo(row);
    });
  });
  tableElement.append(tbody);

  return tableElement;
}

/**
 * Converts HTML table(s) to JSON
 */
export async function htmlToJson(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options, 'json');

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToJson - Extracted Tables', tablesHtml);
  }

  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;
  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;

  debug('htmlConverter.ts', `htmlToJson - includeTableHeaders: ${includeHeaders}`, {
    originalOption: options.includeTableHeaders,
    default: DEFAULT_INCLUDE_HEADERS,
  });

  if (tables.length === 0) {
    throw new ValidationError('No tables found in HTML', {
      source: 'html',
      target: 'json',
    });
  }

  // Only nest output if multipleItems is true AND we have multiple tables
  // OR if heading detection is enabled and we have multiple tables (for "all tables" preset)
  if ((options.multipleItems && tables.length > 1) || (options.enableHeadingDetection && tables.length > 1)) {
    // Check if heading detection is enabled
    const useHeadingKeys = options.enableHeadingDetection;

    if (useHeadingKeys) {
      // Use headings as object keys with nested structure
      const jsonData: Record<string, any> = {};

      tables.forEach((table, tableIndex) => {
        const tableData = [];

        if (table.headers.length > 0 && includeHeaders) {
          debug('htmlConverter.ts', `htmlToJson - Including headers for table ${tableIndex + 1}`);
          for (const row of table.rows) {
            const rowObj: Record<string, string> = {};
            table.headers.forEach((header: string, index: number) => {
              if (index < row.length) {
                rowObj[header] = row[index];
              }
            });
            tableData.push(rowObj);
          }
        } else {
          debug('htmlConverter.ts', `htmlToJson - Not including headers for table ${tableIndex + 1}`);
          tableData.push(...table.rows);
        }

        if (table.headingPath && table.headingPath.length > 0) {
          // Build nested structure based on heading hierarchy
          let current = jsonData;

          for (let i = 0; i < table.headingPath.length; i++) {
            const headingInfo = table.headingPath[i];
            const key = sanitizeHeadingForKey(headingInfo.text);

            if (i === table.headingPath.length - 1) {
              // Last level - this is where the table data goes
              if (!current[key]) {
                current[key] = [];
              }
              // Handle multiple tables with same heading path
              if (Array.isArray(current[key])) {
                current[key].push(...tableData);
              } else if (typeof current[key] === 'object') {
                // Key exists as object (has subsections) - add data to _data property
                if (!current[key]._data) {
                  current[key]._data = [];
                }
                current[key]._data.push(...tableData);
              }
            } else {
              // Intermediate level - create or traverse nested object
              if (!current[key]) {
                current[key] = {};
              } else if (Array.isArray(current[key])) {
                // Key exists as array - convert to object with _data property
                const existingData = current[key];
                current[key] = { _data: existingData };
              }
              current = current[key];
            }
          }
        } else if (table.heading) {
          // Fallback to single heading (backward compatibility)
          const key = sanitizeHeadingForKey(table.heading);
          if (!jsonData[key]) {
            jsonData[key] = [];
          }
          if (Array.isArray(jsonData[key])) {
            jsonData[key].push(...tableData);
          } else if (typeof jsonData[key] === 'object') {
            if (!jsonData[key]._data) {
              jsonData[key]._data = [];
            }
            jsonData[key]._data.push(...tableData);
          }
        } else {
          // No heading - use table index
          jsonData[`table_${tableIndex + 1}`] = tableData;
        }
      });

      const result = JSON.stringify(jsonData, null, prettyPrint ? 2 : 0);
      debugSample('htmlConverter.ts', 'htmlToJson - Output JSON (multiple tables with heading keys)', result);
      return result;
    }

    // Existing array-based output for when heading detection is disabled
    const jsonData = tables.map((table, tableIndex) => {
      const tableData = [];
      debug(
        'htmlConverter.ts',
        `htmlToJson - Table ${tableIndex + 1} - Headers available: ${
          table.headers.length > 0
        }, includeHeaders: ${includeHeaders}`,
      );

      if (table.headers.length > 0 && includeHeaders) {
        debug('htmlConverter.ts', `htmlToJson - Including headers for table ${tableIndex + 1}`);
        for (const row of table.rows) {
          const rowObj: Record<string, string> = {};
          table.headers.forEach((header: string, index: number) => {
            if (index < row.length) {
              rowObj[header] = row[index];
            }
          });
          tableData.push(rowObj);
        }
      } else {
        debug('htmlConverter.ts', `htmlToJson - Not including headers for table ${tableIndex + 1}`);
        tableData.push(...table.rows);
      }

      // Include caption if present
      const result: Record<string, unknown> = { data: tableData };
      if (table.caption) {
        result.caption = table.caption;
      }
      return result;
    });

    const result = JSON.stringify(jsonData, null, prettyPrint ? 2 : 0);
    debugSample('htmlConverter.ts', 'htmlToJson - Output JSON (multiple tables)', result);
    return result;
  }

  // Default: handle as single table (either just one table or multipleItems is false)
  const table = tables[0];
  const jsonData = [];
  debug(
    'htmlConverter.ts',
    `htmlToJson - Single table - Headers available: ${
      table.headers.length > 0
    }, includeHeaders: ${includeHeaders}`,
  );

  // Convert to array of objects with headers as keys if includeHeaders is true
  if (table.headers.length > 0 && includeHeaders) {
    debug('htmlConverter.ts', 'htmlToJson - Including headers for single table');
    for (const row of table.rows) {
      const rowObj: Record<string, string> = {};
      table.headers.forEach((header: string, index: number) => {
        if (index < row.length) {
          rowObj[header] = row[index];
        }
      });
      jsonData.push(rowObj);
    }
  } else {
    debug('htmlConverter.ts', 'htmlToJson - Not including headers for single table');
    // No headers available or not including headers, just return array of arrays
    jsonData.push(...table.rows);
  }

  // Include caption if present
  let resultObj: Record<string, unknown> | unknown[] = jsonData;
  if (table.caption) {
    resultObj = { caption: table.caption, data: jsonData };
  }

  const result = JSON.stringify(resultObj, null, prettyPrint ? 2 : 0);
  debugSample('htmlConverter.ts', 'htmlToJson - Output JSON (single table)', result);
  return result;
}

/**
 * Converts HTML table(s) to CSV
 */
export async function htmlToCsv(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options, 'csv');

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToCsv - Extracted Tables', tablesHtml);
  }

  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;

  debug('htmlConverter.ts', `htmlToCsv - includeTableHeaders: ${includeHeaders}`, {
    originalOption: options.includeTableHeaders,
    default: DEFAULT_INCLUDE_HEADERS,
  });

  if (tables.length === 0) {
    throw new ValidationError('No tables found in HTML', {
      source: 'html',
      target: 'csv',
    });
  }

  const delimiter = options.csvDelimiter || ',';
  let csvContent = '';

  // Only nest output if multipleItems is true AND we have multiple tables
  if (options.multipleItems && tables.length > 1) {
    // Multiple tables - we'll separate them with blank lines
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      debug(
        'htmlConverter.ts',
        `htmlToCsv - Table ${i + 1} - Headers available: ${
          table.headers.length > 0
        }, includeHeaders: ${includeHeaders}`,
      );

      if (i > 0) {
        csvContent += '\n\n';
      }

      // Add heading as a comment row if present, otherwise use caption
      if (table.headingPath && table.headingPath.length > 0) {
        // Output full hierarchy as comment
        const headingPathStr = table.headingPath.map(h => h.text).join(' > ');
        csvContent += `# ${headingPathStr}\n`;
      } else if (table.heading) {
        csvContent += `# ${table.heading}\n`;
      } else if (table.caption) {
        csvContent += `# ${table.caption}\n`;
      }

      // Add headers if present and includeHeaders is true
      if (table.headers.length > 0 && includeHeaders) {
        debug('htmlConverter.ts', `htmlToCsv - Including headers for table ${i + 1}`);
        csvContent += Papa.unparse(
          {
            fields: table.headers,
            data: table.rows,
          },
          { delimiter, header: true },
        );
      } else {
        debug('htmlConverter.ts', `htmlToCsv - Not including headers for table ${i + 1}`);
        // No headers available or includeHeaders is false, just convert rows
        csvContent += Papa.unparse(table.rows, { delimiter, header: false });
      }
    }

    debugSample('htmlConverter.ts', 'htmlToCsv - Output CSV (multiple tables)', csvContent);
    return csvContent;
  }

  // Default: handle as single table (either just one table or multipleItems is false)
  const table = tables[0];
  debug(
    'htmlConverter.ts',
    `htmlToCsv - Single table - Headers available: ${
      table.headers.length > 0
    }, includeHeaders: ${includeHeaders}`,
  );

  // Add heading as a comment row if present, otherwise use caption
  if (table.headingPath && table.headingPath.length > 0) {
    // Output full hierarchy as comment
    const headingPathStr = table.headingPath.map(h => h.text).join(' > ');
    csvContent += `# ${headingPathStr}\n`;
  } else if (table.heading) {
    csvContent += `# ${table.heading}\n`;
  } else if (table.caption) {
    csvContent += `# ${table.caption}\n`;
  }

  // Add headers if present and includeHeaders is true
  if (table.headers.length > 0 && includeHeaders) {
    debug('htmlConverter.ts', 'htmlToCsv - Including headers for table 1');
    csvContent += Papa.unparse(
      {
        fields: table.headers,
        data: table.rows,
      },
      { delimiter, header: true },
    );
  } else {
    debug('htmlConverter.ts', 'htmlToCsv - Not including headers for table 1');
    // No headers available or includeHeaders is false, just convert rows
    csvContent += Papa.unparse(table.rows, { delimiter, header: false });
  }

  debugSample('htmlConverter.ts', 'htmlToCsv - Output CSV (single table)', csvContent);
  return csvContent;
}

/**
 * Converts HTML table(s) to standardized HTML table(s)
 */
export async function htmlToHtml(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options, 'html');

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToHtml - Extracted Tables', tablesHtml);
  }

  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  if (tables.length === 0) {
    throw new ValidationError('No tables found in HTML', {
      source: 'html',
      target: 'html',
    });
  }

  const $ = cheerio.load('');

  // Handle multiple tables vs single table using Cheerio construction
  if (!options.multipleItems && tables.length === 1) {
    // Single table
    const table = buildTableFromTableData(tables[0], $);

    // Format output based on pretty print option
    let output = table.toString();

    if (prettyPrint) {
      // For pretty print, use cheerio's built-in formatting
      output = $.html(table);
    } else {
      // For minified output, use the existing minifier
      output = simpleHtmlMinify(output);
    }

    return output;
  } else {
    // Multiple tables
    const tablesContainer = $('<div></div>'); // Temporary container for multiple tables

    tables.forEach((tableData, index) => {
      const table = buildTableFromTableData(tableData, $);
      tablesContainer.append(table);

      // Add spacing between tables for pretty print
      if (index < tables.length - 1 && prettyPrint) {
        tablesContainer.append('\n\n');
      }
    });

    // Get the HTML content without the wrapper div
    let output = '';
    tablesContainer.children().each((index, element) => {
      if (index > 0 && prettyPrint) {
        output += '\n\n';
      }
      output += $(element).toString();
    });

    // Apply minification if pretty print is disabled
    if (!prettyPrint) {
      output = simpleHtmlMinify(output);
    }

    return output;
  }
}
