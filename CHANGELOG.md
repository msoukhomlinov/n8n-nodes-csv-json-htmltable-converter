# Changelog

All notable changes to the n8n-nodes-csv-json-htmltable-converter package will be documented in this file.

## [1.3.4] - 2025-09-03

### Fixed
- Fixed malformed HTML output by replacing aggressive minifier that removed closing tags
- Removed `@minify-html/node` dependency, reducing package size
- Enhanced input validation to prevent string iteration edge cases

### Changed
- Implemented safe whitespace-only HTML minification
- HTML output now always preserves proper structure

## [1.3.3] - 2025-09-03

### Added
- **Configurable Output Wrapping:** Added "Wrap Output" boolean toggle (default: true) and "Output Field Name" parameter (default: "convertedData") to control output wrapping for ALL formats including n8nObject. When enabled, wraps results in specified field; when disabled, returns data directly.


## [1.3.1] - 2025-09-03

### Fixed
- Fixed issue where converted data was itemised and not wrapped under a single convertedData object

## [1.3.0] - 2025-09-03

### Fixed
- Fixed n8n package installation error for whatwg-mimetype dependency by adding as direct dependency and bundling all dependencies
- Enhanced dependency resolution for n8n community package compatibility

### Changed
- Added `bundledDependencies` field to `package.json` to ensure all dependencies are included in the package.
- Expanded `bundledDependencies` to include all 27 transitive dependencies, permanently fixing n8n's module resolution issues.

## [1.2.4] - 2025-09-03

### Added
- **Data Manipulation Options for Convert operations:**
  - Sort by field name (case-insensitive) with ascending/descending order
  - Filter and reorder columns using comma-separated field names
  - Support for quoted field names with spaces (e.g., "full name", age, "email address")
  - Works across all format combinations (HTML ↔ CSV ↔ JSON ↔ n8nObject)
- Missing captionText parameter support for replace operations
- Missing table preset enum values ('last-table', 'table-with-caption')
- Comprehensive bounds checking for array access operations
- Type-safe parameter interfaces replacing 'any' types

### Fixed
- Syntax error in convertData.ts (malformed try-catch block)
- Parameter validation inconsistency for headingLevel (1-6 vs 1-999)
- ESLint configuration warnings and module type issues
- Standardized error handling patterns (ValidationError vs ValidationResult)
- Failing DOM optimizer test with timing assertions
- Fragile string detection patterns replaced with proper JSON parsing
- CSV to n8nObject conversion now returns all items instead of just the first item
- Unsafe array access patterns throughout codebase

### Improved
- Type safety with proper TypeScript interfaces throughout
- Error handling consistency across all validation functions
- Code reliability with comprehensive bounds checking
- Test stability and reliability
- UI/UX: Table Selection Mode and Table Preset parameters are now hidden when converting from n8nObject format, providing a cleaner interface
- UI/UX: Pretty Print Output parameter now only shows when output format is HTML
- UI/UX: Include Table Headers parameter now only shows when output format is HTML or CSV

## [1.2.3] - 2025-05-29

### Fixed
- Table Under Heading: Now finds tables after a heading in document order, even if separated by other elements (e.g., <p>, <div>), not just direct siblings.
- Last Table preset: Now correctly returns the last table in the document, not the first.
- Improved robustness for table selection presets and fixed edge cases with Cheerio selectors.


## [1.2.2] - 2025-05-29

### Fixed
- Fixed various issues with Replace operations


## [1.2.1] - 2025-05-29

### Fixed
- Reverted back to INodeTypeDescription version 1


## [1.2.0] - 2025-05-29

### Fixed
- Corrected the version in the node file (was incorrectly set to 1 instead of 1.1), which caused issues with upgrading to the new version. No other changes.


## [1.1.0] - 2025-05-28

### Fixed
- Corrected the version in the node file (was incorrectly set to 1 instead of 1.1), which caused issues with upgrading to the new version. No other changes.

## [1.0.0] - 2025-05-28

### Added
- **Style operation:** Apply custom CSS classes, inline styles, zebra striping, border styles, caption styling, and more to HTML tables. Supports advanced table formatting for display, reports, and emails.
- **Replace operation:** Replace an existing HTML table in a document with new content (HTML, CSV, or JSON). Supports all table selection presets and advanced selectors.
- **Advanced and preset table selection:**
  - **Table With Caption**: Extract tables with a <caption> element, optionally filtered by caption text. Caption is included in JSON, as a comment in CSV, and as <caption> in HTML.
  - **Table Under Heading**: Now supports numeric heading level (1–999) and improved table index logic (only direct sibling tables after heading).
  - **Last Table**: Easily select the last table in a document.
  - Improved error messages and validation for all selection modes.
- **n8nObject output format:** Directly outputs JavaScript objects for use in n8n workflows, with improved handling for single/multiple items and chaining between nodes.
- **Output field and format improvements:**
  - Consistent output wrapping for all formats (HTML, CSV, JSON, n8nObject).
  - Improved handling of multiple tables/objects and output field naming.
- **UI/UX enhancements:**
  - More intuitive parameter grouping and help text.
  - Improved validation and user feedback for invalid selectors, heading levels, and missing tables.
- **Debug logging:** Optional debug logging for development and troubleshooting.

### Changed
- **Improved table header handling:** When 'Include Table Headers' is false, header rows are now fully excluded from output.
- **HTML to HTML conversion:** Now processes and regenerates HTML tables for consistent formatting and escaping, rather than returning input as-is.
- **Chaining and n8n integration:** Improved detection and handling of n8nObject input/output for seamless chaining between nodes.
- Migrated from `json2csv` (now abandoned) to `json-2-csv` for JSON to CSV conversion. Maintained feature parity for delimiter, header, and field options. No breaking changes expected.
- Upgraded to Cheerio 1.0+ for improved HTML parsing and selector support.

### Fixed
- **Table index logic for Table Under Heading:** Now only counts direct sibling tables after the heading, not all descendants.
- **Output field handling:** Fixed issues with output field naming and wrapping for all formats.
- **Debug logging:** Removed stray debug output from production builds.
- **Error handling:** Improved error messages and validation for all operations and selection modes.

### Breaking Changes
- **Table Under Heading:** Heading level is now a numeric input (1–999). Table index logic only counts direct sibling tables after the heading.
- **Output format changes:** Output wrapping and field naming are now consistent across all formats. n8nObject output is always in the 'json' property.

### Migration Notes
- Review your workflows for use of removed presets and update to supported options.
- If using Table Under Heading, ensure headingLevel and tableIndex parameters are set correctly.
- Review output field usage and update downstream nodes if needed.

## [0.2.1] - 2025-04-24

### Added
- Added HTML Element Selector option to allow selecting specific parts of HTML documents for table extraction using Cheerio's CSS selector syntax
- Added simplified HTML table selection mode with preset selectors for common scenarios
- Added "Table Under Heading" preset to easily find tables that appear after specific headings, with option to select which table (1st-10th)
- Added improved error messages with helpful suggestions for table selection
- Added documentation and examples for using HTML table selectors effectively

### Changed
- Simplified input handling to only support direct manual input
- Removed "Input Type" and "Input From Field" options
- Updated "Input Data" field description for clarity
- Updated documentation to reflect the simplified input method
- Improved code structure and error handling
- Updated package version
- Minor code improvements and documentation updates

### Features
- Support for bidirectional conversion between HTML Tables, CSV, and JSON formats
- Options for customizing conversion settings
- Comprehensive input validation
- Detailed error messages for troubleshooting
