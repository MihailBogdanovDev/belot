import { expect, test } from 'vitest';
import { fullDeck, cutDeck, deal, shuffle, gatherAfterPlay, gatherAfterThrowIn } from '../src/index.js';
import type { Card, PlayedCard, Seat } from '../src/index.js';

test('cutDeck moves top part to bottom', () => {
  expect(cutDeck(['7C', '8C', '9C', '10C'] as Card[], 1)).toEqual(['8C', '9C', '10C', '7C']);
  expect(() => cutDeck(fullDeck(), 0)).toThrow();
  expect(() => cutDeck(fullDeck(), 32)).toThrow();
});

test('deal 3 then 2 starts right of dealer', () => {
  const d = fullDeck();
  let r = deal(d, 0, 3, [[], [], [], []]);
  expect(r.hands[1]).toEqual(d.slice(0, 3));
  expect(r.hands[0]).toEqual(d.slice(9, 12));
  r = deal(r.deck, 0, 2, r.hands);
  expect(r.hands[1]).toEqual([...d.slice(0, 3), ...d.slice(12, 14)]);
  expect(r.deck).toHaveLength(12);
});

test('gatherAfterPlay keeps play order', () => {
  const d = fullDeck();
  const tricks: PlayedCard[][] = [];
  for (let t = 0; t < 8; t++)
    tricks.push([0, 1, 2, 3].map((s) => ({ seat: s as Seat, card: d[t * 4 + s]! })));
  expect(gatherAfterPlay(tricks)).toEqual(d);
});

test('gatherAfterThrowIn order', () => {
  const hands: Card[][] = [['7C', '8C'], ['9C', '10C'], ['JC', 'QC'], ['KC', 'AC']] as Card[][];
  const rest = ['7D', '8D'] as Card[];
  expect(gatherAfterThrowIn(hands, 2, rest)).toEqual(
    ['KC', 'AC', '7C', '8C', '9C', '10C', 'JC', 'QC', '7D', '8D'],
  );
});

test('shuffle is a permutation, pure, and uses rng', () => {
  const d = fullDeck();
  const copy = [...d];
  let i = 0;
  const rng = () => ((i++ * 7919) % 1000) / 1000;
  const s = shuffle(d, rng);
  expect(d).toEqual(copy);
  expect([...s].sort()).toEqual([...d].sort());
  expect(s).not.toEqual(d);
  expect(i).toBeGreaterThan(0);
  expect(shuffle(d, () => 0)).toEqual(shuffle(d, () => 0));
});
