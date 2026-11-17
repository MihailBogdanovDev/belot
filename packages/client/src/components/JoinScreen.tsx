import { useState } from 'react';
import type { Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { relativePosition } from '../layout.js';
import type { TableMessage } from '../net.js';

const NAME_KEY = 'belot-name';

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

interface Props {
  msg: TableMessage | null;
  connected: boolean;
  sit(seat: Seat, name: string): void;
  leave(): void;
}

export function JoinScreen({ msg, connected, sit, leave }: Props) {
  const [name, setName] = useState(loadName);
  const trimmed = name.trim();
  const seats = msg?.seats ?? [null, null, null, null];
  const mySeat = msg?.mySeat ?? null;
  // Seats are laid out relative to my seat, or from seat 0 when not seated.
  const ref: Seat = mySeat ?? 0;
  const gameStarted = !!msg && mySeat === null && seats.every((s) => s !== null);
  const anyAvailable = seats.some((s) => s === null || !s.connected);

  const changeName = (v: string) => {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const onSeat = (i: Seat) => {
    const occ = seats[i];
    if (occ && !confirm(bg.takeSeat(occ.name))) return;
    sit(i, trimmed);
  };

  return (
    <div className="card join">
      <h1>Белот</h1>
      <input
        className="name-input"
        value={name}
        maxLength={20}
        placeholder={bg.namePlaceholder}
        onChange={(e) => changeName(e.target.value)}
      />
      {!connected && <div className="muted">…</div>}
      <div className="join-table">
        {([0, 1, 2, 3] as Seat[]).map((i) => {
          const s = seats[i] ?? null;
          const canSit = mySeat === null && trimmed.length > 0 && (s === null || (gameStarted && !s.connected));
          return (
            <div key={i} className={`join-seat pos-${relativePosition(ref, i)} ${s ? 'taken' : ''}`}>
              {s ? (
                <>
                  <div className="seat-name">
                    <span className={`dot ${s.connected ? 'on' : 'off'}`} />
                    {s.name}
                  </div>
                  {i === mySeat && !gameStarted && <button onClick={leave}>{bg.leave}</button>}
                  {i !== mySeat && mySeat === null && gameStarted && !s.connected && (
                    <button disabled={!canSit} onClick={() => onSeat(i)}>
                      {bg.sitHere}
                    </button>
                  )}
                </>
              ) : (
                mySeat === null && (
                  <button disabled={!canSit} onClick={() => onSeat(i)}>
                    {bg.sitHere}
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
      {msg && mySeat === null && !anyAvailable && <div className="muted">{bg.tableFull}</div>}
    </div>
  );
}
