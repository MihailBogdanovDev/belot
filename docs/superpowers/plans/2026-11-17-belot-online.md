# Belot Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser Belot for four friends on separate devices, Bulgarian rules incl. no-reshuffle house rule.

**Architecture:** npm-workspaces monorepo. `packages/engine` is a pure, deterministic TS rules engine (reducer + per-seat views). `packages/server` is one Node process (Express + Socket.IO) that holds a single in-memory table, validates every action through the engine, emits redacted views, and serves the built client. `packages/client` is React + Vite.

**Tech Stack:** Node 22, TypeScript 5 (strict), Vitest, Express 4, Socket.IO 4, React 18, Vite 5.

**Spec:** `docs/superpowers/specs/2026-11-17-belot-design.md` (rules tables in `docs/rules.md`). Read both before any task.

## Global Constraints

- TypeScript `strict: true` everywhere; ESM (`"type": "module"`).
- Engine has zero runtime dependencies and no I/O; randomness only via an injected `rng: () => number`.
- Seats 0–3; teams: `teamOf(seat) = seat % 2` (team 0 = seats 0,2; team 1 = seats 1,3). Next player is always `(seat + 1) % 4` (counter-clockwise).
- Contract order: `C < D < H < S < NT < AT` (♣ Спатия, ♦ Каро, ♥ Купа, ♠ Пика, Без коз, Всичко коз).
- All user-visible strings in Bulgarian, only in `packages/client/src/i18n/bg.ts`.
- Clients never receive other players' cards or the deck order.
- Game target 151. Server listens on `process.env.PORT ?? 3001`.
- Commit after each task with a Conventional Commit message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Acting out of turn / double-clicking a card or bid → rejected with error, state unchanged (Task 6 test `rejects out-of-turn and repeated actions`).
2. Browser refresh mid-bidding or mid-trick → same seat, same hand, same phase (Task 7 test `reconnect restores seat and view`).
3. Opening the link in a second tab / a 5th person → cannot steal a connected seat (Task 7 test `cannot sit in a connected seat`).
4. A Капо hand that pushes a team over 151 → game continues to another hand (Task 5 test `valat hand never ends the game`, Task 6 test `game continues after valat over 151`).
5. Many consecutive all-pass throw-ins → deck stays 32 distinct cards, dealer rotates (Task 6 property test).

---

## File Structure

```
package.json                    workspaces root, scripts: test, build, dev, start
tsconfig.base.json
packages/engine/
  package.json, tsconfig.json, vitest config via package script
  src/types.ts                  Card, Suit, Rank, Seat, Team, Contract, PlayedCard
  src/cards.ts                  orders, points, strength, helpers
  src/deck.ts                   shuffle, cut, deal, gather
  src/bidding.ts                bidding state machine
  src/play.ts                   legalCards, trickWinner
  src/declarations.ts           find/validate/resolve declarations, belot eligibility
  src/scoring.ts                hand scoring, rounding, hanging pot
  src/game.ts                   GameState, newGame, applyAction
  src/view.ts                   PlayerView, viewFor
  src/index.ts                  re-exports
  test/*.test.ts                one per src module + game.property.test.ts
packages/server/
  src/table.ts                  Table class (seats, tokens, game) — no sockets
  src/server.ts                 createServer(port) wiring Express + Socket.IO
  src/index.ts                  entry: createServer(PORT)
  test/table.test.ts, test/server.test.ts
packages/client/
  index.html, vite.config.ts
  src/main.tsx, src/App.tsx
  src/net.ts                    socket + token + useTable hook
  src/i18n/bg.ts
  src/layout.ts                 relativePosition(me, seat)
  src/components/*.tsx          Card, Hand, Opponent, TrickArea, BiddingPanel, CutPicker,
                                DeclarationPrompt, ScoreBoard, HandResultModal, GameOverModal,
                                JoinScreen, Menu, Announcements
  src/styles.css
Dockerfile, README.md
```

---

### Task 1: Monorepo scaffold + cards + deck

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `packages/engine/{package.json,tsconfig.json}`, `packages/engine/src/{types.ts,cards.ts,deck.ts,index.ts}`
- Test: `packages/engine/test/cards.test.ts`, `packages/engine/test/deck.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Suit = 'C' | 'D' | 'H' | 'S';
  export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  export type Card = `${Rank}${Suit}`;          // e.g. '10H', 'JS'
  export type Seat = 0 | 1 | 2 | 3;
  export type Team = 0 | 1;
  export type Contract = Suit | 'NT' | 'AT';
  export interface PlayedCard { seat: Seat; card: Card }
  export type Rng = () => number;
  ```
