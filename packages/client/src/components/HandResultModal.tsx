import type { GameAction, PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { CONTRACT_SYMBOL } from './suits.js';

export function HandResultModal({
  view,
  name,
  act,
}: {
  view: PlayerView;
  name(s: Seat): string;
  act(a: GameAction): void;
}) {
  const r = view.lastResult;
  if (!r) return null;
  const me = view.seat % 2;
  const them = 1 - me;
  const rows: [string, (t: number) => number][] = [
    [bg.cards, (t) => r.breakdown[t]!.cards],
    [bg.lastTen, (t) => r.breakdown[t]!.lastTen],
    [bg.declarations, (t) => r.breakdown[t]!.declarations],
    [bg.decl.belot, (t) => r.breakdown[t]!.belot],
    [bg.valat, (t) => r.breakdown[t]!.valat],
  ];
  const shown = rows.filter(([, f]) => f(0) !== 0 || f(1) !== 0);
  const red = r.contract === 'H' || r.contract === 'D';
  return (
    <div className="modal-back">
      <div className="panel result">
        <div className="panel-title">{bg.handResult}</div>
        <div className="result-contract">
          <span className={red ? 'red-sym' : ''}>{CONTRACT_SYMBOL[r.contract]}</span> {bg.contracts[r.contract]} —{' '}
          {name(r.bidder)}
          {r.multiplier === 2 && <b className="cb-mult"> ×2 {bg.contra}</b>}
          {r.multiplier === 4 && <b className="cb-mult"> ×4 {bg.recontra}</b>}
        </div>
        <table className="result-table">
          <thead>
            <tr>
              <th />
              <th>{bg.us}</th>
              <th>{bg.them}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(([label, f]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{f(me)}</td>
                <td>{f(them)}</td>
              </tr>
            ))}
            <tr className="sum">
              <td>{bg.total}</td>
              <td>{r.breakdown[me]!.total}</td>
              <td>{r.breakdown[them]!.total}</td>
            </tr>
            <tr className="gp">
              <td>{bg.gamePoints}</td>
              <td>{r.gamePoints[me]}</td>
              <td>{r.gamePoints[them]}</td>
            </tr>
          </tbody>
        </table>
        <div className={`result-outcome ${r.outcome}`}>
          {bg.outcomeRow}: {bg.outcome[r.outcome]}
        </div>
        {r.potAwarded && (
          <div className="result-pot">
            {bg.potTaken(r.potAwarded.amount)} {r.potAwarded.team === me ? bg.us : bg.them}
          </div>
        )}
        {r.hangingPotAfter > 0 && <div className="result-pot">{bg.potKept(r.hangingPotAfter)}</div>}
        <div className="prompt-actions">
          <button className="primary" onClick={() => act({ type: 'continue' })}>
            {bg.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
