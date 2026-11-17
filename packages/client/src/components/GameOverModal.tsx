import type { GameAction, PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { ResultBreakdown } from './ResultBreakdown.js';
import { CONTRACT_SYMBOL } from './suits.js';

export function GameOverModal({
  view,
  name,
  act,
}: {
  view: PlayerView;
  name(s: Seat): string;
  act(a: GameAction): void;
}) {
  const me = view.seat % 2;
  const r = view.lastResult;
  const won = view.winner === me;
  return (
    <div className="modal-back">
      <div className="panel result">
        <div className="panel-title">{bg.gameOver}</div>
        <div className={`gameover-win ${won ? 'won' : 'lost'}`}>{won ? bg.winnerUs : bg.winnerThem}</div>
        <div className="gameover-score">
          {bg.finalScore}: {bg.us} <b>{view.scores[me]}</b> — {bg.them} <b>{view.scores[1 - me]}</b>
        </div>
        {r && (
          <>
            <div className="panel-title">{bg.handResult}</div>
            <div className="result-contract">
              <span className={r.contract === 'H' || r.contract === 'D' ? 'red-sym' : ''}>
                {CONTRACT_SYMBOL[r.contract]}
              </span>{' '}
              {bg.contracts[r.contract]} — {name(r.bidder)}
            </div>
            <ResultBreakdown r={r} team={me} />
          </>
        )}
        <div className="prompt-actions">
          <button className="primary" onClick={() => act({ type: 'newGame' })}>
            {bg.newGame}
          </button>
        </div>
      </div>
    </div>
  );
}
