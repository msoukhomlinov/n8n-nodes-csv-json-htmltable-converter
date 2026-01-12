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
import * as cheerio from 'cheerio';



export interface OperationContext {
  executeFunctions: IExecuteFunctions;
  items: INodeExecutionData[];
  returnData: INodeExecutionData[];
}

/**
 * Apply styles only to tables in the replacement content (not to all tables in the document)
 */
function applyStylesOnlyToReplacementTable(htmlContent: string, styleOptions: ConversionOptions): string {
  // Load the replacement content HTML (should only contain the generated table)
  const $ = cheerio.load(htmlContent, { xmlMode: true });

  $('table').each((_, table) => {
    const $table = $(table);

    // Apply table-level styles
    const tableStyles: Record<string, string> = {};

    if (styleOptions.tableWidth === 'full') {
      tableStyles['width'] = '100%';
    } else if (styleOptions.tableWidth === 'auto') {
      tableStyles['width'] = 'auto';
    }

    if (styleOptions.bodyTextAlign) {
      tableStyles['text-align'] = styleOptions.bodyTextAlign;
    }

    if (Object.keys(tableStyles).length) {
      $table.css(tableStyles);
    }

    // Apply header alignment and styling
    if (styleOptions.headerTextAlign) {
      $table.find('th').css('text-align', styleOptions.headerTextAlign);
    }
    if (styleOptions.headerVerticalAlign) {
      $table.find('th').css('vertical-align', styleOptions.headerVerticalAlign);
    }
    if (styleOptions.headerWrap) {
      const headerWhiteSpace = styleOptions.headerWrap === 'nowrap' ? 'nowrap' : (styleOptions.headerWrap === 'wrap' ? 'normal' : undefined);
      if (headerWhiteSpace) {
        $table.find('th').css('white-space', headerWhiteSpace);
      }
    }

    // Apply body alignment and styling
    if (styleOptions.bodyTextAlign) {
      $table.find('td').css('text-align', styleOptions.bodyTextAlign);
    }
    if (styleOptions.bodyVerticalAlign) {
      $table.find('td').css('vertical-align', styleOptions.bodyVerticalAlign);
    }
    if (styleOptions.bodyWrap) {
      const bodyWhiteSpace = styleOptions.bodyWrap === 'nowrap' ? 'nowrap' : (styleOptions.bodyWrap === 'wrap' ? 'normal' : undefined);
      if (bodyWhiteSpace) {
        $table.find('td').css('white-space', bodyWhiteSpace);
      }
    }

    // Apply banded rows
    if (styleOptions.bandedRows === 'on') {
      $table.find('tbody tr').each((i, row) => {
        const $row = $(row);
        if (i % 2 === 0) {
          // apply a subtle default even-row background
          if (!$row.attr('style') || !$row.attr('style')!.includes('background-color')) {
            $row.css('background-color', '#f9f9f9');
          }
        }
      });
    }

    // Apply numeric alignment overrides for data cells
    if (styleOptions.numericAlignment === 'right' || styleOptions.numericAlignment === 'left') {
      const align = styleOptions.numericAlignment;
      const numberRegex = /^\s*[+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s*(?:[%])?\s*$/;
      $table.find('td').each((_, cell) => {
        const $cell = $(cell);
        const text = $cell.text();
        if (numberRegex.test(text)) {
          $cell.css('text-align', align);
        }
      });
    }
  });

  return $.root().html() || '';
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

    // If simple style options are enabled and replacementFormat is not HTML, apply styles ONLY to the generated replacement table
    if (params.replacementFormat !== 'html' && params.showStyleOptions) {
      htmlReplacementContent = applyStylesOnlyToReplacementTable(htmlReplacementContent, {
        headerTextAlign: params.headerHorizontalAlign,
        bodyTextAlign: params.bodyHorizontalAlign,
        headerVerticalAlign: params.headerVerticalAlign,
        bodyVerticalAlign: params.bodyVerticalAlign,
        headerWrap: params.headerWrap,
        bodyWrap: params.bodyWrap,
        numericAlignment: params.numericAlignment,
        bandedRows: params.bandedRows,
        tableWidth: params.tableWidth,
      });
    }

    // Replace the table in the source HTML
    const result = await replaceTable(params.sourceHtml, htmlReplacementContent, options);

    // Use formatOutputItem to handle wrapping based on user preferences
    const outputItem = formatOutputItem(result, 'html', params.outputField, params.wrapOutput, params.outputFieldName, itemIndex);
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
    const outputItem = formatOutputItem(styledHtml, 'html', params.outputField, params.wrapOutput, params.outputFieldName, itemIndex);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  }

  return [returnData];
}

/**
 * Extract data from a single n8n execution item
 */
