import chalk from 'chalk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Checks if the current Node.js version meets the minimum requirement
 * @param {string} minVersion - Minimum required version (e.g., "18.0.0")
 * @returns {{satisfied: boolean, current: string, required: string}}
 */
export function checkNodeVersion(minVersion = '18.0.0') {
  const current = process.version.slice(1); // Remove 'v' prefix
  const currentParts = current.split('.').map(Number);
  const requiredParts = minVersion.split('.').map(Number);

  for (let i = 0; i < requiredParts.length; i++) {
    if (currentParts[i] > requiredParts[i]) {
      return { satisfied: true, current: process.version, required: `>=${minVersion}` };
    }
    if (currentParts[i] < requiredParts[i]) {
      return { satisfied: false, current: process.version, required: `>=${minVersion}` };
    }
  }

  return { satisfied: true, current: process.version, required: `>=${minVersion}` };
}

/**
 * Validates Node.js version and exits with error if not satisfied
 * @param {string} minVersion - Minimum required version
 */
export function validateNodeVersion(minVersion = '18.0.0') {
  const check = checkNodeVersion(minVersion);

  if (!check.satisfied) {
    console.error(chalk.red(`\n✗ Node.js version ${check.required} is required`));
    console.error(chalk.yellow(`  Current version: ${check.current}`));
    console.error(chalk.gray('\n💡 Please upgrade Node.js: https://nodejs.org/'));
    process.exit(1);
  }
}

/**
 * Gets the required Node.js version from package.json
 * @returns {string|null} Required version or null if not specified
 */
export function getRequiredNodeVersion() {
  try {
    const packageJson = require('../../package.json');
    const engines = packageJson.engines?.node;
    if (!engines) return null;

    // Parse version from engines.node (e.g., ">=18.0.0" -> "18.0.0")
    const match = engines.match(/>=?(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Validates Node.js version against package.json requirement
 */
export function validateFromPackageJson() {
  const requiredVersion = getRequiredNodeVersion();
  if (requiredVersion) {
    validateNodeVersion(requiredVersion);
  }
}
