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

    socket.on('hello', (p: unknown) => {
      const token = isObj(p) ? p.token : undefined;
      if (typeof token !== 'string' || token.length === 0 || token.length > 100) return fail('Невалиден токен');
      const old = tokens.get(socket.id);
      if (old === token) return broadcast();
      if (old) table.disconnect(old);
      tokens.set(socket.id, token);
      table.hello(token);
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
    socket.on('action', (p: unknown) => withToken((token) => table.act(token, p as GameAction)));
    socket.on('continue', () => withToken((token) => table.act(token, { type: 'continue' })));
    socket.on('newGame', () => withToken((token) => table.act(token, { type: 'newGame' })));
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