- Produces (`cards.ts`): `SUITS`, `RANKS` (natural order 7..A), `CONTRACT_ORDER: Contract[]`, `suitOf(c): Suit`, `rankOf(c): Rank`, `teamOf(s: Seat): Team`, `nextSeat(s: Seat): Seat`, `isTrump(c, contract): boolean` (AT → all true, NT → false, suit → suit match), `cardPoints(c, contract): number`, `cardStrength(c, contract): number` (higher = stronger within a suit; trump order J,9,A,10,K,Q,8,7 when `isTrump`, else A,10,K,Q,J,9,8,7), `naturalIndex(r: Rank): number` (7=0 … A=7), `fullDeck(): Card[]`.
- Produces (`deck.ts`):
  - `shuffle(deck: Card[], rng: Rng): Card[]` (Fisher–Yates, returns new array)
  - `cutDeck(deck: Card[], index: number): Card[]` → `[...deck.slice(index), ...deck.slice(0, index)]`; throws if `index < 1 || index > deck.length - 1`
  - `deal(deck: Card[], dealer: Seat, perPlayer: number, hands: Card[][]): { deck: Card[]; hands: Card[][] }` — takes from front, `perPlayer` cards to each seat starting at `nextSeat(dealer)` counter-clockwise, appends to that seat's hand (dealt order preserved)
  - `gatherAfterPlay(tricks: PlayedCard[][]): Card[]` — tricks in played order, cards in played order
  - `gatherAfterThrowIn(hands: Card[][], dealer: Seat, rest: Card[]): Card[]` — hands of dealer+1, dealer+2, dealer+3, dealer (each in dealt order), then `rest`

- [ ] **Step 1: Root scaffold.** Root `package.json` `{ "private": true, "type": "module", "workspaces": ["packages/*"], "scripts": { "test": "npm test --workspaces --if-present", "build": "npm run build --workspaces --if-present" } }`, `tsconfig.base.json` (strict, ES2022, moduleResolution bundler, `noUncheckedIndexedAccess: true`). Engine package `@belot/engine`, `main`/`types` pointing at `src/index.ts` (consumed as source by server via tsx and client via Vite), scripts `test: vitest run`, `typecheck: tsc --noEmit`. `npm install -D typescript vitest -w @belot/engine`.

- [ ] **Step 2: Write failing tests.**
  ```ts
  // cards.test.ts
  test('trump points total 62, plain 30', () => {
    const hearts = fullDeck().filter(c => suitOf(c) === 'H');
    expect(hearts.reduce((s, c) => s + cardPoints(c, 'H'), 0)).toBe(62);
    expect(hearts.reduce((s, c) => s + cardPoints(c, 'S'), 0)).toBe(30);
    expect(hearts.reduce((s, c) => s + cardPoints(c, 'AT'), 0)).toBe(62);
    expect(hearts.reduce((s, c) => s + cardPoints(c, 'NT'), 0)).toBe(30);
  });
  test('trump strength order J 9 A 10 K Q 8 7', () => {
    const order = ['JH','9H','AH','10H','KH','QH','8H','7H'] as Card[];
    for (let i = 1; i < order.length; i++)
      expect(cardStrength(order[i-1]!, 'H')).toBeGreaterThan(cardStrength(order[i]!, 'H'));
  });
  test('plain strength order A 10 K Q J 9 8 7', () => { /* same shape with 'NT' */ });
  test('fullDeck has 32 distinct cards', () => expect(new Set(fullDeck()).size).toBe(32));
  // deck.test.ts
  test('cutDeck moves top part to bottom', () => {
    expect(cutDeck(['7C','8C','9C','10C'] as Card[], 1)).toEqual(['8C','9C','10C','7C']);
    expect(() => cutDeck(fullDeck(), 0)).toThrow();
    expect(() => cutDeck(fullDeck(), 32)).toThrow();
  });
  test('deal 3 then 2 starts right of dealer', () => {
    const d = fullDeck();
    let r = deal(d, 0, 3, [[],[],[],[]]);
    expect(r.hands[1]).toEqual(d.slice(0,3));
    expect(r.hands[0]).toEqual(d.slice(9,12));
    r = deal(r.deck, 0, 2, r.hands);
    expect(r.hands[1]).toEqual([...d.slice(0,3), ...d.slice(12,14)]);
    expect(r.deck).toHaveLength(12);
  });
  test('gatherAfterPlay keeps play order', ...);  // 8 tricks → flattened in order, length 32
  test('gatherAfterThrowIn order', ...);          // dealer 2 → hands[3], hands[0], hands[1], hands[2], then rest
  test('shuffle is a permutation and uses rng', ...);
  ```
- [ ] **Step 3:** `npm test -w @belot/engine` → FAIL (modules missing).
- [ ] **Step 4:** Implement `types.ts`, `cards.ts`, `deck.ts`, `index.ts` (re-export all).
- [ ] **Step 5:** Tests PASS; `npm run typecheck -w @belot/engine` clean.
- [ ] **Step 6:** Commit `feat(engine): cards, deck, monorepo scaffold`.

---

### Task 2: Bidding

**Files:** Create `packages/engine/src/bidding.ts`; Test `packages/engine/test/bidding.test.ts`

