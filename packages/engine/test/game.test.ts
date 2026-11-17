import { describe, expect, it } from 'vitest';
import { applyAction, cutterOf, newGame, type GameAction, type GameState } from '../src/game.js';
import { findDeclarations } from '../src/declarations.js';
import { viewFor } from '../src/view.js';
import { gatherAfterPlay, gatherAfterThrowIn } from '../src/deck.js';
import { fullDeck, nextSeat } from '../src/cards.js';
import type { Rng, Seat } from '../src/types.js';

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(7);
function act(s: GameState, seat: Seat, a: GameAction): GameState {
  const r = applyAction(s, seat, a, rng);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
const cut = (s: GameState) => act(s, cutterOf(s), { type: 'cut', index: 10 });
function toPlaying(contract: 'C' | 'H' | 'NT' | 'AT' = 'H'): GameState {
  let s = cut(newGame(mulberry32(3)));
  s = act(s, s.turn, { type: 'bid', contract });
  for (let i = 0; i < 3; i++) s = act(s, s.turn, { type: 'pass' });
  return s;
}
function playHand(s: GameState): GameState {
  while (s.phase === 'playing') {
    const v = viewFor(s, s.turn);
    s = act(s, s.turn, { type: 'play', card: v.legal.cards[0]! });
  }
  return s;
}

describe('game', () => {
  it('new game starts at cut with 32-card deck', () => {
    const s = newGame(mulberry32(1));
    expect(s.phase).toBe('cut');
    expect(s.deck).toHaveLength(32);
    expect(new Set(s.deck).size).toBe(32);
    expect(s.turn).toBe(cutterOf(s));
  });

  it('cut deals 5 each and starts bidding right of dealer', () => {
    const s = cut(newGame(mulberry32(1)));
    expect(s.phase).toBe('bidding');
    expect(s.hands.map((h) => h.length)).toEqual([5, 5, 5, 5]);
    expect(s.deck).toHaveLength(12);
    expect(s.turn).toBe(nextSeat(s.dealer));
  });

  it('all pass throws in, rotates dealer, keeps 32 cards in gathered order', () => {
    let s = cut(newGame(mulberry32(1)));
    const expected = gatherAfterThrowIn(s.hands, s.dealer, s.deck);
    const dealer = s.dealer;
    for (let i = 0; i < 4; i++) s = act(s, s.turn, { type: 'pass' });
    expect(s.phase).toBe('cut');
    expect(s.dealer).toBe(nextSeat(dealer));
    expect(s.deck).toEqual(expected);
    expect(s.deck).toHaveLength(32);
    expect(s.hands.every((h) => h.length === 0)).toBe(true);
  });

  it('contract deals to 8 and first lead is right of dealer', () => {
    const s = toPlaying();
    expect(s.phase).toBe('playing');
    expect(s.hands.map((h) => h.length)).toEqual([8, 8, 8, 8]);
    expect(s.deck).toHaveLength(0);
    expect(s.turn).toBe(nextSeat(s.dealer));
    expect(s.contract?.contract).toBe('H');
  });

  it('rejects out-of-turn and repeated actions without mutating', () => {
    const s = toPlaying();
    const snap = structuredClone(s);
    const wrong = ((s.turn + 1) % 4) as Seat;
    const card = s.hands[wrong]![0]!;
    expect(applyAction(s, wrong, { type: 'play', card }, rng).ok).toBe(false);
    const first = s.hands[s.turn]![0]!;
    const r = applyAction(s, s.turn, { type: 'play', card: first }, rng);
    expect(r.ok).toBe(true);
    if (r.ok) expect(applyAction(r.state, s.turn, { type: 'play', card: first }, rng).ok).toBe(false);
    expect(s).toEqual(snap);
  });

  it('rejects unknown and malformed actions', () => {
    const s = newGame(mulberry32(1));
    const c = cutterOf(s);
    const bad = [
      { type: 'bogus' },
      { type: 'cut', index: 1.5 },
      { type: 'cut', index: 0 },
      { type: 'cut', index: 32 },
      { type: 'cut', index: '5' },
      { type: 'play', card: 5 },
      { type: 'bid', contract: 'X' },
      null,
    ];
    for (const a of bad) expect(applyAction(s, c, a as unknown as GameAction, rng).ok).toBe(false);
  });

  it('rejects illegal card', () => {
    const s = toPlaying();
    const lead = s.turn;
    let t = act(s, lead, { type: 'play', card: s.hands[lead]![0]! });
    const v = viewFor(t, t.turn);
    const illegal = t.hands[t.turn]!.find((c) => !v.legal.cards.includes(c));
    if (illegal) expect(applyAction(t, t.turn, { type: 'play', card: illegal }, rng).ok).toBe(false);
    expect(applyAction(t, t.turn, { type: 'play', card: '7X' as never }, rng).ok).toBe(false);
  });

  it('declarations only on first card', () => {
    const base = toPlaying('H');
    const s: GameState = {
      ...base,
      turn: 0,
      hands: [['7C', '8C', '9C', 'AD'], [], [], []],
      tricks: [{ cards: [], winner: 0 }],
    };
    const decl = findDeclarations(s.hands[0]!, 'H')[0]!;
    expect(decl.id).toBeTruthy();
    const r = applyAction(s, 0, { type: 'play', card: 'AD', declarations: [decl.id] }, rng);
    expect(r).toEqual({ ok: false, error: 'declarations only with the first card' });
    // same declaration is accepted on trick 0
    const ok0 = applyAction({ ...s, tricks: [] }, 0, { type: 'play', card: 'AD', declarations: [decl.id] }, rng);
    expect(ok0.ok).toBe(true);
  });

  it('declares available declarations on first card and rejects unavailable / ineligible belot', () => {
    const s = toPlaying();
    const v = viewFor(s, s.turn);
    const card = v.legal.cards[0]!;
    expect(applyAction(s, s.turn, { type: 'play', card, declarations: ['nope'] }, rng).ok).toBe(false);
    const nonBelot = v.legal.cards.find((c) => !v.legal.belotCards.includes(c))!;
    expect(applyAction(s, s.turn, { type: 'play', card: nonBelot, belot: true }, rng).ok).toBe(false);
    if (v.legal.declarations.length > 0) {
      const d = v.legal.declarations[0]!;
      const r = applyAction(s, s.turn, { type: 'play', card, declarations: [d.id] }, rng);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.state.declared).toHaveLength(1);
        expect(r.state.announcements[0]).toEqual({ seat: s.turn, kind: d.kind, trick: 0 });
      }
    }
  });

  it('full hand ends in handEnd with history entry; continue gathers deck in play order and rotates dealer', () => {
    let s = playHand(toPlaying());
    expect(s.phase).toBe('handEnd');
    expect(s.history).toHaveLength(1);
    expect(s.lastResult).toBe(s.history[0]);
    expect(viewFor(s, 2).legal.canContinue).toBe(true);
    const expected = gatherAfterPlay(s.tricks.map((t) => t.cards));
    const dealer = s.dealer;
    s = act(s, 2, { type: 'continue' });
    expect(s.phase).toBe('cut');
    expect(s.deck).toEqual(expected);
    expect([...s.deck].sort()).toEqual([...fullDeck()].sort());
    expect(s.dealer).toBe(nextSeat(dealer));
    expect(s.tricks).toEqual([]);
  });

  it('game continues after valat over 151', () => {
    const all = fullDeck();
    const mk = (cs: string[], winner: Seat) => ({
      cards: cs.map((card, i) => ({ seat: ((winner + i) % 4) as Seat, card })) as never,
      winner,
    });
    const last = ['AS', '7D', '8D', '9D'];
    const rest = all.filter((c) => !last.includes(c));
    const tricks = Array.from({ length: 7 }, (_, i) => mk(rest.slice(i * 4, i * 4 + 4), 0));
    const base = newGame(mulberry32(1));
    let s: GameState = {
      ...base,
      phase: 'playing',
      dealer: 3,
      turn: 0,
      deck: [],
      hands: [['AS'], ['7D'], ['8D'], ['9D']],
      contract: { contract: 'AT', bidder: 0, multiplier: 1 },
      tricks,
      scores: [140, 0],
    };
    for (let i = 0; i < 4; i++) s = act(s, s.turn, { type: 'play', card: viewFor(s, s.turn).legal.cards[0]! });
    expect(s.lastResult?.valatTeam).toBe(0);
    expect(s.scores[0]).toBeGreaterThanOrEqual(151);
    expect(s.phase).toBe('handEnd');
    expect(s.winner).toBeNull();
  });

  it('game over on 151 without valat, newGame restarts', () => {
    const s0 = toPlaying();
    let s: GameState = { ...s0, scores: [0, 150] };
    s = playHand(s);
    expect(s.phase).toBe('gameOver');
    expect(s.winner).not.toBeNull();
    expect(viewFor(s, 1).legal.canNewGame).toBe(true);
    s = act(s, 1, { type: 'newGame' });
    expect(s.phase).toBe('cut');
    expect(s.scores).toEqual([0, 0]);
  });

  it('discards hanging pot when the game ends', () => {
    let found = false;
    for (let seed = 1; seed <= 3000 && !found; seed++) {
      const r = mulberry32(seed);
      let s = cut(newGame(r));
      s = act(s, s.turn, { type: 'bid', contract: 'NT' });
      for (let i = 0; i < 3; i++) s = act(s, s.turn, { type: 'pass' });
      s = { ...s, scores: [150, 149] };
      s = playHand(s);
      if (s.lastResult!.outcome === 'hanging' && s.phase === 'gameOver') {
        found = true;
        expect(s.lastResult!.hangingPotAfter).toBeGreaterThan(0);
        expect(s.hangingPot).toBe(0);
        expect(viewFor(s, 0).hangingPot).toBe(0);
      }
    }
    expect(found).toBe(true);
  });

  it('view hides other hands', () => {
    const s = toPlaying();
    const json = JSON.stringify(viewFor(s, 0));
    expect(json).toContain('handCounts');
    for (const c of s.hands[1]!) expect(json).not.toContain(`"${c}"`);
    for (const c of s.hands[0]!) expect(json).toContain(`"${c}"`);
  });

  it('view sorts hand with trump suit last', () => {
    const v = viewFor(toPlaying('H'), 0);
    const suits = v.hand.map((c) => c.slice(-1));
    const lastNonH = suits.map((x, i) => (x !== 'H' ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
    const firstH = suits.indexOf('H');
    if (firstH >= 0) expect(firstH).toBeGreaterThan(lastNonH);
  });

  it('revealed declarations only after first trick', () => {
    let s = toPlaying();
    const seen = (st: GameState) => viewFor(st, 0).revealedDeclarations;
    s.declared = [{ seat: 1, decl: { id: 'x', kind: 'tierce', cards: ['7C', '8C', '9C'], points: 20 } }];
    expect(seen(s)).toEqual([]);
    for (let i = 0; i < 4; i++) s = act(s, s.turn, { type: 'play', card: viewFor(s, s.turn).legal.cards[0]! });
    expect(seen(s)).toHaveLength(1);
  });
});