function extractSingleItemData(item: INodeExecutionData): IDataObject[] {
  const itemData: IDataObject[] = [];
  let inputData: object;

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

  // If it's an array, add each item, otherwise add the object itself
  if (Array.isArray(inputData)) {
    for (const item of inputData) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        itemData.push(item as IDataObject);
      }
    }
  } else if (!Array.isArray(inputData) && typeof inputData === 'object' && inputData !== null) {
    // Only add objects, not strings or primitives that might get iterated
    itemData.push(inputData as IDataObject);
  }

  return itemData;
}

/**
 * Handle n8nObject special processing
 */
export async function handleN8nObjectProcessing(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  const targetFormat = executeFunctions.getNodeParameter('targetFormat', 0) as FormatType;
  const params = extractN8nObjectParameters(executeFunctions, targetFormat);
  const options = buildN8nObjectOptions(params);

  // Check processAllItemsAtOnce FIRST, regardless of inputData source
  // This ensures the parameter controls behavior even when inputData expressions are used
  if (params.processAllItemsAtOnce) {
    // Process all items together: collect from all items (whether from expressions or previous node)
    const allItems: IDataObject[] = collectN8nObjectItems(items, executeFunctions);

    if (allItems.length > 0) {
      const finalResult = await processN8nObjectItems(allItems, targetFormat, options);
      // Use formatOutputItem to handle wrapping based on user preferences
      // For n8nObject processing, use itemIndex 0 since we're processing all items together
      const outputItem = formatOutputItem(finalResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, 0);
      if (Array.isArray(outputItem)) {
        returnData.push(...outputItem);
      } else {
        returnData.push(outputItem);
      }
    } else {
      // Handle empty case
      const emptyResult = getEmptyResultForFormat(targetFormat);
      // Use formatOutputItem to handle wrapping based on user preferences
      const outputItem = formatOutputItem(emptyResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, 0);
      if (Array.isArray(outputItem)) {
        returnData.push(...outputItem);
      } else {
        returnData.push(outputItem);
      }
    }
  } else {
    // Process each item individually
    // When inputData is an expression like {{ $json }}, it will be evaluated per item
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];

      // Check if inputData is explicitly provided for this item
      const inputDataParam = executeFunctions.getNodeParameter('inputData', itemIndex, '');
      const hasExplicitInputData = inputDataParam && inputDataParam !== '';

      let itemData: IDataObject[];

      if (hasExplicitInputData) {
        // Evaluate inputData expression for this specific item
        let inputData: object;
        if (typeof inputDataParam === 'string') {
          try {
            inputData = JSON.parse(inputDataParam);
          } catch (error) {
            inputData = { value: inputDataParam };
          }
        } else {
          inputData = inputDataParam as object;
        }

        // Convert to array format for processing
        itemData = [];
        if (Array.isArray(inputData)) {
          for (const dataItem of inputData) {
            if (typeof dataItem === 'object' && dataItem !== null && !Array.isArray(dataItem)) {
              itemData.push(dataItem as IDataObject);
            }
          }
        } else if (!Array.isArray(inputData) && typeof inputData === 'object' && inputData !== null) {
          itemData.push(inputData as IDataObject);
        }
      } else {
        // No explicit input, use previous node data
        itemData = extractSingleItemData(item);
      }

      if (itemData.length > 0) {
        const finalResult = await processN8nObjectItems(itemData, targetFormat, options);
        // Use formatOutputItem to handle wrapping based on user preferences
        // Use actual itemIndex for proper paired item tracking
        const outputItem = formatOutputItem(finalResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, itemIndex);
        if (Array.isArray(outputItem)) {
          returnData.push(...outputItem);
        } else {
          returnData.push(outputItem);
        }
      } else {
        // Handle empty case for this item
        const emptyResult = getEmptyResultForFormat(targetFormat);
        const outputItem = formatOutputItem(emptyResult, targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, itemIndex);
        if (Array.isArray(outputItem)) {
          returnData.push(...outputItem);
        } else {
          returnData.push(outputItem);
        }
      }
    }
  }

  return [returnData];
}

/**
 * Handle regular conversion processing
 */
