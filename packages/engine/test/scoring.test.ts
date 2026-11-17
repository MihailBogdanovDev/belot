import { describe, expect, it } from 'vitest';
import { fullDeck, cardPoints } from '../src/cards.js';
import { findDeclarations } from '../src/declarations.js';
import { roundTeam, scoreHand, type ScoreInput } from '../src/scoring.js';
import type { Card, Contract, PlayedCard, Seat, Team } from '../src/types.js';

// Build 8 tricks: winners[i] is the team winning trick i; team A's cards sum to `ptsA`
// over its tricks (subset-sum search), team B takes the rest. Winner seats are explicit.
function build(contract: Contract, winners: Team[], cardPtsTeam0: number): ScoreInput['tricks'] {
  const n0 = winners.filter((w) => w === 0).length * 4;
  const deck = fullDeck();
  const pts = deck.map((c) => cardPoints(c, contract));
  const memo = new Map<string, boolean>();
  const can = (i: number, k: number, s: number): boolean => {
    if (k === 0) return s === 0;
    if (i === deck.length || s < 0) return false;
    const key = `${i},${k},${s}`;
    if (!memo.has(key)) memo.set(key, can(i + 1, k - 1, s - pts[i]!) || can(i + 1, k, s));
    return memo.get(key)!;
  };
  if (!can(0, n0, cardPtsTeam0)) throw new Error('unreachable split');
  const mine: Card[] = [];
  const rest: Card[] = [];
  let k = n0;
  let s = cardPtsTeam0;
  deck.forEach((c, i) => {
    if (k > 0 && can(i + 1, k - 1, s - pts[i]!)) {
      mine.push(c);
      k--;
      s -= pts[i]!;
    } else rest.push(c);
  });
  const piles: [Card[], Card[]] = [mine, rest];
  return winners.map((w) => {
    const cs = piles[w].splice(0, 4);
    return { cards: cs.map((card, j) => ({ seat: j as Seat, card }) as PlayedCard), winner: w as Seat };
  });
}
const T0 = (n: number): Team[] => Array.from({ length: 8 }, (_, i) => (i < n ? 0 : 1)) as Team[];
const base = (o: Partial<ScoreInput>): ScoreInput => ({
  contract: 'H',
  bidder: 0,
  multiplier: 1,
  tricks: [],
  declared: [],
  belots: [],
  hangingPot: 0,
  ...o,
});

describe('roundTeam table', () => {
  it('matches the rounding table', () => {
    expect(roundTeam('H', 86, 76, false)).toBe(8);
    expect(roundTeam('H', 76, 86, false)).toBe(8);
    expect(roundTeam('H', 77, 85, false)).toBe(8);
    expect(roundTeam('H', 85, 77, false)).toBe(8);
    expect(roundTeam('H', 97, 65, false)).toBe(10);
    expect(roundTeam('AT', 134, 124, false)).toBe(13);
    expect(roundTeam('AT', 124, 134, false)).toBe(13);
    expect(roundTeam('NT', 136, 124, false)).toBe(14);
    expect(roundTeam('NT', 124, 136, false)).toBe(12);
    expect(roundTeam('H', 106, 106, true)).toBe(10);
    expect(roundTeam('H', 106, 106, false)).toBe(11);
    expect(roundTeam('AT', 154, 154, true)).toBe(15);
    expect(roundTeam('AT', 154, 154, false)).toBe(16);
    expect(roundTeam('H', 81, 81, true)).toBe(8);
  });
});

describe('scoreHand', () => {
  it('made suit hand', () => {
    // team0 cards 90 + last ten (trick 8 won by team 0) = 100; team1 62
    const tricks = build('H', [1, 1, 1, 0, 0, 0, 0, 0] as Team[], 90);
    const r = scoreHand(base({ tricks }));
    expect(r.breakdown.map((b) => b.total)).toEqual([100, 62]);
    expect(r.outcome).toBe('made');
    expect(r.gamePoints).toEqual([10, 6]);
  });

  it('inside gives all to defenders', () => {
    // team0 cards 60 + last ten = 70; team1 92
    const tricks = build('H', [1, 1, 1, 1, 1, 0, 0, 0] as Team[], 60);
    const r = scoreHand(base({ tricks }));
    expect(r.breakdown.map((b) => b.total)).toEqual([70, 92]);
    expect(r.outcome).toBe('inside');
    expect(r.gamePoints).toEqual([0, 16]);
  });

  it('declarations of failed bidders go to defenders', () => {
    const tricks = build('H', [1, 1, 1, 1, 1, 1, 1, 0] as Team[], 40);
    const tierce = findDeclarations(['7S', '8S', '9S', 'JD', 'QD', 'KC', 'AC', '10C'], 'H')[0]!;
    const r = scoreHand(base({ tricks, declared: [{ seat: 0, decl: tierce }] }));
    expect(r.breakdown[0].declarations).toBe(20);
    expect(r.outcome).toBe('inside');
    expect(r.breakdown[1].total).toBe(112);
    expect(r.gamePoints).toEqual([0, 18]); // round(70 + 112)
  });

  it('NT doubles card points not valat', () => {
    const tricks = build('NT', T0(8), 120);
    const r = scoreHand(base({ contract: 'NT', tricks }));
    expect(r.breakdown[0].total).toBe(350);
    expect(r.breakdown[0].valat).toBe(90);
    expect(r.valatTeam).toBe(0);
  });

  it('valat adds 90', () => {
    const tricks = build('H', T0(8), 152);
    const r = scoreHand(base({ tricks }));
    expect(r.breakdown[0]).toMatchObject({ cards: 152, lastTen: 10, valat: 90, total: 252 });
    expect(r.valatTeam).toBe(0);
    expect(r.gamePoints).toEqual([25, 0]);
  });

  it('contra winner takes doubled pot', () => {
    // team0 50, team1 102 + last ten = 112 -> round(162)=16 * 2
    const tricks = build('H', [1, 1, 1, 1, 1, 0, 0, 1] as Team[], 50);
    const r = scoreHand(base({ tricks, multiplier: 2 }));
    expect(r.outcome).toBe('inside');
    expect(r.gamePoints).toEqual([0, 32]);
  });

  it('hanging stores pot and next made hand collects it', () => {
    const tie = build('H', [1, 1, 1, 1, 0, 0, 0, 0] as Team[], 71);
    const h = scoreHand(base({ tricks: tie }));
    expect(h.breakdown.map((b) => b.total)).toEqual([81, 81]);
    expect(h.outcome).toBe('hanging');
    expect(h.gamePoints).toEqual([0, 8]);
    expect(h.hangingPotAfter).toBe(8);

    const made = build('H', [1, 1, 1, 0, 0, 0, 0, 0] as Team[], 90);
    const r = scoreHand(base({ tricks: made, hangingPot: 8 }));
    expect(r.gamePoints).toEqual([18, 6]);
    expect(r.potAwarded).toEqual({ team: 0, amount: 8 });
    expect(r.hangingPotAfter).toBe(0);
  });

  it('belot always counts', () => {
    const tricks = build('H', [1, 1, 1, 1, 1, 1, 1, 0] as Team[], 40);
    const r = scoreHand(base({ tricks, belots: [0] }));
    expect(r.breakdown[0].belot).toBe(20);
    expect(r.breakdown[0].total).toBe(40 + 10 + 20);
  });
});
