/**
 * Tests for parameter handler utilities
 */

import { ParameterExtractor, PARAMETER_DEFINITIONS, extractReplaceParameters, extractStyleParameters } from '../src/nodes/CsvJsonHtmltableConverter/utils/parameterHandler';
import type { FormatType } from '../src/nodes/CsvJsonHtmltableConverter/types';

// Mock IExecuteFunctions
const mockExecuteFunctions = {
  getNodeParameter: jest.fn(),
  getNode: jest.fn().mockReturnValue({}),
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getCredentials: jest.fn(),
  getCredentialsProperties: jest.fn(),
  getExecutionId: jest.fn(),
  getWorkflow: jest.fn(),
  getWorkflowStaticData: jest.fn(),
  getInputData: jest.fn(),
  putOutputData: jest.fn(),
  sendMessageToUI: jest.fn(),
  getMode: jest.fn(),
  getRestApiUrl: jest.fn(),
  getTimezone: jest.fn(),
  getInstanceId: jest.fn(),
  getInstanceType: jest.fn(),
  getInstanceUrl: jest.fn(),
  getInstanceVersion: jest.fn(),
  prepareOutputData: jest.fn(),
  sendResponse: jest.fn(),
  getParentCallbackManager: jest.fn(),
} as any;

describe('ParameterExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractParameter', () => {
    it('should extract a string parameter with default value', () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('test-value');

      const extractor = new ParameterExtractor(mockExecuteFunctions);
      const result = extractor.extractParameter(PARAMETER_DEFINITIONS.outputField);

      expect(result.value).toBe('test-value');
      expect(result.isDefault).toBe(false);
      expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('outputField', 0, 'convertedData');
    });

    it('should use default value when parameter is not found', () => {
      mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
        throw new Error('Parameter not found');
      });

      const extractor = new ParameterExtractor(mockExecuteFunctions);
      const result = extractor.extractParameter(PARAMETER_DEFINITIONS.outputField);

      expect(result.value).toBe('convertedData');
      expect(result.isDefault).toBe(true);
    });

    it('should validate enum values', () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue('invalid-format');

      const extractor = new ParameterExtractor(mockExecuteFunctions);

      expect(() => {
        extractor.extractParameter(PARAMETER_DEFINITIONS.sourceFormat);
      }).toThrow('Parameter \'sourceFormat\' validation failed: Value \'invalid-format\' is not in allowed values');
    });

    it('should validate enum values before other validations', () => {
      mockExecuteFunctions.getNodeParameter.mockReturnValue(''); // Empty string, invalid enum value

      const extractor = new ParameterExtractor(mockExecuteFunctions);

      expect(() => {
        extractor.extractParameter(PARAMETER_DEFINITIONS.sourceFormat);
      }).toThrow('Parameter \'sourceFormat\' validation failed: Value \'\' is not in allowed values');
    });
  });

  describe('extractParameters', () => {
    it('should extract multiple parameters at once', () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('html')
        .mockReturnValueOnce('json')
        .mockReturnValueOnce('result');

      const extractor = new ParameterExtractor(mockExecuteFunctions);
      const result = extractor.extractParameters({
        sourceFormat: PARAMETER_DEFINITIONS.sourceFormat,
        targetFormat: PARAMETER_DEFINITIONS.targetFormat,
        outputField: PARAMETER_DEFINITIONS.outputField,
      });

      expect(result.sourceFormat.value).toBe('html');
      expect(result.targetFormat.value).toBe('json');
      expect(result.outputField.value).toBe('result');
    });
  });
});

