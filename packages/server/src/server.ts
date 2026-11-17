import { existsSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import type { GameAction, Rng, Seat } from '@belot/engine';
import { Table } from './table.js';

const cryptoRng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

export async function createServer(port: number): Promise<{ port: number; close(): Promise<void> }> {
  const app = express();
  const distUrl = new URL('../../client/dist/', import.meta.url);
  if (existsSync(distUrl)) {
    const dist = fileURLToPath(distUrl);
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile('index.html', { root: dist }));
  }
  const http = createHttpServer(app);
  const io = new Server(http);
  const table = new Table(cryptoRng);
  const tokens = new Map<string, string>(); // socket.id -> token

  const broadcast = () => {
    for (const [id, s] of io.sockets.sockets) {
      const token = tokens.get(id);
      if (token) s.emit('table', table.messageFor(token));
    }
  };

  io.on('connection', (socket: Socket) => {
    const fail = (message: string) => socket.emit('error', { message });
    const withToken = (fn: (token: string) => string | null | void) => {
      const token = tokens.get(socket.id);
      if (!token) return fail('Първо трябва да се представиш');
      const err = fn(token);
      if (err) return fail(err);
      broadcast();
    };

    const identify = (p: unknown): string | null => {
      const token = p;
      if (typeof token !== 'string' || token.length === 0 || token.length > 100) return 'Невалиден токен';
      const old = tokens.get(socket.id);
      if (old === token) return null;
      if (old) table.disconnect(old);
      tokens.set(socket.id, token);
      table.hello(token);
      return null;
    };

    // Token in the handshake: identified before any buffered emit can arrive.
    const auth: unknown = socket.handshake.auth;
    if (isObj(auth) && typeof auth.token === 'string' && !identify(auth.token)) broadcast();

    socket.on('hello', (p: unknown) => {
      const err = identify(isObj(p) ? p.token : undefined);
      if (err) return fail(err);
      broadcast();
    });

    socket.on('sit', (p: unknown) => {
      withToken((token) => {
        if (!isObj(p)) return 'Невалидна заявка';
        const seat = p.seat;
        if (typeof seat !== 'number' || !Number.isInteger(seat) || seat < 0 || seat > 3) return 'Невалидно място';
        const name = typeof p.name === 'string' ? p.name.trim() : '';
        if (name.length < 1 || name.length > 20) return 'Невалидно име';
        return table.sit(token, seat as Seat, name);
      });
    });

    socket.on('leave', () => withToken((token) => table.leave(token)));
    const advance = (type: 'continue' | 'newGame') => {
      const token = tokens.get(socket.id);
      if (token && table.isStaleAdvance(token, type)) return; // duplicate click from another seat: ignore silently
      withToken((t) => table.act(t, { type }));
    };
    socket.on('action', (p: unknown) => {
      const type = isObj(p) ? p.type : undefined;
      if (type === 'continue' || type === 'newGame') return advance(type);
      withToken((token) => table.act(token, p as GameAction));
    });
    socket.on('continue', () => advance('continue'));
    socket.on('newGame', () => advance('newGame'));
    socket.on('resetTable', () =>
      withToken((token) => {
        if (!table.isSeated(token)) return 'Не си седнал';
        table.reset();
      }),
    );

    socket.on('disconnect', () => {
      const token = tokens.get(socket.id);
      tokens.delete(socket.id);
      if (token) {
        table.disconnect(token);
        broadcast();
      }
    });
  });

  await new Promise<void>((resolve) => http.listen(port, resolve));
  return {
    port: (http.address() as AddressInfo).port,
    close: async () => {
      await io.close(); // closes the http server too
    },
  };
}