**Interfaces:**
- Consumes: `Seat`, `Contract`, `CONTRACT_ORDER`, `teamOf`, `nextSeat`.
- Produces:
  ```ts
  export type BidAction = { type: 'bid'; contract: Contract } | { type: 'pass' } | { type: 'contra' } | { type: 'recontra' };
  export interface BiddingState {
    turn: Seat;
    highest: { contract: Contract; seat: Seat } | null;
    multiplier: 1 | 2 | 4;
    passesInRow: number;
    history: { seat: Seat; action: BidAction }[];
  }
  export type BiddingOutcome = { kind: 'open' } | { kind: 'allPass' } | { kind: 'contract'; contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4 };
  export interface LegalBids { contracts: Contract[]; pass: boolean; contra: boolean; recontra: boolean }
  export function startBidding(dealer: Seat): BiddingState;           // turn = nextSeat(dealer)
  export function legalBids(s: BiddingState, seat: Seat): LegalBids;  // all false/empty if not seat's turn or outcome not open
  export function applyBid(s: BiddingState, seat: Seat, a: BidAction): BiddingState | { error: string };
  export function biddingOutcome(s: BiddingState): BiddingOutcome;
  ```
- Rules: bid must be strictly higher than `highest` (resets multiplier to 1, passesInRow 0). Contra: `highest` owned by other team and multiplier 1 → 2, passesInRow 0. Recontra: multiplier 2 and seat on bidder's team → 4, outcome becomes contract immediately. Pass: passesInRow+1. Outcome: recontra → contract; `highest && passesInRow >= 3` → contract; `!highest && passesInRow >= 4` → allPass.

- [ ] **Step 1: Failing tests** — `starts right of dealer` (`startBidding(3).turn === 0`); `four passes is allPass`; `bid then three passes makes contract` (seat 1 bids H, 2,3,0 pass → `{contract:'H', bidder:1, multiplier:1}`); `cannot bid equal or lower` (after S, `applyBid(..,{bid H})` has `error`, `legalBids` contracts `['NT','AT']`); `contra only vs opponents` (partner of bidder: `legalBids(..).contra === false`; opponent: true); `contra then three passes → multiplier 2`; `recontra ends bidding with multiplier 4`; `higher bid after contra clears multiplier`; `out of turn is error`; `actions after outcome are errors`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): bidding`.

---

### Task 3: Legal cards and trick winner

**Files:** Create `packages/engine/src/play.ts`; Test `packages/engine/test/play.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function trickWinner(trick: PlayedCard[], contract: Contract): Seat;   // trick non-empty
  export function legalCards(hand: Card[], trick: PlayedCard[], contract: Contract, seat: Seat): Card[];
  ```
- `trickWinner`: suit contract → highest trump if any trump present, else highest `cardStrength` of led suit. NT/AT → highest of led suit.
- `legalCards` (spec §"Rules details"): empty trick → whole hand. Has led suit → those cards; additionally, if led suit is trump (suit contract) or contract is AT, restrict to cards that beat the current best card of the led suit if any exist. Can't follow: NT/AT → whole hand; suit contract → if `teamOf(trickWinner(trick)) === teamOf(seat)` whole hand; else if a trump is on the trick (winning, owned by opponent) → trumps beating it if any, else whole hand; else (no trump yet) → all trumps if any, else whole hand.

- [ ] **Step 1: Failing tests** (contract `'H'` unless noted):
  - `must follow suit` — lead 7S, hand [AS, JH, 8D] → [AS].
  - `must trump when opponent wins` — seat 1, trick [{0,'AS'}], hand [JH,8D] → [JH].
  - `partner winning frees discard` — seat 2, trick [{0,'AS'},{1,'7S'}], hand [JH,8D] → [JH,8D].
  - `must overtrump opponent trump` — seat 2, trick [{0,'7S'},{1,'9H'}], hand [JH,7H,8D] → [JH].
  - `cannot overtrump → any card` — trick [{0,'7S'},{1,'JH'}], hand [9H,8D] (seat 2) → [9H,8D].
  - `trump led must be raised` — trick [{0,'AH'}], hand [JH,7H,8D] → [JH]; hand [7H,8D] → [7H].
  - `NT only follow` — NT, trick [{0,'10S'}], hand [7S,AS,AH] → [7S,AS].
  - `AT must beat in led suit` — AT, trick [{0,'AS'}], hand [7S,9S] → [9S]; hand [7S,8S] → [7S,8S]; hand [AH] → [AH].
  - `trickWinner` cases: trump beats ace; off-suit ace loses to led 7; AT J of led suit wins.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat(engine): legal cards and trick winner`.

---

### Task 4: Declarations and Белот

**Files:** Create `packages/engine/src/declarations.ts`; Test `packages/engine/test/declarations.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DeclKind = 'tierce' | 'quarte' | 'quint' | 'carre';
  export interface Declaration { id: string; kind: DeclKind; cards: Card[]; points: number }
  // id = kind + ':' + cards sorted joined by ',' — stable, used by client to choose
  export function findDeclarations(hand: Card[], contract: Contract): Declaration[];   // [] for NT
  export function isDisjoint(decls: Declaration[]): boolean;
  export function resolveDeclarations(declared: { seat: Seat; decl: Declaration }[]): { points: [number, number]; valid: { seat: Seat; decl: Declaration }[] };
  export function canDeclareBelot(hand: Card[], card: Card, trick: PlayedCard[], contract: Contract): boolean;
  ```
