# Belot Online — Design

Date: 2026-11-17. Rules reference: [docs/rules.md](../../rules.md).

## Intent
Mihail and friends play Bulgarian Belot regularly, each on their own device from different places. Rules must match how it is played at a Bulgarian table, including the house rule of **never reshuffling** between hands (gather in play order → cut → deal). Must look good; desktop is primary, phone must be usable.

## Goals
- One table, four seats, join by opening a link and typing a name.
- Full Bulgarian Belot: bidding with Контра/Реконтра, all six contracts, trick obligations, declarations, Белот, last 10, Капо, made/inside/hanging scoring with carry-over, game to 151.
- Deck continuity: one shuffle per game; cards gathered in play order; human cut each hand.
- Server is the only source of truth; clients see only their own hand.
- Survive drops: seat held, game waits, refresh/reopen restores everything.
- Bulgarian UI text.

## Non-goals (for now)
- Multiple rooms, lobby, matchmaking, accounts, bots, chat, turn timers, spectators, stats/history persistence, English UI, game state surviving a server restart.

## Anti-goals
- Any rule that differs from the Bulgarian table game without being a deliberate, documented choice.
- Leaking hidden information (other hands, deck order) to clients.
- Getting stuck: no state from which the table cannot continue or be reset.

## Approaches considered
1. **Server-authoritative Node + WebSocket, React client, shared TS rules engine (chosen).** One language end to end; the pure engine is unit-testable and runs only on the server; one process serves both static client and sockets. Needs an always-on host for regular play.
2. **Peer-to-peer (WebRTC) with one player's browser as host.** No server cost, but host closing the tab kills the game, hidden info is exposed to the host, NAT issues. Rejected: fragile and leaks hands.
3. **Hosted realtime backend (Firebase/Supabase).** No server to run, but rule enforcement and hidden hands need server functions anyway; more vendor glue than a 300-line socket server. Rejected.

## Architecture
npm workspaces monorepo, TypeScript everywhere.

```
packages/engine   pure rules: types, deck, bidding, play, declarations, scoring, reducer, views
packages/server   Node + Socket.IO; holds the one Table; serves built client
packages/client   React + Vite UI
```

