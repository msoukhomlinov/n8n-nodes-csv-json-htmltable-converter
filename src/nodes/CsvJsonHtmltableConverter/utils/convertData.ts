import type { FormatType, ConversionOptions } from '../types';
import { htmlToJson, htmlToCsv, htmlToHtml } from './htmlConverter';
import { csvToJson, csvToHtml } from './csvConverter';
import { jsonToHtml, jsonToCsv } from './jsonConverter';
import Papa from 'papaparse';
import { DEFAULT_CSV_DELIMITER } from './constants';
import { debug } from './debug';

/**
 * Converts data from one format to another based on the specified source and target formats
 */
export async function convertData(
  data: string | object,
  sourceFormat: FormatType,
  targetFormat: FormatType,
  options: ConversionOptions = {}
): Promise<string | Record<string, unknown> | unknown[]> {
  debug('convertData.ts', 'convertData - Input', { data, sourceFormat, targetFormat, options });

  try {
    // Handle n8nObject as source format
    if (sourceFormat === 'n8nObject') {
      // Ensure we have a proper object or array to work with
      let objectData: string | Record<string, unknown> | unknown[] = {};
      if (typeof data === 'string') {
        if (data.includes('[object Object]')) {
          objectData = {};
        } else {
          try {
            objectData = JSON.parse(data);
          } catch (error) {
            objectData = data;
          }
        }
      } else {
        objectData = data as Record<string, unknown> | unknown[];
      }

      // Then convert from n8nObject to the target format
      if (targetFormat === 'html') {
        // For HTML conversion, we can pass the data directly to jsonToHtml
        // since it now accepts objects and arrays in addition to strings
        const result = await jsonToHtml(objectData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'csv') {
        // Convert n8nObject to CSV using PapaParse directly for better tabular format
        // For a single object (not an array), wrap it in an array to create a table with one row
        const dataForCsv = Array.isArray(objectData) ? objectData : [objectData];
        const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : true;
        const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
        let result: string;

        if (dataForCsv.length > 0) {
          if (includeHeaders) {
            const fields = Object.keys(dataForCsv[0] as Record<string, unknown>);
            result = Papa.unparse({
              fields,
              data: dataForCsv as unknown[][]
            }, { delimiter, header: true });
          } else {
            // When not including headers, just output the values as arrays
            const data = dataForCsv.map(obj => Object.values(obj as Record<string, unknown>));
            result = Papa.unparse(data, { delimiter, header: false });
          }
        } else {
          // Empty data array, return empty string
          result = '';
        }

        // Minify CSV output if prettyPrint is false
        if (options.prettyPrint === false) {
          // Preserve one newline per record, remove extra blank lines and trim whitespace
          result = result
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n') + '\n';
        }

        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'json') {
        // Normalise prettyPrint to a boolean
        const prettyPrint = options.prettyPrint === true || (typeof options.prettyPrint === 'string' && options.prettyPrint === 'true');
        debug('convertData.ts', 'n8nObject to JSON - prettyPrint value and type', { value: options.prettyPrint, type: typeof options.prettyPrint, normalised: prettyPrint });
        // Convert to proper JSON string
        const result = JSON.stringify(objectData, null, prettyPrint ? 2 : 0);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'n8nObject') {
        // n8nObject to n8nObject, return as is
        debug('convertData.ts', 'convertData - Output', objectData);
        return objectData;
      }
    }

    // For other source formats, data should be a string
    const strData = data as string;

    // Same format - no conversion needed
    if (sourceFormat === targetFormat) {
      if (targetFormat === 'n8nObject' && sourceFormat === 'json') {
        const result = JSON.parse(strData);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (sourceFormat === 'html' && targetFormat === 'html') {
        const result = await htmlToHtml(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      // --- CSV to CSV: re-serialise with includeTableHeaders and prettyPrint ---
      if (sourceFormat === 'csv' && targetFormat === 'csv') {
        const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
        const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : true;
        const prettyPrint = options.prettyPrint !== undefined ? options.prettyPrint : true;
        let result: string;
        if (includeHeaders) {
          // Parse with header: true, output with header: true
          const parsed = Papa.parse(strData, {
            delimiter,
            header: true,
            skipEmptyLines: true,
          });
          const fields = parsed.meta.fields || (parsed.data.length > 0 && typeof parsed.data[0] === 'object' && !Array.isArray(parsed.data[0]) ? Object.keys(parsed.data[0] as Record<string, unknown>) : []);
          result = Papa.unparse({ fields, data: parsed.data }, { delimiter, header: true });
        } else {
          // Parse with header: false, output with header: false
          const parsed = Papa.parse(strData, {
            delimiter,
            header: false,
            skipEmptyLines: true,
          });
          let dataRows = parsed.data as unknown[][];
          // Heuristic: if the first row contains only strings (not numbers), treat as header and remove it
          if (dataRows.length > 1 && dataRows[0].every(cell => typeof cell === 'string' && isNaN(Number(cell)) && cell.trim() !== '')) {
            dataRows = dataRows.slice(1);
          }
          result = Papa.unparse(dataRows, { delimiter, header: false });
        }
        // Minify CSV output if prettyPrint is false
        if (!prettyPrint) {
          result = result
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n') + '\n';
        }
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      debug('convertData.ts', 'convertData - Output', strData);
      return strData;
    }

    // Converting to n8nObject (returns JavaScript object instead of string)
    if (targetFormat === 'n8nObject') {
      if (sourceFormat === 'html') {
        const jsonStr = await htmlToJson(strData, options);
        const parsedData = JSON.parse(jsonStr);

        // For n8n object format, return the parsed data directly without transforming to indexed objects
        if (Array.isArray(parsedData)) {
          // Only nest if multipleItems is true AND there are multiple items
          if (options.multipleItems && parsedData.length > 1) {
            debug('convertData.ts', 'convertData - Output', parsedData);
            return parsedData;
          }
          // For single item or when multipleItems=false, return the flat content
          if (parsedData.length === 1 && Array.isArray(parsedData[0])) {
            debug('convertData.ts', 'convertData - Output', parsedData[0]);
            return parsedData[0];
          }
          debug('convertData.ts', 'convertData - Output', parsedData);
          return parsedData;
        }
        debug('convertData.ts', 'convertData - Output', parsedData);
        return parsedData;
      }
      if (sourceFormat === 'csv') {
        // Always set includeTableHeaders: true for CSV → n8nObject
        const jsonStr = await csvToJson(strData, { ...options, includeTableHeaders: true });
        const parsedData = JSON.parse(jsonStr);
        // For n8n object format, return arrays directly
        debug('convertData.ts', 'convertData - Output', parsedData);
        return parsedData;
      }
      if (sourceFormat === 'json') {
        const parsedData = JSON.parse(strData);
        // For n8n object format, return arrays directly
        debug('convertData.ts', 'convertData - Output', parsedData);
        return parsedData;
      }
    }

    // Converting from HTML
    if (sourceFormat === 'html') {
      debug('convertData.ts', `HTML source conversion - includeTableHeaders: ${options.includeTableHeaders}`);

      if (targetFormat === 'csv') {
        debug('convertData.ts', `Converting HTML to CSV - includeTableHeaders: ${options.includeTableHeaders}`);
        const result = await htmlToCsv(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'json') {
        debug('convertData.ts', `Converting HTML to JSON - includeTableHeaders: ${options.includeTableHeaders}`);
        const result = await htmlToJson(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
    }

    // Converting from CSV
    if (sourceFormat === 'csv') {
      if (targetFormat === 'html') {
        const result = await csvToHtml(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'json') {
        const result = await csvToJson(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
    }

    // Converting from JSON
    if (sourceFormat === 'json') {
      if (targetFormat === 'html') {
        const result = await jsonToHtml(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (targetFormat === 'csv') {
        const result = await jsonToCsv(strData, options);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
      if (sourceFormat === 'json' && targetFormat === 'json') {
        // Parse and re-stringify to apply prettyPrint
        let parsed: unknown;
        try {
          parsed = JSON.parse(strData);
        } catch (err) {
          debug('convertData.ts', 'convertData - Invalid JSON input for prettyPrint', strData);
          throw new Error('Invalid JSON input');
        }
        const prettyPrint = options.prettyPrint === true || (typeof options.prettyPrint === 'string' && options.prettyPrint === 'true');
        if (options.includeTableHeaders !== undefined) {
          debug('convertData.ts', 'JSON > JSON: includeTableHeaders is set but ignored', options.includeTableHeaders);
        }
        const result = JSON.stringify(parsed, null, prettyPrint ? 2 : 0);
        debug('convertData.ts', 'convertData - Output', result);
        return result;
      }
    }

    throw new Error(`Unsupported conversion: ${sourceFormat} to ${targetFormat}`);
  } catch (error) {
    debug('convertData.ts', `Error in convertData: ${error.message}`, error);
    throw new Error(`Conversion error (${sourceFormat} to ${targetFormat}): ${error.message}`);
  }
}
