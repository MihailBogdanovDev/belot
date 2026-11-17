import type { Contract, Suit } from '@belot/engine';

export const SUIT_SYMBOL: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠' };
export const isRed = (s: Suit): boolean => s === 'H' || s === 'D';
export const CONTRACT_SYMBOL: Record<Contract, string> = { ...SUIT_SYMBOL, NT: 'БК', AT: 'ВК' };
