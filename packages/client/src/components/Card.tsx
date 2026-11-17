import type { Card as CardId, Suit } from '@belot/engine';
import { SUIT_SYMBOL, isRed } from './suits.js';

export interface CardProps {
  card?: CardId;
  faceDown?: boolean;
  size?: 'md' | 'sm' | 'xs';
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ card, faceDown, size = 'md', highlighted, dimmed, onClick, style, className }: CardProps) {
  const cls = ['pcard', `pcard-${size}`, className ?? ''];
  if (faceDown || !card) {
    cls.push('pcard-back');
    return <div className={cls.join(' ')} style={style} />;
  }
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1);
  const sym = SUIT_SYMBOL[suit];
  cls.push(isRed(suit) ? 'red' : 'black');
  if (highlighted) cls.push('hl');
  if (dimmed) cls.push('dim');
  if (onClick) cls.push('clickable');
  const corner = (
    <>
      <span>{rank}</span>
      <span>{sym}</span>
    </>
  );
  return (
    <div className={cls.join(' ')} style={style} onClick={onClick}>
      <div className="pcard-corner tl">{corner}</div>
      <div className="pcard-center">{sym}</div>
      <div className="pcard-corner br">{corner}</div>
    </div>
  );
}
