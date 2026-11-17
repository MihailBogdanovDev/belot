import { cardStrength, isTrump, suitOf, teamOf } from './cards.js';
import type { Card, Contract, PlayedCard, Seat } from './types.js';

const best = (cards: PlayedCard[], contract: Contract): PlayedCard =>
  cards.reduce((a, b) => (cardStrength(b.card, contract) > cardStrength(a.card, contract) ? b : a));

export function trickWinner(trick: PlayedCard[], contract: Contract): Seat {
  const led = suitOf(trick[0]!.card);
  const trumps = trick.filter((p) => isTrump(p.card, contract));
  if (contract !== 'NT' && contract !== 'AT' && trumps.length > 0) return best(trumps, contract).seat;
  return best(
    trick.filter((p) => suitOf(p.card) === led),
    contract,
  ).seat;
}

export function legalCards(hand: Card[], trick: PlayedCard[], contract: Contract, seat: Seat): Card[] {
  if (trick.length === 0) return hand;
  const led = suitOf(trick[0]!.card);
  const following = hand.filter((c) => suitOf(c) === led);
  if (following.length > 0) {
    if (contract === 'NT' || !isTrump(following[0]!, contract)) return following;
    const top = best(
      trick.filter((p) => suitOf(p.card) === led),
      contract,
    );
    const higher = following.filter((c) => cardStrength(c, contract) > cardStrength(top.card, contract));
    return higher.length > 0 ? higher : following;
  }
  if (contract === 'NT' || contract === 'AT') return hand;
  if (teamOf(trickWinner(trick, contract)) === teamOf(seat)) return hand;
  const trumpsInHand = hand.filter((c) => isTrump(c, contract));
  const trumpsOnTrick = trick.filter((p) => isTrump(p.card, contract));
  if (trumpsOnTrick.length > 0) {
    const top = best(trumpsOnTrick, contract);
    const higher = trumpsInHand.filter((c) => cardStrength(c, contract) > cardStrength(top.card, contract));
    return higher.length > 0 ? higher : hand;
  }
  return trumpsInHand.length > 0 ? trumpsInHand : hand;
}
