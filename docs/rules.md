# Belot (Белот) — Bulgarian rules reference

Researched 2026-11-17. Primary source: belot.bg rules (BG + EN pages). Secondary: bg.wikipedia.org/wiki/Белот.
Belot has no official governing body; house rules vary by city. Items marked **[variant]** need a decision.

## Setup
- 4 players, 2 teams, partners sit opposite.
- 32-card deck: 7, 8, 9, 10, J, Q, K, A in ♣ ♦ ♥ ♠.
- Everything goes **counter-clockwise** (deal, bidding, play).

## No reshuffle (house rule, from Mihail)
- Deck is shuffled **only once**, before the first hand of a game.
- After a hand is played: cards are gathered **in the order they were played** (no shuffle). Next player **cuts** (цепи) and passes the deck to the next dealer.
- All pass: everyone throws in their 5 cards (gathered in a fixed seat order), then same gather → cut → deal.
- Effect: card clusters from the previous hand survive into the next — part of the game's feel.

## Deal
1. First hand only: shuffle. Every hand: player to the dealer's left cuts (цепи), dealer deals.
2. Deal 3 cards to each, then 2 to each → 5 cards.
3. Bidding.
4. If a contract stands: deal 3 more to each → 8 cards.
5. If all four pass: cards collected, next dealer (to the right) deals.
6. Dealer rotates counter-clockwise each hand.

## Bidding
- Starts with player to dealer's right; each player bids higher or passes.
- Contract order (low → high): **♣ Спатия < ♦ Каро < ♥ Купа < ♠ Пика < Без коз (No trumps) < Всичко коз (All trumps)**.
- **Контра** (×2): only against an opponent's standing bid. **Реконтра** (×4): bidding team answers a contra.
- After contra, higher bids still allowed (belot.bg). **[variant]** Burgas rule: contra blocks all but recontra.
- Ends after 3 consecutive passes following a bid, or on recontra.

## Card ranks and points
| Card | Trump (rank / pts) | Non-trump (rank / pts) |
|---|---|---|
| J | 1 / 20 | 5 / 2 |
| 9 | 2 / 14 | 6 / 0 |
| A | 3 / 11 | 1 / 11 |
| 10 | 4 / 10 | 2 / 10 |
| K | 5 / 4 | 3 / 4 |
| Q | 6 / 3 | 4 / 3 |
| 8 | 7 / 0 | 7 / 0 |
| 7 | 8 / 0 | 8 / 0 |

- Suit contract: 1 trump suit (62 pts) + 3 non-trump (30 each) + last 10 = **162**.
- No trumps: all suits non-trump: 120 + 10 = 130, **doubled → 260**.
- All trumps: all suits trump-ranked: 248 + 10 = **258**.

## Trick play
- Player to dealer's right leads first trick; trick winner leads next.
- **Must follow suit** in all contracts.
- **Suit contract**: can't follow → must trump *if opponents hold the trick*. If opponent already trumped → must overtrump if able; else any card. **Partner winning → may discard anything.**
- **No trumps**: only follow suit.
- **All trumps**: follow suit and **must play higher** than current best of that suit if able (regardless of who is winning).

## Declarations (анонси)
Announced when playing your **first card** of the hand (the card needn't be part of it). Only the type is announced; cards are revealed later. **None in No trumps** (except Belot is also invalid there).

| Declaration | Points |
|---|---|
| Терца (3 in sequence) | 20 |
| Кварта (4 in sequence) | 50 |
| Квинта / сто (5+ in sequence) | 100 |
| Каре of 10 / Q / K / A | 100 |
| Каре of 9s | 150 |
| Каре of Js | 200 |
| Белот (K+Q of trump; any suit in All trumps) | 20 |

- Sequence order: 7 8 9 10 J Q K A (natural, not trump order).
- 7s and 8s: no каре.
- 6–8 in a row: counts as квинта (8 in a row = квинта + терца per bg wiki).
- A card may serve both каре and sequence; player chooses. Каре does not cancel sequences.
- **Sequences comparison**: only the team with the best sequence scores *all* its sequences. Longer beats shorter; same length → higher top card; exact tie → nobody scores sequences.
- **Каре comparison**: only the higher каре scores.
- **Белот**: declared when playing the first of K/Q; always valid if declared (not cancelled). In suit contracts only when leading, following suit, or trumping with it.

## Bonuses
- Last trick: **10**.
- Valat / капо (one team takes all 8 tricks): **+90** (100 incl. last 10). Not doubled in No trumps.
- "С капо не се излиза": a game can't end on a valat hand; play another hand.

## Hand scoring
Compare bidding team's total (cards + declarations + bonuses) vs opponents':
- **Изкарана (made)**: bidders > opponents → each team records own points ÷10 rounded.
- **Вкарана / вътре (failed)**: bidders < opponents → opponents get **everything** (incl. bidders' declarations); bidders 0.
- **Висяща (hanging)**: equal → opponents record own points; bidders' points held and go to the winner of the next hand (accumulate if it hangs again).
- **Контра / реконтра**: winner of the hand takes the whole (doubled/quadrupled) pot, premiums included.

### Rounding (÷10)
- Suit contract: lower team rounds up from 6, higher team from 7 (e.g. 81-81 hangs; totals sum to 16).
- All trumps: lower team rounds up from 4, higher from 5 (totals sum to 26).
- No trumps: double first, then round from 5.
- **[variant]** belot.bg text is garbled on edge cases (e.g. 106-106, 154-154 hanging).

## Game end
- First team to **151+**. Both cross same hand → higher wins. Tie → keep playing.
- Can't win on a valat hand (see above).
- belot.bg online: 30s per move; tournament rounds capped at 7 hands.

## Open variants to decide
1. Contra blocks further bids? (belot.bg: no)
2. Exact rounding table edge cases.
3. Belot restrictions in suit contracts (must be in-trump play).
4. Cut procedure.
