import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IDataObject } from 'n8n-workflow';
import {
  NodeOperationError,
} from 'n8n-workflow';

import { convertData } from './utils/convertData';
import { validateInput } from './utils/validateInput';
import { jsonToHtml } from './utils/jsonConverter';
import { minify } from 'html-minifier';
import type { FormatType, ConversionOptions, SelectorMode, TablePreset, OperationType } from './types';
import { nodeDescription } from './nodeDescription';
import Papa from 'papaparse';
import { replaceTable } from './utils/replaceTable';
import { debug } from './utils/debug';

export class CsvJsonHtmltableConverter implements INodeType {
  description: INodeTypeDescription = nodeDescription;

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    try {
      // Get the operation type
      const operation = this.getNodeParameter('operation', 0) as OperationType;

      // Handle the Replace operation
      if (operation === 'replace') {
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          const sourceHtml = this.getNodeParameter('sourceHtml', itemIndex) as string;
          const replacementFormat = this.getNodeParameter('replacementFormat', itemIndex) as FormatType;
          const replacementContent = this.getNodeParameter('replacementContent', itemIndex) as string;
          const outputField = this.getNodeParameter('outputField', itemIndex, 'convertedData') as string;
          const prettyPrint = this.getNodeParameter('prettyPrint', itemIndex, false) as boolean;

          // Collect options for table selection
          const options: ConversionOptions = {
            prettyPrint,
          };

          // Set selection options based on mode
          options.selectorMode = this.getNodeParameter('selectorMode', itemIndex, 'simple') as SelectorMode;

          if (options.selectorMode === 'simple') {
            options.tablePreset = this.getNodeParameter('tablePreset', itemIndex, 'all-tables') as TablePreset;

            if (options.tablePreset === 'table-under-heading') {
              options.headingLevel = this.getNodeParameter('headingLevel', itemIndex, 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
              options.headingText = this.getNodeParameter('headingText', itemIndex, '') as string;
              options.tableIndex = this.getNodeParameter('tableIndex', itemIndex, 1) as number;
            }

            if (options.tablePreset === 'custom') {
              options.tableSelector = this.getNodeParameter('tableSelector', itemIndex, 'table') as string;
            }
          } else {
            // Advanced mode
            options.tableSelector = this.getNodeParameter('tableSelector', itemIndex, 'table') as string;
            options.elementSelector = this.getNodeParameter('elementSelector', itemIndex, 'html') as string;
          }

          // If the replacement content is not HTML, convert it to HTML first
          let htmlReplacementContent = replacementContent;

          if (replacementFormat !== 'html') {
            // Validate the replacement content
            const validationResult = validateInput(replacementContent, replacementFormat);
            if (!validationResult.valid) {
              throw new NodeOperationError(this.getNode(), `Invalid replacement content: ${validationResult.error}`);
            }

            // Convert replacement content to HTML
            const conversionOptions: ConversionOptions = {
              prettyPrint,
              includeTableHeaders: true,
            };

            if (replacementFormat === 'csv') {
              conversionOptions.csvDelimiter = ',';
            }

            htmlReplacementContent = await convertData(replacementContent, replacementFormat, 'html', conversionOptions) as string;
          }

          // Replace the table in the source HTML
          const result = await replaceTable(sourceHtml, htmlReplacementContent, options);

          // Return the result
          returnData.push({
            json: {
              [outputField]: result,
            },
          });
        }

        return [returnData];
      }

      // Special handling for n8nObject to HTML/CSV/JSON conversion - collect all items into one array
      if (this.getNodeParameter('sourceFormat', 0) === 'n8nObject' &&
          (this.getNodeParameter('targetFormat', 0) === 'html' ||
           this.getNodeParameter('targetFormat', 0) === 'csv' ||
           this.getNodeParameter('targetFormat', 0) === 'json')) {

        // Get individual options
        const targetFormat = this.getNodeParameter('targetFormat', 0) as FormatType;

        // Use parameters from UI for n8nObject to HTML conversion
        let outputField = 'convertedData';
        let includeTableHeaders = true;
        let prettyPrint = false;

        // For HTML, get the parameter values from the UI
        if (targetFormat === 'html') {
          try {
            outputField = this.getNodeParameter('outputField', 0) as string;
            includeTableHeaders = this.getNodeParameter('includeTableHeaders', 0, true) as boolean;
            prettyPrint = this.getNodeParameter('prettyPrint', 0, false) as boolean;
          } catch (error) {
            // Use defaults if parameters not found
          }
        }

        // For CSV/JSON, always combine everything regardless of multipleItems setting
        const multipleItems = false; // Default to false for n8nObject source format
        const csvDelimiter = targetFormat === 'csv' ? this.getNodeParameter('csvDelimiterOutput', 0, ',') as string : ',';

        // Combine into options object
        const options: ConversionOptions = {
          includeTableHeaders,
          prettyPrint,
          multipleItems,
          csvDelimiter
        };

        // Collect all input items
        const allItems: IDataObject[] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          // Get the input data, handling differently for n8nObject format
          let inputData: object;

          // Check if we're getting input from a previous node's n8nObject output
          const isInputFromPreviousNodeObject = Object.keys(items[itemIndex].json).length > 0 &&
                                              ((items[itemIndex].json.convertedData !== undefined &&
                                              typeof items[itemIndex].json.convertedData === 'object') ||
                                              // Or if this is a direct data item from n8nObject format (without output field wrapper)
                                              Object.keys(items[itemIndex].json).filter(key => !key.startsWith('__')).length > 0);

          // Handle cases where input data is passed directly from another node using {{ $('Node').item.json }}
          const expressionNodeInput = (rawInput: unknown): boolean => {
            return typeof rawInput === 'string' &&
                   rawInput.includes('[object Object]') &&
                   Object.keys(items[itemIndex].json).length > 0;
          };

          // For n8nObject from previous node or passed via expression
          if (isInputFromPreviousNodeObject || expressionNodeInput(this.getNodeParameter('inputData', itemIndex, ''))) {
            // Extract data directly from the item's json
            if (items[itemIndex].json.convertedData !== undefined) {
              // If there's a convertedData field, use that
              inputData = items[itemIndex].json.convertedData as object;
            } else {
              // Otherwise use the json object itself (filtering out n8n internal fields)
              const filteredData: IDataObject = {};
              for (const key of Object.keys(items[itemIndex].json)) {
                if (!key.startsWith('__')) {
                  filteredData[key] = items[itemIndex].json[key];
                }
              }
              inputData = filteredData;
            }
          } else {
            // For n8nObject from inputData parameter, we can accept either a JSON string or an actual object
            const rawInput = this.getNodeParameter('inputData', itemIndex, '');

            // If it's a non-empty string, try to parse it as JSON
            if (typeof rawInput === 'string' && rawInput.trim() !== '') {
              try {
                inputData = JSON.parse(rawInput);
              } catch (error) {
                // If parsing fails, use the string as-is
                inputData = { value: rawInput };
              }
            } else if (rawInput === undefined || rawInput === null) {
              // Provide an empty object as default if undefined or null
              inputData = {};
            } else {
              // Otherwise use the raw input (might be an object already)
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

        // If we collected any items
        if (allItems.length > 0) {
          let finalResult = '';

          // Convert based on target format
          if (targetFormat === 'html') {
            // Convert the combined array to HTML
            const htmlTable = await jsonToHtml(allItems, options);

            // Minify the HTML if pretty print is disabled
            finalResult = !prettyPrint ?
              minify(htmlTable, {
                collapseWhitespace: true,
                removeComments: true,
                removeEmptyAttributes: true,
                removeRedundantAttributes: true
              }) :
              htmlTable;
          } else if (targetFormat === 'csv') {
            // For CSV, use Papa.unparse directly to ensure consistent output
            const result = Papa.unparse(allItems, {
              delimiter: csvDelimiter,
              header: includeTableHeaders
            });
            finalResult = result;
          } else if (targetFormat === 'json') {
            // For JSON, use JSON.stringify directly
            finalResult = JSON.stringify(allItems, null, prettyPrint ? 2 : 0);
          }

          // Return a single item with just the converted data
          returnData.push({
            json: {
              [outputField]: finalResult,
            },
          });

          return [returnData];
        }

        // If no valid items found, return appropriate empty format
        let emptyResult: string;
        if (targetFormat === 'html') {
          emptyResult = '<table></table>';
        } else if (targetFormat === 'csv') {
          emptyResult = '';
        } else { // json
          emptyResult = '[]';
        }

        returnData.push({
          json: {
            [outputField]: emptyResult,
          },
        });

        return [returnData];
      }

      // Regular processing for other formats
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const sourceFormat = this.getNodeParameter('sourceFormat', itemIndex) as FormatType;
        const targetFormat = this.getNodeParameter('targetFormat', itemIndex) as FormatType;
        const outputField = this.getNodeParameter('outputField', itemIndex, 'convertedData') as string;

        // Collect all options from individual parameters
        const options: ConversionOptions = {};

        // Set CSV delimiter based on source and target format
        if (sourceFormat === 'csv') {
          options.csvDelimiter = this.getNodeParameter('csvDelimiterInput', itemIndex, ',') as string;
        } else if (targetFormat === 'csv') {
          options.csvDelimiter = this.getNodeParameter('csvDelimiterOutput', itemIndex, ',') as string;
        }

        // Set HTML table selection options
        if (sourceFormat === 'html') {
          options.selectorMode = this.getNodeParameter('selectorMode', itemIndex, 'simple') as SelectorMode;

          if (options.selectorMode === 'simple') {
            options.tablePreset = this.getNodeParameter('tablePreset', itemIndex, 'all-tables') as TablePreset;

            if (options.tablePreset === 'table-under-heading') {
              options.headingLevel = this.getNodeParameter('headingLevel', itemIndex, 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
              options.headingText = this.getNodeParameter('headingText', itemIndex, '') as string;
              options.tableIndex = this.getNodeParameter('tableIndex', itemIndex, 1) as number;
            }

            if (options.tablePreset === 'custom') {
              options.tableSelector = this.getNodeParameter('tableSelector', itemIndex, 'table') as string;
            }
          } else {
            // Advanced mode
            options.tableSelector = this.getNodeParameter('tableSelector', itemIndex, 'table') as string;
            options.elementSelector = this.getNodeParameter('elementSelector', itemIndex, 'html') as string;
          }
        }

        // Common options for all formats
        if (sourceFormat === 'n8nObject' && targetFormat !== 'html') {
          // Set defaults for n8nObject source format except for HTML target
          options.includeTableHeaders = true;
          options.multipleItems = false;
          debug('CsvJsonHtmltableConverter.node.ts', `n8nObject source format: includeTableHeaders=${options.includeTableHeaders}`);
        } else {
          // For other source formats, use the parameters from the UI
          options.multipleItems = this.getNodeParameter('multipleItems', itemIndex, false) as boolean;

          // Use includeTableHeaders parameter for HTML, CSV, and JSON target formats
          if (targetFormat === 'html' || targetFormat === 'csv' || targetFormat === 'json') {
            options.includeTableHeaders = this.getNodeParameter('includeTableHeaders', itemIndex, true) as boolean;
            debug('CsvJsonHtmltableConverter.node.ts', `sourceFormat=${sourceFormat}, targetFormat=${targetFormat}, includeTableHeaders=${options.includeTableHeaders}`);
          } else {
            options.includeTableHeaders = true;
            debug('CsvJsonHtmltableConverter.node.ts', `Other target format: includeTableHeaders=${options.includeTableHeaders}`);
          }
        }

        // Options specific to certain target formats
        if (['json', 'html', 'n8nObject'].includes(targetFormat)) {
          options.prettyPrint = this.getNodeParameter('prettyPrint', itemIndex, false) as boolean;
        }

        // Get the input data, handling differently for n8nObject source format or data coming from a previous n8nObject conversion
        let inputData: string | object;

        // Check if we're getting input from a previous node's n8nObject output
        const isInputFromPreviousNodeObject = sourceFormat === 'n8nObject' &&
                                            Object.keys(items[itemIndex].json).length > 0 &&
                                            ((items[itemIndex].json.convertedData !== undefined &&
                                            typeof items[itemIndex].json.convertedData === 'object') ||
                                            // Or if this is a direct data item from n8nObject format (without output field wrapper)
                                            Object.keys(items[itemIndex].json).filter(key => !key.startsWith('__')).length > 0);

        // Handle cases where input data is passed directly from another node using {{ $('Node').item.json }}
        // This typically arrives as the raw input containing the string [object Object]
        const expressionNodeInput = (rawInput: unknown): boolean => {
          return typeof rawInput === 'string' &&
                 rawInput.includes('[object Object]') &&
                 Object.keys(items[itemIndex].json).length > 0;
        };

        if (isInputFromPreviousNodeObject || (sourceFormat === 'n8nObject' && expressionNodeInput(this.getNodeParameter('inputData', itemIndex)))) {
          // Extract data directly from the item's json
          if (items[itemIndex].json.convertedData !== undefined) {
            // If there's a convertedData field, use that
            inputData = items[itemIndex].json.convertedData as object;
          } else {
            // Otherwise use the json object itself (filtering out n8n internal fields)
            const filteredData: IDataObject = {};
            for (const key of Object.keys(items[itemIndex].json)) {
              if (!key.startsWith('__')) {
                filteredData[key] = items[itemIndex].json[key];
              }
            }
            inputData = filteredData;
          }
        } else if (sourceFormat === 'n8nObject') {
          // For n8nObject from inputData parameter, we can accept either a JSON string or an actual object
          const rawInput = this.getNodeParameter('inputData', itemIndex);

          // If it's a non-empty string, try to parse it as JSON
          if (typeof rawInput === 'string' && rawInput.trim() !== '') {
            try {
              inputData = JSON.parse(rawInput);
            } catch (error) {
              // If parsing fails, use the string as-is
              inputData = { value: rawInput };
            }
          } else if (rawInput === undefined || rawInput === null) {
            // Provide an empty object as default if undefined or null
            inputData = {};
          } else {
            // Otherwise use the raw input (might be an object already)
            inputData = rawInput as object;
          }
        } else {
          // For other formats, get as string
          inputData = this.getNodeParameter('inputData', itemIndex) as string;
        }

        // Validate the input data
        const validationResult = validateInput(inputData, sourceFormat);
        if (!validationResult.valid) {
          throw new NodeOperationError(this.getNode(), `Invalid input data: ${validationResult.error}`);
        }

        // Convert the data
        debug('CsvJsonHtmltableConverter.node.ts', `Before convertData call: includeTableHeaders=${options.includeTableHeaders}`, options);
        const result = await convertData(inputData, sourceFormat, targetFormat, options);

        // For n8n Object, return the object directly
        if (targetFormat === 'n8nObject') {
          if (sourceFormat === 'html' && Array.isArray(result) && result.length > 1) {
            // For HTML tables with multiple rows, we need to return each row as a separate item
            // without wrapping them in a 'data' property
            for (const row of result) {
              returnData.push({
                json: row as IDataObject,
              });
            }
          } else {
            // For other cases, maintain existing behavior
            // If result is an array with a single item, return just that item
            const unwrappedResult = Array.isArray(result) && result.length === 1 ? result[0] : result;
            returnData.push({
              json: unwrappedResult as IDataObject,
            });
          }
        } else {
          // For other formats, return the converted string in the specified output field
          returnData.push({
            json: {
              [outputField]: result,
            },
          });
        }
      }

      return [returnData];
    } catch (error) {
      if (error.message.includes('Error: ')) {
        // If it's our own error message, clean it up a bit
        throw new NodeOperationError(this.getNode(), error.message.replace('Error: ', ''));
      }
      throw new NodeOperationError(this.getNode(), error);
    }
  }
}
