import type { FormatType, ConversionOptions } from '../types';
import { htmlToJson, htmlToCsv, htmlToHtml } from './htmlConverter';
import { csvToJson, csvToHtml } from './csvConverter';
import { jsonToHtml, jsonToCsv } from './jsonConverter';
import Papa from 'papaparse';
import { DEFAULT_CSV_DELIMITER } from './constants';

/**
 * Converts data from one format to another based on the specified source and target formats
 */
export async function convertData(
  data: string | object,
  sourceFormat: FormatType,
  targetFormat: FormatType,
  options: ConversionOptions = {}
): Promise<string | Record<string, unknown> | unknown[]> {
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
        return result;
      }
      if (targetFormat === 'csv') {
        // Convert n8nObject to CSV using PapaParse directly for better tabular format
        // For a single object (not an array), wrap it in an array to create a table with one row
        const dataForCsv = Array.isArray(objectData) ? objectData : [objectData];

        // Use Papa.unparse to create a proper CSV with headers from object keys
        const delimiter = options.csvDelimiter || DEFAULT_CSV_DELIMITER;
        // Always include headers for CSV output
        let result: string;

        // Always include headers for CSV output when possible
        if (dataForCsv.length > 0) {
          const fields = Object.keys(dataForCsv[0] as Record<string, unknown>);
          result = Papa.unparse({
            fields,
            data: dataForCsv as unknown[][]
          }, { delimiter });
        } else {
          // Empty data array, return empty string
          result = '';
        }

        return result;
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
      if (sourceFormat === 'html') {
        const jsonStr = await htmlToJson(strData, options);
        const parsedData = JSON.parse(jsonStr);

        // For n8n object format, return the parsed data directly without transforming to indexed objects
        if (Array.isArray(parsedData)) {
          // If single table and not multipleItems, return the content directly
          if (!options.multipleItems && parsedData.length === 1 && Array.isArray(parsedData[0])) {
            return parsedData[0];
          }
          return parsedData;
        }
        return parsedData;
      }
      if (sourceFormat === 'csv') {
        const jsonStr = await csvToJson(strData, options);
        const parsedData = JSON.parse(jsonStr);
        // For n8n object format, return arrays directly
        return parsedData;
      }
      if (sourceFormat === 'json') {
        const parsedData = JSON.parse(strData);
        // For n8n object format, return arrays directly
        return parsedData;
      }
    }

    // Converting from HTML
    if (sourceFormat === 'html') {
      if (targetFormat === 'csv') {
        const result = await htmlToCsv(strData, options);
        return result;
      }
      if (targetFormat === 'json') {
        const result = await htmlToJson(strData, options);
        return result;
      }
    }

    // Converting from CSV
    if (sourceFormat === 'csv') {
      if (targetFormat === 'html') {
        const result = await csvToHtml(strData, options);
        return result;
      }
      if (targetFormat === 'json') {
        const result = await csvToJson(strData, options);
        return result;
      }
    }

    // Converting from JSON
    if (sourceFormat === 'json') {
      if (targetFormat === 'html') {
        const result = await jsonToHtml(strData, options);
        return result;
      }
      if (targetFormat === 'csv') {
        const result = await jsonToCsv(strData, options);
        return result;
      }
    }

    throw new Error(`Unsupported conversion: ${sourceFormat} to ${targetFormat}`);
  } catch (error) {
    throw new Error(`Conversion error (${sourceFormat} to ${targetFormat}): ${error.message}`);
  }
}
