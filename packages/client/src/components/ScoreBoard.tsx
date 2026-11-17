import { useState } from 'react';
import type { PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { CONTRACT_SYMBOL } from './suits.js';

export function ScoreBoard({ view, name }: { view: PlayerView; name(s: Seat): string }) {
  const [open, setOpen] = useState(false);
  const me = view.seat % 2;
  const them = 1 - me;
  return (
    <div className="scoreboard">
      <div className="sb-head" onClick={() => setOpen((o) => !o)}>
        <div className="sb-row">
          <span>{bg.us}</span>
          <b>{view.scores[me]}</b>
        </div>
        <div className="sb-row">
          <span>{bg.them}</span>
          <b>{view.scores[them]}</b>
        </div>
        {view.hangingPot > 0 && <div className="sb-pot">{bg.hanging(view.hangingPot)}</div>}
        <div className="sb-toggle">
          {bg.history} {open ? '▴' : '▾'}
        </div>
      </div>
      {open && (
        <table className="sb-table">
          <thead>
            <tr>
              <th>{bg.contractCol}</th>
              <th>{bg.bidderCol}</th>
              <th>{bg.us}</th>
              <th>{bg.them}</th>
              <th>{bg.outcomeCol}</th>
            </tr>
          </thead>
          <tbody>
            {view.history.map((h, i) => (
              <tr key={i}>
                <td>{CONTRACT_SYMBOL[h.contract]}</td>
                <td>{name(h.bidder)}</td>
                <td>{h.gamePoints[me]}</td>
                <td>{h.gamePoints[them]}</td>
                <td>{bg.outcome[h.outcome]}</td>
              </tr>
            ))}
            {view.history.length === 0 && (
              <tr>
                <td colSpan={5}>—</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
