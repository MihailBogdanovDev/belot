import { describe, expect, it } from 'vitest';
import { legalCards, trickWinner } from '../src/play.js';
import type { Card, PlayedCard, Seat } from '../src/types.js';

const t = (...xs: [Seat, Card][]): PlayedCard[] => xs.map(([seat, card]) => ({ seat, card }));
const sorted = (cs: Card[]) => [...cs].sort();

describe('legalCards', () => {
  it('must follow suit', () => {
    expect(legalCards(['AS', 'JH', '8D'], t([0, '7S']), 'H', 1)).toEqual(['AS']);
  });
  it('must trump when opponent wins', () => {
    expect(legalCards(['JH', '8D'], t([0, 'AS']), 'H', 1)).toEqual(['JH']);
  });
  it('partner winning frees discard', () => {
    expect(legalCards(['JH', '8D'], t([0, 'AS'], [1, '7S']), 'H', 2)).toEqual(['JH', '8D']);
  });
  it('must overtrump opponent trump', () => {
    expect(legalCards(['JH', '7H', '8D'], t([0, '7S'], [1, '9H']), 'H', 2)).toEqual(['JH']);
  });
  it('cannot overtrump -> any card', () => {
    expect(sorted(legalCards(['9H', '8D'], t([0, '7S'], [1, 'JH']), 'H', 2))).toEqual(sorted(['9H', '8D']));
  });
  it('trump led must be raised', () => {
    expect(legalCards(['JH', '7H', '8D'], t([0, 'AH']), 'H', 1)).toEqual(['JH']);
    expect(legalCards(['7H', '8D'], t([0, 'AH']), 'H', 1)).toEqual(['7H']);
  });
  it('NT only follow', () => {
    expect(legalCards(['7S', 'AS', 'AH'], t([0, '10S']), 'NT', 1)).toEqual(['7S', 'AS']);
  });
  it('AT must beat in led suit', () => {
    expect(legalCards(['7S', '9S'], t([0, 'AS']), 'AT', 1)).toEqual(['9S']);
    expect(legalCards(['7S', '8S'], t([0, 'AS']), 'AT', 1)).toEqual(['7S', '8S']);
    expect(legalCards(['AH'], t([0, 'AS']), 'AT', 1)).toEqual(['AH']);
  });
  it('empty trick -> whole hand', () => {
    expect(legalCards(['7S', 'AH'], [], 'H', 0)).toEqual(['7S', 'AH']);
  });
});

describe('trickWinner', () => {
  it('trump beats ace', () => {
    expect(trickWinner(t([0, 'AS'], [1, '7H']), 'H')).toBe(1);
  });
  it('off-suit ace loses to led 7', () => {
    expect(trickWinner(t([0, '7S'], [1, 'AH']), 'NT')).toBe(0);
  });
  it('AT J of led suit wins', () => {
    expect(trickWinner(t([0, 'AS'], [1, 'JS'], [2, 'AH']), 'AT')).toBe(1);
  });
});
