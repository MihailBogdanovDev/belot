import type { GameAction, PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { ResultBreakdown } from './ResultBreakdown.js';
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
  if (!r) {
    return (
      <div className="modal-back">
        <div className="panel result">
          <div className="prompt-actions">
            <button className="primary" onClick={() => act({ type: 'continue' })}>
              {bg.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }
  const me = view.seat % 2;
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
        <ResultBreakdown r={r} team={me} />
        <div className="prompt-actions">
          <button className="primary" onClick={() => act({ type: 'continue' })}>
            {bg.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
