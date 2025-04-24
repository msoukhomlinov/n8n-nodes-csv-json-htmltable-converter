import { Parser } from 'json2csv';
import { minify } from 'html-minifier';
import type { ConversionOptions } from '../types';
import { DEFAULT_CSV_DELIMITER, DEFAULT_INCLUDE_HEADERS, DEFAULT_PRETTY_PRINT } from './constants';
import { debug, debugSample } from './debug';

/**
 * Parses JSON data into a structured format
 */
function parseJSON(jsonStr: string) {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`JSON parsing error: ${error.message}`);
  }
}

/**
 * Converts JSON to CSV
 */
export async function jsonToCsv(jsonStr: string, options: ConversionOptions): Promise<string> {
  debug('jsonConverter.ts', 'jsonToCsv - Input JSON', jsonStr);
  const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  debug('jsonConverter.ts', 'jsonToCsv - Options', { delimiter, includeHeaders, ...options });
  const jsonData = parseJSON(jsonStr);
  debug('jsonConverter.ts', 'jsonToCsv - Parsed Data', jsonData);

  // Handle different JSON structures (array of objects, array of arrays, etc.)
  try {
    // For array of objects, use json2csv parser
    if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object' && !Array.isArray(jsonData[0])) {
      const fields = Object.keys(jsonData[0]);
      const json2csvParser = new Parser({
        fields,
        delimiter,
        header: includeHeaders
      });
      let result = json2csvParser.parse(jsonData);
      // Minify CSV output if prettyPrint is false
      if (options.prettyPrint === false) {
        result = result
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n') + '\n';
      }
      debugSample('jsonConverter.ts', 'jsonToCsv - Output CSV', result);
      return result;
    }

    // For array of arrays, convert directly
    if (Array.isArray(jsonData) && jsonData.length > 0 && Array.isArray(jsonData[0])) {
      let result = jsonData.map(row =>
        row.map((cell: unknown) =>
          typeof cell === 'string' && cell.includes(delimiter) ?
            `"${cell.replace(/"/g, '""')}"` :
            String(cell)
        ).join(delimiter)
      ).join('\n');
      // Minify CSV output if prettyPrint is false
      if (options.prettyPrint === false) {
        result = result
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n') + '\n';
      }
      debugSample('jsonConverter.ts', 'jsonToCsv - Output CSV', result);
      return result;
    }

    // For simple objects, convert to array of key-value pairs
    if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
      const rows = [];

      // Add headers only if includeHeaders is true
      if (includeHeaders) {
        rows.push(['Key', 'Value'].join(delimiter));
      }

      for (const [key, value] of Object.entries(jsonData)) {
        rows.push([
          key,
          typeof value === 'string' && value.includes(delimiter) ?
            `"${value.replace(/"/g, '""')}"` :
            String(value)
        ].join(delimiter));
      }

      let result = rows.join('\n');
      // Minify CSV output if prettyPrint is false
      if (options.prettyPrint === false) {
        result = result
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n') + '\n';
      }
      debugSample('jsonConverter.ts', 'jsonToCsv - Output CSV', result);
      return result;
    }

    throw new Error('Unsupported JSON structure for CSV conversion');
  } catch (error) {
    throw new Error(`JSON to CSV conversion error: ${error.message}`);
  }
}

/**
 * Converts JSON to HTML table
 */
export async function jsonToHtml(
  jsonData: string | Record<string, unknown> | unknown[],
  options: ConversionOptions
): Promise<string> {
  debug('jsonConverter.ts', 'jsonToHtml - Input', jsonData);
  const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : DEFAULT_INCLUDE_HEADERS;
  const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : DEFAULT_PRETTY_PRINT;
  debug('jsonConverter.ts', 'jsonToHtml - Options', { includeHeaders, prettyPrint, ...options });

  // Parse the input if it's a string, otherwise use as is
  const parsedData = typeof jsonData === 'string' ? parseJSON(jsonData) : jsonData;
  debug('jsonConverter.ts', 'jsonToHtml - Parsed Data', parsedData);

  let html = '<table>';
  const indentation = prettyPrint ? '\n  ' : '';

  try {
    // Array of objects - most common case
    if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'object' && !Array.isArray(parsedData[0])) {
      const headers = Object.keys(parsedData[0]);

      if (includeHeaders) {
        html += `${indentation}<thead>`;
        html += `${indentation}  <tr>`;

        for (const header of headers) {
          html += `${indentation}    <th>${escapeHtml(header)}</th>`;
        }

        html += `${indentation}  </tr>`;
        html += `${indentation}</thead>`;
      }

      html += `${indentation}<tbody>`;

      for (const row of parsedData) {
        html += `${indentation}  <tr>`;

        for (const header of headers) {
          const cellValue = row[header] !== undefined ? row[header] : '';
          html += `${indentation}    <td>${escapeHtml(String(cellValue))}</td>`;
        }

        html += `${indentation}  </tr>`;
      }

      html += `${indentation}</tbody>`;
    }
    // Array of arrays
    else if (Array.isArray(parsedData) && parsedData.length > 0 && Array.isArray(parsedData[0])) {
      html += `${indentation}<tbody>`;

      for (const row of parsedData) {
        html += `${indentation}  <tr>`;

        for (const cell of row) {
          html += `${indentation}    <td>${escapeHtml(String(cell))}</td>`;
        }

        html += `${indentation}  </tr>`;
      }

      html += `${indentation}</tbody>`;
    }
    // Simple object
    else if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      if (includeHeaders) {
        html += `${indentation}<thead>`;
        html += `${indentation}  <tr>`;
        html += `${indentation}    <th>Key</th>`;
        html += `${indentation}    <th>Value</th>`;
        html += `${indentation}  </tr>`;
        html += `${indentation}</thead>`;
      }

      html += `${indentation}<tbody>`;

      for (const [key, value] of Object.entries(parsedData)) {
        html += `${indentation}  <tr>`;
        html += `${indentation}    <td>${escapeHtml(key)}</td>`;
        html += `${indentation}    <td>${escapeHtml(String(value))}</td>`;
        html += `${indentation}  </tr>`;
      }

      html += `${indentation}</tbody>`;
    }
    else {
      throw new Error('Unsupported JSON structure for HTML conversion');
    }

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

    debugSample('jsonConverter.ts', 'jsonToHtml - Output HTML', html);
    return html;
  } catch (error) {
    throw new Error(`JSON to HTML conversion error: ${error.message}`);
  }
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
