import type { PlayerView, Seat } from '@belot/engine';
import { bg } from '../i18n/bg.js';

export function Announcements({ view, name }: { view: PlayerView; name(s: Seat): string }) {
  if (view.announcements.length === 0) return null;
  return (
    <div className="ann-log">
      <div className="ann-title">{bg.announcementsTitle}</div>
      {view.announcements.map((a, i) => (
        <div key={i} className={`ann-row${a.seat % 2 === view.seat % 2 ? ' us' : ''}`}>
          <span className="ann-name">{name(a.seat)}</span> {bg.decl[a.kind]}
        </div>
      ))}
    </div>
  );
}
