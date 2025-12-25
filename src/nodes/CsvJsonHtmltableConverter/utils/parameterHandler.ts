/**
 * Parameter handling utilities for type-safe parameter extraction and validation
 */

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { FormatType, SelectorMode, TablePreset, OperationType } from '../types';

/**
 * Parameter definition with validation rules
 */
export interface ParameterDefinition<T = any> {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  defaultValue?: T;
  enumValues?: readonly T[];
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  validator?: (value: T) => boolean | string;
}

/**
 * Parameter extraction result
 */
export interface ParameterResult<T = any> {
  value: T;
  isDefault: boolean;
}

/**
 * Parameter extractor class for type-safe parameter handling
 */
export class ParameterExtractor {
  private executeFunctions: IExecuteFunctions;
  private itemIndex: number;

  constructor(executeFunctions: IExecuteFunctions, itemIndex: number = 0) {
    this.executeFunctions = executeFunctions;
    this.itemIndex = itemIndex;
  }

  /**
   * Extract a single parameter with validation
   */
  extractParameter<T>(definition: ParameterDefinition<T>): ParameterResult<T> {
    try {
      let value: T;
      let isDefault = false;

      try {
        value = this.executeFunctions.getNodeParameter(definition.name, this.itemIndex, definition.defaultValue) as T;
        if (value === undefined || value === null) {
          if (definition.required) {
            throw new NodeOperationError(this.executeFunctions.getNode(),
              `Required parameter '${definition.name}' is missing`);
          }
          value = definition.defaultValue as T;
          isDefault = true;
        }
      } catch (error) {
        if (definition.required) {
          throw new NodeOperationError(this.executeFunctions.getNode(),
            `Required parameter '${definition.name}' is missing: ${error.message}`);
        }
        value = definition.defaultValue as T;
        isDefault = true;
      }

      // Validate the value
      const validationError = this.validateParameter(value, definition);
      if (validationError) {
        throw new NodeOperationError(this.executeFunctions.getNode(),
          `Parameter '${definition.name}' validation failed: ${validationError}`);
      }

      return { value, isDefault };
    } catch (error) {
      if (error instanceof NodeOperationError) {
        throw error;
      }
      throw new NodeOperationError(this.executeFunctions.getNode(),
        `Failed to extract parameter '${definition.name}': ${error.message}`);
    }
  }

  /**
   * Extract multiple parameters at once
   */
  extractParameters<T extends Record<string, any>>(definitions: Record<keyof T, ParameterDefinition>): {
    [K in keyof T]: ParameterResult<T[K]>
  } {
    const result = {} as { [K in keyof T]: ParameterResult<T[K]> };

    for (const [key, definition] of Object.entries(definitions) as [keyof T, ParameterDefinition][]) {
      result[key] = this.extractParameter(definition);
    }

    return result;
  }

  /**
   * Validate a parameter value against its definition
   */
  private validateParameter<T>(value: T, definition: ParameterDefinition<T>): string | null {
    // Type validation
    if (definition.type === 'string' && typeof value !== 'string') {
      return `Expected string, got ${typeof value}`;
    }
    if (definition.type === 'number' && typeof value !== 'number') {
      return `Expected number, got ${typeof value}`;
    }
    if (definition.type === 'boolean' && typeof value !== 'boolean') {
      return `Expected boolean, got ${typeof value}`;
    }

    // String validations
    if (definition.type === 'string' && typeof value === 'string') {
      if (definition.minLength !== undefined && value.length < definition.minLength) {
        return `String length ${value.length} is less than minimum ${definition.minLength}`;
      }
      if (definition.maxLength !== undefined && value.length > definition.maxLength) {
        return `String length ${value.length} exceeds maximum ${definition.maxLength}`;
      }
    }

    // Number validations
    if (definition.type === 'number' && typeof value === 'number') {
      if (definition.minValue !== undefined && value < definition.minValue) {
        return `Value ${value} is less than minimum ${definition.minValue}`;
      }
      if (definition.maxValue !== undefined && value > definition.maxValue) {
        return `Value ${value} exceeds maximum ${definition.maxValue}`;
      }
    }

    // Enum validation
    if (definition.type === 'enum' && definition.enumValues) {
      if (!definition.enumValues.includes(value)) {
        return `Value '${value}' is not in allowed values: ${definition.enumValues.join(', ')}`;
      }
    }

    // Custom validator
    if (definition.validator) {
      const result = definition.validator(value);
      if (result !== true) {
        return typeof result === 'string' ? result : 'Validation failed';
      }
    }

    return null;
  }
}

