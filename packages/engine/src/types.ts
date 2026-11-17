export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;
export type Contract = Suit | 'NT' | 'AT';
export interface PlayedCard {
  seat: Seat;
  card: Card;
}
export type Rng = () => number;
