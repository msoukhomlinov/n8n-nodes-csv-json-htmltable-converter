import Papa from 'papaparse';
import minifyHtml from '@minify-html/node';
import type { ConversionOptions } from '../types';
import {
  DEFAULT_CSV_DELIMITER,
  DEFAULT_INCLUDE_HEADERS,
  DEFAULT_PRETTY_PRINT,
  MINIFY_OPTIONS,
} from './constants';
import { escapeHtml } from './escapeHtml';


/**
 * Parses CSV data into a structured format
 */
function parseCSV(csv: string, options: ConversionOptions) {
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
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  return result;
}

/**
 * Converts CSV to JSON
 */
export async function csvToJson(csv: string, options: ConversionOptions): Promise<string> {
  const result = parseCSV(csv, options);
  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;

  // If we have headers, result.data will already be an array of objects
  // If not, result.data will be an array of arrays
  return JSON.stringify(result.data, null, prettyPrint ? 2 : 0);
}

/**
 * Converts CSV to HTML table
 */
export async function csvToHtml(csv: string, options: ConversionOptions): Promise<string> {
  const includeHeaders =
    options.includeTableHeaders !== undefined
      ? options.includeTableHeaders
      : DEFAULT_INCLUDE_HEADERS;
  const result = parseCSV(csv, { ...options, includeTableHeaders: false }); // We'll handle headers manually
  const prettyPrint =
    options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;


  const indentation = prettyPrint ? '\n  ' : '';
  let dataRows = result.data as string[][];
  const parts: string[] = ['<table>'];

  if (includeHeaders && dataRows.length > 0) {
    const headers = dataRows[0];
    parts.push(`${indentation}<thead>`, `${indentation}  <tr>`);
    for (const header of headers) {
      parts.push(`${indentation}    <th>${escapeHtml(header)}</th>`);
    }
    parts.push(`${indentation}  </tr>`, `${indentation}</thead>`);
    dataRows = dataRows.slice(1);
  }

  parts.push(`${indentation}<tbody>`);
  for (const row of dataRows) {
    parts.push(`${indentation}  <tr>`);
    for (const cell of row) {
      parts.push(`${indentation}    <td>${escapeHtml(cell)}</td>`);
    }
    parts.push(`${indentation}  </tr>`);
  }
  parts.push(`${indentation}</tbody>`, prettyPrint ? '\n</table>' : '</table>');

  let html = parts.join('');

  if (!prettyPrint) {
    html = minifyHtml.minify(Buffer.from(html), MINIFY_OPTIONS).toString();
  }

  return html;
}
