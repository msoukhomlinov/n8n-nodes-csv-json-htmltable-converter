# n8n-nodes-csv-json-htmltable-converter

This is an n8n community node that provides seamless bidirectional conversion between HTML tables, CSV, and JSON formats.

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/msoukhomlinov)

## Key Features

- Supports conversion between HTML tables, CSV, and JSON formats
- Options for customising the conversion:
  - CSV delimiter
  - HTML table selector
  - HTML element selector
  - Include/exclude table headers
  - Pretty print output
- Comprehensive input validation
- Detailed error messages for troubleshooting

## Installation

You can install this node for your n8n instance using either the n8n Community Nodes UI or manually via npm:

### Install from n8n

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-csv-json-htmltable-converter` in **Enter npm package name**
4. Click **Install**

### Install manually

```bash
cd ~/.n8n/custom
npm install n8n-nodes-csv-json-htmltable-converter
```

## Usage

1. Add the "CSV JSON HTMLTable Converter" node to your workflow
2. Select the source format (HTML, CSV, or JSON)
3. Select the target format you want to convert to
4. Enter your data directly in the "Input Data" field
5. Configure any additional options as needed
6. Set the name of the output field
7. Run the workflow to convert your data

## HTML Table Selection Options

When converting from HTML, you can choose between two selection modes to make finding tables easier:

### Simple Mode (Recommended for beginners)

Simple mode provides preset patterns for common table scenarios:

- **All Tables**: Finds all table elements in the document
- **First Table Only**: Finds only the first table in the document
- **Last Table Only**: Finds only the last table in the document
- **Table Under Heading**: Finds a specific table (1st–10th) that appears after a heading (with configurable heading level and text)
- **Custom**: Use your own custom selector (for advanced users)

### Advanced Mode

Advanced mode gives you more control with two separate selectors:

1. **HTML Element Selector**: First selects elements containing tables
2. **HTML Table Selector**: Then finds tables within those elements

This is useful for complex HTML documents where you need precise control over which tables are selected.

### Tips for Using Table Selectors

- Start with Simple mode and try different presets
- If you need more control, switch to Advanced mode
- For complex websites, use browser developer tools to identify the correct selectors
- Test your selectors incrementally to make sure they work as expected
- For more information about CSS selectors supported by Cheerio, see the [Cheerio documentation](https://cheerio.js.org/docs/basics/selecting)

#### Example Selectors

// Simple selectors
table                     // All tables
table.data                // Tables with class "data"
#main-content table       // Tables inside an element with ID "main-content"

// Advanced selectors
.content                  // Element Selector: Find elements with class "content"
table.results             // Table Selector: Find tables with class "results" inside those elements

## Operations

The Table Converter node provides the following operations:

- Convert HTML tables to CSV
- Convert HTML tables to JSON
- Convert CSV to HTML tables
- Convert CSV to JSON
- Convert JSON to HTML tables
- Convert JSON to CSV

### Node Parameters

#### Source Format

The format of the input data:
- HTML
- CSV
- JSON

#### Target Format

The format to convert the data to:
- HTML
- CSV
- JSON

#### Input Data

The data to be converted in the specified source format.

#### Options

##### CSV Options
- CSV Delimiter: The character to use as a delimiter for CSV data (default: `,`)

##### HTML Options
- HTML Table Selector: CSS selector to identify HTML tables (default: `table`). This selects tables within the context of the element selector.
- HTML Element Selector: CSS selector to identify the HTML element containing tables (default: `html`). This enables extracting tables from specific parts of an HTML document using Cheerio's CSS selector syntax.

**Note:** The HTML conversion works by first selecting elements that match the `elementSelector`, and then finding tables within those elements using the `tableSelector`. This two-step approach provides fine-grained control over which tables to extract from complex HTML documents.

##### General Options
- Include Table Headers: Whether to include table headers in the converted output (default: `true`)
- Pretty Print Output: Format the output with proper indentation and spacing (for JSON and HTML)

#### Output Field

The name of the field to store the converted data in the output.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [n8n node development documentation](https://docs.n8n.io/integrations/creating-nodes/)

## Support

If you find this node helpful and would like to support its development:
[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/msoukhomlinov)

## License

This project is licensed under the [MIT License](LICENSE.md).
