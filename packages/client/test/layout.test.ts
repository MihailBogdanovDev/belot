import { describe, expect, it } from 'vitest';
import { relativePosition } from '../src/layout.js';

describe('relativePosition', () => {
  it('places seats relative to me', () => {
    expect(relativePosition(2, 2)).toBe('bottom');
    expect(relativePosition(2, 3)).toBe('right');
    expect(relativePosition(2, 0)).toBe('top');
    expect(relativePosition(2, 1)).toBe('left');
  });
});
