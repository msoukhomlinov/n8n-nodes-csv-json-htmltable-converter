export const FORMAT_OPTIONS = [
  {
    name: 'HTML',
    value: 'html',
    description: 'HTML table format',
  },
  {
    name: 'CSV',
    value: 'csv',
    description: 'Comma-separated values format',
  },
  {
    name: 'JSON',
    value: 'json',
    description: 'JavaScript Object Notation format',
  },
  {
    name: 'n8n Object',
    value: 'n8nObject',
    description: 'JavaScript object for direct use in n8n workflows',
  },
];

export const OPERATION_OPTIONS = [
  {
    name: 'Convert',
    value: 'convert',
    description: 'Convert between different data formats',
  },
  {
    name: 'Replace',
    value: 'replace',
    description: 'Replace an HTML table with new content',
  },
  {
    name: 'Style',
    value: 'style',
    description: 'Apply custom styles to HTML tables',
  },
];

export const DEFAULT_CSV_DELIMITER = ',';
export const DEFAULT_INCLUDE_HEADERS = true;
export const DEFAULT_PRETTY_PRINT = false;
export const DEFAULT_MULTIPLE_ITEMS = false;

export const MINIFY_OPTIONS = {
  minify_whitespace: true,
  keepComments: false,
  keepSpacesBetweenAttributes: false,
  keepHtmlAndHeadOpeningTags: false,
} as unknown as object;
