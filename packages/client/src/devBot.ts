import { useEffect, useRef } from 'react';
import type { GameAction, PlayerView } from '@belot/engine';

/** Dev-only: with ?bot=1 this tab auto-plays a random legal action 400 ms after it can act. Renders nothing. */
export const BOT_ENABLED = new URLSearchParams(location.search).get('bot') === '1';

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

export function chooseAction(v: PlayerView): GameAction | null {
  const l = v.legal;
  if (v.phase === 'cut') return l.canCut ? { type: 'cut', index: 1 + Math.floor(Math.random() * 31) } : null;
  if (v.phase === 'bidding') {
    const b = l.bids;
    if (!b || v.turn !== v.seat) return null;
    const options: GameAction[] = b.contracts.map((contract) => ({ type: 'bid', contract }));
    if (b.contra) options.push({ type: 'contra' });
    if (b.recontra) options.push({ type: 'recontra' });
    if (b.pass && (options.length === 0 || Math.random() < 0.7)) return { type: 'pass' };
    return options.length ? pick(options) : null;
  }
  if (v.phase === 'playing') {
    return v.turn === v.seat && l.cards.length ? { type: 'play', card: pick(l.cards) } : null;
  }
  if (v.phase === 'handEnd') return l.canContinue && v.seat === v.dealer ? { type: 'continue' } : null;
  if (v.phase === 'gameOver') return l.canNewGame && v.seat === 0 ? { type: 'newGame' } : null;
  return null;
}

export function DevBot({ view, act }: { view: PlayerView; act(a: GameAction): void }) {
  const latest = useRef({ view, act });
  latest.current = { view, act };
  const key = [view.phase, view.turn, view.cutter, view.hand.length, view.trick.length, view.history.length].join('|');
  useEffect(() => {
    if (!chooseAction(latest.current.view)) return;
    const t = setTimeout(() => {
      const a = chooseAction(latest.current.view);
      if (a) latest.current.act(a);
    }, 400);
    return () => clearTimeout(t);
  }, [key]);
  return null;
}
