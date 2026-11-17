import { expect, test } from 'vitest';
import {
  fullDeck, suitOf, rankOf, cardPoints, cardStrength, isTrump, teamOf, nextSeat,
  naturalIndex, CONTRACT_ORDER, SUITS, RANKS,
} from '../src/index.js';
import type { Card } from '../src/index.js';

const hearts = () => fullDeck().filter((c) => suitOf(c) === 'H');

test('trump points total 62, plain 30', () => {
  expect(hearts().reduce((s, c) => s + cardPoints(c, 'H'), 0)).toBe(62);
  expect(hearts().reduce((s, c) => s + cardPoints(c, 'S'), 0)).toBe(30);
  expect(hearts().reduce((s, c) => s + cardPoints(c, 'AT'), 0)).toBe(62);
  expect(hearts().reduce((s, c) => s + cardPoints(c, 'NT'), 0)).toBe(30);
});

test('trump strength order J 9 A 10 K Q 8 7', () => {
  const order = ['JH', '9H', 'AH', '10H', 'KH', 'QH', '8H', '7H'] as Card[];
  for (let i = 1; i < order.length; i++)
    expect(cardStrength(order[i - 1]!, 'H')).toBeGreaterThan(cardStrength(order[i]!, 'H'));
});

test('plain strength order A 10 K Q J 9 8 7', () => {
  const order = ['AH', '10H', 'KH', 'QH', 'JH', '9H', '8H', '7H'] as Card[];
  for (let i = 1; i < order.length; i++)
    expect(cardStrength(order[i - 1]!, 'NT')).toBeGreaterThan(cardStrength(order[i]!, 'NT'));
  expect(cardStrength('JH', 'S')).toBeLessThan(cardStrength('QH', 'S'));
});

test('fullDeck has 32 distinct cards', () => expect(new Set(fullDeck()).size).toBe(32));

test('isTrump per contract', () => {
  expect(isTrump('7H', 'AT')).toBe(true);
  expect(isTrump('7H', 'NT')).toBe(false);
  expect(isTrump('7H', 'H')).toBe(true);
  expect(isTrump('7H', 'S')).toBe(false);
});

test('seats and teams', () => {
  expect(teamOf(0)).toBe(0);
  expect(teamOf(1)).toBe(1);
  expect(teamOf(2)).toBe(0);
  expect(teamOf(3)).toBe(1);
  expect(nextSeat(3)).toBe(0);
  expect(nextSeat(1)).toBe(2);
});

test('constants and helpers', () => {
  expect(CONTRACT_ORDER).toEqual(['C', 'D', 'H', 'S', 'NT', 'AT']);
  expect(SUITS).toEqual(['C', 'D', 'H', 'S']);
  expect(RANKS).toEqual(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  expect(naturalIndex('7')).toBe(0);
  expect(naturalIndex('A')).toBe(7);
  expect(rankOf('10H')).toBe('10');
  expect(suitOf('10H')).toBe('H');
});
