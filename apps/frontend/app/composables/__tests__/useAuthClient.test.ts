import { describe, it, expect } from 'vitest';
import { useAuthClient } from '../useAuthClient';

describe('useAuthClient', () => {
  it('should be defined as a function', () => {
    expect(useAuthClient).toBeDefined();
    expect(typeof useAuthClient).toBe('function');
  });
});
