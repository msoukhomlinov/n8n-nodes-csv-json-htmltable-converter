/**
 * Utility functions for working with selector configurations
 * Helps transition from JSON string approach to proper TypeScript objects
 */

import type { SelectorConfig, TableUnderHeadingConfig, TableWithCaptionConfig } from '../types';

/**
 * Parses legacy JSON string selectors into proper SelectorConfig objects
 * @param elementSelector The element selector (may contain 'special:' prefixes)
 * @param tableSelector The table selector (may be a JSON string)
 * @returns Parsed SelectorConfig object
 */
export function parseSelectorConfig(
  elementSelector: string,
  tableSelector: string
): SelectorConfig {
  switch (elementSelector) {
    case 'special:table-under-heading':
      try {
        const config: TableUnderHeadingConfig = JSON.parse(tableSelector);
        return {
          type: 'table-under-heading',
          tableUnderHeading: config,
        };
      } catch (error) {
        // Fallback to default if parsing fails
        return {
          type: 'standard',
          elementSelector: 'html',
          tableSelector: 'table',
        };
      }

    case 'special:table-with-caption':
      try {
        const config: TableWithCaptionConfig = JSON.parse(tableSelector);
        return {
          type: 'table-with-caption',
          tableWithCaption: config,
        };
      } catch (error) {
        // Fallback to default if parsing fails
        return {
          type: 'standard',
          elementSelector: 'html',
          tableSelector: 'table',
        };
      }

    default:
      return {
        type: 'standard',
        elementSelector: elementSelector || 'html',
        tableSelector: tableSelector || 'table',
      };
  }
}

/**
 * Converts SelectorConfig back to legacy format for backward compatibility
 * @param config The SelectorConfig object
 * @returns Legacy format object with elementSelector and tableSelector strings
 */
export function toLegacyFormat(config: SelectorConfig): {
  elementSelector: string;
  tableSelector: string;
} {
  switch (config.type) {
    case 'standard':
      return {
        elementSelector: config.elementSelector || 'html',
        tableSelector: config.tableSelector || 'table',
      };

    case 'table-under-heading':
      return {
        elementSelector: 'special:table-under-heading',
        tableSelector: JSON.stringify(config.tableUnderHeading),
      };

    case 'table-with-caption':
      return {
        elementSelector: 'special:table-with-caption',
        tableSelector: JSON.stringify(config.tableWithCaption),
      };

    default:
      return {
        elementSelector: 'html',
        tableSelector: 'table',
      };
  }
}

/**
 * Type guard to check if a selector config is for table-under-heading
 */
export function isTableUnderHeadingConfig(
  config: SelectorConfig
): config is SelectorConfig & { tableUnderHeading: TableUnderHeadingConfig } {
  return config.type === 'table-under-heading' && !!config.tableUnderHeading;
}

/**
 * Type guard to check if a selector config is for table-with-caption
 */
export function isTableWithCaptionConfig(
  config: SelectorConfig
): config is SelectorConfig & { tableWithCaption: TableWithCaptionConfig } {
  return config.type === 'table-with-caption' && !!config.tableWithCaption;
}

/**
 * Type guard to check if a selector config is standard
 */
export function isStandardConfig(config: SelectorConfig): config is SelectorConfig & {
  elementSelector: string;
  tableSelector: string;
} {
  return config.type === 'standard' && !!config.elementSelector && !!config.tableSelector;
}
