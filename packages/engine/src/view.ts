import { SUITS, cardStrength, suitOf, teamOf } from './cards.js';
import type { BiddingState, LegalBids } from './bidding.js';
import { legalBids } from './bidding.js';
import { canDeclareBelot, findDeclarations, type Declaration } from './declarations.js';
import { cutterOf, type Announcement, type GameState, type Phase } from './game.js';
import { legalCards } from './play.js';
import type { HandResult } from './scoring.js';
import type { Card, Contract, PlayedCard, Seat, Team } from './types.js';

export interface PlayerView {
  seat: Seat;
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  cutter: Seat;
  hand: Card[];
  handCounts: [number, number, number, number];
  bidding: BiddingState | null;
  contract: GameState['contract'];
  trick: PlayedCard[];
  lastTrick: { cards: PlayedCard[]; winner: Seat } | null;
  tricksWon: [number, number];
  announcements: Announcement[];
  revealedDeclarations: { seat: Seat; decl: Declaration }[];
  scores: [number, number];
  hangingPot: number;
  history: HandResult[];
  lastResult: HandResult | null;
  winner: Team | null;
  legal: {
    cards: Card[];
    bids: LegalBids | null;
    declarations: Declaration[];
    belotCards: Card[];
    canCut: boolean;
    canContinue: boolean;
    canNewGame: boolean;
  };
}

function sortHand(hand: Card[], contract: Contract | null): Card[] {
  const trump = contract && contract !== 'NT' && contract !== 'AT' ? contract : null;
  const order = SUITS.filter((x) => x !== trump);
  if (trump) order.push(trump);
  const strengthContract: Contract = contract ?? 'NT';
  return [...hand].sort(
    (a, b) =>
      order.indexOf(suitOf(a)) - order.indexOf(suitOf(b)) ||
      cardStrength(b, strengthContract) - cardStrength(a, strengthContract),
  );
}

export function viewFor(s: GameState, seat: Seat): PlayerView {
  const contract = s.contract?.contract ?? null;
  const hand = s.hands[seat] ?? [];
  const myTurnPlaying = s.phase === 'playing' && s.turn === seat && contract !== null;
  const cards = myTurnPlaying ? legalCards(hand, s.trick, contract, seat) : [];
  const declarations = myTurnPlaying && s.tricks.length === 0 ? findDeclarations(hand, contract) : [];
  const belotCards = myTurnPlaying ? cards.filter((c) => canDeclareBelot(hand, c, s.trick, contract)) : [];
  const tricksWon: [number, number] = [0, 0];
  for (const t of s.tricks) tricksWon[teamOf(t.winner)]++;
  return {
    seat,
    phase: s.phase,
    dealer: s.dealer,
    turn: s.turn,
    cutter: cutterOf(s),
    hand: sortHand(hand, contract),
    handCounts: s.hands.map((h) => h.length) as [number, number, number, number],
    bidding: s.bidding,
    contract: s.contract,
    trick: s.trick,
    lastTrick: s.tricks.length > 0 ? s.tricks[s.tricks.length - 1]! : null,
    tricksWon,
    announcements: s.announcements,
    revealedDeclarations: s.tricks.length >= 1 ? s.declared : [],
    scores: s.scores,
    hangingPot: s.hangingPot,
    history: s.history,
    lastResult: s.lastResult,
    winner: s.winner,
    legal: {
      cards,
      bids: s.phase === 'bidding' && s.bidding ? legalBids(s.bidding, seat) : null,
      declarations,
      belotCards,
      canCut: s.phase === 'cut' && cutterOf(s) === seat,
      canContinue: s.phase === 'handEnd',
      canNewGame: s.phase === 'gameOver',
    },
  };
}
