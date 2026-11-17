import { describe, expect, it } from 'vitest';
import { applyBid, biddingOutcome, legalBids, startBidding } from '../src/bidding.js';
import type { BidAction, BiddingState } from '../src/bidding.js';
import type { Seat } from '../src/types.js';

function run(dealer: Seat, steps: [Seat, BidAction][]): BiddingState {
  let s = startBidding(dealer);
  for (const [seat, a] of steps) {
    const r = applyBid(s, seat, a);
    if ('error' in r) throw new Error(r.error);
    s = r;
  }
  return s;
}
const pass: BidAction = { type: 'pass' };

describe('bidding', () => {
  it('starts right of dealer', () => {
    expect(startBidding(3).turn).toBe(0);
  });

  it('four passes is allPass', () => {
    const s = run(0, [[1, pass], [2, pass], [3, pass], [0, pass]]);
    expect(biddingOutcome(s)).toEqual({ kind: 'allPass' });
  });

  it('bid then three passes makes contract', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, pass], [3, pass], [0, pass]]);
    expect(biddingOutcome(s)).toEqual({ kind: 'contract', contract: 'H', bidder: 1, multiplier: 1 });
  });

  it('cannot bid equal or lower', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'S' }]]);
    expect('error' in applyBid(s, 2, { type: 'bid', contract: 'H' })).toBe(true);
    expect('error' in applyBid(s, 2, { type: 'bid', contract: 'S' })).toBe(true);
    expect(legalBids(s, 2).contracts).toEqual(['NT', 'AT']);
  });

  it('contra only vs opponents', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, pass]]);
    expect(legalBids(s, 3).contra).toBe(false); // partner of bidder
    const s2 = run(0, [[1, { type: 'bid', contract: 'H' }]]);
    expect(legalBids(s2, 2).contra).toBe(true);
    expect('error' in applyBid(s, 3, { type: 'contra' })).toBe(true);
  });

  it('contra then three passes -> multiplier 2', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, { type: 'contra' }], [3, pass], [0, pass], [1, pass]]);
    expect(biddingOutcome(s)).toEqual({ kind: 'contract', contract: 'H', bidder: 1, multiplier: 2 });
  });

  it('recontra ends bidding with multiplier 4', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, { type: 'contra' }], [3, pass], [0, pass]]);
    expect(legalBids(s, 1).recontra).toBe(true);
    const s2 = run(0, [[1, { type: 'bid', contract: 'H' }], [2, { type: 'contra' }], [3, pass], [0, pass], [1, { type: 'recontra' }]]);
    expect(biddingOutcome(s2)).toEqual({ kind: 'contract', contract: 'H', bidder: 1, multiplier: 4 });
  });

  it('higher bid after contra clears multiplier', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, { type: 'contra' }], [3, { type: 'bid', contract: 'NT' }]]);
    expect(s.multiplier).toBe(1);
    expect(s.passesInRow).toBe(0);
    expect(s.highest).toEqual({ contract: 'NT', seat: 3 });
  });

  it('out of turn is error', () => {
    expect('error' in applyBid(startBidding(0), 2, pass)).toBe(true);
    expect(legalBids(startBidding(0), 2)).toEqual({ contracts: [], pass: false, contra: false, recontra: false });
  });

  it('actions after outcome are errors', () => {
    const s = run(0, [[1, { type: 'bid', contract: 'H' }], [2, pass], [3, pass], [0, pass]]);
    expect('error' in applyBid(s, 1, pass)).toBe(true);
    expect(legalBids(s, 1).pass).toBe(false);
  });
});
