/**
 * Operation handlers for different n8n node operations
 * Refactored from the main execute method for better maintainability
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FormatType, ConversionOptions } from '../types';
import { convertData } from './convertData';
import { validateInput } from './validateInput';
import { replaceTable } from './replaceTable';
import { applyTableStyles } from './applyTableStyles';
import { debug } from './debug';
import { simpleHtmlMinify } from './constants';
import {
  extractReplaceParameters,
  extractStyleParameters,
  extractConversionParameters,
  extractN8nObjectParameters
} from './parameterHandler';



export interface OperationContext {
  executeFunctions: IExecuteFunctions;
  items: INodeExecutionData[];
  returnData: INodeExecutionData[];
}

/**
 * Handle the Replace operation
 */
export async function handleReplaceOperation(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const params = extractReplaceParameters(executeFunctions, itemIndex);
    const options = buildReplaceOptions(params);

    // Convert replacement content to HTML if needed
    let htmlReplacementContent: string = params.replacementContent as string;
    if (params.replacementFormat !== 'html') {
      htmlReplacementContent = await convertReplacementContent(params, options);
    }

    // Replace the table in the source HTML
    const result = await replaceTable(params.sourceHtml, htmlReplacementContent, options);

    // Use formatOutputItem to handle wrapping based on user preferences
    const outputItem = formatOutputItem(result, 'html', params.outputField, params.wrapOutput, params.outputFieldName);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}

/**
 * Handle the Style operation
 */
export async function handleStyleOperation(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const params = extractStyleParameters(executeFunctions, itemIndex);
    const styleOptions = buildStyleOptions(params);

    const styledHtml = applyTableStyles(params.htmlInput, styleOptions);

    // Use formatOutputItem to handle wrapping based on user preferences
    const outputItem = formatOutputItem(styledHtml, 'html', params.outputField, params.wrapOutput, params.outputFieldName);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}

/**
 * Handle n8nObject special processing
 */
