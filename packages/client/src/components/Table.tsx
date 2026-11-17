import { useEffect, useRef, useState } from 'react';
import type { GameAction, PlayerView, Seat } from '@belot/engine';
import type { TableMessage } from '../net.js';
import { relativePosition } from '../layout.js';
import { bg } from '../i18n/bg.js';
import { Announcements } from './Announcements.js';
import { BiddingPanel } from './BiddingPanel.js';
import { CutPicker } from './CutPicker.js';
import { GameOverModal } from './GameOverModal.js';
import { Hand } from './Hand.js';
import { HandResultModal } from './HandResultModal.js';
import { LastTrick } from './LastTrick.js';
import { Opponent } from './Opponent.js';
import { ScoreBoard } from './ScoreBoard.js';
import { TrickArea } from './TrickArea.js';
import { CONTRACT_SYMBOL } from './suits.js';

/** Speech bubbles (3 s) for announcements made after this component mounted. */
function useAnnouncementBubbles(view: PlayerView): Record<number, string> {
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const seen = useRef(view.announcements.length);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const n = view.announcements.length;
  useEffect(() => {
    const reset = n < seen.current;
    const from = reset ? 0 : seen.current;
    seen.current = n;
    if (reset) setBubbles({});
    const fresh = view.announcements.slice(from);
    if (fresh.length === 0) return;
    const texts = fresh.map((a) => [a.seat, bg.decl[a.kind]] as const);
    setBubbles((b) => {
      const next = { ...b };
      for (const [seat, t] of texts) next[seat] = t;
      return next;
    });
    timers.current.push(
      setTimeout(
        () =>
          setBubbles((b) => {
            const next = { ...b };
            for (const [seat, t] of texts) if (next[seat] === t) delete next[seat];
            return next;
          }),
        3000,
      ),
    );
  }, [n]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  return bubbles;
}

/** Short notice when a bidding round ended with four passes (cut phase, no hand scored). */
function useAllPassedNotice(view: PlayerView): boolean {
  const [show, setShow] = useState(false);
  const prev = useRef({ phase: view.phase, hands: view.history.length });
  useEffect(() => {
    const p = prev.current;
    prev.current = { phase: view.phase, hands: view.history.length };
    if (p.phase === 'bidding' && view.phase === 'cut' && p.hands === view.history.length) setShow(true);
  }, [view.phase, view.history.length]);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [show]);
  return show;
}

export function Table({ msg, act }: { msg: TableMessage; act(a: GameAction): void }) {
  const view = msg.view!;
  const seats = msg.seats;
  const name = (s: Seat) => seats[s]?.name ?? '';
  const c = view.contract;
  const bubbles = useAnnouncementBubbles(view);
  const allPassed = useAllPassedNotice(view);
  const myTurn = view.turn === view.seat && (view.phase === 'playing' || view.phase === 'bidding');
  return (
    <div className="table">
      {allPassed && <div className="notice">{bg.allPassed}</div>}
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
      <ScoreBoard view={view} name={name} />
      <Announcements view={view} name={name} />
      <LastTrick view={view} name={name} />
      {([0, 1, 2, 3] as Seat[])
        .filter((s) => s !== view.seat)
        .map((s) => (
          <Opponent
            key={s}
            view={view}
            seat={s}
            info={seats[s] ?? null}
            pos={relativePosition(view.seat, s)}
            bubble={bubbles[s]}
          />
        ))}
      <div className="center">
        {view.phase === 'cut' && <CutPicker view={view} seats={seats} act={act} />}
        {view.phase === 'bidding' && <BiddingPanel view={view} act={act} />}
        {(view.phase === 'playing' || view.phase === 'handEnd') && <TrickArea view={view} />}
      </div>
      <div className="bottom">
        <div className="turn-slot">{myTurn && <div className="turn-banner">{bg.yourTurn}</div>}</div>
        <Opponent
          view={view}
          seat={view.seat}
          info={seats[view.seat] ?? null}
          pos="bottom"
          bubble={bubbles[view.seat]}
        />
        <Hand view={view} act={act} />
      </div>
      {view.phase === 'handEnd' && <HandResultModal view={view} name={name} act={act} />}
      {view.phase === 'gameOver' && <GameOverModal view={view} name={name} act={act} />}
    </div>
  );
}
