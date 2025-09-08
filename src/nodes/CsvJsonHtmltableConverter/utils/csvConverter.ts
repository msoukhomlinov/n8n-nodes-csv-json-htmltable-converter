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
import { ValidationError } from './errors';

/**
 * Parses CSV data into a structured format
 */
function parseCSV(csv: string, options: ConversionOptions, target: FormatType) {
  const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;

  const result = Papa.parse(csv, {
    delimiter,
    header: includeHeaders,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(`CSV parsing error: ${result.errors[0].message}`, {
      source: 'csv',
      target,
    });
  }

  return result;
}

/**
 * Converts CSV to JSON
 */
export async function csvToJson(csv: string, options: ConversionOptions): Promise<string> {
  const result = parseCSV(csv, options, 'json');
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  // If we have headers, result.data will already be an array of objects
  // If not, result.data will be an array of arrays
  return JSON.stringify(result.data, null, prettyPrint ? 2 : 0);
}

/**
 * Converts CSV to HTML table
 */
export async function csvToHtml(csv: string, options: ConversionOptions): Promise<string> {
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  const result = parseCSV(csv, { ...options, includeTableHeaders: false }, 'html'); // We'll handle headers manually
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  const $ = cheerio.load('');
  const table = $('<table></table>');
  let dataRows = result.data as string[][];

  // Handle headers
  if (includeHeaders && dataRows.length > 0) {
    const headers = dataRows[0];
    const thead = $('<thead></thead>');
    const headerRow = $('<tr></tr>').appendTo(thead);

    headers.forEach(header => {
      $('<th></th>').text(header).appendTo(headerRow);
    });

    table.append(thead);
    dataRows = dataRows.slice(1);
  }

  // Handle data rows
  const tbody = $('<tbody></tbody>');
  dataRows.forEach(row => {
    const dataRow = $('<tr></tr>').appendTo(tbody);
    row.forEach(cell => {
      $('<td></td>').text(cell).appendTo(dataRow);
    });
  });
  table.append(tbody);

  // Format output based on pretty print option
  let html = table.toString();

  if (prettyPrint) {
    // For pretty print, use cheerio's built-in formatting
    html = $.html(table);
  } else {
    // For minified output, use the existing minifier
    html = simpleHtmlMinify(html);
  }

  return html;
}
