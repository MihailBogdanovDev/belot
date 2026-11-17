import type { GameAction, PlayerView } from '@belot/engine';
import { bg } from '../i18n/bg.js';

export function GameOverModal({ view, act }: { view: PlayerView; act(a: GameAction): void }) {
  const me = view.seat % 2;
  const won = view.winner === me;
  return (
    <div className="modal-back">
      <div className="panel result">
        <div className="panel-title">{bg.gameOver}</div>
        <div className={`gameover-win ${won ? 'won' : 'lost'}`}>{won ? bg.winnerUs : bg.winnerThem}</div>
        <div className="gameover-score">
          {bg.finalScore}: {bg.us} <b>{view.scores[me]}</b> — {bg.them} <b>{view.scores[1 - me]}</b>
        </div>
        <div className="prompt-actions">
          <button className="primary" onClick={() => act({ type: 'newGame' })}>
            {bg.newGame}
          </button>
        </div>
      </div>
    </div>
  );
}
