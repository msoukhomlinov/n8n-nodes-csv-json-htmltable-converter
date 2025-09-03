/**
 * Tests for data manipulation utilities
 */

import { parseFieldList, filterAndReorderFields, sortByField, manipulateData } from '../src/nodes/CsvJsonHtmltableConverter/utils/dataManipulation';

describe('Data Manipulation Utilities', () => {

  describe('parseFieldList', () => {
    it('should parse simple comma-separated fields', () => {
      const result = parseFieldList('name, age, city');
      expect(result).toEqual(['name', 'age', 'city']);
    });

    it('should handle quoted field names with spaces', () => {
      const result = parseFieldList('"full name", age, "email address"');
      expect(result).toEqual(['full name', 'age', 'email address']);
    });

    it('should handle mixed quoted and unquoted fields', () => {
      const result = parseFieldList('name,"full address",phone');
      expect(result).toEqual(['name', 'full address', 'phone']);
    });

    it('should handle single quotes', () => {
      const result = parseFieldList("'full name', age, 'email address'");
      expect(result).toEqual(['full name', 'age', 'email address']);
    });

    it('should handle empty or whitespace-only strings', () => {
      expect(parseFieldList('')).toEqual([]);
      expect(parseFieldList('   ')).toEqual([]);
    });

    it('should trim whitespace around field names', () => {
      const result = parseFieldList('  name  ,  age  ,  city  ');
      expect(result).toEqual(['name', 'age', 'city']);
    });
  });

  describe('sortByField', () => {
    const testData = [
      { name: 'Charlie', age: 35, score: '85' },
      { name: 'Alice', age: 30, score: '92' },
      { name: 'Bob', age: 25, score: '78' }
    ];

    const testDataMixedCase = [
      { Name: 'Charlie', AGE: 35, Score: '85' },
      { Name: 'Alice', AGE: 30, Score: '92' },
      { Name: 'Bob', AGE: 25, Score: '78' }
    ];

    it('should sort by string field ascending', () => {
      const result = sortByField(testData, 'name', 'ascending');
      expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort by string field descending', () => {
      const result = sortByField(testData, 'name', 'descending');
      expect(result.map(r => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should sort by numeric field ascending', () => {
      const result = sortByField(testData, 'age', 'ascending');
      expect(result.map(r => r.age)).toEqual([25, 30, 35]);
    });

    it('should sort by numeric field descending', () => {
      const result = sortByField(testData, 'age', 'descending');
      expect(result.map(r => r.age)).toEqual([35, 30, 25]);
    });

    it('should handle numeric strings correctly', () => {
      const result = sortByField(testData, 'score', 'descending');
      expect(result.map(r => r.score)).toEqual(['92', '85', '78']);
    });

    it('should return original data if no field specified', () => {
      const result = sortByField(testData, '', 'ascending');
      expect(result).toEqual(testData);
    });

    it('should handle missing field gracefully', () => {
      const result = sortByField(testData, 'nonexistent', 'ascending');
      expect(result).toEqual(testData); // All values are undefined, so order unchanged
    });

    it('should handle case-insensitive field matching', () => {
      const result = sortByField(testDataMixedCase, 'name', 'ascending');
      expect(result.map(r => r.Name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should handle case-insensitive field matching with different cases', () => {
      const result = sortByField(testDataMixedCase, 'AGE', 'ascending');
      expect(result.map(r => r.AGE)).toEqual([25, 30, 35]);
    });

    it('should handle case-insensitive field matching with lowercase input', () => {
      const result = sortByField(testDataMixedCase, 'score', 'descending');
      expect(result.map(r => r.Score)).toEqual(['92', '85', '78']);
    });
  });

  describe('filterAndReorderFields', () => {
    const testData = [
      { name: 'Alice', age: 30, city: 'New York', country: 'USA' },
      { name: 'Bob', age: 25, city: 'London', country: 'UK' }
    ];

    const testDataMixedCase = [
      { Name: 'Alice', Age: 30, City: 'New York', Country: 'USA' },
      { Name: 'Bob', Age: 25, City: 'London', Country: 'UK' }
    ];

    it('should filter and reorder fields as specified', () => {
      const result = filterAndReorderFields(testData, ['age', 'name']);
      expect(result).toEqual([
        { age: 30, name: 'Alice' },
        { age: 25, name: 'Bob' }
      ]);
    });

    it('should handle non-existent fields gracefully', () => {
      const result = filterAndReorderFields(testData, ['name', 'nonexistent', 'age']);
      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ]);
    });

    it('should return original data if no fields specified', () => {
      const result = filterAndReorderFields(testData, []);
      expect(result).toEqual(testData);
    });

    it('should handle empty field list', () => {
      const result = filterAndReorderFields(testData, []);
      expect(result).toEqual(testData);
    });

    it('should handle case-insensitive field matching', () => {
      const result = filterAndReorderFields(testDataMixedCase, ['age', 'name']);
      expect(result).toEqual([
        { Age: 30, Name: 'Alice' },
        { Age: 25, Name: 'Bob' }
      ]);
    });

    it('should handle case-insensitive field matching with mixed case input', () => {
      const result = filterAndReorderFields(testDataMixedCase, ['CITY', 'name']);
      expect(result).toEqual([
        { City: 'New York', Name: 'Alice' },
        { City: 'London', Name: 'Bob' }
      ]);
    });

    it('should preserve original field name casing in output', () => {
      const result = filterAndReorderFields(testDataMixedCase, ['country', 'age']);
      expect(result).toEqual([
        { Country: 'USA', Age: 30 },
        { Country: 'UK', Age: 25 }
      ]);
    });
  });

  describe('manipulateData', () => {
    const testData = [
      { name: 'Charlie', age: 35, city: 'Paris' },
      { name: 'Alice', age: 30, city: 'New York' },
      { name: 'Bob', age: 25, city: 'London' }
    ];

    it('should apply both sorting and field filtering', () => {
      const options = {
        sortByField: 'name',
        sortOrder: 'ascending' as const,
        fields: 'name, age'
      };

      const result = manipulateData(testData, options);
      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 }
      ]);
    });

    it('should apply only sorting when no fields specified', () => {
      const options = {
        sortByField: 'age',
        sortOrder: 'descending' as const
      };

      const result = manipulateData(testData, options);
      expect(result.map(r => r.age)).toEqual([35, 30, 25]);
    });

    it('should apply only field filtering when no sort specified', () => {
      const options = {
        fields: 'city, name'
      };

      const result = manipulateData(testData, options);
      expect(result).toEqual([
        { city: 'Paris', name: 'Charlie' },
        { city: 'New York', name: 'Alice' },
        { city: 'London', name: 'Bob' }
      ]);
    });

    it('should handle quoted field names', () => {
      const testDataWithSpaces = [
        { 'full name': 'Alice Smith', age: 30, 'email address': 'alice@example.com' },
        { 'full name': 'Bob Jones', age: 25, 'email address': 'bob@example.com' }
      ];

      const options = {
        fields: '"full name", "email address"'
      };

      const result = manipulateData(testDataWithSpaces, options);
      expect(result).toEqual([
        { 'full name': 'Alice Smith', 'email address': 'alice@example.com' },
        { 'full name': 'Bob Jones', 'email address': 'bob@example.com' }
      ]);
    });

    it('should return original data when no manipulation options provided', () => {
      const options = {};
      const result = manipulateData(testData, options);
      expect(result).toEqual(testData);
    });

    it('should handle empty data arrays', () => {
      const options = {
        sortByField: 'name',
        sortOrder: 'ascending' as const,
        fields: 'name, age'
      };

      const result = manipulateData([], options);
      expect(result).toEqual([]);
    });

    it('should handle case-insensitive field matching in complex scenario', () => {
      const testDataMixedCase = [
        { FirstName: 'Charlie', AGE: 35, City: 'Paris' },
        { FirstName: 'Alice', AGE: 30, City: 'New York' },
        { FirstName: 'Bob', AGE: 25, City: 'London' }
      ];

      const options = {
        sortByField: 'firstname', // lowercase
        sortOrder: 'ascending' as const,
        fields: 'FIRSTNAME, age' // mixed case
      };

      const result = manipulateData(testDataMixedCase, options);
      expect(result).toEqual([
        { FirstName: 'Alice', AGE: 30 },
        { FirstName: 'Bob', AGE: 25 },
        { FirstName: 'Charlie', AGE: 35 }
      ]);
    });

    it('should preserve original field name casing in output', () => {
      const testDataMixedCase = [
        { UserName: 'Charlie', UserAge: 35 },
        { UserName: 'Alice', UserAge: 30 }
      ];

      const options = {
        fields: 'username, userage' // all lowercase
      };

      const result = manipulateData(testDataMixedCase, options);
      expect(result).toEqual([
        { UserName: 'Charlie', UserAge: 35 },
        { UserName: 'Alice', UserAge: 30 }
      ]);
    });
  });

});