describe('extractReplaceParameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract all replace operation parameters', () => {
    // Mock all the required parameter calls
    const mockParams = {
      sourceHtml: '<table><tr><td>test</td></tr></table>',
      replacementFormat: 'html' as FormatType,
      replacementContent: '<table><tr><td>new</td></tr></table>',
      outputField: 'result',
      prettyPrint: true,
      selectorMode: 'simple',
      tablePreset: 'first-table',
      headingLevel: 2,
      headingText: 'Test Heading',
      tableIndex: 1,
      tableSelector: 'table',
      elementSelector: 'body',
      wrapOutput: true,
      outputFieldName: 'convertedData',
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      return mockParams[paramName as keyof typeof mockParams] || '';
    });

    const result = extractReplaceParameters(mockExecuteFunctions);

    expect(result.sourceHtml).toBe(mockParams.sourceHtml);
    expect(result.replacementFormat).toBe(mockParams.replacementFormat);
    expect(result.replacementContent).toBe(mockParams.replacementContent);
    expect(result.outputField).toBe(mockParams.outputField);
    expect(result.prettyPrint).toBe(mockParams.prettyPrint);
    expect(result.selectorMode).toBe(mockParams.selectorMode);
    expect(result.tablePreset).toBe(mockParams.tablePreset);
  });
});

describe('extractStyleParameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract all style operation parameters', () => {
    const mockParams = {
      htmlInput: '<table><tr><td>test</td></tr></table>',
      tableClass: 'my-table',
      tableStyle: 'border: 1px solid black;',
      rowStyle: 'background-color: #f0f0f0;',
      cellStyle: 'padding: 5px;',
      zebraStriping: true,
      evenRowColor: '#ffffff',
      oddRowColor: '#f9f9f9',
      borderStyle: 'solid',
      borderWidth: 2,
      captionStyle: 'font-weight: bold;',
      captionPosition: 'top',
      borderColor: '#000000',
      borderRadius: '5px',
      borderCollapse: 'collapse',
      tableTextAlign: 'center',
      rowTextAlign: 'left',
      cellTextAlign: 'right',
      outputField: 'styledHtml',
      wrapOutput: true,
      outputFieldName: 'convertedData',
    };

    mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
      return mockParams[paramName as keyof typeof mockParams] || '';
    });

    const result = extractStyleParameters(mockExecuteFunctions);

    expect(result.htmlInput).toBe(mockParams.htmlInput);
    expect(result.tableClass).toBe(mockParams.tableClass);
    expect(result.tableStyle).toBe(mockParams.tableStyle);
    expect(result.zebraStriping).toBe(mockParams.zebraStriping);
    expect(result.borderWidth).toBe(mockParams.borderWidth);
    expect(result.outputField).toBe(mockParams.outputField);
  });
});

describe('Parameter Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate required parameters', () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
      throw new Error('Parameter not found');
    });

    const extractor = new ParameterExtractor(mockExecuteFunctions);

    expect(() => {
      extractor.extractParameter(PARAMETER_DEFINITIONS.sourceFormat);
    }).toThrow('Required parameter \'sourceFormat\' is missing');
  });

  it('should handle parameter extraction errors gracefully', () => {
    mockExecuteFunctions.getNodeParameter.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const extractor = new ParameterExtractor(mockExecuteFunctions);
    const result = extractor.extractParameter(PARAMETER_DEFINITIONS.outputField);

    expect(result.value).toBe('convertedData'); // Default value
    expect(result.isDefault).toBe(true);
  });

  it('should validate number ranges', () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue(25); // Above max of 20

    const extractor = new ParameterExtractor(mockExecuteFunctions);

    expect(() => {
      extractor.extractParameter(PARAMETER_DEFINITIONS.borderWidth);
    }).toThrow('Parameter \'borderWidth\' validation failed: Value 25 exceeds maximum 20');
  });

  it('should validate minimum values', () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue(-1); // Below min of 0

    const extractor = new ParameterExtractor(mockExecuteFunctions);

    expect(() => {
      extractor.extractParameter(PARAMETER_DEFINITIONS.borderWidth);
    }).toThrow('Parameter \'borderWidth\' validation failed: Value -1 is less than minimum 0');
  });
});
