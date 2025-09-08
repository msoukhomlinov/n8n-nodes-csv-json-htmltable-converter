import * as Papa from 'papaparse';
import * as cheerio from 'cheerio';
// Removed @minify-html/node import - using simpleHtmlMinify instead
import type { ConversionOptions, FormatType } from '../types';
import {
  DEFAULT_CSV_DELIMITER,
  DEFAULT_INCLUDE_HEADERS,
  DEFAULT_PRETTY_PRINT,
  simpleHtmlMinify,
} from './constants';
import { ConversionError, ValidationError } from './errors';
import { safeJsonParse } from './safeJson';

/**
 * Parses JSON data into a structured format
 */
function parseJSON(jsonStr: string, target: FormatType) {
  try {
    return safeJsonParse(jsonStr);
  } catch (error) {
    throw new ValidationError(`JSON parsing error: ${error.message}`, {
      source: 'json',
      target,
    });
  }
}

/**
 * Utility function to create table header using Cheerio
 */
function createTableHeader(headers: string[], $: any): any {
  const thead = $('<thead></thead>');
  const row = $('<tr></tr>').appendTo(thead);

  headers.forEach(header => {
    $('<th></th>').text(header).appendTo(row);
  });

  return thead;
}

/**
 * Utility function to create table body for array of objects using Cheerio
 */
function createTableBody(data: Record<string, unknown>[], headers: string[], $: any): any {
  const tbody = $('<tbody></tbody>');

  data.forEach(rowData => {
    const row = $('<tr></tr>').appendTo(tbody);
    headers.forEach(header => {
      const cellValue = rowData[header] ?? '';
      $('<td></td>').text(String(cellValue)).appendTo(row);
    });
  });

  return tbody;
}

/**
 * Utility function to create table body for array of arrays using Cheerio
 */
function createTableBodyFromArrays(data: unknown[][], $: any): any {
  const tbody = $('<tbody></tbody>');

  data.forEach(rowData => {
    const row = $('<tr></tr>').appendTo(tbody);
    rowData.forEach(cell => {
      $('<td></td>').text(String(cell)).appendTo(row);
    });
  });

  return tbody;
}

/**
 * Utility function to create key-value table body with nested object flattening using Cheerio
 */
function createKeyValueTableBody(data: Record<string, unknown>, $: any): any {
  const tbody = $('<tbody></tbody>');

  for (const [key, value] of Object.entries(data)) {
    // Handle nested objects (maintain our existing nested object flattening logic)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Iterate through the nested object's properties
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const row = $('<tr></tr>').appendTo(tbody);
        $('<td></td>').text(nestedKey).appendTo(row);
        $('<td></td>').text(String(nestedValue)).appendTo(row);
      }
    } else {
      // For non-object values, display as normal
      const row = $('<tr></tr>').appendTo(tbody);
      $('<td></td>').text(key).appendTo(row);
      $('<td></td>').text(String(value)).appendTo(row);
    }
  }

  return tbody;
}

/**
 * Converts JSON to CSV
 */
export async function jsonToCsv(jsonStr: string, options: ConversionOptions): Promise<string> {
  const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  const jsonData = parseJSON(jsonStr, 'csv');

  // Handle different JSON structures (array of objects, array of arrays, etc.)
  try {
    // For array of objects, use json2csv parser
    if (
      Array.isArray(jsonData) &&
      jsonData.length > 0 &&
      typeof jsonData[0] === 'object' &&
      !Array.isArray(jsonData[0])
    ) {
      return Papa.unparse(jsonData, {
        delimiter: delimiter,
        header: includeHeaders,
        newline: '\n'
      });
    }

    // For array of arrays, convert directly
    if (Array.isArray(jsonData) && jsonData.length > 0 && Array.isArray(jsonData[0])) {
      return jsonData
        .map((row) =>
          row
            .map((cell: unknown) =>
              typeof cell === 'string' && cell.includes(delimiter)
                ? `"${cell.replace(/"/g, '""')}"`
                : String(cell),
            )
            .join(delimiter),
        )
        .join('\n');
    }

    // For simple objects, convert to array of key-value pairs
    if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      const rows = [];

      // Add headers only if includeHeaders is true
      if (includeHeaders) {
        rows.push(['Key', 'Value'].join(delimiter));
      }

      for (const [key, value] of Object.entries(jsonData)) {
        rows.push(
          [
            key,
            typeof value === 'string' && value.includes(delimiter)
              ? `"${value.replace(/"/g, '""')}"`
              : String(value),
          ].join(delimiter),
        );
      }

      return rows.join('\n');
    }

    throw new ConversionError('Unsupported JSON structure for CSV conversion', {
      source: 'json',
      target: 'csv',
    });
  } catch (error) {
    if (error instanceof ConversionError || error instanceof ValidationError) {
      throw error;
    }
    throw new ConversionError(`JSON to CSV conversion error: ${error.message}`, {
      source: 'json',
      target: 'csv',
    });
  }
}

/**
 * Converts JSON to HTML table
 */
export async function jsonToHtml(
  jsonData: string | Record<string, unknown> | unknown[],
  options: ConversionOptions,
): Promise<string> {
  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;
  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  // Parse the input if it's a string, otherwise use as is
  const parsedData = typeof jsonData === 'string' ? parseJSON(jsonData, 'html') : jsonData;

  try {
    const $ = cheerio.load('');
    const table = $('<table></table>');

    // Array of objects - most common case
    if (
      Array.isArray(parsedData) &&
      parsedData.length > 0 &&
      typeof parsedData[0] === 'object' &&
      !Array.isArray(parsedData[0])
    ) {
      const headers = Object.keys(parsedData[0]);

      if (includeHeaders) {
        const thead = createTableHeader(headers, $);
        table.append(thead);
      }

      const tbody = createTableBody(parsedData as Record<string, unknown>[], headers, $);
      table.append(tbody);
    }
    // Array of arrays
    else if (Array.isArray(parsedData) && parsedData.length > 0 && Array.isArray(parsedData[0])) {
      const tbody = createTableBodyFromArrays(parsedData as unknown[][], $);
      table.append(tbody);
    }
    // Simple object
    else if (typeof parsedData === 'object' && parsedData !== null) {
      if (includeHeaders) {
        const thead = createTableHeader(['Key', 'Value'], $);
        table.append(thead);
      }

      const tbody = createKeyValueTableBody(parsedData as Record<string, unknown>, $);
      table.append(tbody);
    } else {
      throw new ConversionError('Unsupported JSON structure for HTML conversion', {
        source: 'json',
        target: 'html',
      });
    }

    // Format output based on pretty print option
    let html = table.toString();

    if (prettyPrint) {
      // For pretty print, we'll use cheerio's built-in formatting
      html = $.html(table);
    } else {
      // For minified output, use the existing minifier
      html = simpleHtmlMinify(html);
    }

    return html;
  } catch (error) {
    if (error instanceof ConversionError || error instanceof ValidationError) {
      throw error;
    }
    throw new ConversionError(`JSON to HTML conversion error: ${error.message}`, {
      source: 'json',
      target: 'html',
    });
  }
}
