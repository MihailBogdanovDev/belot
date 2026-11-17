import { nextSeat } from './cards.js';
import type { Card, PlayedCard, Rng, Seat } from './types.js';

export function shuffle(deck: Card[], rng: Rng): Card[] {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function cutDeck(deck: Card[], index: number): Card[] {
  if (index < 1 || index > deck.length - 1) throw new Error(`invalid cut index ${index}`);
  return [...deck.slice(index), ...deck.slice(0, index)];
}

export function deal(
  deck: Card[],
  dealer: Seat,
  perPlayer: number,
  hands: Card[][],
): { deck: Card[]; hands: Card[][] } {
  const newHands = hands.map((h) => [...h]);
  let pos = 0;
  let seat = nextSeat(dealer);
  for (let i = 0; i < 4; i++) {
    newHands[seat]!.push(...deck.slice(pos, pos + perPlayer));
    pos += perPlayer;
    seat = nextSeat(seat);
  }
  return { deck: deck.slice(pos), hands: newHands };
}

export function gatherAfterPlay(tricks: PlayedCard[][]): Card[] {
  return tricks.flatMap((t) => t.map((p) => p.card));
}

export function gatherAfterThrowIn(hands: Card[][], dealer: Seat, rest: Card[]): Card[] {
  const out: Card[] = [];
  let seat = nextSeat(dealer);
  for (let i = 0; i < 4; i++) {
    out.push(...hands[seat]!);
    seat = nextSeat(seat);
  }
  return [...out, ...rest];
}
