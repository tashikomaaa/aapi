import { describe, it, expect } from '@jest/globals';
import { checkNodeVersion } from '../../src/utils/version.js';

describe('checkNodeVersion', () => {
  describe('version comparison', () => {
    it('should pass when current version is higher', () => {
      // Mock current version to be v20.0.0 for testing
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v20.0.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);
      expect(result.current).toBe('v20.0.0');
      expect(result.required).toBe('>=18.0.0');

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });

    it('should pass when current version equals minimum', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v18.0.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });

    it('should fail when current version is lower', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(false);
      expect(result.current).toBe('v16.0.0');

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });
  });

  describe('patch version handling', () => {
    it('should handle patch version differences', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v18.0.1',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });

    it('should handle minor version differences', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v18.1.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });

    it('should handle major version differences', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v19.0.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle versions with many digits', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v18.19.0',
        configurable: true,
      });

      const result = checkNodeVersion('18.10.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });

    it('should handle LTS version numbers', () => {
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v20.11.1',
        configurable: true,
      });

      const result = checkNodeVersion('18.0.0');
      expect(result.satisfied).toBe(true);

      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true,
      });
    });
  });

  describe('return value structure', () => {
    it('should return correct structure', () => {
      const result = checkNodeVersion('18.0.0');

      expect(result).toHaveProperty('satisfied');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('required');
      expect(typeof result.satisfied).toBe('boolean');
      expect(typeof result.current).toBe('string');
      expect(typeof result.required).toBe('string');
    });

    it('should format required version correctly', () => {
      const result = checkNodeVersion('18.5.2');
      expect(result.required).toBe('>=18.5.2');
    });
  });
});