- **engine**: no I/O, deterministic given an RNG passed in. `applyAction(state, seat, action) -> { state } | { error }`. `viewFor(state, seat)` returns a redacted per-player view (own hand, others' card counts, public table info). Built with TDD (Vitest).
- **server**: Socket.IO. Single in-memory `Table` = 4 seats (name, token, connected) + engine `GameState | null`. On every state change, emits each seat's `viewFor`. Validates via engine; rejects with error message.
- **client**: React + Vite. Receives views, renders, sends intents. No rules logic beyond what the view tells it (server sends `legalCards`, `legalBids`, `availableDeclarations` in the view).
- Production: `npm run build && npm start` → one Node process on `PORT` serving client + socket. Dockerfile included so it can go on any host (Fly.io/Render/Railway). Hosting setup itself is a follow-up (needs Mihail's account).

## Seats, joining, reconnect
- Seats 0–3. Teams: A = {0,2}, B = {1,3}. Counter-clockwise order: next player = `(seat+1)%4`.
- Screen layout from each player's perspective: me bottom, `me+1` on the **right**, `me+2` top, `me+3` left (counter-clockwise visually).
- Open link → enter name → click an empty seat. 5th person: "Масата е пълна" and can only watch the seat list.
- Client stores a random token in `localStorage`; on reconnect with the same token it reclaims its seat.
- Before game starts, a player may leave their seat. Game starts automatically when 4 seats are filled.
- Disconnected player: seat shows "изчаква…" badge; game simply waits when it is their turn (no timeout).
- **Seat takeover (my call)**: a newcomer without a token may click a *disconnected* seat → confirm "Заеми мястото на Иван?" → gets that seat, its hand and a new token; the old token stops working. Covers device switch / cleared storage without resetting the game.
- "Нулирай масата" (reset table) button in a menu, with confirm, available to any seated player: clears game and seats. Escape hatch for a player who never returns.
- After game end: result screen + "Нова игра" → same seats, new shuffle, first dealer random again.

## Game flow (engine phases)
1. **cut**: cutter = dealer's left = `(dealer+3)%4`. Chooses cut index 1..31 (UI: click on a spread deck). Deck becomes `deck[k:] + deck[:k]`.
2. **deal5**: automatic. From the top, 3 cards to each starting at `dealer+1` going counter-clockwise, then 2 to each.
3. **bidding**: starts at `dealer+1`. Actions: bid(contract) higher than current, pass, contra, recontra.
   - Contract order ♣ < ♦ < ♥ < ♠ < Без коз < Всичко коз.
   - Контра: only when the current highest bid belongs to the opponents and no contra on it yet. Реконтра: only by the bidding team on a contra'd bid.
   - A new higher bid clears contra/recontra (belot.bg rule).
   - Ends: 3 consecutive passes after the last bid/contra action, or immediately on recontra.
   - All 4 pass with no bid → **throw-in**: deck re-gathered (see "Deck continuity"), dealer moves to `dealer+1`, back to **cut**.
4. **deal3**: 3 more each, same order. Everyone has 8.
5. **play**: 8 tricks. First lead `dealer+1`; trick winner leads next.
   - Declarations may be made only with the player's first card (trick 1).
   - Белот declared when playing the first of K/Q pair (see below).
6. **handEnd**: score computed, shown to all; one click of "Продължи" by any player advances (my call). Gather deck, dealer moves to `dealer+1`, back to **cut**, unless game over.
7. **gameOver**: a team ≥151 after a hand that was not Капо and teams not tied.

## Deck continuity
- Game start: shuffle once (crypto RNG on server).
- After a played hand: deck = concatenation of the 8 tricks in the order they were played, each trick's 4 cards in the order played. (My call — Mihail confirmed the general rule; per-team piles was offered as an alternative and not chosen.)
- After a throw-in (my call; Mihail said any fixed automatic order is fine): deck = hands of `dealer+1, dealer+2, dealer+3, dealer` in that order, each hand in the order its cards were dealt, followed by the undealt 12 cards in their order.
- Then cut, then deal from top.

## Rules details the engine enforces
(Full tables in docs/rules.md.)
- **Legal cards**:
  - Must follow suit if able.
  - Suit contract, can't follow: if partner currently wins the trick → any card. Else (opponent winning): if no trump on the trick yet → must trump if able; if an opponent's trump is winning → must play a higher trump if able, otherwise any card (belot.bg rule; no forced undertrump). No trumps in hand → any card.
  - Suit contract, led suit is trump: must follow and must play higher trump if able (regardless of who wins). 
  - No trumps: follow suit only.
  - All trumps: follow suit and must beat the current best card of the led suit if able; can't follow → any card.
- **Declarations** (suit contracts and all trumps only): engine computes the player's available combos from their 8 cards at their first play: sequences (терца/кварта/квинта; 6–8 in a row count as квинта, 8 in a row = квинта + терца), карета (not 7/8). A card may be in both a каре and a sequence; when combos overlap within sequences, offer the max-value non-overlapping set. Player ticks which to announce. Announcement (type only, e.g. "Терца") is shown to all immediately. Exact cards revealed to all at the end of trick 1 (my call).
- **Declaration comparison** (end of trick 1 / scored at hand end): best sequence decides — only that team scores all its sequences; ties in length+top card → nobody scores sequences. Карета: only the team with the stronger каре scores its карета (strength by trump rank J>9>A>10>K>Q). Каре never cancels sequences.
- **Белот**: K+Q of trump (suit contract) or K+Q of any suit (all trumps). When playing the first of the two, client offers "Белот" toggle. Valid when that card is led, follows suit, or is played as a trump. Always scores 20, never cancelled. Not in no trumps.
- **Bonuses**: last trick 10; Капо +90 (team took all 8 tricks).
- **No trumps**: card points + last 10 are doubled; Капо bonus not doubled.

## Scoring
Per hand, compute raw totals for bidders (B) and defenders (D): card points + last 10 (+doubling for no trumps) + valid declarations + Белот + Капо.
- **Made** (B > D): each team gets its own points.
- **Inside** (B < D): D gets B + D; B gets 0.
- **Hanging** (B = D): D gets its own; B's points are held and added to whichever team "wins" the next hand (the team that ends with more points that hand); accumulate if the next hand also hangs.
- **Hanging details (my calls)**:
  - Pot is stored in **game points** (already rounded), engine field `hangingPot: number`.
  - "Winner of the next hand" = made → bidders; inside → defenders; contra/recontra → team taking the pot. If the next hand hangs again, its held points are added to the pot.
  - Throw-in hands don't count; pot waits for the next played hand.
  - Pot is added before the 151 check. If the game ends on a hanging hand (defenders reach 151), the pot is discarded.
  - Equal totals rounding (belot.bg): defenders round down, hanging side rounds up. Suit 106–106 → defenders 10, pot 11. All trumps 154–154 → defenders 15, pot 16. Ordinary 81–81 → 8 and 8.
- **Контра/Реконтра**: whichever team has more points takes everything × 2 / × 4 (premiums and Капо included). Tie under contra → whole multiplied pot hangs.
- **Rounding to game points (÷10)**:
  - Suit: team with fewer points rounds up from 6, team with more from 7.
  - All trumps: fewer from 4, more from 5.
  - No trumps: round half-up (from 5).
  - When one team takes everything (inside/contra), round the combined total half-up.
  - Engine exposes a single `roundPoints(contract, pointsA, pointsB)` with a test table; easy to adjust later if the group plays it differently.
- Game end at ≥151 (see phase 7). Score sheet shows each hand: contract, bidder, team points, made/inside/hanging.

## Client UI
- Green felt table, CSS/SVG cards (no image assets; big readable rank + suit, red ♥♦), card backs for others.
- Desktop: hand fanned at bottom, opponents' backs on sides/top, trick in centre with each card placed toward its player, scoreboard top-right ("Ние / Вие" running totals + expandable hand history), contract badge (e.g. "♥ — Петър, Контра").
- Bidding panel: six contract buttons (disabled if not legal), Пас, Контра, Реконтра.
- Playing: legal cards raised/highlighted, illegal dimmed; click to play. On first card, declaration checkboxes appear before confirming. Белот toggle when relevant.
- Announcements appear as speech bubbles by the player for a few seconds and stay listed in a side log.
- "Последна взятка" button to peek at the previous trick.
- Cut screen: deck spread as a row of backs; cutter clicks a point; others see "Петър цепи…".
- Hand-end modal: breakdown table (cards, declarations, белот, последни 10, капо, total, rounded, result).
- Phone: same components; hand scrolls/overlaps more tightly, side players shrink to name + count. Works in portrait at 375px wide.
- Bulgarian strings centralised in one `i18n/bg.ts` file.

## Protocol (Socket.IO events)
Client → server: `hello {token}`, `sit {seat, name}`, `leave`, `action {GameAction}`, `continue`, `newGame`, `resetTable`.
Server → client: `table {seats, me, view | null}` after every change; `error {message}`.
`GameAction` = `{type:'cut', index}` | `{type:'bid', contract}` | `{type:'pass'}` | `{type:'contra'}` | `{type:'recontra'}` | `{type:'play', card, declarations?: DeclarationId[], belot?: boolean}`.

## Testing
- Engine: TDD unit tests for every rule above (legal cards per contract, bidding transitions, declaration detection/comparison, scoring/rounding table, hanging carry-over, deck continuity, game end incl. Капо rule). Plus a property test: random legal play for many full games never errors and always conserves 32 cards / 162 points.
- Server: integration test with 4 `socket.io-client`s playing a full game via random legal moves; reconnect test.
- Client: build + type-check; manual check in browser with 4 tabs.

## Left to the builder
Exact component structure, styling details, animation, file layout inside packages, Socket.IO vs ws details, how the declaration overlap set is chosen (max value), Dockerfile specifics.
