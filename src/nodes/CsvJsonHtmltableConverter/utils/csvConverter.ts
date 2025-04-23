import Papa from 'papaparse';
import { minify } from 'html-minifier';
import type { ConversionOptions } from '../types';
import { DEFAULT_CSV_DELIMITER, DEFAULT_INCLUDE_HEADERS, DEFAULT_PRETTY_PRINT } from './constants';

/**
 * Parses CSV data into a structured format
 */
function parseCSV(csv: string, options: ConversionOptions) {
  const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;

  const result = Papa.parse(csv, {
    delimiter,
    header: includeHeaders,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  return result;
}

/**
 * Converts CSV to JSON
 */
export async function csvToJson(csv: string, options: ConversionOptions): Promise<string> {
  const result = parseCSV(csv, options);
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
  const result = parseCSV(csv, { ...options, includeTableHeaders: false }); // We'll handle headers manually
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  let html = '<table>';
  const indentation = prettyPrint ? '\n  ' : '';
  let dataRows = result.data as string[][];

  // If we're using headers and there's at least one row
  if (includeHeaders && dataRows.length > 0) {
    const headers = dataRows[0];
    html += `${indentation}<thead>`;
    html += `${indentation}  <tr>`;

    for (const header of headers) {
      html += `${indentation}    <th>${escapeHtml(header)}</th>`;
    }

    html += `${indentation}  </tr>`;
    html += `${indentation}</thead>`;

    // Remove the header row from data
    dataRows = dataRows.slice(1);
  }

  html += `${indentation}<tbody>`;

  for (const row of dataRows) {
    html += `${indentation}  <tr>`;

    for (const cell of row) {
      html += `${indentation}    <td>${escapeHtml(cell)}</td>`;
    }

    html += `${indentation}  </tr>`;
  }

  html += `${indentation}</tbody>`;
  html += prettyPrint ? '\n</table>' : '</table>';

  // Apply minification if pretty print is disabled
  if (!prettyPrint) {
    html = minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true
    });
  }

  return html;
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