export async function handleRegularConversion(context: OperationContext): Promise<INodeExecutionData[][]> {
  const { executeFunctions, items, returnData } = context;

  // Check if inputData is explicitly provided (at itemIndex 0)
  // If it is, process once without iterating through items from previous node
  // This prevents paired item data errors when expressions reference different nodes
  const inputDataParam = executeFunctions.getNodeParameter('inputData', 0, '');
  const hasExplicitInputData = inputDataParam && inputDataParam !== '';

  if (hasExplicitInputData) {
    // Process once with itemIndex 0 when explicit inputData is provided
    const params = extractConversionParameters(executeFunctions, 0);
    const options = buildConversionOptions(params);
    const inputData = extractInputData(params, items[0] || { json: {} }, executeFunctions, 0);

    // Validate the input data
    const validationResult = validateInput(inputData, params.sourceFormat);
    if (!validationResult.valid) {
      throw new NodeOperationError(executeFunctions.getNode(), `Invalid input data: ${validationResult.error}`);
    }

    // Convert the data
    debug('operationHandlers.ts', `Before convertData call: includeTableHeaders=${options.includeTableHeaders}`, options);

    const result = await convertData(inputData, params.sourceFormat, params.targetFormat, options);

    // Format the output
    const outputItem = formatOutputItem(result, params.targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, 0);
    if (Array.isArray(outputItem)) {
      returnData.push(...outputItem);
    } else {
      returnData.push(outputItem);
    }
  } else {
    // No explicit input provided, iterate through items from previous node (existing behavior)
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
      const outputItem = formatOutputItem(result, params.targetFormat, params.outputField, params.wrapOutput, params.outputFieldName, itemIndex);
      if (Array.isArray(outputItem)) {
        returnData.push(...outputItem);
      } else {
        returnData.push(outputItem);
      }
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

  // Heading detection options
  if (params.sourceFormat === 'html') {
    // Auto-enable heading detection for "all tables" preset
    if (params.selectorMode === 'simple' && params.tablePreset === 'all-tables') {
      options.enableHeadingDetection = true;
      // If heading selector is blank, it will default to h1-h5 in findPrecedingHeadingHierarchy
      options.headingSelector = params.headingSelector || '';
    } else if (params.multipleItems) {
      options.enableHeadingDetection = params.enableHeadingDetection;
      if (params.enableHeadingDetection) {
        options.headingSelector = params.headingSelector;
      }
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

  // Check if inputData is explicitly provided (at itemIndex 0 to detect if expression is used)
  // When processAllItemsAtOnce=true, we need to evaluate the expression for EACH item
  const explicitInputData = executeFunctions.getNodeParameter('inputData', 0, '');
  const hasExplicitInputData = explicitInputData && explicitInputData !== '';

  if (hasExplicitInputData) {
    // InputData expression provided: check if it references a node by name
    // Expressions like {{ $('Node Name').item.json }} return the same value regardless of itemIndex
    // We detect this by comparing evaluation at itemIndex 0 and 1
    let referencesNodeByName = false;

    if (items.length > 1) {
      const eval0 = executeFunctions.getNodeParameter('inputData', 0, '');
      const eval1 = executeFunctions.getNodeParameter('inputData', 1, '');

      // Check if both evaluations return the SAME OBJECT REFERENCE
      // When {{ $('Node Name').item.json }} is used, n8n returns the same object reference
      // When {{ $json }} is used, n8n returns different object references (one per item)
      // This avoids false positives with identical data
      if (eval0 === eval1) {
        referencesNodeByName = true;
      }
    }
    // Note: For single item case (items.length === 1), we default to per-item evaluation
    // This ensures {{ $json }} works correctly even with one item
    // If the user truly needs node-by-name with one item, the fallback path will handle it

    if (referencesNodeByName) {
      // Expression references a node by name: iterate through items array directly
      // This assumes the referenced node is the immediate previous node (items array)
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];
        let inputData: object;

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

        // If it's an array, add each item, otherwise add the object itself
        if (Array.isArray(inputData)) {
          for (const dataItem of inputData) {
            if (typeof dataItem === 'object' && dataItem !== null && !Array.isArray(dataItem)) {
              allItems.push(dataItem as IDataObject);
            }
          }
        } else if (!Array.isArray(inputData) && typeof inputData === 'object' && inputData !== null) {
          // Only add objects, not strings or primitives that might get iterated
          allItems.push(inputData as IDataObject);
        }
      }
    } else {
      // Expression evaluates per-item (like {{ $json }}): evaluate for EACH item
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const inputDataParam = executeFunctions.getNodeParameter('inputData', itemIndex, '');

        if (inputDataParam && inputDataParam !== '') {
          let inputData: object;
          if (typeof inputDataParam === 'string') {
            try {
              inputData = JSON.parse(inputDataParam);
            } catch (error) {
              inputData = { value: inputDataParam };
            }
          } else {
            inputData = inputDataParam as object;
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
      }
    }
  } else {
    // No explicit input provided, iterate through items from previous node (existing behavior)
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      let inputData: object;

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

export function formatOutputItem(result: any, targetFormat: FormatType, outputField: string, wrapOutput: boolean = true, outputFieldName: string = 'convertedData', itemIndex: number = 0): INodeExecutionData | INodeExecutionData[] {
  // If wrapping is disabled, return data directly for all formats
  if (!wrapOutput) {
    // For n8nObject format with arrays, return multiple execution data items
    if (targetFormat === 'n8nObject' && Array.isArray(result)) {
      return result.map((item, index) => ({
        json: item as any,
        pairedItem: { item: itemIndex },
      }));
    }
    // For all other formats, return data directly
    return {
      json: result as any,
      pairedItem: { item: itemIndex },
    };
  }

  // If wrapping is enabled, ALWAYS return a single execution item with the entire result nested
  // under the specified output field name (including n8nObject arrays)
  return {
    json: {
      [outputFieldName]: result
    } as any,
    pairedItem: { item: itemIndex },
  };
}