export async function handleN8nObjectProcessing(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  const targetFormat = executeFunctions.getNodeParameter('targetFormat', 0) as FormatType;
  const params = extractN8nObjectParameters(executeFunctions, targetFormat);
  const options = buildN8nObjectOptions(params);

  // Collect all input items
  const allItems: IDataObject[] = collectN8nObjectItems(items, executeFunctions);

  if (allItems.length > 0) {
    const finalResult = await processN8nObjectItems(allItems, targetFormat, options);
    // Use formatOutputItem to handle wrapping based on user preferences
    const outputItem = formatOutputItem(finalResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  } else {
    // Handle empty case
    const emptyResult = getEmptyResultForFormat(targetFormat);
    // Use formatOutputItem to handle wrapping based on user preferences
    const outputItem = formatOutputItem(emptyResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}

/**
 * Handle regular conversion processing
 */
export async function handleRegularConversion(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const params = extractConversionParameters(executeFunctions, itemIndex);
    const options = buildConversionOptions(params);
    const inputData = extractInputData(params, items[itemIndex], executeFunctions, itemIndex);

    // Validate the input data
    const validationResult = validateInput(inputData, params.sourceFormat);
    if (!validationResult.valid) {
      throw new NodeOperationError(executeFunctions.getNode(), `Invalid input data: ${validationResult.error}`);
    }

    // Convert the data
    debug('operationHandlers.ts', `Before convertData call: includeTableHeaders=${options.includeTableHeaders}`, options);

    const result = await convertData(inputData, params.sourceFormat, params.targetFormat, options);

    // Format the output
    const outputItem = formatOutputItem(result, params.targetFormat, params.outputField, params.wrapOutput, params.outputFieldName);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}



// Option building functions
function buildReplaceOptions(params: ReturnType<typeof extractReplaceParameters>): ConversionOptions {
  const options: ConversionOptions = {
    prettyPrint: params.prettyPrint,
    selectorMode: params.selectorMode,
  };

  if (options.selectorMode === 'simple') {
    options.tablePreset = params.tablePreset;

    if (options.tablePreset === 'table-under-heading') {
      options.headingLevel = params.headingLevel;
      options.headingText = params.headingText;
      options.tableIndex = params.tableIndex;
    }

    if (options.tablePreset === 'table-with-caption') {
      options.captionText = params.captionText;
    }

    if (options.tablePreset === 'custom') {
      options.tableSelector = params.tableSelector;
    }
  } else {
    options.tableSelector = params.tableSelector;
    options.elementSelector = params.elementSelector;
  }

  return options;
}

function buildStyleOptions(params: ReturnType<typeof extractStyleParameters>): ConversionOptions {
  return {
    tableClass: params.tableClass,
    tableStyle: params.tableStyle,
    rowStyle: params.rowStyle,
    cellStyle: params.cellStyle,
    zebraStriping: params.zebraStriping,
    evenRowColor: params.evenRowColor,
    oddRowColor: params.oddRowColor,
    borderStyle: params.borderStyle,
    borderColor: params.borderColor,
    borderRadius: params.borderRadius,
    borderCollapse: params.borderCollapse,
    tableTextAlign: params.tableTextAlign,
    rowTextAlign: params.rowTextAlign,
    cellTextAlign: params.cellTextAlign,
    borderWidth: params.borderWidth,
    captionStyle: params.captionStyle,
    captionPosition: params.captionPosition,
  };
}

function buildN8nObjectOptions(params: ReturnType<typeof extractN8nObjectParameters>): ConversionOptions {
  return {
    includeTableHeaders: params.includeTableHeaders,
    prettyPrint: params.prettyPrint,
    multipleItems: params.multipleItems,
    csvDelimiter: params.csvDelimiter,
  };
}

function buildConversionOptions(params: ReturnType<typeof extractConversionParameters>): ConversionOptions {
  const options: ConversionOptions = {};

  // Set CSV delimiter based on source and target format
  if (params.sourceFormat === 'csv') {
    options.csvDelimiter = params.csvDelimiterInput;
  } else if (params.targetFormat === 'csv') {
    options.csvDelimiter = params.csvDelimiterOutput;
  }

  // Set HTML table selection options
  if (params.sourceFormat === 'html') {
    options.selectorMode = params.selectorMode;

    if (options.selectorMode === 'simple') {
      options.tablePreset = params.tablePreset;

      if (options.tablePreset === 'table-under-heading') {
        options.headingLevel = params.headingLevel;
        options.headingText = params.headingText;
        options.tableIndex = params.tableIndex;
      }

      if (options.tablePreset === 'custom') {
        options.tableSelector = params.tableSelector;
      }
    } else {
      options.tableSelector = params.tableSelector;
      options.elementSelector = params.elementSelector;
    }
  }

  // Data manipulation options
  if (params.sortByField) {
    options.sortByField = params.sortByField;
    options.sortOrder = params.sortOrder;
  }
  if (params.fields) {
    options.fields = params.fields;
  }

  // Common options for all formats
  if (params.sourceFormat === 'n8nObject' && params.targetFormat !== 'html') {
    options.includeTableHeaders = true;
    options.multipleItems = false;
    debug('operationHandlers.ts', `n8nObject source format: includeTableHeaders=${options.includeTableHeaders}`);
  } else {
    options.multipleItems = params.multipleItems;
    if (['html', 'csv', 'json'].includes(params.targetFormat)) {
      options.includeTableHeaders = params.includeTableHeaders;
      debug('operationHandlers.ts', `sourceFormat=${params.sourceFormat}, targetFormat=${params.targetFormat}, includeTableHeaders=${options.includeTableHeaders}`);
    } else {
      options.includeTableHeaders = true;
      debug('operationHandlers.ts', `Other target format: includeTableHeaders=${options.includeTableHeaders}`);
    }
  }

  // Options specific to certain target formats
  if (['json', 'html', 'n8nObject'].includes(params.targetFormat)) {
    options.prettyPrint = params.prettyPrint;
  }

  return options;
}

// Helper functions
async function convertReplacementContent(params: any, options: ConversionOptions): Promise<string> {
  // Validate the replacement content
  const validationResult = validateInput(params.replacementContent, params.replacementFormat);
  if (!validationResult.valid) {
    throw new Error(`Invalid replacement content: ${validationResult.error}`);
  }

  // Convert replacement content to HTML
  const conversionOptions: ConversionOptions = {
    prettyPrint: params.prettyPrint,
    includeTableHeaders: params.includeTableHeaders,
    sortByField: params.sortByField,
    sortOrder: params.sortOrder,
    fields: params.fields,
  };

  if (params.replacementFormat === 'csv') {
    conversionOptions.csvDelimiter = ',';
  }

  return await convertData(params.replacementContent, params.replacementFormat, 'html', conversionOptions) as string;
}

function collectN8nObjectItems(items: INodeExecutionData[], executeFunctions: IExecuteFunctions): IDataObject[] {
  const allItems: IDataObject[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    let inputData: object;

    // Get the resolved inputData parameter (expressions are automatically resolved)
    const explicitInputData = executeFunctions.getNodeParameter('inputData', itemIndex, '');

    // If user provided explicit input data, use it
    if (explicitInputData && explicitInputData !== '') {
      if (typeof explicitInputData === 'string') {
        try {
          inputData = JSON.parse(explicitInputData);
        } catch (error) {
          inputData = { value: explicitInputData };
        }
      } else {
        inputData = explicitInputData as object;
      }
    } else {
      // No explicit input provided, fall back to previous node data
      const item = items[itemIndex];
      if (item.json && Object.keys(item.json).length > 0) {
        if (item.json.convertedData !== undefined) {
          inputData = item.json.convertedData as object;
        } else {
          const filteredData: IDataObject = {};
          for (const key of Object.keys(item.json)) {
            if (!key.startsWith('__')) {
              filteredData[key] = item.json[key];
            }
          }
          inputData = filteredData;
        }
      } else {
        inputData = {};
      }
    }

    // If it's an array, add each item, otherwise add the object itself
    if (Array.isArray(inputData)) {
      for (const item of inputData) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          allItems.push(item as IDataObject);
        }
      }
    } else if (!Array.isArray(inputData) && typeof inputData === 'object' && inputData !== null) {
      // Only add objects, not strings or primitives that might get iterated
      allItems.push(inputData as IDataObject);
    }
  }

  return allItems;
}

async function processN8nObjectItems(allItems: IDataObject[], targetFormat: FormatType, options: ConversionOptions): Promise<string> {
  const { jsonToHtml } = await import('./jsonConverter');
  const Papa = await import('papaparse');

  if (targetFormat === 'html') {
    const htmlTable = await jsonToHtml(allItems, options);
    return options.prettyPrint ?
      htmlTable :
      simpleHtmlMinify(htmlTable);
  } else if (targetFormat === 'csv') {
    const result = Papa.unparse(allItems, {
      delimiter: options.csvDelimiter,
      header: options.includeTableHeaders
    });
    return result;
  } else if (targetFormat === 'json') {
    return JSON.stringify(allItems, null, options.prettyPrint ? 2 : 0);
  }

  return '';
}

function getEmptyResultForFormat(targetFormat: FormatType): string {
  if (targetFormat === 'html') {
    return '<table></table>';
  } else if (targetFormat === 'csv') {
    return '';
  } else { // json
    return '[]';
  }
}

function extractInputData(params: any, item: INodeExecutionData, executeFunctions: IExecuteFunctions, itemIndex: number): string | object {
  // Get the resolved inputData parameter (expressions are automatically resolved)
  const inputData = executeFunctions.getNodeParameter('inputData', itemIndex, '');

  // If user provided explicit input data, use it
  if (inputData && inputData !== '') {
    if (params.sourceFormat === 'n8nObject') {
      // For n8nObject, try to parse as JSON if it's a string
      if (typeof inputData === 'string') {
        try {
          return JSON.parse(inputData);
        } catch (error) {
          return { value: inputData };
        }
      } else {
        return inputData as object;
      }
    } else {
      // For other formats (HTML, CSV, JSON), return as string
      return inputData as string;
    }
  }

  // No explicit input provided, fall back to previous node data for n8nObject format
  if (params.sourceFormat === 'n8nObject' && item.json && Object.keys(item.json).length > 0) {
    if (item.json.convertedData !== undefined) {
      return item.json.convertedData as object;
    } else {
      const filteredData: IDataObject = {};
      for (const key of Object.keys(item.json)) {
        if (!key.startsWith('__')) {
          filteredData[key] = item.json[key];
        }
      }
      return filteredData;
    }
  }

  // Return empty value for the format
  return params.sourceFormat === 'n8nObject' ? {} : '';
}

export function formatOutputItem(result: any, targetFormat: FormatType, outputField: string, wrapOutput: boolean = true, outputFieldName: string = 'convertedData'): INodeExecutionData | INodeExecutionData[] {
  // If wrapping is disabled, return data directly for all formats
  if (!wrapOutput) {
    // For n8nObject format with arrays, return multiple execution data items
    if (targetFormat === 'n8nObject' && Array.isArray(result)) {
      return result.map(item => ({
        json: item as any,
      }));
    }
    // For all other formats, return data directly
    return {
      json: result as any,
    };
  }

  // If wrapping is enabled, ALWAYS return a single execution item with the entire result nested
  // under the specified output field name (including n8nObject arrays)
  return {
    json: {
      [outputFieldName]: result
    } as any,
  };
}
