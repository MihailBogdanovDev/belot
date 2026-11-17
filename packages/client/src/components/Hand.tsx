import type { GameAction, PlayerView } from '@belot/engine';
import { Card } from './Card.js';

export function Hand({ view, act }: { view: PlayerView; act(a: GameAction): void }) {
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === view.seat;
  const n = view.hand.length;
  return (
    <div className="hand">
      {view.hand.map((c, i) => {
        const legal = myTurn && view.legal.cards.includes(c);
        const rot = (i - (n - 1) / 2) * 3;
        const drop = Math.abs(i - (n - 1) / 2) ** 2 * 1.2 - (myTurn && view.legal.cards.includes(c) ? 14 : 0);
        return (
          <Card
            key={c}
            card={c}
            highlighted={legal}
            dimmed={myTurn && !legal}
            onClick={legal ? () => act({ type: 'play', card: c }) : undefined}
            className="hand-card"
            style={{ transform: `translateY(${drop}px) rotate(${rot}deg)`, zIndex: i }}
          />
        );
      })}
    </div>
  );
}
