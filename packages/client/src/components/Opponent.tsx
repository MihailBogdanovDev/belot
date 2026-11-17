import type { BidAction, PlayerView, Seat } from '@belot/engine';
import type { PublicSeat } from '../net.js';
import type { Position } from '../layout.js';
import { bg } from '../i18n/bg.js';
import { Card } from './Card.js';
import { CONTRACT_SYMBOL } from './suits.js';

function bubbleText(a: BidAction): string {
  switch (a.type) {
    case 'bid':
      return `${CONTRACT_SYMBOL[a.contract]} ${bg.contracts[a.contract]}`;
    case 'pass':
      return bg.pass;
    case 'contra':
      return bg.contra;
    case 'recontra':
      return bg.recontra;
  }
}

export function Opponent({
  view,
  seat,
  info,
  pos,
}: {
  view: PlayerView;
  seat: Seat;
  info: PublicSeat | null;
  pos: Position;
}) {
  const isMe = pos === 'bottom';
  const last = view.phase === 'bidding' ? view.bidding?.history.filter((h) => h.seat === seat).at(-1) : undefined;
  const active = view.turn === seat && (view.phase === 'bidding' || view.phase === 'playing');
  const count = view.handCounts[seat];
  return (
    <div className={`opp opp-${pos}${active ? ' active' : ''}`}>
      {last && <div className="bubble">{bubbleText(last.action)}</div>}
      <div className="plate">
        {view.dealer === seat && <span className="chip">{bg.dealerChip}</span>}
        <span className="plate-name">{info?.name ?? ''}</span>
        {info && !info.connected && <span className="badge">{bg.waiting}</span>}
      </div>
      {!isMe && (
        <div className="opp-cards">
          {Array.from({ length: count }, (_, i) => (
            <Card key={i} faceDown size="sm" className="opp-card" />
          ))}
        </div>
      )}
    </div>
  );
}
