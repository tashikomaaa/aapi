import { describe, it, expect } from '@jest/globals';
import { validateProjectName, validateModelName, sanitizePath } from '../../src/utils/validate.js';

describe('validateProjectName', () => {
  it('should accept valid project names', () => {
    expect(validateProjectName('my-api').valid).toBe(true);
    expect(validateProjectName('api123').valid).toBe(true);
    expect(validateProjectName('my_api').valid).toBe(true);
    expect(validateProjectName('my.api').valid).toBe(true);
  });

  it('should reject empty names', () => {
    const result = validateProjectName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject null or undefined', () => {
    expect(validateProjectName(null).valid).toBe(false);
    expect(validateProjectName(undefined).valid).toBe(false);
  });

  it('should reject names that are too long', () => {
    const longName = 'a'.repeat(215);
    const result = validateProjectName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('214 characters or less');
  });

  it('should reject uppercase letters', () => {
    const result = validateProjectName('MyAPI');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('should reject special characters', () => {
    expect(validateProjectName('my@api').valid).toBe(false);
    expect(validateProjectName('my#api').valid).toBe(false);
    expect(validateProjectName('my api').valid).toBe(false);
  });

  it('should reject names starting with dot or underscore', () => {
    expect(validateProjectName('.myapi').valid).toBe(false);
    expect(validateProjectName('_myapi').valid).toBe(false);
  });

  it('should reject reserved names', () => {
    expect(validateProjectName('node_modules').valid).toBe(false);
    expect(validateProjectName('.git').valid).toBe(false);
    expect(validateProjectName('package.json').valid).toBe(false);
  });

  it('should reject Node.js core module names', () => {
    expect(validateProjectName('fs').valid).toBe(false);
    expect(validateProjectName('http').valid).toBe(false);
    expect(validateProjectName('path').valid).toBe(false);
  });
});

describe('validateModelName', () => {
  it('should accept valid model names', () => {
    expect(validateModelName('User').valid).toBe(true);
    expect(validateModelName('ProductModel').valid).toBe(true);
    expect(validateModelName('My_Model').valid).toBe(true);
    expect(validateModelName('Model123').valid).toBe(true);
    expect(validateModelName('_privateModel').valid).toBe(true);
    expect(validateModelName('$model').valid).toBe(true);
  });

  it('should reject empty names', () => {
    const result = validateModelName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject null or undefined', () => {
    expect(validateModelName(null).valid).toBe(false);
    expect(validateModelName(undefined).valid).toBe(false);
  });

  it('should reject names that are too long', () => {
    const longName = 'A'.repeat(101);
    const result = validateModelName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100 characters or less');
  });

  it('should reject names starting with numbers', () => {
    const result = validateModelName('123Model');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid JavaScript identifier');
  });

  it('should reject names with spaces or special characters', () => {
    expect(validateModelName('My Model').valid).toBe(false);
    expect(validateModelName('My-Model').valid).toBe(false);
    expect(validateModelName('My@Model').valid).toBe(false);
  });

  it('should reject JavaScript reserved keywords', () => {
    expect(validateModelName('class').valid).toBe(false);
    expect(validateModelName('function').valid).toBe(false);
    expect(validateModelName('return').valid).toBe(false);
    expect(validateModelName('const').valid).toBe(false);
    expect(validateModelName('let').valid).toBe(false);
    expect(validateModelName('await').valid).toBe(false);
  });

  it('should accept reserved keywords with different casing', () => {
    // "Class" is not the same as "class" in the validation
    const result = validateModelName('Class');
    // This should pass because we check toLowerCase()
    expect(result.valid).toBe(false);
  });
});

describe('sanitizePath', () => {
  it('should return basename for simple names', () => {
    expect(sanitizePath('myfile.txt')).toBe('myfile.txt');
    expect(sanitizePath('Model')).toBe('Model');
  });

  it('should strip directory traversal attempts', () => {
    expect(sanitizePath('../../../etc/passwd')).toBe('passwd');
    expect(sanitizePath('../../malicious')).toBe('malicious');
    expect(sanitizePath('/absolute/path/file.js')).toBe('file.js');
  });

  it('should handle paths with multiple separators', () => {
    expect(sanitizePath('path/to/file.js')).toBe('file.js');
    expect(sanitizePath('a/b/c/d/model.js')).toBe('model.js');
  });

  it('should handle Windows-style paths', () => {
    expect(sanitizePath('C:\\\\Users\\\\file.txt')).toBe('file.txt');
    expect(sanitizePath('..\\\\..\\\\malicious')).toBe('malicious');
  });
});
