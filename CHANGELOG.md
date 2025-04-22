# Changelog

All notable changes to the n8n-nodes-csv-json-htmltable-converter package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added HTML Element Selector option to allow selecting specific parts of HTML documents for table extraction using Cheerio's CSS selector syntax
- Added simplified HTML table selection mode with preset selectors for common scenarios
- Added "Table Under Heading" preset to easily find tables that appear after specific headings, with option to select which table (1st-10th)
- Added improved error messages with helpful suggestions for table selection
- Added documentation and examples for using HTML table selectors effectively

## [0.2.1] - 2023-11-17

### Changed

- Updated package version
- Minor code improvements and documentation updates

## [0.2.0] - 2023-11-16

### Changed

- Simplified input handling to only support direct manual input
- Removed "Input Type" and "Input From Field" options
- Updated "Input Data" field description for clarity
- Updated documentation to reflect the simplified input method
- Improved code structure and error handling

## [0.1.0] - 2023-11-01

### Added

- Initial release of the CSV JSON HTMLTable Converter node
- Support for bidirectional conversion between HTML Tables, CSV, and JSON formats
- Options for customizing conversion settings
- Comprehensive input validation
- Detailed error messages for troubleshooting
