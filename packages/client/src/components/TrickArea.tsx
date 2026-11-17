import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlayedCard, PlayerView, Seat } from '@belot/engine';
import { relativePosition } from '../layout.js';
import { Card } from './Card.js';

interface Held {
  cards: PlayedCard[];
  winner: Seat;
  leaving: boolean;
}

const keyOf = (v: PlayerView): string => (v.lastTrick ? v.lastTrick.cards.map((c) => c.card).join(',') : '');

export function TrickArea({ view }: { view: PlayerView }) {
  const [held, setHeld] = useState<Held | null>(null);
  const seen = useRef(keyOf(view));
  const key = keyOf(view);
  const trickLen = view.trick.length;

  useLayoutEffect(() => {
    const changed = key !== seen.current;
    seen.current = key;
    if (trickLen > 0) {
      setHeld(null);
      return;
    }
    if (!changed || !view.lastTrick) return;
    setHeld({ cards: view.lastTrick.cards, winner: view.lastTrick.winner, leaving: false });
    const t1 = setTimeout(() => setHeld((h) => (h ? { ...h, leaving: true } : h)), 1200);
    const t2 = setTimeout(() => setHeld(null), 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key, trickLen]);

  const cards = trickLen > 0 ? view.trick : (held?.cards ?? []);
  const leaving = trickLen === 0 && held?.leaving;
  const winnerPos = held ? relativePosition(view.seat, held.winner) : null;
  return (
    <div className="trick">
      {cards.map((pc, i) => {
        const pos = relativePosition(view.seat, pc.seat);
        const cls = `trick-card tc-${pos}${leaving ? ` leave-${winnerPos}` : ''}`;
        return <Card key={pc.card} card={pc.card} className={cls} style={{ zIndex: i }} />;
      })}
    </div>
  );
}
