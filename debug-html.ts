import { jsonToHtml } from './src/nodes/CsvJsonHtmltableConverter/utils/jsonConverter';

async function debugJsonToHtml() {
  console.log('=== Debugging jsonToHtml function ===\n');

  // Test with simple object (user's input)
  const userInput = {"Unique Vendors Count": 944, "Products Count": 2644};
  console.log('Input object:', userInput);
  console.log('');

  // Test with pretty print enabled
  console.log('--- Pretty print enabled ---');
  const resultPretty = await jsonToHtml(userInput, { includeTableHeaders: true, prettyPrint: true });
  console.log('Result:');
  console.log(resultPretty);
  console.log('');

  // Test with pretty print disabled (minified)
  console.log('--- Pretty print disabled (minified) ---');
  const resultMinified = await jsonToHtml(userInput, { includeTableHeaders: true, prettyPrint: false });
  console.log('Result:');
  console.log(resultMinified);
  console.log('');

  // Test with array of objects (what collectN8nObjectItems produces)
  console.log('--- Array of objects ---');
  const arrayInput = [userInput];
  const resultArray = await jsonToHtml(arrayInput, { includeTableHeaders: true, prettyPrint: true });
  console.log('Result:');
  console.log(resultArray);
  console.log('');

  // Test with array of objects minified
  console.log('--- Array of objects (minified) ---');
  const resultArrayMinified = await jsonToHtml(arrayInput, { includeTableHeaders: true, prettyPrint: false });
  console.log('Result:');
  console.log(resultArrayMinified);
  console.log('');

  // Test without headers
  console.log('--- Without headers ---');
  const resultNoHeaders = await jsonToHtml(userInput, { includeTableHeaders: false, prettyPrint: true });
  console.log('Result:');
  console.log(resultNoHeaders);
}

debugJsonToHtml().catch(console.error);