- Points: tierce 20, quarte 50, quint 100; carre 10/Q/K/A 100, 9s 150, Js 200; no carre of 7/8.
- Sequences use natural order. Per suit run of length L: L 3→tierce, 4→quarte, 5–7→quint of top 5 cards, 8→quint (top 5) + tierce (bottom 3).
- `resolveDeclarations`: sequences — compare each team's best (length, then top `naturalIndex`); strictly better team scores all its sequences; equal → none. Carrés — team with the strongest carré by trump strength (J>9>A>10>K>Q) scores all its carrés. Carrés and sequences resolved independently.
- `canDeclareBelot`: contract ≠ NT; card rank K or Q; partner (Q/K of same suit) still in `hand`; suit is trump (suit contract) or any (AT); and (trick empty, or `suitOf(card)` = led suit, or suit contract and card is trump).

- [ ] **Step 1: Failing tests:**
  - `finds tierce quarte quint` — hand [7H,8H,9H, JS,QS,KS,AS, 10D] contract 'C' → tierce(20) + quarte(50).
  - `run of 6 gives top-5 quint`; `run of 8 gives quint + tierce`.
  - `carre values` — four Js 200, four 9s 150, four As 100, four 8s none.
  - `nothing in NT`.
  - `overlap must choose` — [JH,JS,JD,JC,QH,KH] → carré and tierce both offered; `isDisjoint([carre, tierce]) === false`.
  - `longer sequence wins all` — team0 quarte, team1 tierce+tierce → points [50, 0].
  - `equal best sequence cancels` — team0 tierce 8-10H, team1 tierce 8-10S → [0,0].
  - `higher top wins equal length` — tierce to K vs tierce to Q → K side scores.
  - `carre does not cancel sequence` — team0 carré Q, team1 quint → [100, 100].
  - `stronger carre wins` — team0 carré 9 (150), team1 carré A (100) → [150, 0].
  - `belot eligibility` — 'H': KH lead with QH in hand → true; KH discarded on spade lead (not trump? it IS trump → trumping) → true; 'H' KS with QS → false; AT KS led with QS → true; AT KS discarded on heart lead → false; NT → false; QH already played (not in hand) → false.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat(engine): declarations and belot`.

---

### Task 5: Hand scoring and rounding

**Files:** Create `packages/engine/src/scoring.ts`; Test `packages/engine/test/scoring.test.ts`

**Interfaces:**
- Consumes: `cardPoints`, `teamOf`, `resolveDeclarations`.
- Produces:
  ```ts
  export interface TeamBreakdown { cards: number; lastTen: number; declarations: number; belot: number; valat: number; total: number }
  export type Outcome = 'made' | 'inside' | 'hanging';
  export interface HandResult {
    contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4;
    breakdown: [TeamBreakdown, TeamBreakdown];
    outcome: Outcome;
    gamePoints: [number, number];        // added to scores this hand (incl. any pot awarded)
    potAwarded: { team: Team; amount: number } | null;
    hangingPotAfter: number;
    valatTeam: Team | null;
  }
  export interface ScoreInput {
    contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4;
    tricks: { cards: PlayedCard[]; winner: Seat }[];   // 8
    declared: { seat: Seat; decl: Declaration }[];
    belots: Seat[];
    hangingPot: number;
  }
  export function roundTeam(contract: Contract, mine: number, theirs: number, isDefenderOnTie: boolean): number;
  export function scoreHand(input: ScoreInput): HandResult;
  ```
- Rounding `r(x, t) = Math.floor(x/10) + (x % 10 >= t ? 1 : 0)`. `roundTeam`: suit → fewer t=6, more t=7; AT → fewer t=4, more t=5; NT → t=5; on tie: defender uses the "more" threshold, bidder the "fewer" one.
- Breakdown: `cards` = card points won; `lastTen` 10 to winner of trick 8; NT doubles `cards + lastTen`; `valat` 90 to team winning all 8 (never doubled by NT); declarations from `resolveDeclarations` (0 for NT); `belot` 20 × belots per team.
- Outcome with B = bidder team total, D = defender total:
  - multiplier 1: B > D made → each `roundTeam`; B < D inside → defenders get `r(B+D, 5)`, bidders 0; B = D hanging → defenders `roundTeam(..., true)`, bidders' `roundTeam(..., false)` added to pot, bidders 0.
  - multiplier 2/4: higher team gets `r(B+D, 5) * multiplier`, other 0; tie → pot += `r(B+D,5) * multiplier`, nobody scores. Outcome 'made' if bidders took it, 'inside' if defenders.
  - Pot award: if outcome is not hanging and `hangingPot > 0`, add pot to the winning team (made → bidder team, inside → defender team); `hangingPotAfter = 0`. If hanging, `hangingPotAfter = hangingPot + held`.

- [ ] **Step 1: Failing tests:**
  - `roundTeam table` — `roundTeam('H',86,76,false)===8`, `roundTeam('H',76,86,false)===8`, `roundTeam('H',77,85,false)===8`, `roundTeam('H',85,77,false)===8`, `roundTeam('H',97,65,false)===10`, `roundTeam('AT',134,124,false)===13`, `('AT',124,134)===13`; `('NT',136,124)===14`, `('NT',124,136)===12`; ties: `('H',106,106,true)===10`, `('H',106,106,false)===11`, `('AT',154,154,true)===15`, `('AT',154,154,false)===16`, `('H',81,81,true)===8`.
  - `made suit hand` — build tricks so bidders have 100 card pts incl last 10, defenders 62 → made, gamePoints [10, 6] (order by team).
  - `inside gives all to defenders` — bidders 70 vs 92 → defenders 16, bidders 0.
  - `declarations of failed bidders go to defenders`.
  - `NT doubles card points not valat` — valat in NT: valat team total = 260 + 90 = 350.
  - `valat adds 90`.
  - `contra winner takes doubled pot` — suit, multiplier 2, defenders win → defenders `16*2 = 32`.
  - `hanging stores pot and next made hand collects it` — call scoreHand with tie → pot 8; next call with `hangingPot: 8`, made by bidders → their gamePoints include +8, `hangingPotAfter 0`.
  - `belot always counts` — team with belot but losing sequences still gets 20.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat(engine): hand scoring and rounding`.

