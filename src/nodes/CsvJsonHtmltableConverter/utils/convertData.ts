import type { FormatType, ConversionOptions } from '../types';
import { htmlToJson, htmlToCsv, htmlToHtml } from './htmlConverter';
import { csvToJson, csvToHtml } from './csvConverter';
import { jsonToHtml, jsonToCsv } from './jsonConverter';
import { DEFAULT_CSV_DELIMITER } from './constants';
import { debug } from './debug';
import { ConversionError, ValidationError } from './errors';
import { manipulateData } from './dataManipulation';

/**
 * Apply data manipulation to object data if manipulation options are specified
 */
function applyDataManipulation(data: unknown, options: ConversionOptions): unknown {
  const needsManipulation = (options.sortByField && options.sortByField.trim()) ||
                           (options.fields && options.fields.trim());

  if (!needsManipulation) {
    return data;
  }

  debug('convertData.ts', 'Applying data manipulation', { sortByField: options.sortByField, fields: options.fields });

  // Handle array of objects
  if (Array.isArray(data)) {
    const firstItem = data[0];
    if (firstItem && typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
      return manipulateData(data as Record<string, any>[], options);
    }
  }

  // Handle single object
  if (data && typeof data === 'object' && !Array.isArray(data) && data !== null) {
    return manipulateData([data as Record<string, any>], options)[0];
  }

  debug('convertData.ts', 'Data manipulation skipped - unsupported data format');
  return data;
}

/**
 * Converts data from one format to another based on the specified source and target formats
 */
