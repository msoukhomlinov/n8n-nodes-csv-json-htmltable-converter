# n8n-nodes-csv-json-htmltable-converter

This is an n8n community node that provides seamless bidirectional conversion between HTML tables, CSV, and JSON formats.

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/msoukhomlinov)

## Key Features

- Supports conversion between HTML Tables, CSV, and JSON formats
- Input data directly into the node via manual input
- Options for customizing the conversion:
  - CSV delimiter
  - HTML table selector
  - Include/exclude table headers
  - Pretty print output
  - Support for multiple tables/objects
- Comprehensive input validation
- Detailed error messages for troubleshooting

## Installation

Follow these instructions to install this node for your n8n instance:

```bash
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

## Example Use Cases

- Converting JSON data to HTML tables for reports
- Converting HTML tables scraped from websites to CSV for data analysis
- Transforming CSV data to JSON for API consumption
- Normalizing data between different formats for integration purposes

## Advanced Usage Examples

### Extracting Tables from Complex HTML Documents

When working with complex HTML documents (like web pages) that contain multiple tables, you can use the Element Selector feature to target specific tables based on their location in the document.

For example, if you have an HTML page with tables in different sections:

```html
<div class="main-content">
  <h2>Sales Data</h2>
  <div class="data-container">
    <table>
      <!-- Sales data table -->
    </table>
  </div>
</div>
<div class="sidebar">
  <h3>Summary</h3>
  <table>
    <!-- Summary table -->
  </table>
</div>
```

You can extract just the sales table by using:
- Element Selector: `.main-content .data-container`
- Table Selector: `table`

Or extract just the summary table by using:
- Element Selector: `.sidebar`
- Table Selector: `table`

This feature utilizes Cheerio's CSS selector capabilities, supporting selectors like:
- Class selectors (`.classname`)
- ID selectors (`#id`)
- Descendant selectors (`.parent .child`)
- Attribute selectors (`[data-type="sales"]`)
- Pseudo-class selectors (`:first-child`, `:contains("text")`)

## HTML Table Selection Options

When converting from HTML, you can now choose between two selection modes to make finding tables easier:

### Simple Mode (Recommended for beginners)

Simple mode provides preset patterns for common table scenarios:

- **All Tables**: Finds all table elements in the document
- **First Table Only**: Finds only the first table in the document
- **Tables With Headers**: Finds tables that have header rows (th elements)
- **Tables in Main Content**: Finds tables in main content areas (main, article, etc.)
- **Data Tables**: Finds tables with class containing "data" or with data attributes
- **Table Under Heading**: Finds a specific table (1st-10th) that appears after a heading (with configurable heading level and text)
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

```
// Simple selectors
table                     // All tables
table.data                // Tables with class "data"
#main-content table       // Tables inside an element with ID "main-content"

// Advanced selectors
.content                  // Element Selector: Find elements with class "content"
table.results             // Table Selector: Find tables with class "results" inside those elements
```

## License

[MIT](LICENSE.md)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow.svg)](https://buymeacoffee.com/msoukhomlinov)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Version History](#version-history)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Install from n8n

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-csv-json-htmltable-converter` in **Enter npm package name**
4. Click **Install**

### Install manually

Install node:

```bash
cd ~/.n8n/custom
npm install n8n-nodes-csv-json-htmltable-converter
```

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
- Multiple Tables/Objects: Whether the input contains multiple tables or JSON objects

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
