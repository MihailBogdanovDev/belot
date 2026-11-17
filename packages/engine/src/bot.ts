import type { GameAction } from './game.js';
import type { Rng } from './types.js';
import type { PlayerView } from './view.js';

const pick = <T>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]!;

/**
 * A simple random-but-legal player. Returns the action this seat should take now, or null
 * when it has nothing to do. Never continues a finished hand or starts a new game: humans do that.
 */
export function chooseBotAction(v: PlayerView, rng: Rng): GameAction | null {
  const l = v.legal;
  if (v.phase === 'cut') return l.canCut ? { type: 'cut', index: 1 + Math.floor(rng() * 31) } : null;
  if (v.phase === 'bidding') {
    const b = l.bids;
    if (!b || v.turn !== v.seat) return null;
    const options: GameAction[] = b.contracts.map((contract) => ({ type: 'bid', contract }));
    if (b.contra) options.push({ type: 'contra' });
    if (b.recontra) options.push({ type: 'recontra' });
    if (b.pass && (options.length === 0 || rng() < 0.7)) return { type: 'pass' };
    return options.length ? pick(options, rng) : null;
  }
  if (v.phase === 'playing' && v.turn === v.seat && l.cards.length) {
    const card = pick(l.cards, rng);
    return {
      type: 'play',
      card,
      declarations: l.declarations.length ? l.declarations.map((d) => d.id).slice(0, 1) : undefined,
      belot: l.belotCards.includes(card) || undefined,
    };
  }
  return null;
}
