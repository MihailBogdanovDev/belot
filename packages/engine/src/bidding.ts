import { CONTRACT_ORDER, nextSeat, teamOf } from './cards.js';
import type { Contract, Seat } from './types.js';

export type BidAction =
  | { type: 'bid'; contract: Contract }
  | { type: 'pass' }
  | { type: 'contra' }
  | { type: 'recontra' };

export interface BiddingState {
  turn: Seat;
  highest: { contract: Contract; seat: Seat } | null;
  multiplier: 1 | 2 | 4;
  passesInRow: number;
  history: { seat: Seat; action: BidAction }[];
}

export type BiddingOutcome =
  | { kind: 'open' }
  | { kind: 'allPass' }
  | { kind: 'contract'; contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4 };

export interface LegalBids {
  contracts: Contract[];
  pass: boolean;
  contra: boolean;
  recontra: boolean;
}

export function startBidding(dealer: Seat): BiddingState {
  return { turn: nextSeat(dealer), highest: null, multiplier: 1, passesInRow: 0, history: [] };
}

export function biddingOutcome(s: BiddingState): BiddingOutcome {
  if (s.highest && (s.multiplier === 4 || s.passesInRow >= 3)) {
    return { kind: 'contract', contract: s.highest.contract, bidder: s.highest.seat, multiplier: s.multiplier };
  }
  if (!s.highest && s.passesInRow >= 4) return { kind: 'allPass' };
  return { kind: 'open' };
}

export function legalBids(s: BiddingState, seat: Seat): LegalBids {
  const none: LegalBids = { contracts: [], pass: false, contra: false, recontra: false };
  if (seat !== s.turn || biddingOutcome(s).kind !== 'open') return none;
  const floor = s.highest ? CONTRACT_ORDER.indexOf(s.highest.contract) : -1;
  const opponents = s.highest !== null && teamOf(s.highest.seat) !== teamOf(seat);
  return {
    contracts: CONTRACT_ORDER.filter((_, i) => i > floor),
    pass: true,
    contra: opponents && s.multiplier === 1,
    recontra: s.highest !== null && !opponents && s.multiplier === 2,
  };
}

export function applyBid(s: BiddingState, seat: Seat, a: BidAction): BiddingState | { error: string } {
  if (biddingOutcome(s).kind !== 'open') return { error: 'bidding is over' };
  if (seat !== s.turn) return { error: 'not your turn' };
  const legal = legalBids(s, seat);
  const history = [...s.history, { seat, action: a }];
  const turn = nextSeat(seat);
  switch (a.type) {
    case 'bid':
      if (!legal.contracts.includes(a.contract)) return { error: 'bid must be higher than the current bid' };
      return { turn, highest: { contract: a.contract, seat }, multiplier: 1, passesInRow: 0, history };
    case 'pass':
      return { ...s, turn, passesInRow: s.passesInRow + 1, history };
    case 'contra':
      if (!legal.contra) return { error: 'contra not allowed' };
      return { ...s, turn, multiplier: 2, passesInRow: 0, history };
    case 'recontra':
      if (!legal.recontra) return { error: 'recontra not allowed' };
      return { ...s, turn, multiplier: 4, passesInRow: 0, history };
  }
}
