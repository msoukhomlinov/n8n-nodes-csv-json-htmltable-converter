export type FormatType = 'html' | 'csv' | 'json' | 'n8nObject';
export type OperationType = 'convert' | 'replace' | 'style';
export type SelectorMode = 'simple' | 'advanced';
export type TablePreset = 'all-tables' | 'first-table' | 'last-table' | 'table-under-heading' | 'table-with-caption' | 'custom';

export interface ConversionOptions {
  // CSV options
  csvDelimiter?: string;

  // HTML table selection options
  selectorMode?: SelectorMode;
  tablePreset?: TablePreset;
  tableSelector?: string;
  elementSelector?: string;

  // Table-under-heading options
  headingLevel?: number;
  headingText?: string;
  tableIndex?: number;

  // Table-with-caption options
  captionText?: string;

  // Output options
  includeTableHeaders?: boolean;
  prettyPrint?: boolean;
  multipleItems?: boolean;
  wrapOutput?: boolean;
  outputFieldName?: string;

  // Data manipulation options
  sortByField?: string;
  sortOrder?: 'ascending' | 'descending';
  fields?: string;

  // Table styling options
  tableClass?: string;
  tableStyle?: string;
  rowStyle?: string;
  cellStyle?: string;
  zebraStriping?: boolean;
  evenRowColor?: string;
  oddRowColor?: string;
  borderStyle?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: string;
  borderCollapse?: string;
  captionStyle?: string;
  captionPosition?: string;
  tableTextAlign?: string;
  rowTextAlign?: string;
  cellTextAlign?: string;
}

/**
 * Represents extracted table data from HTML
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

/**
 * Configuration for table-under-heading selector
 */
export interface TableUnderHeadingConfig {
  headingLevel: number;
  headingSelector: string;
  headingText: string;
  tableIndex: number;
}

/**
 * Configuration for table-with-caption selector
 */
export interface TableWithCaptionConfig {
  captionText: string;
}

/**
 * Selector configuration - replaces JSON string approach
 */
export interface SelectorConfig {
  type: 'standard' | 'table-under-heading' | 'table-with-caption';
  tableSelector?: string;
  elementSelector?: string;
  tableUnderHeading?: TableUnderHeadingConfig;
  tableWithCaption?: TableWithCaptionConfig;
}
