import { CONTRACT_ORDER, fullDeck, nextSeat } from './cards.js';
import { applyBid, biddingOutcome, startBidding, type BidAction, type BiddingState } from './bidding.js';
import { canDeclareBelot, findDeclarations, isDisjoint, type DeclKind, type Declaration } from './declarations.js';
import { cutDeck, deal, gatherAfterPlay, gatherAfterThrowIn, shuffle } from './deck.js';
import { legalCards, trickWinner } from './play.js';
import { scoreHand, type HandResult } from './scoring.js';
import type { Card, Contract, PlayedCard, Rng, Seat, Team } from './types.js';

export type Phase = 'cut' | 'bidding' | 'playing' | 'handEnd' | 'gameOver';
export type GameAction =
  | { type: 'cut'; index: number }
  | BidAction
  | { type: 'play'; card: Card; declarations?: string[]; belot?: boolean }
  | { type: 'continue' }
  | { type: 'newGame' };

export interface Announcement {
  seat: Seat;
  kind: DeclKind | 'belot';
  trick: number;
}

export interface GameState {
  phase: Phase;
  dealer: Seat;
  turn: Seat;
  deck: Card[];
  hands: Card[][];
  bidding: BiddingState | null;
  contract: { contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4 } | null;
  trick: PlayedCard[];
  tricks: { cards: PlayedCard[]; winner: Seat }[];
  declared: { seat: Seat; decl: Declaration }[];
  belots: Seat[];
  announcements: Announcement[];
  scores: [number, number];
  hangingPot: number;
  history: HandResult[];
  lastResult: HandResult | null;
  winner: Team | null;
}

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };

export function newGame(rng: Rng): GameState {
  const dealer = Math.floor(rng() * 4) as Seat;
  return {
    phase: 'cut',
    dealer,
    turn: ((dealer + 3) % 4) as Seat,
    deck: shuffle(fullDeck(), rng),
    hands: [[], [], [], []],
    bidding: null,
    contract: null,
    trick: [],
    tricks: [],
    declared: [],
    belots: [],
    announcements: [],
    scores: [0, 0],
    hangingPot: 0,
    history: [],
    lastResult: null,
    winner: null,
  };
}

export function cutterOf(s: GameState): Seat {
  return ((s.dealer + 3) % 4) as Seat;
}

const err = (error: string): ActionResult => ({ ok: false, error });
const ok = (state: GameState): ActionResult => ({ ok: true, state });

function validShape(a: unknown): a is GameAction {
  if (typeof a !== 'object' || a === null) return false;
  const x = a as Record<string, unknown>;
  switch (x.type) {
    case 'cut':
      return typeof x.index === 'number' && Number.isInteger(x.index) && x.index >= 1 && x.index <= 31;
    case 'bid':
      return typeof x.contract === 'string' && (CONTRACT_ORDER as string[]).includes(x.contract);
    case 'pass':
    case 'contra':
    case 'recontra':
    case 'continue':
    case 'newGame':
      return true;
    case 'play':
      return (
        typeof x.card === 'string' &&
        (x.declarations === undefined ||
          (Array.isArray(x.declarations) && x.declarations.every((d) => typeof d === 'string'))) &&
        (x.belot === undefined || typeof x.belot === 'boolean')
      );
    default:
      return false;
  }
}

export function applyAction(s: GameState, seat: Seat, a: GameAction, rng: Rng): ActionResult {
  if (!validShape(a)) return err('malformed action');
  if (![0, 1, 2, 3].includes(seat)) return err('invalid seat');
  const st = structuredClone(s);
  switch (a.type) {
    case 'cut':
      return doCut(st, seat, a.index);
    case 'bid':
    case 'pass':
    case 'contra':
    case 'recontra':
      return doBid(st, seat, a);
    case 'play':
      return doPlay(st, seat, a);
    case 'continue':
      return doContinue(st);
    case 'newGame':
      if (st.phase !== 'gameOver') return err('game is not over');
      return ok(newGame(rng));
  }
}

function doCut(s: GameState, seat: Seat, index: number): ActionResult {
  if (s.phase !== 'cut') return err('not in cut phase');
  if (seat !== cutterOf(s)) return err('only the cutter may cut');
  const cut = cutDeck(s.deck, index);
  const first = deal(cut, s.dealer, 3, s.hands);
  const dealt = deal(first.deck, s.dealer, 2, first.hands);
  s.deck = dealt.deck;
  s.hands = dealt.hands;
  s.phase = 'bidding';
  s.bidding = startBidding(s.dealer);
  s.turn = s.bidding.turn;
  return ok(s);
}

