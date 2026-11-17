import type { Seat } from '@belot/engine';

export type Position = 'bottom' | 'right' | 'top' | 'left';

const POSITIONS: Position[] = ['bottom', 'right', 'top', 'left'];

/** Where `seat` is drawn relative to `me` (me is always at the bottom; play runs counter-clockwise). */
export function relativePosition(me: Seat, seat: Seat): Position {
  return POSITIONS[(seat - me + 4) % 4]!;
}