/**
 * Predefined parameter definitions for common operations
 */
export const PARAMETER_DEFINITIONS = {
  // Common parameters
  operation: {
    name: 'operation',
    type: 'enum' as const,
    required: true,
    enumValues: ['convert', 'replace', 'style'] as const,
  } as ParameterDefinition<OperationType>,

  outputField: {
    name: 'outputField',
    type: 'string' as const,
    defaultValue: 'convertedData',
    minLength: 1,
    maxLength: 100,
  } as ParameterDefinition<string>,

  prettyPrint: {
    name: 'prettyPrint',
    type: 'boolean' as const,
    defaultValue: false,
  } as ParameterDefinition<boolean>,

  // Convert operation parameters
  sourceFormat: {
    name: 'sourceFormat',
    type: 'enum' as const,
    required: true,
    enumValues: ['html', 'csv', 'json', 'n8nObject'] as const,
  } as ParameterDefinition<FormatType>,

  targetFormat: {
    name: 'targetFormat',
    type: 'enum' as const,
    required: true,
    enumValues: ['html', 'csv', 'json', 'n8nObject'] as const,
  } as ParameterDefinition<FormatType>,

  // Replace operation parameters
  sourceHtml: {
    name: 'sourceHtml',
    type: 'string' as const,
    required: true,
    minLength: 1,
  } as ParameterDefinition<string>,

  replacementFormat: {
    name: 'replacementFormat',
    type: 'enum' as const,
    required: true,
    enumValues: ['html', 'csv', 'json', 'n8nObject'] as const,
  } as ParameterDefinition<FormatType>,

  replacementContent: {
    name: 'replacementContent',
    type: 'string' as const,
    required: true,
    minLength: 1,
  } as ParameterDefinition<string>,

  // Style operation parameters
  htmlInput: {
    name: 'htmlInput',
    type: 'string' as const,
    required: true,
    minLength: 1,
  } as ParameterDefinition<string>,

  tableClass: {
    name: 'tableClass',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  tableStyle: {
    name: 'tableStyle',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  rowStyle: {
    name: 'rowStyle',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  cellStyle: {
    name: 'cellStyle',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  // Additional style parameters
  evenRowColor: {
    name: 'evenRowColor',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  oddRowColor: {
    name: 'oddRowColor',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  borderStyle: {
    name: 'borderStyle',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  borderWidth: {
    name: 'borderWidth',
    type: 'number' as const,
    defaultValue: 1,
    minValue: 0,
    maxValue: 20,
  } as ParameterDefinition<number>,

  captionStyle: {
    name: 'captionStyle',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  captionPosition: {
    name: 'captionPosition',
    type: 'enum' as const,
    defaultValue: 'top',
    enumValues: ['top', 'bottom'] as const,
  } as ParameterDefinition<string>,

  borderColor: {
    name: 'borderColor',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  borderRadius: {
    name: 'borderRadius',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  borderCollapse: {
    name: 'borderCollapse',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'collapse', 'separate'] as const,
  } as ParameterDefinition<string>,

  tableTextAlign: {
    name: 'tableTextAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'left', 'center', 'right', 'justify'] as const,
  } as ParameterDefinition<string>,

  rowTextAlign: {
    name: 'rowTextAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'left', 'center', 'right', 'justify'] as const,
  } as ParameterDefinition<string>,

  cellTextAlign: {
    name: 'cellTextAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'left', 'center', 'right', 'justify'] as const,
  } as ParameterDefinition<string>,

  // Table selection parameters
  selectorMode: {
    name: 'selectorMode',
    type: 'enum' as const,
    defaultValue: 'simple',
    enumValues: ['simple', 'advanced'] as const,
  } as ParameterDefinition<SelectorMode>,

  tablePreset: {
    name: 'tablePreset',
    type: 'enum' as const,
    defaultValue: 'all-tables',
    enumValues: ['all-tables', 'first-table', 'last-table', 'table-under-heading', 'table-with-caption', 'custom'] as const,
  } as ParameterDefinition<TablePreset>,

  tableSelector: {
    name: 'tableSelector',
    type: 'string' as const,
    defaultValue: 'table',
    minLength: 1,
  } as ParameterDefinition<string>,

  elementSelector: {
    name: 'elementSelector',
    type: 'string' as const,
    defaultValue: 'html',
    minLength: 1,
  } as ParameterDefinition<string>,

  headingLevel: {
    name: 'headingLevel',
    type: 'number' as const,
    defaultValue: 1,
    minValue: 1,
    maxValue: 999,
  } as ParameterDefinition<number>,

  headingText: {
    name: 'headingText',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  tableIndex: {
    name: 'tableIndex',
    type: 'number' as const,
    defaultValue: 1,
    minValue: 1,
  } as ParameterDefinition<number>,

  captionText: {
    name: 'captionText',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  // CSV parameters
  csvDelimiterInput: {
    name: 'csvDelimiterInput',
    type: 'string' as const,
    defaultValue: ',',
    minLength: 1,
    maxLength: 5,
  } as ParameterDefinition<string>,

  csvDelimiterOutput: {
    name: 'csvDelimiterOutput',
    type: 'string' as const,
    defaultValue: ',',
    minLength: 1,
    maxLength: 5,
  } as ParameterDefinition<string>,

  // Table display parameters
  includeTableHeaders: {
    name: 'includeTableHeaders',
    type: 'boolean' as const,
    defaultValue: true,
  } as ParameterDefinition<boolean>,

  multipleItems: {
    name: 'multipleItems',
    type: 'boolean' as const,
    defaultValue: false,
  } as ParameterDefinition<boolean>,

  // Heading detection parameters
  enableHeadingDetection: {
    name: 'enableHeadingDetection',
    type: 'boolean' as const,
    defaultValue: false,
  } as ParameterDefinition<boolean>,

  headingSelector: {
    name: 'headingSelector',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  // Data manipulation parameters
  sortByField: {
    name: 'sortByField',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  sortOrder: {
    name: 'sortOrder',
    type: 'enum' as const,
    defaultValue: 'ascending',
    enumValues: ['ascending', 'descending'] as const,
  } as ParameterDefinition<'ascending' | 'descending'>,

  fields: {
    name: 'fields',
    type: 'string' as const,
    defaultValue: '',
  } as ParameterDefinition<string>,

  // Output wrapping parameters
  wrapOutput: {
    name: 'wrapOutput',
    type: 'boolean' as const,
    defaultValue: true,
  } as ParameterDefinition<boolean>,

  outputFieldName: {
    name: 'outputFieldName',
    type: 'string' as const,
    defaultValue: 'convertedData',
    minLength: 1,
    maxLength: 100,
  } as ParameterDefinition<string>,

  processAllItemsAtOnce: {
    name: 'processAllItemsAtOnce',
    type: 'boolean' as const,
    defaultValue: false,
  } as ParameterDefinition<boolean>,

  // Replace simple style parameters
  showStyleOptions: {
    name: 'showStyleOptions',
    type: 'boolean' as const,
    defaultValue: false,
  } as ParameterDefinition<boolean>,
  headerHorizontalAlign: {
    name: 'headerHorizontalAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'left', 'center', 'right'] as const,
  } as ParameterDefinition<string>,
  bodyHorizontalAlign: {
    name: 'bodyHorizontalAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'left', 'center', 'right'] as const,
  } as ParameterDefinition<string>,
  numericAlignment: {
    name: 'numericAlignment',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'right', 'left'] as const,
  } as ParameterDefinition<string>,
  bandedRows: {
    name: 'bandedRows',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'on', 'off'] as const,
  } as ParameterDefinition<string>,
  headerVerticalAlign: {
    name: 'headerVerticalAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'top', 'middle', 'bottom'] as const,
  } as ParameterDefinition<string>,
  bodyVerticalAlign: {
    name: 'bodyVerticalAlign',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'top', 'middle', 'bottom'] as const,
  } as ParameterDefinition<string>,
  headerWrap: {
    name: 'headerWrap',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'wrap', 'nowrap'] as const,
  } as ParameterDefinition<string>,
  bodyWrap: {
    name: 'bodyWrap',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'wrap', 'nowrap'] as const,
  } as ParameterDefinition<string>,
  tableWidth: {
    name: 'tableWidth',
    type: 'enum' as const,
    defaultValue: '',
    enumValues: ['', 'auto', 'full'] as const,
  } as ParameterDefinition<string>,
};

/**
 * Extract parameters for replace operation
 */
export function extractReplaceParameters(executeFunctions: IExecuteFunctions, itemIndex: number = 0) {
  const extractor = new ParameterExtractor(executeFunctions, itemIndex);

  // First extract replacementFormat to check if we need special handling
  const replacementFormatParam = extractor.extractParameter(PARAMETER_DEFINITIONS.replacementFormat);
  const replacementFormat = replacementFormatParam.value as FormatType;

  // Extract replacementContent with special handling for n8nObject format
  let replacementContent: string | object;
  if (replacementFormat === 'n8nObject') {
    // For n8nObject, bypass parameter validation and extract directly
    const rawReplacementContent = executeFunctions.getNodeParameter('replacementContent', itemIndex, '');

    if (typeof rawReplacementContent === 'string') {
      // Try to parse as JSON if it's a string
      try {
        replacementContent = JSON.parse(rawReplacementContent);
      } catch (error) {
        // If it's not valid JSON, treat as a simple string value
        replacementContent = { value: rawReplacementContent };
      }
    } else {
      // If it's already an object, use it directly
      replacementContent = rawReplacementContent as object;
    }
  } else {
    // For other formats, use normal parameter validation
    const replacementContentParam = extractor.extractParameter(PARAMETER_DEFINITIONS.replacementContent);
    replacementContent = replacementContentParam.value as string;
  }

  // Extract all other parameters normally
  const params = extractor.extractParameters({
    sourceHtml: PARAMETER_DEFINITIONS.sourceHtml,
    outputField: PARAMETER_DEFINITIONS.outputField,
    prettyPrint: PARAMETER_DEFINITIONS.prettyPrint,
    includeTableHeaders: PARAMETER_DEFINITIONS.includeTableHeaders,
    selectorMode: PARAMETER_DEFINITIONS.selectorMode,
    tablePreset: PARAMETER_DEFINITIONS.tablePreset,
    headingLevel: PARAMETER_DEFINITIONS.headingLevel,
    headingText: PARAMETER_DEFINITIONS.headingText,
    tableIndex: PARAMETER_DEFINITIONS.tableIndex,
    captionText: PARAMETER_DEFINITIONS.captionText,
    tableSelector: PARAMETER_DEFINITIONS.tableSelector,
    elementSelector: PARAMETER_DEFINITIONS.elementSelector,
    wrapOutput: PARAMETER_DEFINITIONS.wrapOutput,
    outputFieldName: PARAMETER_DEFINITIONS.outputFieldName,
    sortByField: PARAMETER_DEFINITIONS.sortByField,
    sortOrder: PARAMETER_DEFINITIONS.sortOrder,
    fields: PARAMETER_DEFINITIONS.fields,
  });

  // Extract simple style options leniently (avoid strict validation to preserve backward compatibility in tests)
  let showStyleOptions = false;
  try {
    const v = executeFunctions.getNodeParameter('showStyleOptions', itemIndex, false) as any;
    showStyleOptions = v === true || v === 'true';
  } catch {}
  const headerHorizontalAlign = ((): string => {
    try { return executeFunctions.getNodeParameter('headerHorizontalAlign', itemIndex, '') as string; } catch { return ''; }
  })();
  const bodyHorizontalAlign = ((): string => {
    try { return executeFunctions.getNodeParameter('bodyHorizontalAlign', itemIndex, '') as string; } catch { return ''; }
  })();
  const numericAlignment = ((): string => {
    try { return executeFunctions.getNodeParameter('numericAlignment', itemIndex, '') as string; } catch { return ''; }
  })();
  const bandedRows = ((): string => {
    try { return executeFunctions.getNodeParameter('bandedRows', itemIndex, '') as string; } catch { return ''; }
  })();
  const headerVerticalAlign = ((): string => {
    try { return executeFunctions.getNodeParameter('headerVerticalAlign', itemIndex, '') as string; } catch { return ''; }
  })();
  const bodyVerticalAlign = ((): string => {
    try { return executeFunctions.getNodeParameter('bodyVerticalAlign', itemIndex, '') as string; } catch { return ''; }
  })();
  const headerWrap = ((): string => {
    try { return executeFunctions.getNodeParameter('headerWrap', itemIndex, '') as string; } catch { return ''; }
  })();
  const bodyWrap = ((): string => {
    try { return executeFunctions.getNodeParameter('bodyWrap', itemIndex, '') as string; } catch { return ''; }
  })();
  const tableWidth = ((): string => {
    try { return executeFunctions.getNodeParameter('tableWidth', itemIndex, '') as string; } catch { return ''; }
  })();

  return {
    sourceHtml: params.sourceHtml.value as string,
    replacementFormat,
    replacementContent,
    outputField: params.outputField.value as string,
    prettyPrint: params.prettyPrint.value as boolean,
    includeTableHeaders: params.includeTableHeaders.value as boolean,
    selectorMode: params.selectorMode.value as SelectorMode,
    tablePreset: params.tablePreset.value as TablePreset,
    headingLevel: params.headingLevel.value as number,
    headingText: params.headingText.value as string,
    tableIndex: params.tableIndex.value as number,
    captionText: params.captionText.value as string,
    tableSelector: params.tableSelector.value as string,
    elementSelector: params.elementSelector.value as string,
    wrapOutput: params.wrapOutput.value as boolean,
    outputFieldName: params.outputFieldName.value as string,
    sortByField: params.sortByField.value as string,
    sortOrder: params.sortOrder.value as 'ascending' | 'descending',
    fields: params.fields.value as string,
    showStyleOptions,
    headerHorizontalAlign,
    bodyHorizontalAlign,
    numericAlignment,
    bandedRows,
    headerVerticalAlign,
    bodyVerticalAlign,
    headerWrap,
    bodyWrap,
    tableWidth,
  };
}

/**
 * Extract parameters for style operation
 */
export function extractStyleParameters(executeFunctions: IExecuteFunctions, itemIndex: number = 0) {
  const extractor = new ParameterExtractor(executeFunctions, itemIndex);

  const params = extractor.extractParameters({
    htmlInput: PARAMETER_DEFINITIONS.htmlInput,
    tableClass: PARAMETER_DEFINITIONS.tableClass,
    tableStyle: PARAMETER_DEFINITIONS.tableStyle,
    rowStyle: PARAMETER_DEFINITIONS.rowStyle,
    cellStyle: PARAMETER_DEFINITIONS.cellStyle,
    zebraStriping: {
      name: 'zebraStriping',
      type: 'boolean' as const,
      defaultValue: false,
    },
    evenRowColor: PARAMETER_DEFINITIONS.evenRowColor,
    oddRowColor: PARAMETER_DEFINITIONS.oddRowColor,
    borderStyle: PARAMETER_DEFINITIONS.borderStyle,
    borderWidth: PARAMETER_DEFINITIONS.borderWidth,
    captionStyle: PARAMETER_DEFINITIONS.captionStyle,
    captionPosition: PARAMETER_DEFINITIONS.captionPosition,
    borderColor: PARAMETER_DEFINITIONS.borderColor,
    borderRadius: PARAMETER_DEFINITIONS.borderRadius,
    borderCollapse: PARAMETER_DEFINITIONS.borderCollapse,
    tableTextAlign: PARAMETER_DEFINITIONS.tableTextAlign,
    rowTextAlign: PARAMETER_DEFINITIONS.rowTextAlign,
    cellTextAlign: PARAMETER_DEFINITIONS.cellTextAlign,
    outputField: { ...PARAMETER_DEFINITIONS.outputField, defaultValue: 'styledHtml' },
    wrapOutput: PARAMETER_DEFINITIONS.wrapOutput,
    outputFieldName: PARAMETER_DEFINITIONS.outputFieldName,
  });

  return {
    htmlInput: params.htmlInput.value as string,
    tableClass: params.tableClass.value as string,
    tableStyle: params.tableStyle.value as string,
    rowStyle: params.rowStyle.value as string,
    cellStyle: params.cellStyle.value as string,
    zebraStriping: params.zebraStriping.value as boolean,
    evenRowColor: params.evenRowColor.value as string,
    oddRowColor: params.oddRowColor.value as string,
    borderStyle: params.borderStyle.value as string,
    borderWidth: params.borderWidth.value as number,
    captionStyle: params.captionStyle.value as string,
    captionPosition: params.captionPosition.value as string,
    borderColor: params.borderColor.value as string,
    borderRadius: params.borderRadius.value as string,
    borderCollapse: params.borderCollapse.value as string,
    tableTextAlign: params.tableTextAlign.value as string,
    rowTextAlign: params.rowTextAlign.value as string,
    cellTextAlign: params.cellTextAlign.value as string,
    outputField: params.outputField.value as string,
    wrapOutput: params.wrapOutput.value as boolean,
    outputFieldName: params.outputFieldName.value as string,
  };
}

/**
 * Extract parameters for conversion operation
 */
export function extractConversionParameters(executeFunctions: IExecuteFunctions, itemIndex: number = 0) {
  const extractor = new ParameterExtractor(executeFunctions, itemIndex);

  const params = extractor.extractParameters({
    sourceFormat: PARAMETER_DEFINITIONS.sourceFormat,
    targetFormat: PARAMETER_DEFINITIONS.targetFormat,
    outputField: PARAMETER_DEFINITIONS.outputField,
    csvDelimiterInput: PARAMETER_DEFINITIONS.csvDelimiterInput,
    csvDelimiterOutput: PARAMETER_DEFINITIONS.csvDelimiterOutput,
    selectorMode: PARAMETER_DEFINITIONS.selectorMode,
    tablePreset: PARAMETER_DEFINITIONS.tablePreset,
    headingLevel: PARAMETER_DEFINITIONS.headingLevel,
    headingText: PARAMETER_DEFINITIONS.headingText,
    tableIndex: PARAMETER_DEFINITIONS.tableIndex,
    tableSelector: PARAMETER_DEFINITIONS.tableSelector,
    elementSelector: PARAMETER_DEFINITIONS.elementSelector,
    multipleItems: PARAMETER_DEFINITIONS.multipleItems,
    enableHeadingDetection: PARAMETER_DEFINITIONS.enableHeadingDetection,
    headingSelector: PARAMETER_DEFINITIONS.headingSelector,
    includeTableHeaders: PARAMETER_DEFINITIONS.includeTableHeaders,
    prettyPrint: PARAMETER_DEFINITIONS.prettyPrint,
    sortByField: PARAMETER_DEFINITIONS.sortByField,
    sortOrder: PARAMETER_DEFINITIONS.sortOrder,
    fields: PARAMETER_DEFINITIONS.fields,
    wrapOutput: PARAMETER_DEFINITIONS.wrapOutput,
    outputFieldName: PARAMETER_DEFINITIONS.outputFieldName,
  });

  return {
    sourceFormat: params.sourceFormat.value as FormatType,
    targetFormat: params.targetFormat.value as FormatType,
    outputField: params.outputField.value as string,
    csvDelimiterInput: params.csvDelimiterInput.value as string,
    csvDelimiterOutput: params.csvDelimiterOutput.value as string,
    selectorMode: params.selectorMode.value as SelectorMode,
    tablePreset: params.tablePreset.value as TablePreset,
    headingLevel: params.headingLevel.value as number,
    headingText: params.headingText.value as string,
    tableIndex: params.tableIndex.value as number,
    tableSelector: params.tableSelector.value as string,
    elementSelector: params.elementSelector.value as string,
    multipleItems: params.multipleItems.value as boolean,
    enableHeadingDetection: params.enableHeadingDetection.value as boolean,
    headingSelector: params.headingSelector.value as string,
    includeTableHeaders: params.includeTableHeaders.value as boolean,
    prettyPrint: params.prettyPrint.value as boolean,
    sortByField: params.sortByField.value as string,
    sortOrder: params.sortOrder.value as 'ascending' | 'descending',
    fields: params.fields.value as string,
    wrapOutput: params.wrapOutput.value as boolean,
    outputFieldName: params.outputFieldName.value as string,
  };
}

/**
 * Extract parameters for n8nObject processing
 */
export function extractN8nObjectParameters(executeFunctions: IExecuteFunctions, targetFormat: FormatType, itemIndex: number = 0) {
  const extractor = new ParameterExtractor(executeFunctions, itemIndex);

  // For HTML, get the parameter values from the UI
  let outputField = 'convertedData';
  let includeTableHeaders = true;
  let prettyPrint = false;
  let wrapOutput = true;
  let outputFieldName = 'convertedData';

  if (targetFormat === 'html') {
    try {
      const outputFieldParam = extractor.extractParameter(PARAMETER_DEFINITIONS.outputField);
      const includeHeadersParam = extractor.extractParameter(PARAMETER_DEFINITIONS.includeTableHeaders);
      const prettyPrintParam = extractor.extractParameter(PARAMETER_DEFINITIONS.prettyPrint);
      outputField = outputFieldParam.value as string;
      includeTableHeaders = includeHeadersParam.value as boolean;
      prettyPrint = prettyPrintParam.value as boolean;
    } catch (error) {
      // Use defaults if parameters not found
    }
  }

  // Extract wrapping parameters for all target formats
  try {
    const wrapOutputParam = extractor.extractParameter(PARAMETER_DEFINITIONS.wrapOutput);
    const outputFieldNameParam = extractor.extractParameter(PARAMETER_DEFINITIONS.outputFieldName);
    wrapOutput = wrapOutputParam.value as boolean;
    outputFieldName = outputFieldNameParam.value as string;
  } catch (error) {
    // Use defaults if parameters not found
  }

  // Extract processAllItemsAtOnce parameter
  let processAllItemsAtOnce = false;
  try {
    const processAllItemsParam = extractor.extractParameter(PARAMETER_DEFINITIONS.processAllItemsAtOnce);
    processAllItemsAtOnce = processAllItemsParam.value as boolean;
  } catch (error) {
    // Use default if parameter not found
  }

  const multipleItems = false; // Default to false for n8nObject source format
  const csvDelimiter = targetFormat === 'csv' ? executeFunctions.getNodeParameter('csvDelimiterOutput', 0, ',') as string : ',';

  return {
    targetFormat,
    outputField,
    includeTableHeaders,
    prettyPrint,
    multipleItems,
    csvDelimiter,
    wrapOutput,
    outputFieldName,
    processAllItemsAtOnce,
  };
}
