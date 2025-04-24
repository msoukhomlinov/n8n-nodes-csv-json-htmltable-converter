export type FormatType = 'html' | 'csv' | 'json' | 'n8nObject';

export type SelectorMode = 'simple' | 'advanced';

export type OperationType = 'convert' | 'replace';

export type TablePreset =
  | 'all-tables'
  | 'first-table'
  | 'last-table'
  | 'table-under-heading'
  | 'custom';

export interface ConversionOptions {
  csvDelimiter?: string;
  tableSelector?: string;
  elementSelector?: string;
  selectorMode?: SelectorMode;
  tablePreset?: TablePreset;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  headingText?: string;
  tableIndex?: number;
  includeTableHeaders?: boolean;
  prettyPrint?: boolean;
  replacementContent?: string;
  replacementInputType?: FormatType;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface HtmlTableOptions {
  tableSelector: string;
  includeTableHeaders: boolean;
}

export interface CsvOptions {
  delimiter: string;
  includeHeaders: boolean;
}

export interface JsonOptions {
  prettyPrint: boolean;
}