export async function convertData(
  data: string | object,
  sourceFormat: FormatType,
  targetFormat: FormatType,
  options: ConversionOptions = {}
): Promise<string | Record<string, unknown> | unknown[]> {
  debug('convertData.ts', `Input - sourceFormat: ${sourceFormat}, targetFormat: ${targetFormat}, includeTableHeaders: ${options.includeTableHeaders}`, options);

  try {
    // Handle n8nObject as source format
    if (sourceFormat === 'n8nObject') {
      // Ensure we have a proper object or array to work with
      let objectData: string | Record<string, unknown> | unknown[] = {};
      if (typeof data === 'string') {
        // Try to parse as JSON first, fallback to treating as string value
        try {
          objectData = JSON.parse(data);
        } catch (error) {
          // If it's not valid JSON, treat as a simple string value
          objectData = { value: data };
        }
      } else {
        objectData = data as Record<string, unknown> | unknown[];
      }

      // Apply data manipulation if specified
      objectData = applyDataManipulation(objectData, options) as typeof objectData;

      // Then convert from n8nObject to the target format
      if (targetFormat === 'html') {
        // For HTML conversion, we can pass the data directly to jsonToHtml
        // since it now accepts objects and arrays in addition to strings
        const result = await jsonToHtml(objectData, options);
        return result;
      }
      if (targetFormat === 'csv') {
        const rows = Array.isArray(objectData) ? objectData : [objectData];
        const includeHeaders = options.includeTableHeaders !== undefined ? options.includeTableHeaders : true;
        const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;

        if (rows.length === 0) {
          return '';
        }

        // Ensure we have objects with keys to work with
        if (rows.length === 0 || typeof rows[0] !== 'object' || rows[0] === null) {
          return '';
        }

        const keys = Object.keys(rows[0] as Record<string, unknown>);
        const csvLines: string[] = [];

        if (includeHeaders) {
          csvLines.push(keys.join(delimiter));
        }

        for (const row of rows) {
          const values = keys.map((key) => {
            const value = (row as Record<string, unknown>)[key];
            const str = value === undefined || value === null ? '' : String(value);
            return str.includes(delimiter) ? `"${str.replace(/"/g, '""')}"` : str;
          });
          csvLines.push(values.join(delimiter));
        }

        return csvLines.join('\n');
      }
      if (targetFormat === 'json') {
        // Convert to proper JSON string
        const result = JSON.stringify(objectData, null, options.prettyPrint ? 2 : 0);
        return result;
      }
      if (targetFormat === 'n8nObject') {
        // n8nObject to n8nObject, return as is
        return objectData;
      }
    }

    // For other source formats, data should be a string
    const strData = data as string;

    // Same format - no conversion needed
    if (sourceFormat === targetFormat) {
      if (targetFormat === 'n8nObject' && sourceFormat === 'json') {
        return JSON.parse(strData);
      }
      if (sourceFormat === 'html' && targetFormat === 'html') {
        return await htmlToHtml(strData, options);
      }
      return strData;
    }

    // Converting to n8nObject (returns JavaScript object instead of string)
    if (targetFormat === 'n8nObject') {
      let jsonStr: string;
      if (sourceFormat === 'html') {
        jsonStr = await htmlToJson(strData, options);
      } else if (sourceFormat === 'csv') {
        jsonStr = await csvToJson(strData, options);
      } else if (sourceFormat === 'json') {
        jsonStr = strData;
      } else {
        throw new Error(`Unsupported conversion: ${sourceFormat} to ${targetFormat}`);
      }

      let parsedData = JSON.parse(jsonStr);

      // Apply data manipulation if specified
      parsedData = applyDataManipulation(parsedData, options);

      if (sourceFormat === 'html' && Array.isArray(parsedData)) {
        if (options.multipleItems && parsedData.length > 1) {
          return parsedData;
        }
        if (parsedData.length === 1 && Array.isArray(parsedData[0])) {
          return parsedData[0];
        }
      }

      return parsedData;
    }

        // Map of conversion functions for remaining format combinations
    const converters: Record<string, Record<string, (input: string, opts: ConversionOptions) => Promise<string>>> = {
      html: { csv: htmlToCsv, json: htmlToJson, html: htmlToHtml },
      csv: { html: csvToHtml, json: csvToJson },
      json: { html: jsonToHtml, csv: jsonToCsv }
    };

    const converter = converters[sourceFormat]?.[targetFormat];
    if (converter) {
      debug('convertData.ts', `Converting ${sourceFormat} to ${targetFormat}`);

            // Check if data manipulation is needed
      const needsManipulation = (options.sortByField && options.sortByField.trim()) ||
                               (options.fields && options.fields.trim());

      if (needsManipulation) {
        debug('convertData.ts', `Data manipulation requested for ${sourceFormat} to ${targetFormat}`);

        // Convert to intermediate JSON format for manipulation
        let jsonStr: string;
        if (sourceFormat === 'html') {
          jsonStr = await htmlToJson(strData, options);
        } else if (sourceFormat === 'csv') {
          jsonStr = await csvToJson(strData, options);
        } else if (sourceFormat === 'json') {
          jsonStr = strData;
        } else {
          // Fallback to direct conversion if manipulation not supported
          return await converter(strData, options);
        }

        const objectData = JSON.parse(jsonStr);
        const manipulatedData = applyDataManipulation(objectData, options);

        // Convert manipulated data to final target format
        if (targetFormat === 'html') {
          return await jsonToHtml(manipulatedData as string | Record<string, unknown> | unknown[], options);
        } else if (targetFormat === 'csv') {
          return await jsonToCsv(JSON.stringify(manipulatedData), options);
        } else if (targetFormat === 'json') {
          return JSON.stringify(manipulatedData, null, options.prettyPrint ? 2 : 0);
        }
      }

      // Direct conversion without manipulation
      return await converter(strData, options);
    }

    throw new ConversionError(`Unsupported conversion: ${sourceFormat} to ${targetFormat}`, {
      source: sourceFormat,
      target: targetFormat,
    });
  } catch (error) {
      debug('convertData.ts', `Error in convertData: ${error.message}`, error);
      if (error instanceof ConversionError || error instanceof ValidationError) {
        throw error;
      }
      throw new ConversionError(`Conversion error (${sourceFormat} to ${targetFormat}): ${error.message}`, {
        source: sourceFormat,
        target: targetFormat,
      });
    }
  }
