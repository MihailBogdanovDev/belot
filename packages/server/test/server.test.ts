import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { GameAction, PlayerView } from '@belot/engine';
import { createServer } from '../src/server.js';
import type { TableMessage } from '../src/table.js';

let closers: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const c of closers.reverse()) await c();
  closers = [];
});

interface Client {
  s: Socket;
  last: TableMessage | null;
  token: string;
}

async function boot() {
  const srv = await createServer(0);
  closers.push(() => srv.close());
  return srv;
}

function connect(port: number, token: string, onMsg?: (c: Client, m: TableMessage) => void): Client {
  const s = io(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  const c: Client = { s, last: null, token };
  s.on('connect', () => s.emit('hello', { token }));
  s.on('table', (m: TableMessage) => {
    c.last = m;
    onMsg?.(c, m);
  });
  closers.push(() => {
    s.close();
  });
  return c;
}

const until = async (cond: () => boolean, ms = 5000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
};

function pick(v: PlayerView): GameAction | null {
  const l = v.legal;
  const r = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
  if (l.canCut) return { type: 'cut', index: 1 + Math.floor(Math.random() * 31) };
  if (l.bids) {
    const opts: GameAction[] = [];
    if (l.bids.pass) opts.push({ type: 'pass' });
    if (l.bids.contra) opts.push({ type: 'contra' });
    if (l.bids.recontra) opts.push({ type: 'recontra' });
    for (const c of l.bids.contracts) opts.push({ type: 'bid', contract: c });
    if (opts.length) return r(opts);
  }
  if (l.cards.length) {
    const card = r(l.cards);
    const decls = l.declarations.length && Math.random() < 0.5 ? [l.declarations[0]!.id] : undefined;
    return { type: 'play', card, ...(decls ? { declarations: decls } : {}) };
  }
  if (l.canContinue && v.seat === 0) return { type: 'continue' };
  return null;
}

describe('server', () => {
  it('plays a full game via random legal moves', async () => {
    const srv = await boot();
    let over = false;
    const clients = [0, 1, 2, 3].map((i) =>
      connect(srv.port, `t${i}`, (c, m) => {
        if (!m.view) return;
        if (m.view.phase === 'gameOver') {
          over = true;
          return;
        }
        const a = pick(m.view);
        if (a) c.s.emit('action', a);
      }),
    );
    await until(() => clients.every((c) => c.s.connected));
    clients.forEach((c, i) => c.s.emit('sit', { seat: i, name: `P${i}` }));
    await until(() => over && clients.every((c) => c.last?.view?.phase === 'gameOver'), 30000);
  }, 40000);

  it('restores seat and hand after reconnect', async () => {
    const srv = await boot();
    const clients = [0, 1, 2, 3].map((i) => connect(srv.port, `t${i}`));
    await until(() => clients.every((c) => c.s.connected));
    clients.forEach((c, i) => c.s.emit('sit', { seat: i, name: `P${i}` }));
    await until(() => clients.every((c) => c.last?.view));
    // deal a bit: cutter cuts so hands exist
    const cutter = clients.find((c) => c.last!.view!.legal.canCut)!;
    cutter.s.emit('action', { type: 'cut', index: 5 });
    await until(() => clients.every((c) => c.last!.view!.hand.length === 5));
    const old = clients[2]!;
    old.s.close();
    await until(() => clients[0]!.last!.seats[2]?.connected === false);
    const again = connect(srv.port, 't2');
    await until(() => again.last?.mySeat === 2);
    expect(again.last!.view!.hand.length).toBeGreaterThan(0);
    expect(again.last!.view!.hand).toEqual(old.last!.view!.hand);
    await until(() => clients[0]!.last!.seats[2]?.connected === true);
  });

  it('rejects bad payloads and events before hello', async () => {
    const srv = await boot();
    const s = io(`http://localhost:${srv.port}`, { transports: ['websocket'], forceNew: true });
    closers.push(() => {
      s.close();
    });
    const errs: string[] = [];
    s.on('error', (e: { message: string }) => errs.push(e.message));
    await until(() => s.connected);
    s.emit('sit', { seat: 0, name: 'A' });
    await until(() => errs.length === 1);
    s.emit('hello', { token: '' });
    await until(() => errs.length === 2);
    s.emit('hello', { token: 'ok' });
    s.emit('sit', { seat: 7, name: 'A' });
    s.emit('sit', { seat: 0, name: '   ' });
    await until(() => errs.length === 4);
  });

  it('restores the seat from handshake auth without hello', async () => {
    const srv = await boot();
    const a = connect(srv.port, 'a');
    await until(() => a.s.connected);
    a.s.emit('sit', { seat: 1, name: 'A' });
    await until(() => a.last?.mySeat === 1);
    a.s.close();
    const s = io(`http://localhost:${srv.port}`, { transports: ['websocket'], forceNew: true, auth: { token: 'a' } });
    closers.push(() => {
      s.close();
    });
    let msg: TableMessage | null = null;
    s.on('table', (m: TableMessage) => (msg = m));
    await until(() => (msg as TableMessage | null)?.mySeat === 1);
  });

  it('ignores a second continue once the hand already advanced', async () => {
    const srv = await boot();
    const clients = [0, 1, 2, 3].map((i) => connect(srv.port, `t${i}`));
    const errs: string[] = [];
    clients.forEach((c) => c.s.on('error', (e: { message: string }) => errs.push(e.message)));
    await until(() => clients.every((c) => c.s.connected));
    clients.forEach((c, i) => c.s.emit('sit', { seat: i, name: `P${i}` }));
    await until(() => clients.every((c) => c.last?.view));
    // drive until handEnd
    const drive = (c: Client) => {
      const v = c.last!.view!;
      const a = pick(v);
      if (a && !(a.type === 'continue')) c.s.emit('action', a);
    };
    const t0 = Date.now();
    while (!clients.every((c) => c.last?.view?.phase === 'handEnd')) {
      if (Date.now() - t0 > 20000) throw new Error('no handEnd');
      const before = clients[0]!.last;
      clients.forEach((c) => c.last?.view && c.last.view.phase !== 'handEnd' && drive(c));
      await new Promise((r) => setTimeout(r, 20));
      void before;
    }
    errs.length = 0;
    const n = clients[0]!.last!.view!.history.length;
    clients[0]!.s.emit('continue');
    clients[1]!.s.emit('continue');
    await until(() => clients.every((c) => c.last!.view!.phase !== 'handEnd'));
    await new Promise((r) => setTimeout(r, 150));
    expect(errs).toEqual([]);
    expect(clients[0]!.last!.view!.history.length).toBe(n);
    expect(clients[0]!.last!.view!.phase).toBe('cut');
  }, 30000);
});
