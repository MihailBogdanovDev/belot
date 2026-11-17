# Known issues and follow-ups (v1)

Deferred minors from the per-task and final reviews. None block play.

## Gameplay / UX
- Pre-game seat takeover: a player who sits, then loses their browser storage before the game starts, can only recover by "Нулирай масата" (reset).
- Phone cut row: ~9px tap strip per card (any tap is a valid cut, so it works, just imprecise).
- Phone scoreboard chevron doesn't flip when expanded.
- Revealed declarations include ones cancelled by the comparison (scoring is correct; only the display shows all).
- Card ranks use Latin letters (J/Q/K/A) rather than Bulgarian (В/Д/П/А).
- Scoreboard toggle is a clickable div (no keyboard/a11y role).

## Engineering
- Root `dev` script uses POSIX `PORT=3001 ...` (won't work in Windows cmd).
- Docker image not yet built/verified (daemon was off). `npm start` inside the container doesn't forward SIGTERM; container runs as root.
- Test gaps (behaviour verified by reading/random play, but not pinned): contra tie, recontra ×4, pot to defenders on an inside hand, consecutive hanging hands, bidder on team 1, Белот alongside losing sequences, All-trumps 154/154 tie; several legal-card branches; client prompt logic; multi-socket refcount with auth + hello.
- Dev bot (`?bot=1`) never declares; it only continues from the dealer seat.
