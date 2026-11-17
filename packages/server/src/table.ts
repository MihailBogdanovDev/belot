import {
  applyAction,
  chooseBotAction,
  newGame,
  viewFor,
  type GameAction,
  type GameState,
  type Phase,
  type PlayerView,
  type Rng,
  type Seat,
} from '@belot/engine';

export interface PublicSeat {
  name: string;
  connected: boolean;
  bot: boolean;
}
export interface TableMessage {
  seats: (PublicSeat | null)[];
  mySeat: Seat | null;
  view: PlayerView | null;
}

interface Occupant {
  token: string;
  name: string;
  bot?: boolean;
}

const ERRORS: Record<string, string> = {
  'not your turn': 'Не е твой ред',
  'only the cutter may cut': 'Само играчът вляво от раздаващия цепи',
  'not in cut phase': 'Не е време за цепене',
  'not in bidding phase': 'Не е време за наддаване',
  'not in playing phase': 'Не е време за игра',
  'hand is not over': 'Ръката не е приключила',
  'game is not over': 'Играта не е приключила',
  'card not in hand': 'Нямаш тази карта',
  'illegal card': 'Не можеш да играеш тази карта',
};
const DEFAULT_ERROR = 'Невалиден ход';

export class Table {
  private seats: (Occupant | null)[] = [null, null, null, null];
  private game: GameState | null = null;
  /** Number of live sockets per token. */
  private conns = new Map<string, number>();

  constructor(private rng: Rng) {}

  private seatOf(token: string): Seat | null {
    const i = this.seats.findIndex((s) => s?.token === token);
    return i < 0 ? null : (i as Seat);
  }

  private isConnected(token: string): boolean {
    return (this.conns.get(token) ?? 0) > 0;
  }

  private startIfFull(): void {
    if (!this.game && this.seats.every((s) => s !== null)) this.game = newGame(this.rng);
  }

  hello(token: string): Seat | null {
    this.conns.set(token, (this.conns.get(token) ?? 0) + 1);
    return this.seatOf(token);
  }

  disconnect(token: string): void {
    const n = (this.conns.get(token) ?? 0) - 1;
    if (n > 0) this.conns.set(token, n);
    else this.conns.delete(token);
  }

  sit(token: string, seat: Seat, name: string): string | null {
    if (this.seatOf(token) !== null) return 'Вече си седнал';
    const occ = this.seats[seat];
    if (occ) {
      if (!this.game || this.isConnected(occ.token)) return 'Мястото е заето';
      this.seats[seat] = { token, name };
      return null;
    }
    if (this.game) return 'Мястото е заето';
    this.seats[seat] = { token, name };
    this.startIfFull();
    return null;
  }

  leave(token: string): string | null {
    const seat = this.seatOf(token);
    if (seat === null) return 'Не си седнал';
    if (this.game) return 'Играта вече е започнала';
    this.seats[seat] = null;
    return null;
  }

  act(token: string, action: GameAction): string | null {
    const seat = this.seatOf(token);
    if (seat === null) return 'Не си седнал';
    if (!this.game) return 'Играта не е започнала';
    const r = applyAction(this.game, seat, action, this.rng);
    if (!r.ok) return ERRORS[r.error] ?? DEFAULT_ERROR;
    this.game = r.state;
    return null;
  }

  /** True when a continue/newGame would be a stale duplicate (phase already moved on). */
  isStaleAdvance(token: string, type: 'continue' | 'newGame'): boolean {
    if (this.seatOf(token) === null || !this.game) return false;
    return this.game.phase !== (type === 'continue' ? 'handEnd' : 'gameOver');
  }

  addBot(seat: Seat): string | null {
    if (this.game) return 'Играта вече е започнала';
    if (this.seats[seat]) return 'Мястото е заето';
    this.seats[seat] = { token: `bot:${seat}:${Math.floor(this.rng() * 1e9)}`, name: `Бот ${seat + 1}`, bot: true };
    this.startIfFull();
    return null;
  }

  removeBot(seat: Seat): string | null {
    if (this.game) return 'Играта вече е започнала';
    if (!this.seats[seat]?.bot) return 'Там няма бот';
    this.seats[seat] = null;
    return null;
  }

  phase(): Phase | null {
    return this.game?.phase ?? null;
  }

  /** Let one bot that can act take its move. Returns true if a bot moved. */
  stepBots(): boolean {
    if (!this.game) return false;
    for (let i = 0; i < 4; i++) {
      const occ = this.seats[i];
      if (!occ?.bot) continue;
      const action = chooseBotAction(viewFor(this.game, i as Seat), this.rng);
      if (!action) continue;
      const r = applyAction(this.game, i as Seat, action, this.rng);
      if (!r.ok) continue;
      this.game = r.state;
      return true;
    }
    return false;
  }

  /** Continue a finished hand / start a new game on behalf of the table (used when only bots remain). */
  advanceAsAnyone(): string | null {
    if (!this.game) return 'Играта не е започнала';
    const type = this.game.phase === 'handEnd' ? 'continue' : this.game.phase === 'gameOver' ? 'newGame' : null;
    if (!type) return DEFAULT_ERROR;
    const r = applyAction(this.game, 0, { type }, this.rng);
    if (!r.ok) return DEFAULT_ERROR;
    this.game = r.state;
    return null;
  }

  reset(): void {
    this.seats = [null, null, null, null];
    this.game = null;
  }

  isSeated(token: string): boolean {
    return this.seatOf(token) !== null;
  }

  messageFor(token: string): TableMessage {
    const mySeat = this.seatOf(token);
    return {
      seats: this.seats.map((s) =>
        s ? { name: s.name, connected: !!s.bot || this.isConnected(s.token), bot: !!s.bot } : null,
      ),
      mySeat,
      view: this.game && mySeat !== null ? viewFor(this.game, mySeat) : null,
    };
  }
}
