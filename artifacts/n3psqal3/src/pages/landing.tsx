import { Link } from "wouter";
import { ShieldCheck, Lock, CreditCard, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/animated-logo";

const TRUST_ITEMS = [
  {
    icon: CreditCard,
    label: "Payments powered by Whop",
    detail: "Tier subscriptions run on Whop's payment rails — verified server-side, never client-trusted.",
  },
  {
    icon: ShieldCheck,
    label: "Server-verified settlements",
    detail: "Every receipt is validated by the protocol before a single credit moves.",
  },
  {
    icon: Lock,
    label: "Secured identity",
    detail: "Sign-in and sessions handled by Clerk — your credentials never touch our servers.",
  },
  {
    icon: ServerCog,
    label: "Atomic settlement engine",
    detail: "Attempt limits, risk caps, and circuit breakers enforced at the database level.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .bg-vid { display: none; }
          }
        `}</style>
        <video
          className="bg-vid absolute inset-0 w-full h-full object-cover opacity-90"
          src="/videos/visualizer.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/20 to-background/80" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatedLogo className="w-[110vmin] h-[110vmin] opacity-[0.07]" speed={22} decorative />
        </div>
      </div>

      <div className="z-10 text-center max-w-3xl mx-auto">
        <div className="mb-8 flex justify-center">
          <AnimatedLogo className="w-28 h-28" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          The <span className="cosmic-gradient-text">Near-Miss</span> Economy
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-light max-w-2xl mx-auto leading-relaxed">
          N3PSQAL3 is a hybrid clearinghouse protocol settling payouts for sports bettors who lost a 5+ leg parlay by exactly one leg.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 bg-gradient-to-r from-primary to-secondary text-black font-bold border-0 hover:opacity-90 rounded-full">
              Initialize Connection
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-primary/30 hover:border-primary/60 hover:bg-primary/10">
              Access Terminal
            </Button>
          </Link>
        </div>
        
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
            <h3 className="text-lg font-bold mb-2 text-primary">Verify</h3>
            <p className="text-muted-foreground text-sm">Submit your tragic 5+ leg parlay slips. The protocol validates the exact one-leg miss.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
            <h3 className="text-lg font-bold mb-2 text-secondary">Settle</h3>
            <p className="text-muted-foreground text-sm">Recover a tier-based fraction of the payout you almost won. Turn heartbreak into yield.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
            <h3 className="text-lg font-bold mb-2 text-primary">Ascend</h3>
            <p className="text-muted-foreground text-sm">Guided by R0QQ3T, the Agentic Zodiac Systems Assistant, leveraging your Starting 5 profile.</p>
          </div>
        </div>

        <div className="mt-20">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-6">
            Protocol Infrastructure
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {TRUST_ITEMS.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/60 flex flex-col gap-2"
              >
                <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold leading-snug">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-16 pb-8 text-center text-xs text-muted-foreground space-y-2">
          <p>
            <Link href="/terms">
              <span className="underline underline-offset-4 hover:text-foreground cursor-pointer">
                Terms &amp; Conditions
              </span>
            </Link>
          </p>
          <p>
            N3PSQAL3 is a settlement clearinghouse, not a gambling service.
            21+ only. Gambling problem? Call or text 1-800-GAMBLER.
          </p>
        </footer>
      </div>
    </div>
  );
}
