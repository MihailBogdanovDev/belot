import { cardPoints, teamOf } from './cards.js';
import { resolveDeclarations, type Declaration } from './declarations.js';
import type { Contract, PlayedCard, Seat, Team } from './types.js';

export interface TeamBreakdown {
  cards: number;
  lastTen: number;
  declarations: number;
  belot: number;
  valat: number;
  total: number;
}
export type Outcome = 'made' | 'inside' | 'hanging';
export interface HandResult {
  contract: Contract;
  bidder: Seat;
  multiplier: 1 | 2 | 4;
  breakdown: [TeamBreakdown, TeamBreakdown];
  outcome: Outcome;
  gamePoints: [number, number];
  potAwarded: { team: Team; amount: number } | null;
  hangingPotAfter: number;
  valatTeam: Team | null;
}
export interface ScoreInput {
  contract: Contract;
  bidder: Seat;
  multiplier: 1 | 2 | 4;
  tricks: { cards: PlayedCard[]; winner: Seat }[];
  declared: { seat: Seat; decl: Declaration }[];
  belots: Seat[];
  hangingPot: number;
}

const round = (x: number, t: number): number => Math.floor(x / 10) + (x % 10 >= t ? 1 : 0);

export function roundTeam(contract: Contract, mine: number, theirs: number, isDefenderOnTie: boolean): number {
  if (contract === 'NT') return round(mine, 5);
  const [fewer, more] = contract === 'AT' ? [4, 5] : [6, 7];
  const isMore = mine === theirs ? isDefenderOnTie : mine > theirs;
  return round(mine, isMore ? more : fewer);
}

export function scoreHand(input: ScoreInput): HandResult {
  const { contract, bidder, multiplier, tricks, declared, belots, hangingPot } = input;
  const nt = contract === 'NT';
  const bt = teamOf(bidder);
  const dt = (1 - bt) as Team;

  const empty = (): TeamBreakdown => ({ cards: 0, lastTen: 0, declarations: 0, belot: 0, valat: 0, total: 0 });
  const bd: [TeamBreakdown, TeamBreakdown] = [empty(), empty()];
  const tricksWon: [number, number] = [0, 0];
  tricks.forEach((t, i) => {
    const team = teamOf(t.winner);
    tricksWon[team]++;
    for (const pc of t.cards) bd[team].cards += cardPoints(pc.card, contract);
    if (i === tricks.length - 1) bd[team].lastTen = 10;
  });
  const decls = nt ? [0, 0] : resolveDeclarations(declared).points;
  let valatTeam: Team | null = null;
  for (const t of [0, 1] as Team[]) {
    if (tricksWon[t] === 8) {
      valatTeam = t;
      bd[t].valat = 90;
    }
    if (nt) {
      bd[t].cards *= 2;
      bd[t].lastTen *= 2;
    }
    bd[t].declarations = decls[t]!;
    bd[t].belot = nt ? 0 : 20 * belots.filter((s) => teamOf(s) === t).length;
    bd[t].total = bd[t].cards + bd[t].lastTen + bd[t].declarations + bd[t].belot + bd[t].valat;
  }

  const B = bd[bt].total;
  const D = bd[dt].total;
  const gamePoints: [number, number] = [0, 0];
  let outcome: Outcome;
  let held = 0;

  if (multiplier === 1) {
    if (B > D) {
      outcome = 'made';
      gamePoints[bt] = roundTeam(contract, B, D, false);
      gamePoints[dt] = roundTeam(contract, D, B, true);
    } else if (B < D) {
      outcome = 'inside';
      gamePoints[dt] = round(B + D, 5);
    } else {
      outcome = 'hanging';
      gamePoints[dt] = roundTeam(contract, D, B, true);
      held = roundTeam(contract, B, D, false);
    }
  } else {
    const all = round(B + D, 5) * multiplier;
    if (B > D) {
      outcome = 'made';
      gamePoints[bt] = all;
    } else if (B < D) {
      outcome = 'inside';
      gamePoints[dt] = all;
    } else {
      outcome = 'hanging';
      held = all;
    }
  }

  let potAwarded: HandResult['potAwarded'] = null;
  let hangingPotAfter: number;
  if (outcome === 'hanging') {
    hangingPotAfter = hangingPot + held;
  } else {
    hangingPotAfter = 0;
    if (hangingPot > 0) {
      const team = outcome === 'made' ? bt : dt;
      gamePoints[team] += hangingPot;
      potAwarded = { team, amount: hangingPot };
    }
  }

  return { contract, bidder, multiplier, breakdown: bd, outcome, gamePoints, potAwarded, hangingPotAfter, valatTeam };
}
