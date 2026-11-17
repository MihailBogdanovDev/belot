import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateToken } from '../src/token.js';

afterEach(() => vi.unstubAllGlobals());

describe('generateToken', () => {
  it('falls back to getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => a.fill(0xab) });
    const t = generateToken();
    expect(t).toBe('ab'.repeat(16));
  });
  it('uses randomUUID when present', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' });
    expect(generateToken()).toBe('uuid-1');
  });
});
