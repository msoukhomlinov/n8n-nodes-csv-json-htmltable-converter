import * as cheerio from 'cheerio';
import Papa from 'papaparse';
import minifyHtml from '@minify-html/node';
import type { ConversionOptions, TableData, TablePreset } from '../types';
import { DEFAULT_INCLUDE_HEADERS, DEFAULT_PRETTY_PRINT } from './constants';
import { debug, debugSample } from './debug';

/**
 * Maps preset options to corresponding selectors
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
      // Get the heading level (default to 1 if not specified)
      let headingLevel = typeof options.headingLevel === 'number' ? options.headingLevel : 1;
      if (headingLevel < 1 || headingLevel > 999) headingLevel = 1;
      const headingSelector = `h${headingLevel}`;
      // Get the table index (default to 1 if not specified)
      const tableIndex = options.tableIndex || 1;
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify({
          headingLevel: headingLevel,
          headingSelector,
          headingText: options.headingText?.trim() || '',
          tableIndex
        })
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
 * Extracts table data from HTML
 */
function extractTableData(html: string, options: ConversionOptions): TableData[] {
  const $ = cheerio.load(html);
  const tables: TableData[] = [];
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  const multipleItems = options.multipleItems !== undefined ? options.multipleItems : false;

  debug('htmlConverter.ts', `extractTableData - includeTableHeaders: ${includeHeaders}`, { originalOption: options.includeTableHeaders, default: DEFAULT_INCLUDE_HEADERS });

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
        if (headingText === '' || headingContent.toLowerCase().includes(headingText.toLowerCase())) {
          // Use nextAll('table') to get all direct sibling tables after the heading
          const tablesAfterHeading = $(heading).nextAll('table');
          if (tablesAfterHeading.length >= tableIndex) {
            foundTable = tablesAfterHeading[tableIndex - 1];
            return false; // Stop after finding the correct heading and table
          }
        }
        return true;
      });
      if (foundTable) {
        processTable($, foundTable, includeHeaders, tables);
      } else {
        throw new Error(`No tables found after heading level h${headingLevel} containing "${headingText || 'any text'}" at index ${tableIndex}. Please check your HTML structure or try another preset.`);
      }
      return tables;
    }

    // Special handling for table-with-caption preset
    if (elementSelector === 'special:table-with-caption') {
      const config = JSON.parse(tableSelector);
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
          `No tables found with <caption> containing "${captionText || 'any text'}". Please check your HTML or try another preset.`
        );
      }
      if (multipleItems) {
        for (const table of matchingTables) {
          processTable($, table, includeHeaders, tables);
        }
      } else {
        processTable($, matchingTables[0], includeHeaders, tables);
      }
      return tables;
    }

    // If elementSelector is empty, use the root element
    const elements = elementSelector ? $(elementSelector) : $.root();

    if (elements.length === 0) {
      throw new Error(`No elements found matching the selector: "${elementSelector}". Try using a more general selector like "html" or "body".`);
    }

    // Find tables within those elements
    let foundTables = false;

    elements.each((_, element) => {
      // Find tables using tableSelector (defaults to 'table' if empty)
      const tablesInElement = $(element).find(tableSelector);

      if (tablesInElement.length > 0) {
        foundTables = true;

        // If multipleItems is false and we're not using "all-tables" preset, only process the first table
        if (!multipleItems && !(options.selectorMode === 'simple' && options.tablePreset === 'all-tables')) {
          processTable($, tablesInElement[0], includeHeaders, tables);
          return false; // Break each loop after processing the first table
        }

        // Process all tables if multipleItems is true or we're using "all-tables" preset
        tablesInElement.each((_, table) => {
          processTable($, table, includeHeaders, tables);
        });
      }

      return true; // Continue the each() loop
    });

    if (!foundTables) {
      // Prepare helpful error message with suggestions
      const helpfulMessage = options.selectorMode === 'simple' && options.tablePreset !== 'custom'
        ? '\nTry another preset or switch to Advanced mode for more control.'
        : '\nHere are some suggestions:\n- Check if your HTML actually contains <table> elements\n- Try using a more general selector like "table" or "div table"\n- Switch to Simple mode and try the different presets\n- Use browser developer tools to identify the correct selectors';

      const elementSelectorMsg = elementSelector ? ` matching: "${elementSelector}"` : '';
      throw new Error(`No tables found matching the selector: "${tableSelector}" within elements${elementSelectorMsg}.${helpfulMessage}`);
    }

    // If we found a large number of tables, add a note to the first table
    if (tables.length > 10 && multipleItems) {
      tables[0].headers.push(`NOTE: Found ${tables.length} tables. Consider using a more specific selector.`);
    }
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

  return tables;
}

