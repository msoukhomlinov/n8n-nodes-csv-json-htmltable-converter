import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { FORMAT_OPTIONS, OPERATION_OPTIONS } from './utils/constants';

export const nodeDescription: INodeTypeDescription = {
  displayName: 'CSV JSON HTMLTable Converter',
  name: 'csvJsonHtmltableConverter',
  icon: 'file:csvJsonHtmltableConverter.svg',
  group: ['transform'],
  version: 1,
  usableAsTool: true,
  subtitle: '={{ $parameter["operation"] === "convert" ? $parameter["sourceFormat"] + " to " + $parameter["targetFormat"] : ($parameter["operation"] === "replace" ? "Replace Table in HTML" : "Style HTML Table(s)") }}',
  description: 'Convert, replace, or style HTML tables, CSV, and JSON data.',
  defaults: {
    name: 'CSV JSON HTMLTable Converter',
  },
  inputs: [NodeConnectionType.Main],
  outputs: [NodeConnectionType.Main],
  properties: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      options: OPERATION_OPTIONS,
      default: 'convert',
      description: 'The operation to perform',
      required: true,
    },
    // Convert Operation Parameters
    {
      displayName: 'Source Format',
      name: 'sourceFormat',
      type: 'options',
      options: FORMAT_OPTIONS,
      default: 'json',
      description: 'The format of the input data',
      required: true,
      displayOptions: {
        show: {
          operation: ['convert'],
        },
      },
    },
    {
      displayName: 'Target Format',
      name: 'targetFormat',
      type: 'options',
      options: FORMAT_OPTIONS,
      default: 'csv',
      description: 'The format to convert the data to',
      required: true,
      displayOptions: {
        show: {
          operation: ['convert'],
        },
      },
    },
    {
      displayName: 'Process All Items At Once',
      name: 'processAllItemsAtOnce',
      type: 'boolean',
      default: false,
      description: 'When enabled, combines all incoming items from the immediately previous node and processes them together into a single output. When disabled (default), processes each item separately producing individual outputs. This option only applies when processing from the immediately previous node (Input Data field is empty).',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['n8nObject'],
        },
      },
    },
    {
      displayName: 'Input Data',
      name: 'inputData',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 10,
      },
      description: 'The data to be converted in the specified source format.',
      required: true,
      displayOptions: {
        show: {
          operation: ['convert'],
        },
      },
    },
    {
      displayName: 'CSV Delimiter (Input)',
      name: 'csvDelimiterInput',
      type: 'string',
      default: ',',
      description: 'The delimiter character to use for CSV data',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['csv'],
        },
      },
    },
    {
      displayName: 'CSV Delimiter (Output)',
      name: 'csvDelimiterOutput',
      type: 'string',
      default: ',',
      description: 'The delimiter character to use for CSV output',
      displayOptions: {
        show: {
          operation: ['convert'],
          targetFormat: ['csv'],
        },
      },
    },
    // Replace Operation Parameters
    {
      displayName: 'Source HTML',
      name: 'sourceHtml',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 10,
      },
      description: 'The HTML document containing the table to replace',
      required: true,
      displayOptions: {
        show: {
          operation: ['replace'],
        },
      },
    },
    {
      displayName: 'Replacement Content Format',
      name: 'replacementFormat',
      type: 'options',
      options: FORMAT_OPTIONS,
      default: 'html',
      description: 'The format of the replacement content',
      required: true,
      displayOptions: {
        show: {
          operation: ['replace'],
        },
      },
    },
    {
      displayName: 'Replacement Content',
      name: 'replacementContent',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 10,
      },
      description: 'The content that will replace the selected table. Will be converted to HTML table if needed.',
      required: true,
      displayOptions: {
        show: {
          operation: ['replace'],
        },
      },
    },
    // Replace Style Options (simple)
    {
      displayName: 'Show Style Options',
      name: 'showStyleOptions',
      type: 'boolean',
      default: false,
      description: 'Show simple styling options to apply to the generated table',
      displayOptions: {
        show: {
          operation: ['replace'],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Header horizontal alignment
    {
      displayName: 'Header Horizontal Alignment',
      name: 'headerHorizontalAlign',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Left', value: 'left' },
        { name: 'Centre', value: 'center' },
        { name: 'Right', value: 'right' },
      ],
      default: '',
      description: 'Horizontal alignment for header cells (<th>)',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Body horizontal alignment
    {
      displayName: 'Body Horizontal Alignment',
      name: 'bodyHorizontalAlign',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Left', value: 'left' },
        { name: 'Centre', value: 'center' },
        { name: 'Right', value: 'right' },
      ],
      default: '',
      description: 'Horizontal alignment for data cells (<td>)',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Numeric alignment
    {
      displayName: 'Numeric Alignment',
      name: 'numericAlignment',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Right', value: 'right' },
        { name: 'Left', value: 'left' },
      ],
      default: '',
      description: 'Alignment to apply only to numeric cells',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Banded rows
    {
      displayName: 'Banded Rows',
      name: 'bandedRows',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'On', value: 'on' },
        { name: 'Off', value: 'off' },
      ],
      default: '',
      description: 'Apply zebra striping to even rows',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Header vertical alignment
    {
      displayName: 'Header Vertical Alignment',
      name: 'headerVerticalAlign',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Top', value: 'top' },
        { name: 'Middle', value: 'middle' },
        { name: 'Bottom', value: 'bottom' },
      ],
      default: '',
      description: 'Vertical alignment for header cells',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Body vertical alignment
    {
      displayName: 'Body Vertical Alignment',
      name: 'bodyVerticalAlign',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Top', value: 'top' },
        { name: 'Middle', value: 'middle' },
        { name: 'Bottom', value: 'bottom' },
      ],
      default: '',
      description: 'Vertical alignment for data cells',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Header wrap
    {
      displayName: 'Header Text Wrapping',
      name: 'headerWrap',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Wrap', value: 'wrap' },
        { name: 'No Wrap', value: 'nowrap' },
      ],
      default: '',
      description: 'Wrapping behaviour for header cells',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Body wrap
    {
      displayName: 'Body Text Wrapping',
      name: 'bodyWrap',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Wrap', value: 'wrap' },
        { name: 'No Wrap', value: 'nowrap' },
      ],
      default: '',
      description: 'Wrapping behaviour for data cells',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Table width
    {
      displayName: 'Table Width',
      name: 'tableWidth',
      type: 'options',
      options: [
        { name: 'Unchanged', value: '' },
        { name: 'Auto', value: 'auto' },
        { name: 'Full Width (100%)', value: 'full' },
      ],
      default: '',
      description: 'Width of the table element',
      displayOptions: {
        show: {
          operation: ['replace'],
          showStyleOptions: [true],
        },
        hide: {
          replacementFormat: ['html'],
        },
      },
    },
    // Style Operation Help Text
    /**
     * Style Operation:
     * Apply custom styles to HTML tables. This operation does not convert data, but modifies the appearance of tables using CSS classes, inline styles, zebra striping, borders, and caption positioning.
     *
     * Parameters:
     * - HTML Input: The HTML string containing the table(s) to style
     * - Table Class: CSS class to add to <table>
     * - Table Style: Inline CSS for <table>
     * - Row Style: Inline CSS for <tr> (optional)
     * - Cell Style: Inline CSS for <td>/<th> (optional)
     * - Zebra Striping: Enable/disable alternating row colours
     * - Even Row Colour: Background colour for even rows (if zebra striping enabled)
     * - Odd Row Colour: Background colour for odd rows (if zebra striping enabled)
     * - Border Style: Border style for <table>, <td>, <th> (e.g. solid, dashed, none)
     * - Border Width: Border width for <table>, <td>, <th> (e.g. 1px, 2px)
     * - Caption Style: Inline CSS for <caption> (optional)
     * - Caption Position: Position of the <caption> (top or bottom)
     * - Output Field: The name of the output field to store the styled HTML (default: styledHtml)
     *
     * Usage Tip: Use the Style operation to prepare HTML tables for display, reports, or emails. Combine with Convert or Replace operations for end-to-end data transformation and presentation.
     */
    // Style Operation Parameters
    {
      displayName: 'HTML Input',
      name: 'htmlInput',
      type: 'string',
      default: '',
      typeOptions: {
        rows: 10,
      },
      description: 'The HTML containing the table(s) to style',
      required: true,
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    // Table Class toggle
    {
      displayName: 'Show Table Class',
      name: 'showTableClass',
      type: 'boolean',
      default: false,
      description: 'Show the Table Class option',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    {
      displayName: 'Table Class',
      name: 'tableClass',
      type: 'string',
      default: '',
      description: 'CSS class to add to <table>',
      displayOptions: {
        show: {
          operation: ['style'],
          showTableClass: [true],
        },
      },
    },
    // Table Style toggle
    {
      displayName: 'Show Table Style',
      name: 'showTableStyle',
      type: 'boolean',
      default: false,
      description: 'Show the Table Style option',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    // Table Text Align (first in Table Style section)
    {
      displayName: 'Table Text Align',
      name: 'tableTextAlign',
      type: 'options',
      options: [
        { name: 'Default (no override)', value: '' },
        { name: 'Left', value: 'left' },
        { name: 'Center', value: 'center' },
        { name: 'Right', value: 'right' },
        { name: 'Justify', value: 'justify' },
        { name: 'Start', value: 'start' },
        { name: 'End', value: 'end' },
      ],
      default: '',
      description: 'Set the text-align property for the <table> element. Affects horizontal alignment of all content in the table.',
      displayOptions: {
        show: {
          operation: ['style'],
          showTableStyle: [true],
        },
      },
    },
    // Table Style
    {
      displayName: 'Table Style',
      name: 'tableStyle',
      type: 'string',
      default: '',
      description: 'Full custom CSS for the <table> element. Use this to set multiple or advanced styles (e.g. background, width, font). Does not affect borders unless you include border properties here.',
      displayOptions: {
        show: {
          operation: ['style'],
          showTableStyle: [true],
        },
      },
    },
    // Row Style toggle
    {
      displayName: 'Show Row Style',
      name: 'showRowStyle',
      type: 'boolean',
      default: false,
      description: 'Show the Row Style option',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    // Row Text Align (first in Row Style section)
    {
      displayName: 'Row Text Align',
      name: 'rowTextAlign',
      type: 'options',
      options: [
        { name: 'Default (no override)', value: '' },
        { name: 'Left', value: 'left' },
        { name: 'Center', value: 'center' },
        { name: 'Right', value: 'right' },
        { name: 'Justify', value: 'justify' },
        { name: 'Start', value: 'start' },
        { name: 'End', value: 'end' },
      ],
      default: '',
      description: 'Set the text-align property for all <tr> elements. Affects horizontal alignment of content in each row.',
      displayOptions: {
        show: {
          operation: ['style'],
          showRowStyle: [true],
        },
      },
    },
    // Row Style
    {
      displayName: 'Row Style',
      name: 'rowStyle',
      type: 'string',
      default: '',
      description: 'Custom CSS for all <tr> (table row) elements. Use to set row background, font, or spacing. Does not affect borders or cells individually.',
      displayOptions: {
        show: {
          operation: ['style'],
          showRowStyle: [true],
        },
      },
    },
    // Cell Style toggle
    {
      displayName: 'Show Cell Style',
      name: 'showCellStyle',
      type: 'boolean',
      default: false,
      description: 'Show the Cell Style option',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    // Cell Text Align (first in Cell Style section)
    {
      displayName: 'Cell Text Align',
      name: 'cellTextAlign',
      type: 'options',
      options: [
        { name: 'Default (no override)', value: '' },
        { name: 'Left', value: 'left' },
        { name: 'Center', value: 'center' },
        { name: 'Right', value: 'right' },
        { name: 'Justify', value: 'justify' },
        { name: 'Start', value: 'start' },
        { name: 'End', value: 'end' },
      ],
      default: '',
      description: 'Set the text-align property for all <td> and <th> elements. Affects horizontal alignment of content in each cell.',
      displayOptions: {
        show: {
          operation: ['style'],
          showCellStyle: [true],
        },
      },
    },
    // Cell Style
    {
      displayName: 'Cell Style',
      name: 'cellStyle',
      type: 'string',
      default: '',
      description: 'Custom CSS for all <td> and <th> (table cell) elements. Use to set cell background, font, or alignment. Does not affect row or table styles.',
      displayOptions: {
        show: {
          operation: ['style'],
          showCellStyle: [true],
        },
      },
    },
    // Border Style toggle
    {
      displayName: 'Show Border Style',
      name: 'showBorderStyle',
      type: 'boolean',
      default: false,
      description: 'Show the Border Style and Border Width options',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    {
      displayName: 'Border Style',
      name: 'borderStyle',
      type: 'options',
      options: [
        { name: 'Default (no style)', value: '' },
        { name: 'Solid', value: 'solid' },
        { name: 'Dashed', value: 'dashed' },
        { name: 'Dotted', value: 'dotted' },
        { name: 'Double', value: 'double' },
        { name: 'Groove', value: 'groove' },
        { name: 'Ridge', value: 'ridge' },
        { name: 'Inset', value: 'inset' },
        { name: 'Outset', value: 'outset' },
        { name: 'None', value: 'none' },
        { name: 'Hidden', value: 'hidden' },
      ],
      default: '',
      description: 'Quickly set the border style for the <table> only. Does not affect rows or cells. For advanced border control, use Table Style.',
      displayOptions: {
        show: {
          operation: ['style'],
          showBorderStyle: [true],
        },
      },
    },
    {
      displayName: 'Border Colour',
      name: 'borderColor',
      type: 'color',
      default: '',
      description: 'Set the border colour for the <table> only. Does not affect rows or cells. For advanced border control, use Table Style.',
      displayOptions: {
        show: {
          operation: ['style'],
          showBorderStyle: [true],
        },
      },
    },
    {
      displayName: 'Border Radius',
      name: 'borderRadius',
      type: 'string',
      default: '',
      description: 'Set the border radius for the <table> (e.g. 4px, 0.5em). Leave blank for no rounding.',
      displayOptions: {
        show: {
          operation: ['style'],
          showBorderStyle: [true],
        },
      },
    },
    {
      displayName: 'Border Collapse',
      name: 'borderCollapse',
      type: 'options',
      options: [
        { name: 'Default (no override)', value: '' },
        { name: 'Separate', value: 'separate' },
        { name: 'Collapse', value: 'collapse' },
      ],
      default: '',
      description: 'Set the border-collapse property for the <table>. Use "collapse" for joined borders, "separate" for spacing between cells.',
      displayOptions: {
        show: {
          operation: ['style'],
          showBorderStyle: [true],
        },
      },
    },
    {
      displayName: 'Border Width',
      name: 'borderWidth',
      type: 'number',
      typeOptions: {
        minValue: 0,
        step: 1,
      },
      default: 1,
      description: 'Sets the border width for the <table> using the HTML border attribute and as a CSS style. Value is interpreted as pixels (px) in the style.',
      displayOptions: {
        show: {
          operation: ['style'],
          showBorderStyle: [true],
        },
      },
    },
    // Caption Style toggle
    {
      displayName: 'Show Caption Style',
      name: 'showCaptionStyle',
      type: 'boolean',
      default: false,
      description: 'Show the Caption Style and Caption Position options',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    {
      displayName: 'Caption Style',
      name: 'captionStyle',
      type: 'string',
      default: '',
      description: 'Inline CSS for <caption> (optional)',
      displayOptions: {
        show: {
          operation: ['style'],
          showCaptionStyle: [true],
        },
      },
    },
    {
      displayName: 'Caption Position',
      name: 'captionPosition',
      type: 'options',
      options: [
        { name: 'Top', value: 'top' },
        { name: 'Bottom', value: 'bottom' },
      ],
      default: 'top',
      description: 'Position of the <caption> (top or bottom)',
      displayOptions: {
        show: {
          operation: ['style'],
          showCaptionStyle: [true],
        },
      },
    },
    {
      displayName: 'Output Field',
      name: 'outputField',
      type: 'string',
      default: 'styledHtml',
      description: 'The name of the output field to store the styled HTML',
      displayOptions: {
        show: {
          operation: ['style'],
        },
      },
    },
    // Table Selection Parameters (shared by both operations)
    {
      displayName: 'Table Selection Mode',
      name: 'selectorMode',
      type: 'options',
      options: [
        {
          name: 'Simple',
          value: 'simple',
          description: 'Use simplified table selection with presets for common scenarios',
        },
        {
          name: 'Advanced',
          value: 'advanced',
          description: 'Use advanced selection with separate element and table selectors',
        },
      ],
      default: 'simple',
      description: 'How to select tables from HTML - Simple uses presets, Advanced gives more control',
      displayOptions: {
        hide: {
          operation: ['style'],
          sourceFormat: ['csv', 'n8nObject'],
        },
      },
    },
    {
      displayName: 'Table Preset',
      name: 'tablePreset',
      type: 'options',
      options: [
        {
          name: 'All Tables',
          value: 'all-tables',
          description: 'Find all tables in the document',
        },
        {
          name: 'First Table Only',
          value: 'first-table',
          description: 'Find only the first table in the document',
        },
        {
          name: 'Last Table',
          value: 'last-table',
          description: 'Find only the last table in the document',
        },
        {
          name: 'Table Under Heading',
          value: 'table-under-heading',
          description: 'Find a specific table that appears after a heading',
        },
        {
          name: 'Table with Caption',
          value: 'table-with-caption',
          description: 'Find a table with a <caption> element. Optionally filter by caption text. The caption will be included in the output (JSON property, CSV comment, HTML <caption>).',
        },
        {
          name: 'Custom',
          value: 'custom',
          description: 'Use a custom selector expression',
        },
      ],
      default: 'all-tables',
      description: 'Predefined selector patterns for common table locations',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
        },
        hide: {
          selectorMode: ['advanced'],
          sourceFormat: ['csv', 'n8nObject'],
        },
      },
    },
    {
      displayName: 'Heading Level',
      name: 'headingLevel',
      type: 'number',
      typeOptions: {
        minValue: 1,
        maxValue: 999,
      },
      default: 1,
      description: 'The heading level to search for (e.g. 1 = <h1>, 2 = <h2>, ... up to 999)',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          selectorMode: ['advanced'],
          tablePreset: ['all-tables', 'first-table', 'last-table', 'custom'],
        },
      },
    },
    {
      displayName: 'Heading Text',
      name: 'headingText',
      type: 'string',
      default: '',
      description: 'Text content the heading should contain (case-insensitive, partial match). Leave empty to match any heading.',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          selectorMode: ['advanced'],
          tablePreset: ['all-tables', 'first-table', 'last-table', 'custom'],
        },
      },
    },
    {
      displayName: 'Table Index',
      name: 'tableIndex',
      type: 'number',
      default: 1,
      description: 'The index of the table to select when multiple tables are found after a heading (1 = first table)',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          selectorMode: ['advanced'],
          tablePreset: ['all-tables', 'first-table', 'last-table', 'custom'],
        },
      },
    },
    {
      displayName: 'Custom Selector',
      name: 'tableSelector',
      type: 'string',
      default: 'table',
      description: 'CSS selector to identify HTML tables (when using custom preset). <a href="https://cheerio.js.org/docs/basics/selecting" target="_blank">Learn more about Cheerio selectors</a>',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
          tablePreset: ['custom'],
        },
        hide: {
          sourceFormat: ['csv', 'json', 'n8nObject'],
          selectorMode: ['advanced'],
          tablePreset: ['all-tables', 'first-table', 'last-table', 'table-under-heading'],
        },
      },
    },
    {
      displayName: 'HTML Table Selector',
      name: 'tableSelector',
      type: 'string',
      default: 'table',
      description: 'CSS selector to identify HTML tables. <a href="https://cheerio.js.org/docs/basics/selecting" target="_blank">Learn more about Cheerio selectors</a>',
      displayOptions: {
        show: {
          selectorMode: ['advanced'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
          selectorMode: ['simple'],
        },
      },
    },
    {
      displayName: 'HTML Element Selector',
      name: 'elementSelector',
      type: 'string',
      default: 'html',
      description: 'CSS selector to identify the HTML element containing tables. Tables will be searched within these elements.',
      displayOptions: {
        show: {
          selectorMode: ['advanced'],
        },
        hide: {
          sourceFormat: ['csv', 'json', 'n8nObject'],
          selectorMode: ['simple'],
        },
      },
    },
    // Shared Parameters
    {
      displayName: 'Include Table Headers',
      name: 'includeTableHeaders',
      type: 'boolean',
      default: true,
      description: 'Whether to include table headers in the converted output',
      displayOptions: {
        show: {
          operation: ['convert', 'replace'],
          targetFormat: ['html', 'csv'],
        },
      },
    },
    {
      displayName: 'Pretty Print Output',
      name: 'prettyPrint',
      type: 'boolean',
      default: false,
      description: 'Whether to format the output with proper indentation and spacing',
      displayOptions: {
        show: {
          targetFormat: ['html'],
          operation: ['convert'],
        },
      },
    },
    {
      displayName: 'Multiple Tables/Objects',
      name: 'multipleItems',
      type: 'boolean',
      default: false,
      description: 'Whether the input contains multiple tables or JSON objects',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['html', 'json'],
        },
      },
    },
    {
      displayName: 'Enable Heading Detection',
      name: 'enableHeadingDetection',
      type: 'boolean',
      default: false,
      description: 'Detect headings or labels before each table to use as identifiers in the output',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['html'],
          multipleItems: [true],
        },
        hide: {
          tablePreset: ['all-tables'],
        },
      },
    },
    {
      displayName: 'Heading Selector',
      name: 'headingSelector',
      type: 'string',
      default: '',
      description: 'CSS selector for the element containing the heading text (e.g., "div.term-date span.year"). The element should precede the table in the HTML structure.',
      placeholder: 'div.year, h2, .table-label',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['html'],
          multipleItems: [true],
          enableHeadingDetection: [true],
        },
        hide: {
          tablePreset: ['all-tables'],
        },
      },
    },
    {
      displayName: 'Heading Selector',
      name: 'headingSelector',
      type: 'string',
      default: '',
      description: 'CSS selector for headings preceding tables. Default (blank): checks &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;h4&gt;, &lt;h5&gt; elements and preserves their hierarchy in the output.',
      placeholder: 'Default: h1-h5. Custom: div.year, .table-label',
      displayOptions: {
        show: {
          operation: ['convert'],
          sourceFormat: ['html'],
          selectorMode: ['simple'],
          tablePreset: ['all-tables'],
        },
      },
    },
    {
      displayName: 'Caption Text',
      name: 'captionText',
      type: 'string',
      default: '',
      description: 'Text content the <caption> should contain (case-insensitive, partial match). Leave empty to match any caption. Used only with the Table with Caption preset.',
      displayOptions: {
        show: {
          selectorMode: ['simple'],
          tablePreset: ['table-with-caption'],
        },
        hide: {
          sourceFormat: ['csv', 'json', 'n8nObject'],
          selectorMode: ['advanced'],
          tablePreset: ['all-tables', 'first-table', 'last-table', 'table-under-heading', 'custom'],
        },
      },
    },
    // Data Manipulation Options
    {
      displayName: 'Show Data Manipulation',
      name: 'showDataManipulation',
      type: 'boolean',
      default: false,
      description: 'Show data manipulation options for sorting, filtering, and reordering fields',
      displayOptions: {
        show: {
          operation: ['convert', 'replace'],
        },
      },
    },
    {
      displayName: 'Sort By Field',
      name: 'sortByField',
      type: 'string',
      default: '',
      description: 'Field name to sort by. Field name matching is case-insensitive. Leave empty for no sorting.',
      displayOptions: {
        show: {
          operation: ['convert', 'replace'],
          showDataManipulation: [true],
        },
      },
    },
    {
      displayName: 'Sort Order',
      name: 'sortOrder',
      type: 'options',
      options: [
        { name: 'Ascending', value: 'ascending' },
        { name: 'Descending', value: 'descending' },
      ],
      default: 'ascending',
      description: 'Sort order for the specified field',
      displayOptions: {
        show: {
          operation: ['convert', 'replace'],
          showDataManipulation: [true],
        },
      },
    },
    {
      displayName: 'Fields',
      name: 'fields',
      type: 'string',
      default: '',
      description: 'Comma-separated list of field names to include and reorder. If specified, only these fields will be included in the output, in the order listed. Field names containing spaces should be wrapped in quotation marks (e.g., "field name", "another field", simple_field). Field name matching is case-insensitive, but original casing is preserved in output. Leave empty to include all fields in their original order.',
      displayOptions: {
        show: {
          operation: ['convert', 'replace'],
          showDataManipulation: [true],
        },
      },
    },
    // Output Wrapping Options
    {
      displayName: 'Wrap Output',
      name: 'wrapOutput',
      type: 'boolean',
      default: true,
      description: 'Whether to wrap the output in a specified field. When enabled, the result will be placed under the specified field name. When disabled, the result is returned directly.',
    },
    {
      displayName: 'Output Field Name',
      name: 'outputFieldName',
      type: 'string',
      default: 'convertedData',
      description: 'The name of the field to wrap the output in when "Wrap Output" is enabled.',
      displayOptions: {
        show: {
          wrapOutput: [true],
        },
      },
    },
  ],
};
