export type FormatType = 'html' | 'csv' | 'json' | 'n8nObject';

export type SelectorMode = 'simple' | 'advanced';

export type OperationType = 'convert' | 'replace' | 'style';

export type TablePreset =
  | 'all-tables'
  | 'first-table'
  | 'last-table'
  | 'table-under-heading'
  | 'custom'
  | 'table-with-caption';

export interface ConversionOptions {
  csvDelimiter?: string;
  tableSelector?: string;
  elementSelector?: string;
  selectorMode?: SelectorMode;
  tablePreset?: TablePreset;
  headingLevel?: number;
  headingText?: string;
  tableIndex?: number;
  includeTableHeaders?: boolean;
  prettyPrint?: boolean;
  multipleItems?: boolean;
  replacementContent?: string;
  replacementInputType?: FormatType;
  captionText?: string;
  // Style operation options
  htmlInput?: string;
  tableClass?: string;
  tableStyle?: string;
  rowStyle?: string;
  cellStyle?: string;
  zebraStriping?: boolean;
  evenRowColor?: string;
  oddRowColor?: string;
  borderStyle?: string;
  borderColor?: string;
  borderRadius?: string;
  borderCollapse?: string;
  tableTextAlign?: string;
  rowTextAlign?: string;
  cellTextAlign?: string;
  borderWidth?: number;
  captionStyle?: string;
  captionPosition?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
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
