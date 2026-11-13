import { useState } from "react";
import {
  useGetMe,
  useGetSubscription,
  useGetPayoutStatus,
  useOnboardPayouts,
  useWithdrawPayout,
  getGetMeQueryKey,
  getGetPayoutStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { User, LogOut, CreditCard, Banknote, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function CashOutCard({ balance, tier }: { balance: number; tier: string }) {
  const isDemo = tier === "demo";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGetPayoutStatus();
  const onboard = useOnboardPayouts();
  const withdraw = useWithdrawPayout();
  const [amount, setAmount] = useState("");

  const startOnboarding = () => {
    onboard.mutate(
      { data: { returnUrl: window.location.href } },
      {
        onSuccess: ({ url }) => {
          window.location.href = url;
        },
        onError: (err: any) => {
          toast({ title: "Couldn't start payout setup", description: err.error || err.message, variant: "destructive" });
        },
      },
    );
  };

  const doWithdraw = () => {
    const value = Number(amount);
    if (!(value > 0)) return;
    withdraw.mutate(
      { data: { amount: value } },
      {
        onSuccess: (result) => {
          toast({
            title: "Cash out sent",
            description: `$${result.amount.toFixed(2)} is on its way to your payout account.`,
          });
          setAmount("");
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPayoutStatusQueryKey() });
        },
        onError: (err: any) => {
          toast({
            title: "Cash out failed",
            description: err.error || err.message || "Unknown error",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" /> Cash Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDemo ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your settled balance of{" "}
              <span className="text-foreground font-semibold">${balance.toFixed(2)}</span>{" "}
              is being held on the ledger. Cash-outs are reserved for paid tiers — upgrade
              to Bronze or above to unlock withdrawals.
            </p>
            <Button asChild>
              <a href="/tiers">Upgrade to unlock cash-outs</a>
            </Button>
          </>
        ) : isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !status?.connected || !status.payoutsEnabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              {status?.connected
                ? "Your payout account needs a few more details before withdrawals unlock."
                : "Connect a payout account to receive your settled balance as real money."}
            </p>
            <Button onClick={startOnboarding} disabled={onboard.isPending}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {status?.connected ? "Finish payout setup" : "Set up payout account"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center pb-4 border-b border-border/50">
              <span className="text-muted-foreground">Payout account</span>
              <Badge variant="outline" className="border-green-500/50 text-green-500">ACTIVE</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="number"
                step="0.01"
                min="5"
                placeholder="Amount (min $5.00)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="sm:max-w-48"
              />
              <Button
                onClick={doWithdraw}
                disabled={withdraw.isPending || !(Number(amount) >= 5) || Number(amount) > balance}
              >
                {withdraw.isPending ? "Sending..." : "Withdraw"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Available: ${balance.toFixed(2)} · Minimum withdrawal $5.00 · Arrives via Stripe
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: sub, isLoading: subLoading } = useGetSubscription();
  const { signOut } = useClerk();

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your terminal settings.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userLoading ? <Skeleton className="h-32 w-full" /> : user && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">ID</label>
                  <p className="font-mono text-sm truncate">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{user.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Joined</label>
                  <p className="font-medium">{format(new Date(user.createdAt), "MMMM d, yyyy")}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-secondary" /> Protocol Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userLoading || subLoading ? <Skeleton className="h-32 w-full" /> : (
              <>
                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                  <span className="text-muted-foreground">Current Tier</span>
                  <Badge variant="outline" className="uppercase border-primary/50 text-primary">
                    {user?.tier}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                  <span className="text-muted-foreground">Settled Balance</span>
                  <span className="text-xl font-bold cosmic-gradient-text">${user?.balance.toFixed(2)}</span>
                </div>
                {sub?.active && sub.renewsAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Renews At</span>
                    <span className="font-medium">{format(new Date(sub.renewsAt), "MMM d, yyyy")}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {user && <CashOutCard balance={user.balance} tier={user.tier} />}
      </div>

      <div className="flex justify-end pt-8">
        <Button variant="destructive" onClick={() => signOut({ redirectUrl: "/" })}>
          <LogOut className="w-4 h-4 mr-2" /> Disconnect Terminal
        </Button>
      </div>
    </div>
  );
}