import { describe, expect, it } from 'vitest';
import { Table } from '../src/table.js';

let seed = 7;
const rng = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe('Table bots', () => {
  it('adds bots to empty seats; a full table starts the game', () => {
    const t = new Table(rng);
    t.hello('h');
    expect(t.sit('h', 0, 'Human')).toBeNull();
    for (const s of [1, 2, 3] as const) expect(t.addBot(s)).toBeNull();
    const m = t.messageFor('h');
    expect(m.seats.map((s) => s?.bot)).toEqual([false, true, true, true]);
    expect(m.seats.every((s) => s?.connected)).toBe(true);
    expect(m.view?.phase).toBe('cut');
  });

  it('cannot add a bot to a taken seat or after the game starts', () => {
    const t = new Table(rng);
    t.hello('h');
    t.sit('h', 0, 'Human');
    expect(t.addBot(0)).toBe('Мястото е заето');
    for (const s of [1, 2, 3] as const) t.addBot(s);
    t.removeBot(1);
    expect(t.addBot(1)).not.toBeNull();
  });

  it('removes bots only before the game, only bot seats', () => {
    const t = new Table(rng);
    t.hello('h');
    t.sit('h', 0, 'Human');
    t.addBot(1);
    expect(t.removeBot(0)).not.toBeNull();
    expect(t.removeBot(1)).toBeNull();
    expect(t.messageFor('h').seats[1]).toBeNull();
  });

  it('bots play until a human must act; a full bot game reaches the end', () => {
    const t = new Table(rng);
    for (const s of [0, 1, 2, 3] as const) t.addBot(s);
    let steps = 0;
    for (;;) {
      const moved = t.stepBots();
      if (moved) { steps++; if (steps > 20000) throw new Error('runaway'); continue; }
      // Bots never continue/newGame; play the human role here.
      const phase = t.phase();
      if (phase === 'gameOver') break;
      expect(phase).toBe('handEnd');
      expect(t.advanceAsAnyone()).toBeNull();
    }
    expect(steps).toBeGreaterThan(30);
  });
});
