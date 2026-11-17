import type { Card, Contract, Rank, Seat, Suit, Team } from './types.js';

export const SUITS: Suit[] = ['C', 'D', 'H', 'S'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const CONTRACT_ORDER: Contract[] = ['C', 'D', 'H', 'S', 'NT', 'AT'];

const TRUMP_POINTS: Record<Rank, number> = { J: 20, '9': 14, A: 11, '10': 10, K: 4, Q: 3, '8': 0, '7': 0 };
const PLAIN_POINTS: Record<Rank, number> = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0 };
const TRUMP_ORDER: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
const PLAIN_ORDER: Rank[] = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];

export const suitOf = (c: Card): Suit => c.slice(-1) as Suit;
export const rankOf = (c: Card): Rank => c.slice(0, -1) as Rank;
export const teamOf = (s: Seat): Team => (s % 2) as Team;
export const nextSeat = (s: Seat): Seat => ((s + 1) % 4) as Seat;
export const naturalIndex = (r: Rank): number => RANKS.indexOf(r);

export function isTrump(c: Card, contract: Contract): boolean {
  if (contract === 'AT') return true;
  if (contract === 'NT') return false;
  return suitOf(c) === contract;
}

export function cardPoints(c: Card, contract: Contract): number {
  return (isTrump(c, contract) ? TRUMP_POINTS : PLAIN_POINTS)[rankOf(c)];
}

export function cardStrength(c: Card, contract: Contract): number {
  return (isTrump(c, contract) ? TRUMP_ORDER : PLAIN_ORDER).indexOf(rankOf(c));
}

export function fullDeck(): Card[] {
  return SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}` as Card));
}
