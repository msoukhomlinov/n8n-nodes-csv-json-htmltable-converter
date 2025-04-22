import type { INodeTypeDescription } from 'n8n-workflow';
import { FORMAT_OPTIONS, OPERATION_OPTIONS } from './utils/constants';

export const nodeDescription: INodeTypeDescription = {
  displayName: 'CSV JSON HTMLTable Converter',
  name: 'csvJsonHtmltableConverter',
  icon: 'file:csvJsonHtmltableConverter.svg',
  group: ['transform'],
  version: 1,
  subtitle: '={{ $parameter["operation"] === "convert" ? $parameter["sourceFormat"] + " to " + $parameter["targetFormat"] : "Replace HTML Table" }}',
  description: 'A comprehensive node that provides seamless bidirectional conversion between HTML tables, CSV, and JSON formats',
  defaults: {
    name: 'CSV JSON HTMLTable Converter',
  },
  inputs: ['main'],
  outputs: ['main'],
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
        show: {
          operation: ['replace'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
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
          name: 'Custom',
          value: 'custom',
          description: 'Use a custom selector expression',
        },
      ],
      default: 'all-tables',
      description: 'Predefined selector patterns for common table locations',
      displayOptions: {
        show: {
          operation: ['replace'],
          selectorMode: ['simple'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
          selectorMode: ['advanced'],
        },
      },
    },
    {
      displayName: 'Heading Level',
      name: 'headingLevel',
      type: 'options',
      options: [
        { name: 'H1', value: 'h1' },
        { name: 'H2', value: 'h2' },
        { name: 'H3', value: 'h3' },
        { name: 'H4', value: 'h4' },
        { name: 'H5', value: 'h5' },
        { name: 'H6', value: 'h6' },
      ],
      default: 'h2',
      description: 'The heading level to search for (h1-h6)',
      displayOptions: {
        show: {
          operation: ['replace'],
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
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
          operation: ['replace'],
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
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
          operation: ['replace'],
          selectorMode: ['simple'],
          tablePreset: ['table-under-heading'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'json', 'n8nObject'],
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
          operation: ['replace'],
          selectorMode: ['simple'],
          tablePreset: ['custom'],
        },
        hide: {
          operation: ['convert'],
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
          operation: ['replace'],
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
          operation: ['replace'],
          selectorMode: ['advanced'],
        },
        hide: {
          operation: ['convert'],
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
          operation: ['convert'],
          sourceFormat: ['html', 'csv', 'json', 'n8nObject'],
          targetFormat: ['html'],
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
          operation: ['replace'],
        },
        hide: {
          operation: ['convert'],
          sourceFormat: ['csv', 'n8nObject'],
          targetFormat: ['csv'],
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
          sourceFormat: ['html', 'csv', 'json'],
        },
      },
    },
    {
      displayName: 'Output Field',
      name: 'outputField',
      type: 'string',
      default: 'convertedData',
      description: 'The name of the output field to store the converted or replaced data',
      displayOptions: {
        hide: {
          operation: ['convert'],
          sourceFormat: ['html', 'csv', 'json', 'n8nObject'],
          targetFormat: ['n8nObject'],
        },
      },
    },
  ],
};
