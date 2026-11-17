import type { GameAction, Seat } from '@belot/engine';
import type { TableMessage } from '../net.js';
import { relativePosition } from '../layout.js';
import { bg } from '../i18n/bg.js';
import { BiddingPanel } from './BiddingPanel.js';
import { CutPicker } from './CutPicker.js';
import { Hand } from './Hand.js';
import { Opponent } from './Opponent.js';
import { TrickArea } from './TrickArea.js';
import { CONTRACT_SYMBOL } from './suits.js';

export function Table({ msg, act }: { msg: TableMessage; act(a: GameAction): void }) {
  const view = msg.view!;
  const seats = msg.seats;
  const name = (s: Seat) => seats[s]?.name ?? '';
  const c = view.contract;
  const myTurn = view.turn === view.seat && (view.phase === 'playing' || view.phase === 'bidding');
  return (
    <div className="table">
      {c && (
        <div className="contract-badge">
          <span className={`cb-sym${c.contract === 'H' || c.contract === 'D' ? ' red' : ''}`}>
            {CONTRACT_SYMBOL[c.contract]}
          </span>{' '}
          {bg.contracts[c.contract]} — {name(c.bidder)}
          {c.multiplier === 2 && <b className="cb-mult"> ×2 {bg.contra}</b>}
          {c.multiplier === 4 && <b className="cb-mult"> ×4 {bg.recontra}</b>}
        </div>
      )}
      {([0, 1, 2, 3] as Seat[]).map((s) => (
        <Opponent key={s} view={view} seat={s} info={seats[s] ?? null} pos={relativePosition(view.seat, s)} />
      ))}
      <div className="center">
        {view.phase === 'cut' && <CutPicker view={view} seats={seats} act={act} />}
        {view.phase === 'bidding' && <BiddingPanel view={view} act={act} />}
        {(view.phase === 'playing' || view.phase === 'handEnd') && <TrickArea view={view} />}
      </div>
      {myTurn && <div className="turn-banner">{bg.yourTurn}</div>}
      <Hand view={view} act={act} />
    </div>
  );
}
