import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameAction, PlayerView, Seat } from '@belot/engine';
import { generateToken } from './token.js';

// Mirrors packages/server/src/table.ts (kept local so server code never enters the browser bundle).
export interface PublicSeat {
  name: string;
  connected: boolean;
}
export interface TableMessage {
  seats: (PublicSeat | null)[];
  mySeat: Seat | null;
  view: PlayerView | null;
}

export interface TableApi {
  msg: TableMessage | null;
  connected: boolean;
  error: string | null;
  sit(seat: Seat, name: string): void;
  leave(): void;
  act(a: GameAction): void;
  resetTable(): void;
}

function getToken(): string {
  const slot = new URLSearchParams(location.search).get('slot');
  const key = slot ? `belot-token-slot-${slot}` : 'belot-token';
  try {
    let t = localStorage.getItem(key);
    if (!t) {
      t = generateToken();
      localStorage.setItem(key, t);
    }
    return t;
  } catch {
    return generateToken();
  }
}

export function useTable(): TableApi {
  const [msg, setMsg] = useState<TableMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const token = getToken();
    const socket = io({ auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('hello', { token });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('table', (m: TableMessage) => {
      clearTimeout(errTimer.current);
      setError(null);
      setMsg(m);
    });
    socket.on('error', (e: { message: string }) => {
      setError(e.message);
      clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setError(null), 4000);
    });
    return () => {
      clearTimeout(errTimer.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sit = useCallback((seat: Seat, name: string) => socketRef.current?.emit('sit', { seat, name }), []);
  const leave = useCallback(() => socketRef.current?.emit('leave'), []);
  const act = useCallback((a: GameAction) => {
    const s = socketRef.current;
    if (!s) return;
    if (a.type === 'continue') s.emit('continue');
    else if (a.type === 'newGame') s.emit('newGame');
    else s.emit('action', a);
  }, []);
  const resetTable = useCallback(() => socketRef.current?.emit('resetTable'), []);

  return { msg, connected, error, sit, leave, act, resetTable };
}
