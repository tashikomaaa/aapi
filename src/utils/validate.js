import path from 'path';

/**
 * Validates a project name according to npm package naming rules
 * @param {string} name - The project name to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required' };
  }

  // Check minimum length
  if (name.length < 1) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  // Check maximum length (npm limit is 214 characters)
  if (name.length > 214) {
    return { valid: false, error: 'Project name must be 214 characters or less' };
  }

  // Check for invalid characters (npm allows lowercase, digits, hyphens, underscores, dots)
  if (!/^[a-z0-9._-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Project name can only contain lowercase letters, numbers, hyphens, underscores, and dots',
    };
  }

  // Check if starts with dot or underscore (not recommended)
  if (/^[._]/.test(name)) {
    return { valid: false, error: 'Project name cannot start with a dot or underscore' };
  }

  // Check for reserved npm names
  const reservedNames = [
    'node_modules',
    'favicon.ico',
    '.git',
    '.env',
    'package.json',
    'package-lock.json',
  ];
  if (reservedNames.includes(name.toLowerCase())) {
    return { valid: false, error: `"${name}" is a reserved name and cannot be used` };
  }

  // Check for Node.js core modules
  const coreModules = [
    'assert',
    'buffer',
    'child_process',
    'cluster',
    'crypto',
    'dgram',
    'dns',
    'domain',
    'events',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'path',
    'punycode',
    'querystring',
    'readline',
    'stream',
    'string_decoder',
    'timers',
    'tls',
    'tty',
    'url',
    'util',
    'v8',
    'vm',
    'zlib',
  ];
  if (coreModules.includes(name.toLowerCase())) {
    return {
      valid: false,
      error: `"${name}" conflicts with a Node.js core module name`,
    };
  }

  return { valid: true };
}

/**
 * Validates a model name for code generation (PascalCase identifier)
 * @param {string} name - The model name to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateModelName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Model name is required' };
  }

  // Check minimum length
  if (name.length < 1) {
    return { valid: false, error: 'Model name cannot be empty' };
  }

  // Check maximum length (reasonable limit for identifiers)
  if (name.length > 100) {
    return { valid: false, error: 'Model name must be 100 characters or less' };
  }

  // Check for valid JavaScript identifier characters
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return {
      valid: false,
      error: 'Model name must be a valid JavaScript identifier (letters, numbers, underscore, dollar sign)',
    };
  }

  // Check for JavaScript reserved keywords
  const reservedKeywords = [
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'let',
    'static',
    'enum',
    'await',
    'implements',
    'interface',
    'package',
    'private',
    'protected',
    'public',
  ];
  if (reservedKeywords.includes(name.toLowerCase())) {
    return {
      valid: false,
      error: `"${name}" is a JavaScript reserved keyword and cannot be used`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a name to prevent path traversal attacks
 * @param {string} name - The name to sanitize
 * @returns {string} Sanitized name (basename only)
 */
export function sanitizePath(name) {
  // Use path.basename to strip any directory components
  return path.basename(name);
}
