import * as cheerio from 'cheerio';
import Papa from 'papaparse';
import { minify } from 'html-minifier';
import type { ConversionOptions, TableData, TablePreset } from '../types';
import { DEFAULT_INCLUDE_HEADERS, DEFAULT_PRETTY_PRINT } from './constants';

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
      // Get the heading level (default to h2 if not specified)
      const headingLevel = options.headingLevel || 'h2';
      // Get the table index (default to 1 if not specified)
      const tableIndex = options.tableIndex || 1;

      // For table-under-heading, we'll return a special value that will be handled
      // in the extractTableData function with a custom implementation
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
 * Extracts table data from HTML
 */
function extractTableData(html: string, options: ConversionOptions): TableData[] {
  const $ = cheerio.load(html);
  const tables: TableData[] = [];
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  const multipleItems = options.multipleItems !== undefined ? options.multipleItems : false;

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

      // Process the table at the specified index (if available)
      if (tablesAfterHeading.length >= tableIndex) {
        processTable($, tablesAfterHeading[tableIndex - 1], includeHeaders, tables);
      } else if (tablesAfterHeading.length > 0) {
        // If table index is out of range but we found some tables, use the first one
        processTable($, tablesAfterHeading[0], includeHeaders, tables);
      } else {
        // No tables found after matching headings
        throw new Error(`No tables found after heading ${headingLevel} containing "${headingText || 'any text'}". Please check your HTML structure or try another preset.`);
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
  const tableData: TableData = {
    headers: [],
    rows: [],
  };

  // Extract headers only if required
  if (includeHeaders) {
    $(table).find('thead tr th, thead tr td').each((_, cell) => {
      tableData.headers.push($(cell).text().trim());
    });

    // If no thead, use the first row as headers
    if (tableData.headers.length === 0) {
      $(table).find('tr:first-child th, tr:first-child td').each((_, cell) => {
        tableData.headers.push($(cell).text().trim());
      });
    }

    // Extract rows, excluding the first row if it was used for headers
    const rowSelector = tableData.headers.length > 0 ? 'tbody tr, tr:not(:first-child)' : 'tbody tr, tr';

    $(table).find(rowSelector).each((_, row) => {
      const rowData: string[] = [];
      $(row).find('td, th').each((_, cell) => {
        rowData.push($(cell).text().trim());
      });

      if (rowData.length > 0) {
        tableData.rows.push(rowData);
      }
    });
  } else {
    // When not including headers, extract all rows
    $(table).find('tr').each((_, row) => {
      const rowData: string[] = [];
      $(row).find('td, th').each((_, cell) => {
        rowData.push($(cell).text().trim());
      });

      if (rowData.length > 0) {
        tableData.rows.push(rowData);
      }
    });
  }

  tables.push(tableData);
}

/**
 * Converts HTML table(s) to JSON
 */
export async function htmlToJson(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options);
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }

  // Handle single table vs. multiple tables
  if (!options.multipleItems && tables.length === 1) {
    const table = tables[0];
    const jsonData = [];

    // Convert to array of objects with headers as keys (always include headers for JSON output)
    if (table.headers.length > 0) {
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
      // No headers available, just return array of arrays
      jsonData.push(...table.rows);
    }

    return JSON.stringify(jsonData, null, prettyPrint ? 2 : 0);
  }

  // Multiple tables
  const jsonData = tables.map(table => {
    const tableData = [];

    if (table.headers.length > 0) {
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
      tableData.push(...table.rows);
    }

    return tableData;
  });

  return JSON.stringify(jsonData, null, prettyPrint ? 2 : 0);
}

/**
 * Converts HTML table(s) to CSV
 */
export async function htmlToCsv(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options);

  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }

  const delimiter = options.csvDelimiter || ',';
  // Always include headers for CSV output
  let csvContent = '';

  // Handle single table vs. multiple tables
  if (!options.multipleItems && tables.length === 1) {
    const table = tables[0];

    // Add headers if present (always include headers for CSV output)
    if (table.headers.length > 0) {
      csvContent += Papa.unparse({
        fields: table.headers,
        data: table.rows
      }, { delimiter, header: true });
    } else {
      // No headers available, just convert rows
      csvContent += Papa.unparse(table.rows, { delimiter, header: false });
    }

    return csvContent;
  }

  // Multiple tables - we'll separate them with blank lines
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];

    if (i > 0) {
      csvContent += '\n\n';
    }

    // Add headers if present (always include headers for CSV output)
    if (table.headers.length > 0) {
      csvContent += Papa.unparse({
        fields: table.headers,
        data: table.rows
      }, { delimiter, header: true });
    } else {
      // No headers available, just convert rows
      csvContent += Papa.unparse(table.rows, { delimiter, header: false });
    }
  }

  return csvContent;
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
 * Converts HTML table(s) to standardized HTML table(s)
 */
export async function htmlToHtml(html: string, options: ConversionOptions): Promise<string> {
  const tables = extractTableData(html, options);
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
    output = minify(output, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true
    });
  }

  return output;
}
