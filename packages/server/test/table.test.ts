import { describe, expect, it } from 'vitest';
import { Table } from '../src/table.js';

const rng = () => 0.37;

function full(): Table {
  const t = new Table(rng);
  for (let i = 0; i < 4; i++) {
    t.hello(`t${i}`);
    expect(t.sit(`t${i}`, i as 0 | 1 | 2 | 3, `P${i}`)).toBeNull();
  }
  return t;
}

describe('Table', () => {
  it('fourth seat starts game', () => {
    const t = new Table(rng);
    for (let i = 0; i < 3; i++) {
      t.hello(`t${i}`);
      t.sit(`t${i}`, i as 0 | 1 | 2, `P${i}`);
      expect(t.messageFor(`t${i}`).view).toBeNull();
    }
    t.hello('t3');
    t.sit('t3', 3, 'P3');
    expect(t.messageFor('t3').view?.phase).toBe('cut');
  });

  it('cannot sit in a connected seat', () => {
    const t = new Table(rng);
    t.hello('a');
    t.hello('b');
    expect(t.sit('a', 0, 'A')).toBeNull();
    expect(t.sit('b', 0, 'B')).toBe('Мястото е заето');
    expect(t.sit('a', 1, 'A')).not.toBeNull();
  });

  it('leave only before game', () => {
    const t = new Table(rng);
    t.hello('a');
    t.sit('a', 0, 'A');
    t.leave('a');
    expect(t.messageFor('a').mySeat).toBeNull();
    expect(t.messageFor('a').seats[0]).toBeNull();
    const f = full();
    expect(f.leave('t0')).not.toBeNull();
    expect(f.messageFor('t0').mySeat).toBe(0);
  });

  it('disconnected seat can be taken over and old token loses access', () => {
    const t = full();
    t.disconnect('t2');
    expect(t.messageFor('t0').seats[2]?.connected).toBe(false);
    t.hello('new');
    expect(t.sit('new', 1, 'X')).toBe('Мястото е заето');
    expect(t.sit('new', 2, 'Nova')).toBeNull();
    expect(t.messageFor('new').mySeat).toBe(2);
    expect(t.messageFor('new').seats[2]).toEqual({ name: 'Nova', connected: true, bot: false });
    expect(t.hello('t2')).toBeNull();
    expect(t.messageFor('t2').mySeat).toBeNull();
    expect(t.messageFor('t2').view?.hand ?? []).toEqual([]);
    expect(t.act('t2', { type: 'pass' })).not.toBeNull();
  });

  it('reconnect restores seat and view', () => {
    const t = full();
    const before = t.messageFor('t1').view!.hand;
    t.disconnect('t1');
    expect(t.hello('t1')).toBe(1);
    expect(t.messageFor('t1').view!.hand).toEqual(before);
    expect(t.messageFor('t0').seats[1]?.connected).toBe(true);
  });

  it('messageFor hides other hands', () => {
    const t = full();
    const m = t.messageFor('t0');
    expect(JSON.stringify(m)).not.toContain('"hands"');
    expect(m.view!.seat).toBe(0);
    const t1 = t.messageFor('t1').view!;
    expect(t1.seat).toBe(1);
  });

  it('reset clears seats and game', () => {
    const t = full();
    t.reset();
    const m = t.messageFor('t0');
    expect(m.seats).toEqual([null, null, null, null]);
    expect(m.mySeat).toBeNull();
    expect(m.view).toBeNull();
  });

  it('rejects invalid action and reports Bulgarian error', () => {
    const t = full();
    expect(t.act('t0', { type: 'pass' })).toBe('Не е време за наддаване');
    expect(t.act('t0', { type: 'bogus' } as never)).toBe('Невалиден ход');
    expect(t.act('nobody', { type: 'pass' })).toBe('Не си седнал');
  });
});
