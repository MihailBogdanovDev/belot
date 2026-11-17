import { RANKS, SUITS, cardStrength, naturalIndex, rankOf, suitOf, teamOf } from './cards.js';
import type { Card, Contract, PlayedCard, Rank, Seat } from './types.js';

export type DeclKind = 'tierce' | 'quarte' | 'quint' | 'carre';
export interface Declaration {
  id: string;
  kind: DeclKind;
  cards: Card[];
  points: number;
}

const SEQ_POINTS: Record<number, { kind: DeclKind; points: number }> = {
  3: { kind: 'tierce', points: 20 },
  4: { kind: 'quarte', points: 50 },
  5: { kind: 'quint', points: 100 },
};
const CARRE_POINTS: Partial<Record<Rank, number>> = { '10': 100, Q: 100, K: 100, A: 100, '9': 150, J: 200 };

const sortCards = (cards: Card[]): Card[] =>
  [...cards].sort(
    (a, b) => SUITS.indexOf(suitOf(a)) - SUITS.indexOf(suitOf(b)) || naturalIndex(rankOf(a)) - naturalIndex(rankOf(b)),
  );

function make(kind: DeclKind, cards: Card[], points: number): Declaration {
  const sorted = sortCards(cards);
  return { id: `${kind}:${sorted.join(',')}`, kind, cards: sorted, points };
}

function sequence(cards: Card[]): Declaration {
  const { kind, points } = SEQ_POINTS[cards.length]!;
  return make(kind, cards, points);
}

export function findDeclarations(hand: Card[], contract: Contract): Declaration[] {
  if (contract === 'NT') return [];
  const out: Declaration[] = [];
  for (const suit of SUITS) {
    const have = new Set(hand.filter((c) => suitOf(c) === suit).map(rankOf));
    let run: Card[] = [];
    const flush = () => {
      if (run.length >= 3) {
        if (run.length === 8) {
          out.push(sequence(run.slice(3)), sequence(run.slice(0, 3)));
        } else {
          out.push(sequence(run.slice(-Math.min(run.length, 5))));
        }
      }
      run = [];
    };
    for (const r of RANKS) {
      if (have.has(r)) run.push(`${r}${suit}` as Card);
      else flush();
    }
    flush();
  }
  for (const r of RANKS) {
    const pts = CARRE_POINTS[r];
    if (pts === undefined) continue;
    const cards = SUITS.map((s) => `${r}${s}` as Card);
    if (cards.every((c) => hand.includes(c))) out.push(make('carre', cards, pts));
  }
  return out;
}

export function isDisjoint(decls: Declaration[]): boolean {
  const seen = new Set<Card>();
  for (const d of decls) {
    for (const c of d.cards) {
      if (seen.has(c)) return false;
      seen.add(c);
    }
  }
  return true;
}

type Declared = { seat: Seat; decl: Declaration };

const seqKey = (d: Declaration): [number, number] => [
  d.cards.length,
  Math.max(...d.cards.map((c) => naturalIndex(rankOf(c)))),
];
const cmpKey = (a: [number, number], b: [number, number]): number => a[0] - b[0] || a[1] - b[1];

export function resolveDeclarations(declared: Declared[]): { points: [number, number]; valid: Declared[] } {
  const points: [number, number] = [0, 0];
  const valid: Declared[] = [];

  const seqs = declared.filter((d) => d.decl.kind !== 'carre');
  const best: ([number, number] | null)[] = [null, null];
  for (const d of seqs) {
    const t = teamOf(d.seat);
    const k = seqKey(d.decl);
    if (best[t] === null || cmpKey(k, best[t]!) > 0) best[t] = k;
  }
  let seqWinner: 0 | 1 | null = null;
  if (best[0] && !best[1]) seqWinner = 0;
  else if (best[1] && !best[0]) seqWinner = 1;
  else if (best[0] && best[1]) {
    const c = cmpKey(best[0], best[1]);
    seqWinner = c > 0 ? 0 : c < 0 ? 1 : null;
  }
  if (seqWinner !== null) {
    for (const d of seqs) {
      if (teamOf(d.seat) === seqWinner) {
        points[seqWinner] += d.decl.points;
        valid.push(d);
      }
    }
  }

  const carres = declared.filter((d) => d.decl.kind === 'carre');
  const strength = (d: Declaration): number => cardStrength(d.cards[0]!, 'AT');
  let top: Declared | null = null;
  for (const d of carres) if (top === null || strength(d.decl) > strength(top.decl)) top = d;
  if (top) {
    const winner = teamOf(top.seat);
    for (const d of carres) {
      if (teamOf(d.seat) === winner) {
        points[winner] += d.decl.points;
        valid.push(d);
      }
    }
  }
  return { points, valid };
}

export function canDeclareBelot(hand: Card[], card: Card, trick: PlayedCard[], contract: Contract): boolean {
  if (contract === 'NT') return false;
  const rank = rankOf(card);
  if (rank !== 'K' && rank !== 'Q') return false;
  const suit = suitOf(card);
  if (contract !== 'AT' && suit !== contract) return false;
  const partner = `${rank === 'K' ? 'Q' : 'K'}${suit}` as Card;
  if (!hand.includes(partner)) return false;
  if (trick.length === 0) return true;
  if (suitOf(trick[0]!.card) === suit) return true;
  return contract !== 'AT' && suit === contract;
}
