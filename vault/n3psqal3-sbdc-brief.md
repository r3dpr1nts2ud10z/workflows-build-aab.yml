# N3PSQAL3 — Business Brief
### Prepared for Binghamton SBDC advisory call

---

## What it is (plain terms)
N3PSQAL3 is a **web-based entertainment platform for sports bettors whose parlay bets almost won**. A user whose multi-leg parlay lost by a single leg ("a near miss") submits their betting slip to the site. The platform independently verifies the slip against real sportsbook odds, reviews it for integrity, and **settles it for a fraction of what the full parlay would have paid** — credited to their account balance on the platform.

The pitch in one line: *"Your buzzer beater bounced out. We still pay the moral victory."*

Tagline: **Verify. Settle. Ascend.**

## How it makes money
- **Subscription tiers (primary revenue)** — sold through Whop (a commerce platform):
  | Tier | Price/mo | Daily attempts | Settlement fraction |
  |---|---|---|---|
  | Demo | Free | 1 | 1/16 of parlay payout |
  | Bronze | $5 | 3 | 1/8 |
  | Silver | $10 | 5 | 1/4 |
  | Gold | $50 | 10 | 1/2 |
  | Diamond | $100 | Unlimited | 1/2 |
- **20% "Protocol Integrity & Settlement" fee** taken on every settlement.
- Free-tier users can win balance but **cannot cash out** — withdrawal rights are a paid-tier benefit (converts luck into subscriptions).

## Current status (all built and live)
- Live production website with user accounts (Clerk auth), tier subscriptions (Whop), receipt verification engine with an independent odds cross-check, integrity review flow, and a settlement ledger.
- **Cash-out rail built on Stripe Connect** — the same payout infrastructure major sportsbooks use — code-reviewed for money-safety; awaiting final live-mode activation (in progress with platform support).
- First receipt verified and settled end-to-end (founder's own ticket, $100 net).
- Brand assets in motion: mascot ("the Fox"), video promos, consistent visual identity.
- Sole founder/operator; built on Replit infrastructure.

## The questions to ask the SBDC (in priority order)
1. **Regulatory / licensing (the big one):** "My platform pays users based on the outcomes of sports events they bet on elsewhere. I don't take wagers myself — users pay a subscription and I settle their already-lost slips at a fraction. Does this constitute gambling, a sweepstakes, or a promotional game under New York law? What's the right entity and counsel to answer this definitively, and are there SBDC-affiliated attorneys who do a free first consult?"
2. **Entity formation:** "I'm currently operating as an individual. What structure (LLC vs. other) fits a platform handling user balances and payouts, and what does that cost to set up in New York?"
3. **Financial exposure:** "My business model pays out on chance-based outcomes — how do I model and reserve for payout liability so subscriptions stay ahead of settlements?" (Show them the tier table — fractions and daily caps are the liability controls.)
4. **Funding & programs:** "Are there NY state small-business grants, competitions, or micro-loans a pre-revenue digital platform qualifies for?"
5. **First-customer strategy:** "My market is sports bettors on social media. Any SBDC marketing resources or local programs for customer acquisition on a $0 budget?"

## Framing guidance for the call
- Lead with **"entertainment platform / clearinghouse for settling near-miss betting receipts"** — accurate and neutral. Let *them* raise the gambling-law question; answer honestly when they do. Do not present it as a betting site, because it isn't one — no wagers are placed on the platform.
- Be upfront that payout liability vs. subscription revenue is the core economic question — SBDC advisors respect a founder who names their own risk.
- Ask for a referral to a **gaming/sweepstakes attorney** — that referral alone makes the call worth it.

## Key numbers if asked
- Revenue to date: $0 (pre-revenue; platform launched, first paying customers pending)
- Cost structure: platform hosting + payment processing fees; no employees
- Unit economics: a Bronze user pays $60/yr; their max daily exposure is capped by attempts × 1/8 fraction × per-receipt cap