---

### Task 6: Game reducer, views, property test

**Files:** Create `packages/engine/src/game.ts`, `packages/engine/src/view.ts`; Test `packages/engine/test/game.test.ts`, `packages/engine/test/game.property.test.ts`

**Interfaces:**
- Consumes: all prior engine modules.
- Produces:
  ```ts
  export type Phase = 'cut' | 'bidding' | 'playing' | 'handEnd' | 'gameOver';
  export type GameAction =
    | { type: 'cut'; index: number }
    | BidAction
    | { type: 'play'; card: Card; declarations?: string[]; belot?: boolean }
    | { type: 'continue' }
    | { type: 'newGame' };
  export interface Announcement { seat: Seat; kind: DeclKind | 'belot'; trick: number }
  export interface GameState {
    phase: Phase; dealer: Seat; turn: Seat;
    deck: Card[]; hands: Card[][];                 // hands in dealt order
    bidding: BiddingState | null;
    contract: { contract: Contract; bidder: Seat; multiplier: 1 | 2 | 4 } | null;
    trick: PlayedCard[]; tricks: { cards: PlayedCard[]; winner: Seat }[];
    declared: { seat: Seat; decl: Declaration }[]; belots: Seat[]; announcements: Announcement[];
    scores: [number, number]; hangingPot: number;
    history: HandResult[]; lastResult: HandResult | null; winner: Team | null;
  }
  export function newGame(rng: Rng): GameState;   // shuffled deck, dealer = floor(rng()*4), phase 'cut'
  export function cutterOf(s: GameState): Seat;   // (dealer + 3) % 4
  export function applyAction(s: GameState, seat: Seat, a: GameAction, rng: Rng): { ok: true; state: GameState } | { ok: false; error: string };
  // view.ts
  export interface PlayerView {
    seat: Seat; phase: Phase; dealer: Seat; turn: Seat; cutter: Seat;
    hand: Card[];                                  // sorted: by suit (contract trump last), then cardStrength desc
    handCounts: [number, number, number, number];
    bidding: BiddingState | null; contract: GameState['contract'];
    trick: PlayedCard[]; lastTrick: { cards: PlayedCard[]; winner: Seat } | null;
    tricksWon: [number, number];
    announcements: Announcement[];
    revealedDeclarations: { seat: Seat; decl: Declaration }[];   // empty until tricks.length >= 1
    scores: [number, number]; hangingPot: number; history: HandResult[]; lastResult: HandResult | null; winner: Team | null;
    legal: { cards: Card[]; bids: LegalBids | null; declarations: Declaration[]; belotCards: Card[]; canCut: boolean; canContinue: boolean; canNewGame: boolean };
  }
  export function viewFor(s: GameState, seat: Seat): PlayerView;
  ```
- Transitions (spec §"Game flow"):
  - `cut` (phase cut, seat = cutter): cutDeck → deal 3 → deal 2 → phase bidding, `startBidding(dealer)`.
  - bid actions (phase bidding): `applyBid`; on `allPass` → `deck = gatherAfterThrowIn(hands, dealer, deck)`, hands empty, `dealer = nextSeat(dealer)`, phase cut. On contract → deal 3, phase playing, turn `nextSeat(dealer)`.
  - `play` (phase playing, seat = turn): card ∈ `legalCards`; if `declarations` given: only allowed on the player's first card of the hand (trick 0), ids ⊆ `findDeclarations(hand at that moment)`, `isDisjoint` — push to `declared` and `announcements`; if `belot` true: must satisfy `canDeclareBelot`, push seat to `belots` + announcement. After 4 cards: winner leads; after 8 tricks: `scoreHand`, scores += gamePoints, `hangingPot = hangingPotAfter`, push history, phase handEnd. Game over check at hand end: `valatTeam === null && max(scores) >= 151 && scores[0] !== scores[1]` → `winner`, phase gameOver (if hanging pot remains it is discarded).
  - `continue` (phase handEnd, any seat): `deck = gatherAfterPlay(tricks.map(t => t.cards))`, reset hand fields, `dealer = nextSeat(dealer)`, phase cut.
  - `newGame` (phase gameOver, any seat): `newGame(rng)`.
