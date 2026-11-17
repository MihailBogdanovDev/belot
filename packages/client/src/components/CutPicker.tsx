import type { GameAction, PlayerView } from '@belot/engine';
import type { PublicSeat } from '../net.js';
import { bg } from '../i18n/bg.js';
import { Card } from './Card.js';

export function CutPicker({
  view,
  seats,
  act,
}: {
  view: PlayerView;
  seats: (PublicSeat | null)[];
  act(a: GameAction): void;
}) {
  if (!view.legal.canCut) {
    return <div className="cut-wait">{bg.cutting(seats[view.cutter]?.name ?? '')}</div>;
  }
  return (
    <div className="cut">
      <div className="cut-title">{bg.cut}</div>
      <div className="cut-row">
        {Array.from({ length: 32 }, (_, i) => (
          <div
            key={i}
            className={`cut-slot${i === 0 ? ' disabled' : ''}`}
            onClick={i >= 1 ? () => act({ type: 'cut', index: i }) : undefined}
          >
            <Card faceDown />
          </div>
        ))}
      </div>
    </div>
  );
}