function doBid(s: GameState, seat: Seat, a: BidAction): ActionResult {
  if (s.phase !== 'bidding' || !s.bidding) return err('not in bidding phase');
  const r = applyBid(s.bidding, seat, a);
  if ('error' in r) return err(r.error);
  s.bidding = r;
  s.turn = r.turn;
  const out = biddingOutcome(r);
  if (out.kind === 'allPass') {
    s.deck = gatherAfterThrowIn(s.hands, s.dealer, s.deck);
    s.hands = [[], [], [], []];
    s.dealer = nextSeat(s.dealer);
    s.bidding = null;
    s.phase = 'cut';
    s.turn = cutterOf(s);
  } else if (out.kind === 'contract') {
    const d = deal(s.deck, s.dealer, 3, s.hands);
    s.deck = d.deck;
    s.hands = d.hands;
    s.contract = { contract: out.contract, bidder: out.bidder, multiplier: out.multiplier };
    s.phase = 'playing';
    s.turn = nextSeat(s.dealer);
  }
  return ok(s);
}

function doPlay(s: GameState, seat: Seat, a: Extract<GameAction, { type: 'play' }>): ActionResult {
  if (s.phase !== 'playing' || !s.contract) return err('not in playing phase');
  if (seat !== s.turn) return err('not your turn');
  const { contract } = s.contract;
  const hand = s.hands[seat]!;
  if (!hand.includes(a.card)) return err('card not in hand');
  if (!legalCards(hand, s.trick, contract, seat).includes(a.card)) return err('illegal card');

  if (a.declarations && a.declarations.length > 0) {
    if (s.tricks.length !== 0) return err('declarations only with the first card');
    const available = findDeclarations(hand, contract);
    const chosen: Declaration[] = [];
    for (const id of a.declarations) {
      const d = available.find((x) => x.id === id);
      if (!d) return err(`declaration not available: ${id}`);
      chosen.push(d);
    }
    if (!isDisjoint(chosen)) return err('declarations overlap');
    for (const decl of chosen) {
      s.declared.push({ seat, decl });
      s.announcements.push({ seat, kind: decl.kind, trick: s.tricks.length });
    }
  }
  if (a.belot) {
    if (!canDeclareBelot(hand, a.card, s.trick, contract)) return err('belot not allowed with this card');
    s.belots.push(seat);
    s.announcements.push({ seat, kind: 'belot', trick: s.tricks.length });
  }

  s.hands[seat] = hand.filter((c) => c !== a.card);
  s.trick.push({ seat, card: a.card });
  if (s.trick.length < 4) {
    s.turn = nextSeat(seat);
    return ok(s);
  }
  const winner = trickWinner(s.trick, contract);
  s.tricks.push({ cards: s.trick, winner });
  s.trick = [];
  s.turn = winner;
  if (s.tricks.length < 8) return ok(s);

  const result = scoreHand({
    contract,
    bidder: s.contract.bidder,
    multiplier: s.contract.multiplier,
    tricks: s.tricks,
    declared: s.declared,
    belots: s.belots,
    hangingPot: s.hangingPot,
  });
  s.scores = [s.scores[0] + result.gamePoints[0], s.scores[1] + result.gamePoints[1]];
  s.hangingPot = result.hangingPotAfter;
  s.history.push(result);
  s.lastResult = result;
  s.phase = 'handEnd';
  if (result.valatTeam === null && Math.max(s.scores[0], s.scores[1]) >= 151 && s.scores[0] !== s.scores[1]) {
    s.winner = (s.scores[0] > s.scores[1] ? 0 : 1) as Team;
    s.hangingPot = 0;
    s.phase = 'gameOver';
  }
  return ok(s);
}

function doContinue(s: GameState): ActionResult {
  if (s.phase !== 'handEnd') return err('hand is not over');
  s.deck = gatherAfterPlay(s.tricks.map((t) => t.cards));
  s.hands = [[], [], [], []];
  s.bidding = null;
  s.contract = null;
  s.trick = [];
  s.tricks = [];
  s.declared = [];
  s.belots = [];
  s.announcements = [];
  s.dealer = nextSeat(s.dealer);
  s.phase = 'cut';
  s.turn = cutterOf(s);
  return ok(s);
}