- Every rejected action returns `{ ok: false }` and never mutates input (clone with `structuredClone` first).

- [ ] **Step 1: Failing tests (game.test.ts)** using a fixed rng (`mulberry32(seed)` helper in test):
  - `new game starts at cut with 32-card deck`.
  - `cut deals 5 each and starts bidding right of dealer`.
  - `all pass throws in, rotates dealer, keeps 32 cards in gathered order` (assert deck equals `gatherAfterThrowIn` of the hands).
  - `contract deals to 8 and first lead is right of dealer`.
  - `rejects out-of-turn and repeated actions` — play by wrong seat → error; same card twice → error; state object deep-equal before/after.
  - `rejects illegal card`.
  - `declarations only on first card` — second card with declarations → error.
  - `full hand ends in handEnd with history entry; continue gathers deck in play order and rotates dealer`.
  - `game continues after valat over 151` — construct state with scores [140, 0], force valat hand → phase handEnd not gameOver.
  - `view hides other hands` — `JSON.stringify(viewFor(s,0))` contains none of seat 1's cards; contains `handCounts`.
  - `revealed declarations only after first trick`.
- [ ] **Step 2: Property test (game.property.test.ts):** for seeds 1..200: loop picking a random legal action (cut index random 1..31, random from `legal.bids`, random from `legal.cards` with declarations sometimes, continue) until gameOver or 2000 actions. Assert: never `ok:false`; at every hand end `cards + lastTen` summed over both teams equals 162 (suit), 258 (AT) or 260 (NT); `deck + hands + trick + tricks` always = 32 distinct cards; reaches gameOver for every seed.
- [ ] **Step 3:** FAIL. **Step 4:** Implement `game.ts`, `view.ts`, export from index. **Step 5:** PASS (all engine tests). **Step 6:** Commit `feat(engine): game reducer and player views`.

---

### Task 7: Server (table + Socket.IO)

**Files:** Create `packages/server/{package.json,tsconfig.json}`, `src/table.ts`, `src/server.ts`, `src/index.ts`; Test `test/table.test.ts`, `test/server.test.ts`

**Interfaces:**
- Consumes: `@belot/engine` (`newGame`, `applyAction`, `viewFor`, `GameAction`, `PlayerView`, `Seat`).
- Produces (protocol, used by client Task 8):
  ```ts
  export interface PublicSeat { name: string; connected: boolean }
  export interface TableMessage { seats: (PublicSeat | null)[]; mySeat: Seat | null; view: PlayerView | null }
  // client → server events
  'hello'      { token: string }
  'sit'        { seat: Seat; name: string }        // empty seat (pre-game) or takeover of a disconnected seat
  'leave'      {}                                  // only before game starts
  'action'     GameAction
  'resetTable' {}
  // server → client
  'table'      TableMessage
  'error'      { message: string }                 // Bulgarian text
  ```
- `Table` class (no sockets): `hello(token): Seat | null` (marks connected), `disconnect(token)`, `sit(token, seat, name): string | null` (error or null), `leave(token)`, `act(token, action): string | null`, `reset()`, `messageFor(token): TableMessage`. Game auto-created via `newGame(rng)` when 4th seat filled. Takeover: allowed only when game exists and target seat `connected === false`; replaces token and name kept? → name replaced with new name. Errors in Bulgarian (e.g. `'Мястото е заето'`, `'Не е твой ред'` — pass engine errors through a small map, default `'Невалиден ход'`).
- `createServer(port: number): Promise<{ port: number; close(): Promise<void> }>` — Express serves `../client/dist` if it exists; Socket.IO on same http server; after every handled event broadcasts `table` to each connected socket with its own `messageFor`. Socket→token map; `disconnect` event → `table.disconnect`.
- Scripts: `dev: tsx watch src/index.ts`, `start: tsx src/index.ts`, `test: vitest run`, `typecheck`. Deps: `express socket.io tsx @belot/engine`; dev: `socket.io-client vitest @types/express`.

