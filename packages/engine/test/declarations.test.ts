import { describe, expect, it } from 'vitest';
import {
  canDeclareBelot,
  findDeclarations,
  isDisjoint,
  resolveDeclarations,
  type Declaration,
} from '../src/declarations.js';
import type { Card } from '../src/types.js';

const h = (s: string) => s.split(' ') as Card[];
const d = (hand: string, kind: string) => findDeclarations(h(hand), 'AT').find((x) => x.kind === kind)!;

describe('findDeclarations', () => {
  it('finds tierce quarte quint', () => {
    const r = findDeclarations(h('7H 8H 9H JS QS KS AS 10D'), 'C');
    expect(r.map((x) => [x.kind, x.points])).toEqual([
      ['tierce', 20],
      ['quarte', 50],
    ]);
    expect(r[0]!.id).toBe('tierce:7H,8H,9H');
    const q = findDeclarations(h('7H 8H 9H 10H JH'), 'C');
    expect(q.map((x) => [x.kind, x.points])).toEqual([['quint', 100]]);
  });
  it('run of 6 gives top-5 quint', () => {
    const r = findDeclarations(h('7H 8H 9H 10H JH QH'), 'H');
    expect(r).toHaveLength(1);
    expect(r[0]!.kind).toBe('quint');
    expect(r[0]!.cards).toEqual(h('8H 9H 10H JH QH'));
  });
  it('run of 8 gives quint + tierce', () => {
    const r = findDeclarations(h('7H 8H 9H 10H JH QH KH AH'), 'H');
    expect(r.map((x) => x.kind).sort()).toEqual(['quint', 'tierce']);
    expect(r.find((x) => x.kind === 'tierce')!.cards).toEqual(h('7H 8H 9H'));
    expect(r.find((x) => x.kind === 'quint')!.cards).toEqual(h('10H JH QH KH AH'));
    expect(isDisjoint(r)).toBe(true);
  });
  it('carre values', () => {
    const four = (r: string) => h(['C', 'D', 'H', 'S'].map((s) => r + s).join(' '));
    const pts = (r: string) => findDeclarations(four(r), 'H').map((x) => x.points);
    expect(pts('J')).toEqual([200]);
    expect(pts('9')).toEqual([150]);
    expect(pts('A')).toEqual([100]);
    expect(pts('8')).toEqual([]);
    expect(pts('7')).toEqual([]);
  });
  it('nothing in NT', () => {
    expect(findDeclarations(h('7H 8H 9H JH JS JD JC'), 'NT')).toEqual([]);
  });
  it('overlap must choose', () => {
    const r = findDeclarations(h('JH JS JD JC QH KH'), 'H');
    const carre = r.find((x) => x.kind === 'carre')!;
    const tierce = r.find((x) => x.kind === 'tierce')!;
    expect(carre).toBeDefined();
    expect(tierce).toBeDefined();
    expect(isDisjoint([carre, tierce])).toBe(false);
  });
});

describe('resolveDeclarations', () => {
  const tierce = (cards: string) => findDeclarations(h(cards), 'AT')[0]!;
  it('longer sequence wins all', () => {
    const r = resolveDeclarations([
      { seat: 0, decl: tierce('7H 8H 9H 10H') },
      { seat: 1, decl: tierce('7S 8S 9S') },
      { seat: 3, decl: tierce('7D 8D 9D') },
    ]);
    expect(r.points).toEqual([50, 0]);
    expect(r.valid).toHaveLength(1);
  });
  it('equal best sequence cancels', () => {
    const r = resolveDeclarations([
      { seat: 0, decl: tierce('8H 9H 10H') },
      { seat: 1, decl: tierce('8S 9S 10S') },
    ]);
    expect(r.points).toEqual([0, 0]);
    expect(r.valid).toEqual([]);
  });
  it('higher top wins equal length', () => {
    const r = resolveDeclarations([
      { seat: 0, decl: tierce('10H JH QH') },
      { seat: 1, decl: tierce('JS QS KS') },
    ]);
    expect(r.points).toEqual([0, 20]);
  });
  it('carre does not cancel sequence', () => {
    const carreQ = d('QH QS QD QC', 'carre');
    const quint = d('7H 8H 9H 10H JH', 'quint');
    const r = resolveDeclarations([
      { seat: 0, decl: carreQ },
      { seat: 1, decl: quint },
    ]);
    expect(r.points).toEqual([100, 100]);
  });
  it('stronger carre wins', () => {
    const c9 = d('9H 9S 9D 9C', 'carre');
    const cA = d('AH AS AD AC', 'carre');
    const r = resolveDeclarations([
      { seat: 0, decl: c9 },
      { seat: 1, decl: cA },
    ]);
    expect(r.points).toEqual([150, 0]);
  });
});

describe('canDeclareBelot', () => {
  it('belot eligibility', () => {
    const hand = h('KH QH 7C');
    expect(canDeclareBelot(hand, 'KH', [], 'H')).toBe(true);
    expect(canDeclareBelot(hand, 'KH', [{ seat: 1, card: '7S' }], 'H')).toBe(true);
    expect(canDeclareBelot(h('KS QS'), 'KS', [], 'H')).toBe(false);
    expect(canDeclareBelot(h('KS QS'), 'KS', [], 'AT')).toBe(true);
    expect(canDeclareBelot(h('KS QS'), 'KS', [{ seat: 1, card: '7H' }], 'AT')).toBe(false);
    expect(canDeclareBelot(hand, 'KH', [], 'NT')).toBe(false);
    expect(canDeclareBelot(h('KH 7C'), 'KH', [], 'H')).toBe(false);
  });
});
