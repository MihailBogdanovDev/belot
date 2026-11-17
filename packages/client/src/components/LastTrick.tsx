import { useState } from 'react';
import type { PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { Card } from './Card.js';

export function LastTrick({ view, name }: { view: PlayerView; name(s: Seat): string }) {
  const [open, setOpen] = useState(false);
  const lt = view.lastTrick;
  if (!lt || view.phase !== 'playing') return null;
  return (
    <div className="last-trick">
      <button className="lt-btn" onClick={() => setOpen((o) => !o)}>
        {bg.lastTrick}
      </button>
      {open && (
        <div className="panel lt-pop">
          {lt.cards.map((pc) => (
            <div key={pc.card} className={`lt-item${pc.seat === lt.winner ? ' win' : ''}`}>
              <Card card={pc.card} size="sm" />
              <span>{name(pc.seat)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
