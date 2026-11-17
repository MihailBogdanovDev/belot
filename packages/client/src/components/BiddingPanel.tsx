import type { Contract, GameAction, PlayerView } from '@belot/engine';
import { CONTRACT_ORDER } from '@belot/engine';
import { bg } from '../i18n/bg.js';
import { CONTRACT_SYMBOL } from './suits.js';

export function BiddingPanel({ view, act }: { view: PlayerView; act(a: GameAction): void }) {
  const lb = view.legal.bids;
  const mine = view.turn === view.seat && lb !== null;
  const can = (c: Contract) => mine && lb.contracts.includes(c);
  return (
    <div className="bidding">
      <div className="bid-contracts">
        {CONTRACT_ORDER.map((c) => (
          <button
            key={c}
            className={`bid-btn${c === 'H' || c === 'D' ? ' red' : ''}`}
            disabled={!can(c)}
            onClick={() => act({ type: 'bid', contract: c })}
          >
            <span className="bid-sym">{CONTRACT_SYMBOL[c]}</span>
            <span className="bid-label">{bg.contracts[c]}</span>
          </button>
        ))}
      </div>
      <div className="bid-actions">
        <button disabled={!(mine && lb.pass)} onClick={() => act({ type: 'pass' })}>
          {bg.pass}
        </button>
        <button disabled={!(mine && lb.contra)} onClick={() => act({ type: 'contra' })}>
          {bg.contra}
        </button>
        <button disabled={!(mine && lb.recontra)} onClick={() => act({ type: 'recontra' })}>
          {bg.recontra}
        </button>
      </div>
    </div>
  );
}