- [ ] **Step 1: Failing tests (table.test.ts):** `fourth seat starts game`; `cannot sit in a connected seat`; `leave only before game`; `disconnected seat can be taken over and old token loses access`; `reconnect restores seat and view` (hello with same token after disconnect → same seat, view.hand equal); `messageFor hides other hands`; `reset clears seats and game`.
- [ ] **Step 2: Failing test (server.test.ts):** start on port 0, connect 4 `socket.io-client`s with tokens t0..t3, each `hello` + `sit`, then drive a full game: on each `table` message, the client whose seat must act sends a random legal action from `view.legal` (cut, bid/pass, card, continue). Expect a `table` message with `view.phase === 'gameOver'` within 30 s. Second test: disconnect client 2 mid-game, reconnect with token t2 → receives same `mySeat` and non-empty hand.
- [ ] **Step 3:** FAIL. **Step 4:** Implement. **Step 5:** PASS. **Step 6:** Commit `feat(server): single-table socket server`.

---

### Task 8: Client shell — connection, join screen, i18n

**Files:** Create `packages/client/{package.json,tsconfig.json,vite.config.ts,index.html}`, `src/{main.tsx,App.tsx,net.ts,layout.ts,styles.css}`, `src/i18n/bg.ts`, `src/components/{JoinScreen.tsx,Menu.tsx}`; Test `packages/client/test/layout.test.ts`

**Interfaces:**
- Consumes: `TableMessage`, events from Task 7; types from `@belot/engine`.
- Produces:
  - `net.ts`: `useTable(): { msg: TableMessage | null; connected: boolean; error: string | null; sit(seat, name); leave(); act(a: GameAction); resetTable() }`. Token: `localStorage` key `belot-token` + optional `?slot=N` suffix (lets one browser test 4 seats in 4 tabs); generated with `crypto.randomUUID()`. Sends `hello` on every (re)connect.
  - `layout.ts`: `relativePosition(me: Seat, seat: Seat): 'bottom' | 'right' | 'top' | 'left'` → offsets 0,1,2,3.
  - `bg.ts`: `export const bg = { contracts: { C:'Спатия', D:'Каро', H:'Купа', S:'Пика', NT:'Без коз', AT:'Всичко коз' }, pass:'Пас', contra:'Контра', recontra:'Реконтра', decl: { tierce:'Терца', quarte:'Кварта', quint:'Квинта', carre:'Каре', belot:'Белот' }, outcome: { made:'Изкарана', inside:'Вътре', hanging:'Висяща' }, us:'Ние', them:'Вие', cut:'Цепи', cutting:(n)=>`${n} цепи…`, yourTurn:'Твой ред', waiting:'изчаква…', tableFull:'Масата е пълна', namePlaceholder:'Твоето име', sitHere:'Седни тук', takeSeat:(n)=>`Заеми мястото на ${n}?`, continue:'Продължи', newGame:'Нова игра', resetTable:'Нулирай масата', resetConfirm:'Сигурни ли сте? Играта ще бъде изтрита.', lastTrick:'Последна взятка', valat:'Капо', lastTen:'Последни 10', cards:'Карти', total:'Общо', declarations:'Анонси', winnerUs:'Победа!', winnerThem:'Загуба', leave:'Стани' }`.
  - Vite dev proxy `/socket.io` → `http://localhost:3001` (ws: true). Root `package.json` scripts: `dev` runs server + client (`concurrently`), `start` runs server (serving `packages/client/dist`).
- JoinScreen: name input (persisted in localStorage), table diagram with 4 seats showing names/connected; empty seat → "Седни тук"; disconnected seat during game → takeover with `confirm(bg.takeSeat(name))`. Shows "Масата е пълна" when no seat available. "Стани" for own seat before game starts.
- Menu: top-left button opening a small menu with "Нулирай масата" (confirm).

- [ ] **Step 1: Failing test:** `relativePosition(2, 3) === 'right'`, `(2, 0) === 'top'`, `(2, 1) === 'left'`, `(2, 2) === 'bottom'`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement files above; App shows JoinScreen until `msg.view` exists, else placeholder "Table" div.
- [ ] **Step 4:** Test PASS; `npm run build -w @belot/client` succeeds; manual: `npm run dev`, open 4 tabs `?slot=1..4`, sit in each → server logs game start, all tabs leave join screen.
- [ ] **Step 5:** Commit `feat(client): connection, join screen, i18n`.

---

### Task 9: Client table — cards, hand, opponents, trick, cut, bidding

