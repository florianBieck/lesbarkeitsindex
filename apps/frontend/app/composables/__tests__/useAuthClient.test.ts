import { describe, it, expect } from 'vitest';
import { useAuthClient, plugins } from '../useAuthClient';

describe('useAuthClient', () => {
  it('should be defined as a function', () => {
    expect(useAuthClient).toBeDefined();
    expect(typeof useAuthClient).toBe('function');
  });

  it('should export plugins array', () => {
    expect(Array.isArray(plugins)).toBe(true);
  });
});
