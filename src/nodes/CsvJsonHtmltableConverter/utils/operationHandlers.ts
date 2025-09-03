/**
 * Operation handlers for different n8n node operations
 * Refactored from the main execute method for better maintainability
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FormatType, ConversionOptions, SelectorMode, TablePreset } from '../types';
import { convertData } from './convertData';
import { validateInput } from './validateInput';
import { replaceTable } from './replaceTable';
import { applyTableStyles } from './applyTableStyles';
import { debug } from './debug';
import { MINIFY_OPTIONS } from './constants';
import {
  extractReplaceParameters,
  extractStyleParameters,
  extractConversionParameters,
  extractN8nObjectParameters
} from './parameterHandler';

// Type-safe parameter interfaces
interface ReplaceParams {
  sourceHtml: string;
  replacementFormat: FormatType;
  replacementContent: string;
  outputField: string;
  prettyPrint: boolean;
  selectorMode: SelectorMode;
  tablePreset: TablePreset;
  headingLevel: number;
  headingText: string;
  tableIndex: number;
  captionText: string;
  tableSelector: string;
  elementSelector: string;
}

interface StyleParams {
  htmlInput: string;
  tableClass: string;
  tableStyle: string;
  rowStyle: string;
  cellStyle: string;
  zebraStriping: boolean;
  evenRowColor: string;
  oddRowColor: string;
  borderStyle: string;
  borderWidth: number;
  captionStyle: string;
  captionPosition: string;
  borderColor: string;
  borderRadius: string;
  borderCollapse: string;
  tableTextAlign: string;
  rowTextAlign: string;
  cellTextAlign: string;
  outputField: string;
}

interface ConversionParams {
  sourceFormat: FormatType;
  targetFormat: FormatType;
  outputField: string;
  csvDelimiterInput: string;
  csvDelimiterOutput: string;
  selectorMode: SelectorMode;
  tablePreset: TablePreset;
  headingLevel: number;
  headingText: string;
  tableIndex: number;
  tableSelector: string;
  elementSelector: string;
  multipleItems: boolean;
  includeTableHeaders: boolean;
  prettyPrint: boolean;
  sortByField: string;
  sortOrder: 'ascending' | 'descending';
  fields: string;
}

interface N8nObjectParams {
  targetFormat: FormatType;
  outputField: string;
  includeTableHeaders: boolean;
  prettyPrint: boolean;
  multipleItems: boolean;
  csvDelimiter: string;
}


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
    let htmlReplacementContent = params.replacementContent;
    if (params.replacementFormat !== 'html') {
      htmlReplacementContent = await convertReplacementContent(params, options);
    }

    // Replace the table in the source HTML
    const result = await replaceTable(params.sourceHtml, htmlReplacementContent, options);

    // Return the result directly without wrapping
    returnData.push({
      json: result as any,
    });
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

    returnData.push({
      json: styledHtml as any,
    });
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
    returnData.push({
      json: finalResult as any,
    });
  } else {
    // Handle empty case
    const emptyResult = getEmptyResultForFormat(targetFormat);
    returnData.push({
      json: emptyResult as any,
    });
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
    const outputItem = formatOutputItem(result, params.targetFormat, params.outputField);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}



// Option building functions
function buildReplaceOptions(params: ReplaceParams): ConversionOptions {
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

function buildStyleOptions(params: StyleParams): ConversionOptions {
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

function buildN8nObjectOptions(params: N8nObjectParams): ConversionOptions {
  return {
    includeTableHeaders: params.includeTableHeaders,
    prettyPrint: params.prettyPrint,
    multipleItems: params.multipleItems,
    csvDelimiter: params.csvDelimiter,
  };
}

function buildConversionOptions(params: ConversionParams): ConversionOptions {
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
    includeTableHeaders: true,
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

    // Check if we're getting input from a previous node's n8nObject output
    const isInputFromPreviousNodeObject = Object.keys(items[itemIndex].json).length > 0 &&
      ((items[itemIndex].json.convertedData !== undefined &&
        typeof items[itemIndex].json.convertedData === 'object') ||
        Object.keys(items[itemIndex].json).filter(key => !key.startsWith('__')).length > 0);

    // Handle cases where input data is passed directly from another node
    const expressionNodeInput = (rawInput: unknown): boolean => {
      // Check if rawInput looks like it came from an expression that couldn't serialize properly
      return typeof rawInput === 'string' &&
        rawInput.trim() !== '' &&
        Object.keys(items[itemIndex].json).length > 0 &&
        // Try to parse as JSON, if it fails but we have other data, likely from expression
        (() => {
          try {
            JSON.parse(rawInput);
            return false; // If it parses, it's valid JSON, not an expression issue
          } catch {
            return true; // If it doesn't parse and we have other data, likely expression
          }
        })();
    };

    // For n8nObject from previous node or passed via expression
    if (isInputFromPreviousNodeObject || expressionNodeInput(executeFunctions.getNodeParameter('inputData', itemIndex))) {
      if (items[itemIndex].json.convertedData !== undefined) {
        inputData = items[itemIndex].json.convertedData as object;
      } else {
        const filteredData: IDataObject = {};
        for (const key of Object.keys(items[itemIndex].json)) {
          if (!key.startsWith('__')) {
            filteredData[key] = items[itemIndex].json[key];
          }
        }
        inputData = filteredData;
      }
    } else {
      // For n8nObject from inputData parameter
      const rawInput = executeFunctions.getNodeParameter('inputData', itemIndex);
      if (typeof rawInput === 'string' && rawInput.trim() !== '') {
        try {
          inputData = JSON.parse(rawInput);
        } catch (error) {
          inputData = { value: rawInput };
        }
      } else if (rawInput === undefined || rawInput === null) {
        inputData = {};
      } else {
        inputData = rawInput as object;
      }
    }

    // If it's an array, add each item, otherwise add the object itself
    if (Array.isArray(inputData)) {
      for (const item of inputData) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          allItems.push(item as IDataObject);
        }
      }
    } else if (!Array.isArray(inputData)) {
      allItems.push(inputData as IDataObject);
    }
  }

  return allItems;
}

async function processN8nObjectItems(allItems: IDataObject[], targetFormat: FormatType, options: ConversionOptions): Promise<string> {
  const { jsonToHtml } = await import('./jsonConverter');
  const minifyHtml = await import('@minify-html/node');
  const Papa = await import('papaparse');

  if (targetFormat === 'html') {
    const htmlTable = await jsonToHtml(allItems, options);
    return options.prettyPrint ?
      htmlTable :
      minifyHtml.minify(Buffer.from(htmlTable), MINIFY_OPTIONS).toString();
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
  // Check if we're getting input from a previous node's n8nObject output
  const isInputFromPreviousNodeObject = params.sourceFormat === 'n8nObject' &&
    Object.keys(item.json).length > 0 &&
    ((item.json.convertedData !== undefined &&
      typeof item.json.convertedData === 'object') ||
      Object.keys(item.json).filter(key => !key.startsWith('__')).length > 0);

  // Handle cases where input data is passed directly from another node
  const expressionNodeInput = (rawInput: unknown): boolean => {
    // Check if rawInput looks like it came from an expression that couldn't serialize properly
    return typeof rawInput === 'string' &&
      rawInput.trim() !== '' &&
      Object.keys(item.json).length > 0 &&
      // Try to parse as JSON, if it fails but we have other data, likely from expression
      (() => {
        try {
          JSON.parse(rawInput);
          return false; // If it parses, it's valid JSON, not an expression issue
        } catch {
          return true; // If it doesn't parse and we have other data, likely expression
        }
      })();
  };

  if (isInputFromPreviousNodeObject || (params.sourceFormat === 'n8nObject' && expressionNodeInput(executeFunctions.getNodeParameter('inputData', itemIndex)))) {
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
  } else if (params.sourceFormat === 'n8nObject') {
    const rawInput = executeFunctions.getNodeParameter('inputData', itemIndex);
    if (typeof rawInput === 'string' && rawInput.trim() !== '') {
      try {
        return JSON.parse(rawInput);
      } catch (error) {
        return { value: rawInput };
      }
    } else if (rawInput === undefined || rawInput === null) {
      return {};
    } else {
      return rawInput as object;
    }
  } else {
    return executeFunctions.getNodeParameter('inputData', itemIndex) as string;
  }
}

export function formatOutputItem(result: any, targetFormat: FormatType, outputField: string): INodeExecutionData | INodeExecutionData[] {
  // For n8nObject format with arrays, return multiple execution data items
  if (targetFormat === 'n8nObject' && Array.isArray(result)) {
    return result.map(item => ({
      json: item as any,
    }));
  }

  // For other formats, return data directly without any wrapping
  return {
    json: result as any,
  };
}