/**
 * Process a table element and extract its data
 */
function processTable($: cheerio.Root, table: cheerio.Element, includeHeaders: boolean, tables: TableData[]): void {
  debug('htmlConverter.ts', `processTable - includeHeaders: ${includeHeaders}`);

  const tableData: TableData = {
    headers: [],
    rows: [],
  };

  // Extract caption if present
  const caption = $(table).find('caption').first();
  if (caption.length > 0) {
    tableData.caption = caption.text().trim();
  }

  // Determine if there's a header row we can identify
  let headerRowSelector = '';
  let isHeaderRowIdentified = false;

  // Check if there's a thead with rows
  if ($(table).find('thead tr').length > 0) {
    headerRowSelector = 'thead tr:first-child';
    isHeaderRowIdentified = true;
  } else {
    // If no thead, check if first row has th elements
    if ($(table).find('tr:first-child th').length > 0) {
      headerRowSelector = 'tr:first-child';
      isHeaderRowIdentified = true;
    } else if ($(table).find('tr').length > 0) {
      // If no clear header indicators, assume first row is header
      headerRowSelector = 'tr:first-child';
      isHeaderRowIdentified = true;
    }
  }

  // Extract headers if we found a header row (regardless of includeHeaders flag)
  // We need the headers for internal use even if they won't be included in output
  if (headerRowSelector) {
    $(table).find(`${headerRowSelector} th, ${headerRowSelector} td`).each((_, cell) => {
      tableData.headers.push($(cell).text().trim());
    });
  }

  // Determine which rows to extract as data
  let dataRowSelector: string;

  if (isHeaderRowIdentified) {
    // Skip the header row
    dataRowSelector = headerRowSelector === 'thead tr:first-child' ?
      'tbody tr, tr:not(thead tr)' : 'tr:not(:first-child)';
  } else {
    // No header row identified, include all rows
    dataRowSelector = 'tr';
  }

  // Extract data rows
  $(table).find(dataRowSelector).each((_, row) => {
    const rowData: string[] = [];
    $(row).find('td, th').each((_, cell) => {
      rowData.push($(cell).text().trim());
    });

    if (rowData.length > 0) {
      tableData.rows.push(rowData);
    }
  });

  tables.push(tableData);
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Utility function to convert TableData to HTML string for debugging
 */
function tableDataToHtml(table: TableData): string {
  let html = '<table>';

  // Add headers if present
  if (table.headers.length > 0) {
    html += '<thead><tr>';
    for (const header of table.headers) {
      html += `<th>${escapeHtml(header)}</th>`;
    }
    html += '</tr></thead>';
  }

  // Add rows
  html += '<tbody>';
  if (table.rows.length > 0) {
    // Only include first few rows for debugging
    const sampleRows = table.rows.slice(0, 3);
    for (const row of sampleRows) {
      html += '<tr>';
      for (const cell of row) {
        html += `<td>${escapeHtml(cell)}</td>`;
      }
      html += '</tr>';
    }
    if (table.rows.length > 3) {
      html += '<tr><td colspan="100">...</td></tr>';
    }
  }
  html += '</tbody></table>';

  return html;
}

/**
 * Converts HTML table(s) to JSON
 */
export async function htmlToJson(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options);

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToJson - Extracted Tables', tablesHtml);
  }

  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;

  debug('htmlConverter.ts', `htmlToJson - includeTableHeaders: ${includeHeaders}`, { originalOption: options.includeTableHeaders, default: DEFAULT_INCLUDE_HEADERS });

  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }

  // Only nest output if multipleItems is true AND we have multiple tables
  if (options.multipleItems && tables.length > 1) {
    // Multiple tables
    const jsonData = tables.map((table, tableIndex) => {
      const tableData = [];
      debug('htmlConverter.ts', `htmlToJson - Table ${tableIndex + 1} - Headers available: ${table.headers.length > 0}, includeHeaders: ${includeHeaders}`);

      if (table.headers.length > 0 && includeHeaders) {
        debug('htmlConverter.ts', `htmlToJson - Including headers for table ${tableIndex + 1}`);
        for (const row of table.rows) {
          const rowObj: Record<string, string> = {};
          table.headers.forEach((header, index) => {
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
  debug('htmlConverter.ts', `htmlToJson - Single table - Headers available: ${table.headers.length > 0}, includeHeaders: ${includeHeaders}`);

  // Convert to array of objects with headers as keys if includeHeaders is true
  if (table.headers.length > 0 && includeHeaders) {
    debug('htmlConverter.ts', 'htmlToJson - Including headers for single table');
    for (const row of table.rows) {
      const rowObj: Record<string, string> = {};
      table.headers.forEach((header, index) => {
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
  const tables = extractTableData(html, options);

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToCsv - Extracted Tables', tablesHtml);
  }

  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;

  debug('htmlConverter.ts', `htmlToCsv - includeTableHeaders: ${includeHeaders}`, { originalOption: options.includeTableHeaders, default: DEFAULT_INCLUDE_HEADERS });

  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }

  const delimiter = options.csvDelimiter || ',';
  let csvContent = '';

  // Only nest output if multipleItems is true AND we have multiple tables
  if (options.multipleItems && tables.length > 1) {
    // Multiple tables - we'll separate them with blank lines
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      debug('htmlConverter.ts', `htmlToCsv - Table ${i + 1} - Headers available: ${table.headers.length > 0}, includeHeaders: ${includeHeaders}`);

      if (i > 0) {
        csvContent += '\n\n';
      }

      // Add caption as a comment row if present
      if (table.caption) {
        csvContent += `# ${table.caption}\n`;
      }

      // Add headers if present and includeHeaders is true
      if (table.headers.length > 0 && includeHeaders) {
        debug('htmlConverter.ts', `htmlToCsv - Including headers for table ${i + 1}`);
        csvContent += Papa.unparse({
          fields: table.headers,
          data: table.rows
        }, { delimiter, header: true });
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
  debug('htmlConverter.ts', `htmlToCsv - Single table - Headers available: ${table.headers.length > 0}, includeHeaders: ${includeHeaders}`);

  // Add caption as a comment row if present
  if (table.caption) {
    csvContent += `# ${table.caption}\n`;
  }

  // Add headers if present and includeHeaders is true
  if (table.headers.length > 0 && includeHeaders) {
    debug('htmlConverter.ts', 'htmlToCsv - Including headers for table 1');
    csvContent += Papa.unparse({
      fields: table.headers,
      data: table.rows
    }, { delimiter, header: true });
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
  const tables = extractTableData(html, options);

  // Log extracted tables HTML
  if (tables.length > 0) {
    const tablesHtml = tables.map(tableDataToHtml).join('\n');
    debugSample('htmlConverter.ts', 'htmlToHtml - Extracted Tables', tablesHtml);
  }

  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }

  let output = '';
  const indentation = prettyPrint ? '\n  ' : '';

  // Handle multiple tables vs single table
  if (!options.multipleItems && tables.length === 1) {
    const table = tables[0];

    output += '<table>';

    // Add caption if present
    if (table.caption) {
      output += `${indentation}<caption>${escapeHtml(table.caption)}</caption>`;
    }

    // Add headers if present
    if (table.headers.length > 0) {
      output += `${indentation}<thead>`;
      output += `${indentation}  <tr>`;

      for (const header of table.headers) {
        output += `${indentation}    <th>${escapeHtml(header)}</th>`;
      }

      output += `${indentation}  </tr>`;
      output += `${indentation}</thead>`;
    }

    // Add rows
    output += `${indentation}<tbody>`;

    for (const row of table.rows) {
      output += `${indentation}  <tr>`;

      for (const cell of row) {
        output += `${indentation}    <td>${escapeHtml(cell)}</td>`;
      }

      output += `${indentation}  </tr>`;
    }

    output += `${indentation}</tbody>`;
    output += prettyPrint ? '\n</table>' : '</table>';
  } else {
    // Multiple tables
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];

      if (i > 0) {
        output += prettyPrint ? '\n\n' : '';
      }

      output += '<table>';

      // Add caption if present
      if (table.caption) {
        output += `${indentation}<caption>${escapeHtml(table.caption)}</caption>`;
      }

      // Add headers if present
      if (table.headers.length > 0) {
        output += `${indentation}<thead>`;
        output += `${indentation}  <tr>`;

        for (const header of table.headers) {
          output += `${indentation}    <th>${escapeHtml(header)}</th>`;
        }

        output += `${indentation}  </tr>`;
        output += `${indentation}</thead>`;
      }

      // Add rows
      output += `${indentation}<tbody>`;

      for (const row of table.rows) {
        output += `${indentation}  <tr>`;

        for (const cell of row) {
          output += `${indentation}    <td>${escapeHtml(cell)}</td>`;
        }

        output += `${indentation}  </tr>`;
      }

      output += `${indentation}</tbody>`;
      output += prettyPrint ? '\n</table>' : '</table>';
    }
  }

  // Apply minification if pretty print is disabled
  if (!prettyPrint) {
    output = minifyHtml.minify(Buffer.from(output), {
      minify_whitespace: true,
      keepComments: false,
      keepSpacesBetweenAttributes: false,
      keepHtmlAndHeadOpeningTags: false
    } as unknown as object).toString();
  }

  return output;
}
