import { useEffect, useState } from 'react';
import type { Card as CardId, GameAction, PlayerView } from '@belot/engine';
import { Card } from './Card.js';
import { DeclarationPrompt } from './DeclarationPrompt.js';

export function Hand({ view, act }: { view: PlayerView; act(a: GameAction): void }) {
  const [pending, setPending] = useState<CardId | null>(null);
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === view.seat;
  const n = view.hand.length;
  const decls = myTurn ? view.legal.declarations : [];

  const stillMine = pending !== null && myTurn && view.hand.includes(pending);
  useEffect(() => {
    if (pending && !stillMine) setPending(null);
  }, [pending, stillMine]);

  const click = (c: CardId) => {
    const askBelot = view.legal.belotCards.includes(c);
    if (decls.length === 0 && !askBelot) act({ type: 'play', card: c });
    else setPending(c);
  };

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
            onClick={legal ? () => click(c) : undefined}
            className="hand-card"
            style={{ transform: `translateY(${drop}px) rotate(${rot}deg)`, zIndex: i }}
          />
        );
      })}
      {pending && stillMine && (
        <DeclarationPrompt
          card={pending}
          declarations={decls}
          askBelot={view.legal.belotCards.includes(pending)}
          onCancel={() => setPending(null)}
          onConfirm={(ids, belot) => {
            const card = pending;
            setPending(null);
            const a: GameAction = { type: 'play', card };
            if (ids.length) a.declarations = ids;
            if (belot) a.belot = true;
            act(a);
          }}
        />
      )}
    </div>
  );
}
