import { json2csv } from 'json-2-csv';

import type { ConversionOptions, FormatType } from '../types';
import { DEFAULT_CSV_DELIMITER, DEFAULT_INCLUDE_HEADERS, DEFAULT_PRETTY_PRINT } from './constants';
import minifyHtml from '@minify-html/node';
import { ConversionError, ValidationError } from './errors';

/**
 * Parses JSON data into a structured format
 */
function parseJSON(jsonStr: string, target: FormatType) {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new ValidationError(`JSON parsing error: ${error.message}`, {
      source: 'json',
      target,
    });
  }
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
      const fields = Object.keys(jsonData[0]);
      const optionsCsv = {
        delimiter: { field: delimiter },
        prependHeader: includeHeaders,
        keys: fields,
      };
      return await json2csv(jsonData, optionsCsv);
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

  const indentation = prettyPrint ? '\n  ' : '';
  const parts: string[] = ['<table>'];

  try {
    // Array of objects - most common case
    if (
      Array.isArray(parsedData) &&
      parsedData.length > 0 &&
      typeof parsedData[0] === 'object' &&
      !Array.isArray(parsedData[0])
    ) {
      const headers = Object.keys(parsedData[0]);

      if (includeHeaders) {
        parts.push(`${indentation}<thead>`, `${indentation}  <tr>`);
        for (const header of headers) {
          parts.push(`${indentation}    <th>${escapeHtml(header)}</th>`);
        }
        parts.push(`${indentation}  </tr>`, `${indentation}</thead>`);
      }

      parts.push(`${indentation}<tbody>`);

      for (const row of parsedData) {
        parts.push(`${indentation}  <tr>`);
        for (const header of headers) {
          const cellValue = row[header] !== undefined ? row[header] : '';
          parts.push(`${indentation}    <td>${escapeHtml(String(cellValue))}</td>`);
        }
        parts.push(`${indentation}  </tr>`);
      }

      parts.push(`${indentation}</tbody>`);
    }
    // Array of arrays
    else if (Array.isArray(parsedData) && parsedData.length > 0 && Array.isArray(parsedData[0])) {
      parts.push(`${indentation}<tbody>`);
      for (const row of parsedData) {
        parts.push(`${indentation}  <tr>`);
        for (const cell of row) {
          parts.push(`${indentation}    <td>${escapeHtml(String(cell))}</td>`);
        }
        parts.push(`${indentation}  </tr>`);
      }
      parts.push(`${indentation}</tbody>`);
    }
    // Simple object
      else if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      if (includeHeaders) {
        parts.push(`${indentation}<thead>`, `${indentation}  <tr>`, `${indentation}    <th>Key</th>`, `${indentation}    <th>Value</th>`, `${indentation}  </tr>`, `${indentation}</thead>`);
      }

      parts.push(`${indentation}<tbody>`);
      for (const [key, value] of Object.entries(parsedData)) {
        parts.push(`${indentation}  <tr>`, `${indentation}    <td>${escapeHtml(key)}</td>`, `${indentation}    <td>${escapeHtml(String(value))}</td>`, `${indentation}  </tr>`);
      }
      html += `${indentation}</tbody>`;
    }
      else {
        throw new ConversionError('Unsupported JSON structure for HTML conversion', {
          source: 'json',
          target: 'html',
        });
      }

      html += prettyPrint ? '\n</table>' : '</table>';

      // Apply minification if pretty print is disabled
      if (!prettyPrint) {
        html = minifyHtml.minify(Buffer.from(html), {
          minify_whitespace: true,
          keepComments: false,
          keepSpacesBetweenAttributes: false,
          keepHtmlAndHeadOpeningTags: false
        } as unknown as object).toString();
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
