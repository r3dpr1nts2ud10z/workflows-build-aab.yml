import { Link } from "wouter";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Nature of the Service",
    body: [
      "N3PSQAL3 (the \"Protocol\") is a private settlement clearinghouse for documented near-miss parlay outcomes. The Protocol is NOT a sportsbook, casino, gambling operator, or wagering service of any kind. No bets are placed, brokered, or facilitated through the Protocol. Settlements are discretionary goodwill payments computed from user-submitted documentation of wagers already concluded elsewhere.",
      "The Protocol does not guarantee any settlement, payout, yield, or return. All settlement fractions, tiers, and figures displayed are maximums subject to the risk controls described in Section 5.",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 21 years of age (or the age of majority for wagering activity in your jurisdiction, whichever is greater) and legally permitted to have placed the underlying wager you submit. By using the Protocol you represent and warrant that your use is lawful in your jurisdiction. You are solely responsible for compliance with all laws applicable to you.",
    ],
  },
  {
    title: "3. Receipt Authenticity",
    body: [
      "Every receipt you submit must be a truthful, accurate, and complete record of a real wager you personally placed: a parlay of five (5) or more legs that lost by exactly one (1) leg. Submitting fabricated, altered, duplicated, or third-party receipts is a material breach of these Terms.",
      "The Protocol may at any time — before or after settlement — demand supporting evidence (sportsbook screenshots, account statements, bet IDs). Failure to produce evidence on request voids the related receipt and any settlement derived from it, and the Protocol may reverse credited amounts, suspend the account, and permanently ban the user.",
    ],
  },
  {
    title: "4. Settlements, Attempts & Fees",
    body: [
      "Settlement executions are limited per UTC day according to your tier. An attempt is consumed when a settlement is executed OR when a settlement is routed to operator integrity review, regardless of outcome. Rejected reviews do not refund attempts.",
      "All settlements are subject to a 20% Protocol Integrity & Settlement fee deducted from the gross settlement value. Displayed tier fractions are applied to the potential payout before the fee. Account balances are protocol credits; withdrawal mechanics, timing, and minimums are at the operator's discretion and may require identity verification.",
    ],
  },
  {
    title: "5. Risk Controls (Black Swan Defenses)",
    body: [
      "To protect the solvency and integrity of the clearinghouse, all settlements pass through layered risk controls, including without limitation: (a) a hard per-receipt cap on gross settlement value; (b) a global daily settlement ceiling — when reached, further settlements are refused until the next UTC day; (c) mandatory operator integrity review for settlements above the auto-clear threshold; and (d) a reserve-coverage gate tying large payouts to the Protocol's fee treasury.",
      "Settlements held for review are quoted, not owed: the quoted amount is an offer that the operator may approve, adjust, or reject at sole discretion following review. Limits and thresholds may change at any time without notice, including retroactively for receipts not yet settled.",
    ],
  },
  {
    title: "6. Fair Use & Prohibited Conduct",
    body: [
      "You agree not to: create multiple accounts; use bots, scripts, or automation against the Protocol; probe, overload, or circumvent rate limits or risk controls; exploit bugs (report them instead); collude with other users to structure receipts around thresholds; or use the Protocol for money laundering or any unlawful purpose. Structuring — splitting or timing receipts to evade caps, ceilings, or review — is itself a breach.",
    ],
  },
  {
    title: "7. R0QQ3T & Astrological Content",
    body: [
      "R0QQ3T, the Agentic Zodiac Systems Assistant, provides AI-generated entertainment content. Nothing R0QQ3T produces — including zodiac readings, insights, or commentary — constitutes financial, legal, betting, or professional advice of any kind. Do not make wagering decisions based on R0QQ3T output.",
    ],
  },
  {
    title: "8. Account Suspension & Termination",
    body: [
      "The operator may suspend or terminate any account, refuse any receipt, and withhold or reverse any unsettled or fraudulently obtained balance at any time for breach of these Terms, suspected fraud, legal necessity, or protection of the Protocol. Where lawful, legitimately settled balances will be honored on terminated accounts after review.",
    ],
  },
  {
    title: "9. Disclaimers & Limitation of Liability",
    body: [
      "THE PROTOCOL IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR'S TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THE PROTOCOL SHALL NOT EXCEED THE GREATER OF (A) FEES YOU PAID IN THE PRECEDING THREE (3) MONTHS OR (B) ONE HUNDRED U.S. DOLLARS ($100). THE OPERATOR IS NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, NOR FOR GAMBLING LOSSES OF ANY KIND.",
      "Gambling involves risk of loss. If you or someone you know has a gambling problem, call or text 1-800-GAMBLER.",
    ],
  },
  {
    title: "10. Changes to These Terms",
    body: [
      "The operator may amend these Terms at any time by posting the revised version at this page. Continued use of the Protocol after changes are posted constitutes acceptance. Material changes to fees or settlement mechanics apply prospectively to receipts submitted after the change.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Link href="/">
          <Button
            variant="ghost"
            className="pl-0 mb-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Terms &amp; Conditions
          </h1>
        </div>
        <p className="text-muted-foreground mb-10 font-mono text-sm uppercase tracking-widest">
          N3PSQAL3 Protocol · Effective July 6, 2026
        </p>

        <div className="p-4 mb-10 rounded-lg border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
          By creating an account, submitting a receipt, or executing a
          settlement, you agree to be bound by these Terms &amp; Conditions in
          their entirety. If you do not agree, do not use the Protocol.
        </div>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-bold mb-3 text-primary">{s.title}</h2>
              <div className="space-y-3">
                {s.body.map((p, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border/50 text-xs text-muted-foreground">
          Questions about these Terms? Contact the operator through your
          account terminal. Gambling problem? Call or text 1-800-GAMBLER.
        </div>
      </div>
    </div>
  );
}
