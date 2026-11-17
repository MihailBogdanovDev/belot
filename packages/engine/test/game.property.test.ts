import { describe, expect, it } from 'vitest';
import { applyAction, cutterOf, newGame, type GameAction, type GameState } from '../src/game.js';
import { viewFor } from '../src/view.js';
import { isDisjoint } from '../src/declarations.js';
import type { Rng, Seat } from '../src/types.js';

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]!;

function checkCards(s: GameState): void {
  const all = [
    ...s.deck,
    ...s.hands.flat(),
    ...s.trick.map((p) => p.card),
    ...s.tricks.flatMap((t) => t.cards.map((p) => p.card)),
  ];
  expect(all).toHaveLength(32);
  expect(new Set(all).size).toBe(32);
}

function chooseAction(s: GameState, rng: Rng): { seat: Seat; action: GameAction } {
  switch (s.phase) {
    case 'cut':
      return { seat: cutterOf(s), action: { type: 'cut', index: 1 + Math.floor(rng() * 31) } };
    case 'bidding': {
      const b = viewFor(s, s.turn).legal.bids!;
      const opts: GameAction[] = [
        ...b.contracts.map((contract) => ({ type: 'bid', contract }) as GameAction),
        ...(b.pass ? [{ type: 'pass' } as GameAction, { type: 'pass' } as GameAction] : []),
        ...(b.contra ? [{ type: 'contra' } as GameAction] : []),
        ...(b.recontra ? [{ type: 'recontra' } as GameAction] : []),
      ];
      return { seat: s.turn, action: pick(opts, rng) };
    }
    case 'playing': {
      const v = viewFor(s, s.turn);
      const card = pick(v.legal.cards, rng);
      const action: Extract<GameAction, { type: 'play' }> = { type: 'play', card };
      const chosen = v.legal.declarations.filter(() => rng() < 0.5);
      if (chosen.length > 0 && isDisjoint(chosen)) action.declarations = chosen.map((d) => d.id);
      if (v.legal.belotCards.includes(card) && rng() < 0.5) action.belot = true;
      return { seat: s.turn, action };
    }
    case 'handEnd':
      return { seat: 0, action: { type: 'continue' } };
    default:
      throw new Error('unreachable');
  }
}

describe('game property', () => {
  it('random legal play always reaches gameOver with consistent cards and points', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(seed);
      let s = newGame(rng);
      let n = 0;
      while (s.phase !== 'gameOver' && n++ < 5000) {
        const { seat, action } = chooseAction(s, rng);
        const r = applyAction(s, seat, action, rng);
        if (!r.ok) throw new Error(`seed ${seed}: ${r.error} on ${JSON.stringify(action)}`);
        s = r.state;
        checkCards(s);
        if (s.phase === 'handEnd' || s.phase === 'gameOver') {
          const res = s.lastResult!;
          const sum = res.breakdown.reduce((a, t) => a + t.cards + t.lastTen, 0);
          expect(sum).toBe(res.contract === 'NT' ? 260 : res.contract === 'AT' ? 258 : 162);
        }
      }
      expect(s.phase, `seed ${seed}`).toBe('gameOver');
    }
  });
});
