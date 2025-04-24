import type { FormatType, ValidationResult } from '../types';
import * as cheerio from 'cheerio';
import Papa from 'papaparse';

/**
 * Validates the input data based on the specified format
 */
export function validateInput(inputData: string | object, format: FormatType): ValidationResult {
  // Handle n8nObject format separately since it's not a string
  if (format === 'n8nObject') {
    return validateN8nObject(inputData);
  }

  // For other formats, ensure we have a string
  if (typeof inputData !== 'string') {
    return {
      valid: false,
      error: `Input data must be a string for ${format} format`,
    };
  }

  if (!inputData || inputData.trim() === '') {
    return {
      valid: false,
      error: 'Input data is empty',
    };
  }

  switch (format) {
    case 'html':
      return validateHtml(inputData);
    case 'csv':
      return validateCsv(inputData);
    case 'json':
      return validateJson(inputData);
    default:
      return {
        valid: false,
        error: `Unsupported format: ${format}`,
      };
  }
}

/**
 * Validates n8nObject input to ensure it has a valid structure
 */
function validateN8nObject(data: string | object): ValidationResult {
  try {
    // If it's a string, try to parse it as JSON
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Check if the object structure is valid
    if (parsed === null || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'n8n Object must be an object or array',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid n8n Object: ${error.message}`,
    };
  }
}

/**
 * Validates HTML input to ensure it contains valid table elements
 */
function validateHtml(html: string): ValidationResult {
  try {
    const $ = cheerio.load(html);
    const tables = $('table');

    if (tables.length === 0) {
      return {
        valid: false,
        error: 'No HTML tables found in the input',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid HTML: ${error.message}`,
    };
  }
}

/**
 * Validates CSV input to ensure it has a consistent structure
 */
function validateCsv(csv: string): ValidationResult {
  try {
    const result = Papa.parse(csv, { skipEmptyLines: true });

    if (result.errors && result.errors.length > 0) {
      return {
        valid: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    if (!result.data || result.data.length === 0) {
      return {
        valid: false,
        error: 'CSV data is empty or contains no valid rows',
      };
    }

    // Check if all rows have the same number of columns
    const data = result.data as unknown[][];
    const firstRowLength = data[0].length;
    const inconsistentRow = data.findIndex((row) => row.length !== firstRowLength);

    if (inconsistentRow !== -1) {
      return {
        valid: false,
        error: `Inconsistent CSV structure: Row ${inconsistentRow + 1} has ${
          data[inconsistentRow].length
        } columns, expected ${firstRowLength}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid CSV: ${error.message}`,
    };
  }
}

/**
 * Validates JSON input to ensure it can be parsed and has the expected structure
 */
function validateJson(json: string): ValidationResult {
  try {
    const parsed = JSON.parse(json);

    // Check if the JSON structure is valid for conversion
    if (parsed === null || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'JSON must be an object or array',
      };
    }

    // If it's an array, make sure it's not empty and that each item is an object
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return {
          valid: false,
          error: 'JSON array is empty',
        };
      }

      // Check if all items in the array are objects
      const nonObjectItem = parsed.findIndex((item) => item === null || typeof item !== 'object' || Array.isArray(item));
      if (nonObjectItem !== -1) {
        return {
          valid: false,
          error: `Invalid JSON structure: Item at index ${nonObjectItem} is not an object`,
        };
      }

      // Check if all objects have the same keys
      const firstItemKeys = Object.keys(parsed[0]).sort().join(',');
      const inconsistentItem = parsed.findIndex(
        (item) => Object.keys(item).sort().join(',') !== firstItemKeys
      );

      if (inconsistentItem !== -1) {
        return {
          valid: false,
          error: `Inconsistent JSON structure: Item at index ${inconsistentItem} has different keys`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}