**Files:** Create `src/components/{Card.tsx,Hand.tsx,Opponent.tsx,TrickArea.tsx,CutPicker.tsx,BiddingPanel.tsx,Table.tsx}`; Modify `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `PlayerView`, `useTable().act`, `relativePosition`, `bg`.
- Produces: `<Table msg act />` used by App; `<Card card faceDown? size? highlighted? dimmed? onClick? />` used by later components.
- Visual spec (spec §"Client UI"): green felt radial gradient; cards CSS-drawn (white rounded rect, rank + suit symbol corner and big centre symbol, ♥♦ red, ♣♠ near-black), back = patterned dark red. Desktop hand fanned bottom; opponents show name, connected badge (`bg.waiting` when disconnected), dealer chip "Р", card backs count, turn glow. Trick area: each played card offset toward its player; when `trick` becomes empty and `lastTrick` changed, keep showing `lastTrick` for 1200 ms then slide toward winner (client-only state). Contract badge top-centre: `♥ Купа — {name}` + `×2 Контра` / `×4 Реконтра`.
- CutPicker: visible to all in phase cut; cutter sees 32 overlapping backs, hover lifts, click at index i → `act({type:'cut', index:i})` (i in 1..31); others see `bg.cutting(name)`.
- BiddingPanel: shown in phase bidding; six contract buttons with suit symbols (enabled iff in `legal.bids.contracts`), Пас/Контра/Реконтра per flags; shows bidding history as bubbles by each player (last action per seat).
- Hand: in phase playing, cards in `legal.cards` raised and clickable, others dimmed. Click → `act({type:'play', card})` (declaration/belot prompt is Task 10).

- [ ] **Step 1:** Implement components; Table composes them by `relativePosition`.
- [ ] **Step 2:** `npm run build -w @belot/client` passes (tsc + vite).
- [ ] **Step 3: Manual verification** with 4 tabs: cut, bid, see contract badge, play a full hand of 8 tricks with legal-card highlighting; disconnected tab shows `изчаква…` on others.
- [ ] **Step 4:** Commit `feat(client): table, cards, cut and bidding`.

---

### Task 10: Client — declarations, Белот, announcements, results, scoreboard

**Files:** Create `src/components/{DeclarationPrompt.tsx,Announcements.tsx,ScoreBoard.tsx,HandResultModal.tsx,GameOverModal.tsx,LastTrick.tsx}`; Modify `Hand.tsx`, `Table.tsx`, `styles.css`

**Interfaces:**
- Consumes: `PlayerView.legal.declarations`, `legal.belotCards`, `announcements`, `revealedDeclarations`, `history`, `lastResult`, `winner`, `scores`, `hangingPot`.
- Behaviour:
  - First card of the hand with non-empty `legal.declarations`: clicking a card opens DeclarationPrompt listing each declaration (`bg.decl[kind]` + mini cards) as checkboxes, with overlapping ones mutually exclusive (disable a box whose cards intersect a ticked one), buttons "Играй" / cancel → `act({type:'play', card, declarations: ids})`.
  - Clicking a card in `legal.belotCards`: prompt "Белот?" Да/Не (combined into the same prompt if both apply) → `belot: true|false`.
  - Announcements: speech bubble by the announcing player for 3 s (`bg.decl[kind]`), plus persistent list in side panel for the current hand; after trick 1, revealed declaration cards shown under each player's name for the rest of the hand.
  - ScoreBoard top-right: `Ние` / `Вие` from the viewer's team perspective, hanging pot shown if > 0 ("Висящи: N"), expandable history table (contract, bidder, both teams' game points, outcome label).
  - HandResultModal in phase handEnd: two-column breakdown (Карти, Последни 10, Анонси, Белот, Капо, Общо, game points, outcome); "Продължи" button → `act({type:'continue'})`.
  - GameOverModal in phase gameOver: winner text from viewer perspective, final scores, "Нова игра" → `act({type:'newGame'})`.
  - LastTrick button "Последна взятка" toggles a small overlay of `lastTrick`.

- [ ] **Step 1:** Implement. **Step 2:** Build passes.
- [ ] **Step 3: Manual verification:** deal until a hand with a declaration (use `?slot` tabs), declare, see bubble on others, see reveal after trick 1, finish hand, modal breakdown matches engine `lastResult`, continue → next hand cut by the right seat (dealer's left). Game-over modal is verified with the dev-only `?bot=1` query param (add in this task, `src/devBot.ts`): that tab auto-sends a random legal action 400 ms after its turn starts (cut, bid/pass, card, continue). Run 3 bot tabs + 1 human tab to reach 151 quickly.
- [ ] **Step 4:** Commit `feat(client): declarations, results and scoreboard`.

---

### Task 11: Responsive polish, production build, Dockerfile, README

**Files:** Modify `styles.css`, components as needed; Create `Dockerfile`, `.dockerignore`; Modify `README.md`, root `package.json`

- Phone (≤ 600 px wide, portrait 375×812): hand cards overlap to fit width, side opponents collapse to name + count chip, bidding panel wraps to 3×3 grid, modals full-width. No horizontal scroll.
- Production: `npm run build` builds client to `packages/client/dist`; `npm start` → server on `PORT` serves it. Dockerfile: `node:22-slim`, `npm ci`, `npm run build`, `CMD ["npm","start"]`, `EXPOSE 3001`.
- README: what it is, rules link, `npm install`, `npm run dev` (open `http://localhost:5173/?slot=1..4` to test alone), `npm start`, how friends join (share URL of a host/tunnel), Docker, tests.

- [ ] **Step 1:** Implement responsive CSS. **Step 2:** `npm test && npm run build` all green.
- [ ] **Step 3: Manual:** `npm start`, open `http://localhost:3001` in browser at desktop width and at 375×812; full hand playable at both, no horizontal scroll.
- [ ] **Step 4:** Commit `feat: responsive layout, production build, docker, readme`.
