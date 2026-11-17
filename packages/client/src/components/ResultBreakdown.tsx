import type { HandResult } from '@belot/engine';
import { bg } from '../i18n/bg.js';

/** Scoring table + outcome + pot lines for one hand, from `team`'s point of view. */
export function ResultBreakdown({ r, team }: { r: HandResult; team: number }) {
  const me = team;
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
    <>
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
    </>
  );
}
