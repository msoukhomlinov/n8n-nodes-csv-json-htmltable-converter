/**
 * Tests for selector configuration utilities
 */

import {
  getPresetSelectors,
  getPresetSelectorsLegacy,
} from '../src/nodes/CsvJsonHtmltableConverter/utils/tableSelectors';
import {
  parseSelectorConfig,
  toLegacyFormat,
  isTableUnderHeadingConfig,
  isTableWithCaptionConfig,
  isStandardConfig,
} from '../src/nodes/CsvJsonHtmltableConverter/utils/selectorConfig';
import type { ConversionOptions } from '../src/nodes/CsvJsonHtmltableConverter/types';

describe('Selector Configuration System', () => {
  describe('getPresetSelectors', () => {
    it('should return standard config for all-tables preset', () => {
      const options: ConversionOptions = {};
      const result = getPresetSelectors('all-tables', options);

      expect(result.type).toBe('standard');
      expect(result.elementSelector).toBe('html');
      expect(result.tableSelector).toBe('table');
    });

    it('should return standard config for first-table preset', () => {
      const options: ConversionOptions = {};
      const result = getPresetSelectors('first-table', options);

      expect(result.type).toBe('standard');
      expect(result.elementSelector).toBe('html');
      expect(result.tableSelector).toBe('table:first-of-type');
    });

    it('should return table-under-heading config', () => {
      const options: ConversionOptions = {
        headingLevel: 2,
        headingText: 'Test Heading',
        tableIndex: 1,
      };
      const result = getPresetSelectors('table-under-heading', options);

      expect(result.type).toBe('table-under-heading');
      expect(result.tableUnderHeading).toBeDefined();
      expect(result.tableUnderHeading!.headingLevel).toBe(2);
      expect(result.tableUnderHeading!.headingText).toBe('Test Heading');
      expect(result.tableUnderHeading!.tableIndex).toBe(1);
      expect(result.tableUnderHeading!.headingSelector).toBe('h2');
    });

    it('should return table-with-caption config', () => {
      const options: ConversionOptions = {
        captionText: 'Test Caption',
      };
      const result = getPresetSelectors('table-with-caption', options);

      expect(result.type).toBe('table-with-caption');
      expect(result.tableWithCaption).toBeDefined();
      expect(result.tableWithCaption!.captionText).toBe('Test Caption');
    });

    it('should return custom config', () => {
      const options: ConversionOptions = {
        tableSelector: '.custom-table',
      };
      const result = getPresetSelectors('custom', options);

      expect(result.type).toBe('standard');
      expect(result.elementSelector).toBe('html');
      expect(result.tableSelector).toBe('.custom-table');
    });

    it('should handle invalid heading level gracefully', () => {
      const options: ConversionOptions = {
        headingLevel: 1000, // Invalid level
        headingText: 'Test',
        tableIndex: 1,
      };
      const result = getPresetSelectors('table-under-heading', options);

      expect(result.tableUnderHeading!.headingLevel).toBe(1); // Should default to 1
      expect(result.tableUnderHeading!.headingSelector).toBe('h1');
    });
  });

  describe('getPresetSelectorsLegacy', () => {
    it('should return legacy format for backward compatibility', () => {
      const options: ConversionOptions = {
        headingLevel: 2,
        headingText: 'Test Heading',
        tableIndex: 1,
      };
      const result = getPresetSelectorsLegacy('table-under-heading', options);

      expect(result.elementSelector).toBe('special:table-under-heading');
      expect(result.tableSelector).toBeDefined();

      // Should be valid JSON
      const parsed = JSON.parse(result.tableSelector);
      expect(parsed.headingLevel).toBe(2);
      expect(parsed.headingText).toBe('Test Heading');
    });

    it('should return standard selectors for non-special cases', () => {
      const options: ConversionOptions = {};
      const result = getPresetSelectorsLegacy('all-tables', options);

      expect(result.elementSelector).toBe('html');
      expect(result.tableSelector).toBe('table');
    });
  });

  describe('parseSelectorConfig', () => {
    it('should parse table-under-heading JSON string', () => {
      const elementSelector = 'special:table-under-heading';
      const tableSelector = JSON.stringify({
        headingLevel: 2,
        headingSelector: 'h2',
        headingText: 'Test',
        tableIndex: 1,
      });

      const result = parseSelectorConfig(elementSelector, tableSelector);

      expect(result.type).toBe('table-under-heading');
      expect(result.tableUnderHeading!.headingLevel).toBe(2);
      expect(result.tableUnderHeading!.headingText).toBe('Test');
    });

    it('should parse table-with-caption JSON string', () => {
      const elementSelector = 'special:table-with-caption';
      const tableSelector = JSON.stringify({
        captionText: 'Test Caption',
      });

      const result = parseSelectorConfig(elementSelector, tableSelector);

      expect(result.type).toBe('table-with-caption');
      expect(result.tableWithCaption!.captionText).toBe('Test Caption');
    });

    it('should handle standard selectors', () => {
      const elementSelector = 'body';
      const tableSelector = '.my-table';

      const result = parseSelectorConfig(elementSelector, tableSelector);

      expect(result.type).toBe('standard');
      expect(result.elementSelector).toBe('body');
      expect(result.tableSelector).toBe('.my-table');
    });

    it('should fallback on JSON parse error', () => {
      const elementSelector = 'special:table-under-heading';
      const tableSelector = 'invalid json';

      const result = parseSelectorConfig(elementSelector, tableSelector);

      expect(result.type).toBe('standard');
      expect(result.elementSelector).toBe('html');
      expect(result.tableSelector).toBe('table');
    });
  });

  describe('toLegacyFormat', () => {
    it('should convert table-under-heading config to legacy format', () => {
      const config = {
        type: 'table-under-heading' as const,
        tableUnderHeading: {
          headingLevel: 2,
          headingSelector: 'h2',
          headingText: 'Test',
          tableIndex: 1,
        },
      };

      const result = toLegacyFormat(config);

      expect(result.elementSelector).toBe('special:table-under-heading');
      const parsed = JSON.parse(result.tableSelector);
      expect(parsed.headingLevel).toBe(2);
      expect(parsed.headingText).toBe('Test');
    });

    it('should convert table-with-caption config to legacy format', () => {
      const config = {
        type: 'table-with-caption' as const,
        tableWithCaption: {
          captionText: 'Test Caption',
        },
      };

      const result = toLegacyFormat(config);

      expect(result.elementSelector).toBe('special:table-with-caption');
      const parsed = JSON.parse(result.tableSelector);
      expect(parsed.captionText).toBe('Test Caption');
    });

    it('should convert standard config to legacy format', () => {
      const config = {
        type: 'standard' as const,
        elementSelector: 'body',
        tableSelector: '.my-table',
      };

      const result = toLegacyFormat(config);

      expect(result.elementSelector).toBe('body');
      expect(result.tableSelector).toBe('.my-table');
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify table-under-heading config', () => {
      const config = {
        type: 'table-under-heading' as const,
        tableUnderHeading: {
          headingLevel: 1,
          headingSelector: 'h1',
          headingText: '',
          tableIndex: 1,
        },
      };

      expect(isTableUnderHeadingConfig(config)).toBe(true);
      expect(isTableWithCaptionConfig(config)).toBe(false);
      expect(isStandardConfig(config)).toBe(false);
    });

    it('should correctly identify table-with-caption config', () => {
      const config = {
        type: 'table-with-caption' as const,
        tableWithCaption: {
          captionText: 'Test',
        },
      };

      expect(isTableUnderHeadingConfig(config)).toBe(false);
      expect(isTableWithCaptionConfig(config)).toBe(true);
      expect(isStandardConfig(config)).toBe(false);
    });

    it('should correctly identify standard config', () => {
      const config = {
        type: 'standard' as const,
        elementSelector: 'html',
        tableSelector: 'table',
      };

      expect(isTableUnderHeadingConfig(config)).toBe(false);
      expect(isTableWithCaptionConfig(config)).toBe(false);
      expect(isStandardConfig(config)).toBe(true);
    });
  });

  describe('Integration Test', () => {
    it('should maintain consistency between new and legacy APIs', () => {
      const options: ConversionOptions = {
        headingLevel: 3,
        headingText: 'Integration Test',
        tableIndex: 2,
      };

      // Get config using new API
      const newConfig = getPresetSelectors('table-under-heading', options);

      // Get legacy format
      const legacyFormat = getPresetSelectorsLegacy('table-under-heading', options);

      // Parse legacy format back to new format
      const parsedConfig = parseSelectorConfig(
        legacyFormat.elementSelector,
        legacyFormat.tableSelector
      );

      // Should be equivalent
      expect(newConfig.type).toBe(parsedConfig.type);
      expect(newConfig.tableUnderHeading!.headingLevel).toBe(parsedConfig.tableUnderHeading!.headingLevel);
      expect(newConfig.tableUnderHeading!.headingText).toBe(parsedConfig.tableUnderHeading!.headingText);
    });
  });
});
