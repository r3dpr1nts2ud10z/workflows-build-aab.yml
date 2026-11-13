import {
  useGetCommandCenter,
  getGetCommandCenterQueryKey,
  useGetReviewQueue,
  getGetReviewQueueQueryKey,
  useReviewReceipt,
  useGetMe,
  useListAds,
  getListAdsQueryKey,
  useCreateAd,
  useUpdateAd,
  useSetSettlementPause,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ShieldCheck, TrendingUp, Users, Percent, Rocket, Landmark, Gauge, Scale, CheckCircle2, XCircle, Droplets, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ZetaOverviewWidget } from "@/components/zeta-overview-widget";

function shortDate(d: string): string {
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

export default function CommandCenterPage() {
  const { data: me, isLoading: loadingMe } = useGetMe();
  const { data, isLoading, error } = useGetCommandCenter({
    query: {
      queryKey: getGetCommandCenterQueryKey(),
      enabled: !!me?.isAdmin,
    },
  });
  const { data: queue } = useGetReviewQueue({
    query: {
      queryKey: getGetReviewQueueQueryKey(),
      enabled: !!me?.isAdmin,
    },
  });
  const reviewReceipt = useReviewReceipt();
  const setSettlementPause = useSetSettlementPause();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const togglePause = (paused: boolean) => {
    setSettlementPause.mutate(
      { data: { paused } },
      {
        onSuccess: () => {
          toast({
            title: paused ? "Settlements paused" : "Settlements resumed",
            description: paused
              ? "All automatic settlements are now halted."
              : "Automatic settlements are live again.",
          });
          queryClient.invalidateQueries({
            queryKey: getGetCommandCenterQueryKey(),
          });
        },
        onError: (err: any) => {
          toast({
            title: "Could not update settlement state",
            description: err?.error || err?.message || "Unknown error",
            variant: "destructive",
          });
        },
      },
    );
  };

  const decide = (id: number, action: "approve" | "reject") => {
    reviewReceipt.mutate(
      { id, data: { action } },
      {
        onSuccess: () => {
          toast({
            title: action === "approve" ? "Settlement cleared" : "Receipt rejected",
            description:
              action === "approve"
                ? `Receipt #${id} settled at its quoted terms.`
                : `Receipt #${id} was rejected by integrity review.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetReviewQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCommandCenterQueryKey() });
        },
        onError: (err: any) => {
          toast({
            title: "Review action failed",
            description: err?.error || err?.message || "Unknown error",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (loadingMe) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!me?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const roqqetStatusColor =
    data?.roqqet.status === "online"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : data?.roqqet.status === "degraded"
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Operator telemetry — Protocol Integrity &amp; Settlement oversight.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-center text-destructive">
            {(error as Error).message || "Failed to load command center."}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <ZetaOverviewWidget />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20 neon-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Yield
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${data.todayYield.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Settled payouts today (net to users)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fee Treasury
                </CardTitle>
                <Landmark className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${data.feeBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(data.feeRate * 100).toFixed(0)}% Protocol Integrity &amp;
                  Settlement fee
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Visitor Velocity
                </CardTitle>
                <Users className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.visitorVelocity.today}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    unique today
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.visitorVelocity.changePct == null
                    ? `vs ${data.visitorVelocity.yesterday} yesterday`
                    : `${data.visitorVelocity.changePct >= 0 ? "+" : ""}${data.visitorVelocity.changePct}% vs yesterday (${data.visitorVelocity.yesterday})`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Near-Miss Conversion
                </CardTitle>
                <Percent className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.conversion.settlementRate == null
                    ? "—"
                    : `${data.conversion.settlementRate}%`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.conversion.settledReceipts}/
                  {data.conversion.totalReceipts} receipts settled ·{" "}
                  {data.conversion.signupToSubmitRate == null
                    ? "—"
                    : `${data.conversion.signupToSubmitRate}%`}{" "}
                  of {data.conversion.totalUsers} users submitting
                </p>
              </CardContent>
            </Card>
          </div>

          <Card
            className={`bg-card/50 backdrop-blur-sm ${
              data.solvency.settlementPaused
                ? "border-red-500/40"
                : "border-primary/20 neon-border"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Absolute Solvency
                </CardTitle>
                <CardDescription>
                  Treasury is real spendable cash — revenue in, payouts out. The
                  protocol never auto-pays money it hasn&apos;t banked.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {data.solvency.settlementPaused
                      ? "Settlements paused"
                      : "Settlements live"}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      data.solvency.settlementPaused
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {data.solvency.settlementPaused ? "HALTED" : "ACTIVE"}
                  </p>
                </div>
                <Switch
                  checked={!data.solvency.settlementPaused}
                  disabled={setSettlementPause.isPending}
                  onCheckedChange={(checked) => togglePause(!checked)}
                  aria-label="Toggle automatic settlements"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div className="rounded-md border border-primary/20 p-3">
                  <p className="text-muted-foreground text-xs">
                    Treasury (spendable)
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ${data.solvency.treasuryBalance.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-muted-foreground text-xs">
                    Payouts (rolling 24h)
                  </p>
                  <p className="text-2xl font-bold">
                    ${data.solvency.rolling24hPayouts.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-muted-foreground text-xs">MRR</p>
                  <p className="text-2xl font-bold">
                    ${data.solvency.mrr.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-muted-foreground text-xs">
                    Active subscribers
                  </p>
                  <p className="text-2xl font-bold">
                    {data.solvency.activeSubscribers}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Auto-payouts must stay within treasury (reserve multiple{" "}
                {data.risk.reserveMultiple}×
                {data.risk.reserveBuffer > 0
                  ? `, $${data.risk.reserveBuffer.toFixed(2)} buffer`
                  : ""}
                ). Anything beyond coverage is held for your review below.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Black Swan Defenses</CardTitle>
                  <CardDescription>
                    Layered settlement risk controls
                  </CardDescription>
                </div>
                <Gauge className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Daily settlement ceiling</span>
                    <span>
                      ${data.risk.todaySettledNet.toFixed(2)} / $
                      {data.risk.dailyCeiling.toLocaleString()} (
                      {data.risk.ceilingUtilizationPct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        data.risk.ceilingUtilizationPct >= 90
                          ? "bg-red-500"
                          : data.risk.ceilingUtilizationPct >= 60
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(100, data.risk.ceilingUtilizationPct)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">
                      Per-receipt gross cap
                    </p>
                    <p className="text-lg font-bold">
                      ${data.risk.maxGrossSettlement.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">
                      Auto-clear threshold (net)
                    </p>
                    <p className="text-lg font-bold">
                      ${data.risk.reviewThreshold.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">
                      Reserve capacity
                    </p>
                    <p className="text-lg font-bold">
                      ${data.risk.reserveCapacity.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">
                      Review exposure
                    </p>
                    <p className="text-lg font-bold">
                      ${data.risk.pendingReviewExposure.toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Settlements above the threshold — or beyond reserve coverage —
                  are held for your review below.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    Integrity Review Queue
                    {queue && queue.items.length > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-2 bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                      >
                        {queue.items.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Held settlements awaiting operator decision
                  </CardDescription>
                </div>
                <Scale className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                {!queue || queue.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Queue clear — no settlements awaiting review.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {queue.items.map((item) => (
                      <div
                        key={item.receipt.id}
                        className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              Receipt #{item.receipt.id} —{" "}
                              {item.receipt.platform}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.userEmail ?? "no email"} ·{" "}
                              {item.userTier.toUpperCase()} tier
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="text-sm font-bold">
                              ${item.receipt.quotedNet?.toFixed(2)} net
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${item.receipt.quotedGross?.toFixed(2)} gross
                            </p>
                          </div>
                        </div>
                        {item.receipt.statusReason && (
                          <p className="text-xs text-yellow-400/90">
                            {item.receipt.statusReason}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={reviewReceipt.isPending}
                            onClick={() => decide(item.receipt.id, "approve")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            disabled={reviewReceipt.isPending}
                            onClick={() => decide(item.receipt.id, "reject")}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <AdWaterworks />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-base">Daily Yield (14d)</CardTitle>
                <CardDescription>
                  Net settlement payouts per UTC day
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyYield}>
                    <defs>
                      <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(280 100% 70%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(280 100% 70%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 20%)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      stroke="hsl(240 20% 60%)"
                      fontSize={11}
                    />
                    <YAxis stroke="hsl(240 20% 60%)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(240 30% 10%)",
                        border: "1px solid hsl(240 30% 20%)",
                        borderRadius: 8,
                      }}
                      labelFormatter={shortDate}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Yield"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(280 100% 70%)"
                      fill="url(#yieldFill)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-base">Unique Visitors (14d)</CardTitle>
                <CardDescription>Distinct visitors per UTC day</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.visitors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 20% 20%)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      stroke="hsl(240 20% 60%)"
                      fontSize={11}
                    />
                    <YAxis allowDecimals={false} stroke="hsl(240 20% 60%)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(240 30% 10%)",
                        border: "1px solid hsl(240 30% 20%)",
                        borderRadius: 8,
                      }}
                      labelFormatter={shortDate}
                      formatter={(v: number) => [v, "Visitors"]}
                    />
                    <Bar dataKey="value" fill="hsl(190 95% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-base">Traffic Sources (14d)</CardTitle>
              <CardDescription>
                Unique visitors by acquisition source — share links with ?src=ig,
                ?src=tt, ?src=x, ?src=yt to attribute
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.trafficSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const max = Math.max(
                      ...data.trafficSources.map((s) => s.visitors),
                      1,
                    );
                    return data.trafficSources.map((s) => (
                      <div key={s.source} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm font-mono text-muted-foreground truncate">
                          {s.source}
                        </span>
                        <div className="flex-1 h-3 rounded-full bg-border/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[hsl(280_100%_70%)]"
                            style={{ width: `${(s.visitors / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                          {s.visitors}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">R0QQ3T Systems</CardTitle>
                  <CardDescription>
                    Agentic Zodiac Systems Assistant status
                  </CardDescription>
                </div>
                <Rocket className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={roqqetStatusColor}>
                    {data.roqqet.status.toUpperCase()}
                  </Badge>
                  {!data.roqqet.configured && (
                    <span className="text-xs text-muted-foreground">
                      AI integration not configured
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">Chats today</p>
                    <p className="text-lg font-bold">{data.roqqet.chatsToday}</p>
                  </div>
                  <div className="rounded-md border border-border/60 p-3">
                    <p className="text-muted-foreground text-xs">
                      Insights today
                    </p>
                    <p className="text-lg font-bold">
                      {data.roqqet.insightsToday}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.roqqet.lastActivityAt
                    ? `Last activity ${format(parseISO(data.roqqet.lastActivityAt), "MMM d, HH:mm")} UTC`
                    : "No activity recorded since last server start"}
                </p>
                {data.roqqet.lastError && (
                  <p className="text-xs text-yellow-400/90 break-words">
                    Last error: {data.roqqet.lastError}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-base">Recent Fee Entries</CardTitle>
                <CardDescription>
                  Protocol Integrity &amp; Settlement fee ledger
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentFees.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No fees collected yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.recentFees.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {f.source === "subscription_revenue"
                              ? "Subscription revenue"
                              : f.source === "settlement_payout"
                                ? "Settlement payout"
                                : f.source}
                          </p>
                          {f.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {f.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(f.createdAt), "MMM d, HH:mm")} UTC
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold whitespace-nowrap ${
                            f.amount >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {f.amount >= 0 ? "+" : "−"}$
                          {Math.abs(f.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AdWaterworks() {
  const { data: ads, isLoading } = useListAds({
    query: { queryKey: getListAdsQueryKey() },
  });
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "affiliate" as "house" | "affiliate",
    headline: "",
    body: "",
    ctaLabel: "",
    ctaUrl: "",
    placement: "any",
    weight: 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAdsQueryKey() });

  const submit = () => {
    createAd.mutate(
      { data: form },
      {
        onSuccess: () => {
          invalidate();
          setShowForm(false);
          setForm({
            name: "",
            kind: "affiliate",
            headline: "",
            body: "",
            ctaLabel: "",
            ctaUrl: "",
            placement: "any",
            weight: 1,
          });
          toast({ title: "Ad created" });
        },
        onError: (err: any) =>
          toast({
            title: "Could not create ad",
            description: err?.error || err?.message,
            variant: "destructive",
          }),
      },
    );
  };

  const canSubmit =
    form.name && form.headline && form.body && form.ctaLabel && form.ctaUrl;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-4 h-4 text-secondary" />
            Ad Waterworks
          </CardTitle>
          <CardDescription>
            House promos &amp; affiliate slots served to Demo-tier surfaces.
            Set AD_NETWORK_SCRIPT_URL to switch every slot to a network embed.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="w-4 h-4 mr-1" /> New Ad
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-4 rounded-lg border border-border bg-background/50 grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Internal name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as any })
                }
              >
                <option value="affiliate">Affiliate</option>
                <option value="house">House</option>
              </select>
              <select
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.placement}
                onChange={(e) =>
                  setForm({ ...form, placement: e.target.value })
                }
              >
                <option value="any">Any placement</option>
                <option value="dashboard">Dashboard</option>
                <option value="receipts">Receipts</option>
                <option value="roqqet">R0QQ3T</option>
              </select>
            </div>
            <Input
              className="sm:col-span-2"
              placeholder="Headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
            <Textarea
              className="sm:col-span-2"
              placeholder="Body copy"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <Input
              placeholder="CTA label"
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            />
            <Input
              placeholder="CTA URL (/tiers or https://...)"
              value={form.ctaUrl}
              onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Weight</span>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={form.weight}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weight: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <Button
              disabled={!canSubmit || createAd.isPending}
              onClick={submit}
            >
              {createAd.isPending ? "Creating..." : "Create Ad"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !ads || ads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ads yet.</p>
        ) : (
          <div className="space-y-2">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{ad.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        ad.kind === "affiliate"
                          ? "border-secondary/50 text-secondary"
                          : "border-primary/50 text-primary"
                      }
                    >
                      {ad.kind}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      {ad.placement}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      w{ad.weight}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {ad.headline}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-mono">
                      {ad.impressions.toLocaleString()} impr ·{" "}
                      {ad.clicks.toLocaleString()} clicks
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      CTR{" "}
                      {ad.impressions > 0
                        ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </p>
                  </div>
                  <Switch
                    checked={ad.active}
                    disabled={updateAd.isPending}
                    onCheckedChange={(active) =>
                      updateAd.mutate(
                        { id: ad.id, data: { active } },
                        {
                          onSuccess: invalidate,
                          onError: (err: any) =>
                            toast({
                              title: "Update failed",
                              description: err?.error || err?.message,
                              variant: "destructive",
                            }),
                        },
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
