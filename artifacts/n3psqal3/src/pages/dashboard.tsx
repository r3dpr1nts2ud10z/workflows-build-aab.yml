import { useGetDashboardSummary, useGetActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CreditCard, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import AdSlot from "@/components/ad-slot";

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetActivity();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Protocol Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome to the clearinghouse terminal.</p>
      </div>

      <AdSlot placement="dashboard" />

      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20 neon-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Yield</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.potentialUnclaimed.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">From {summary.verifiedCount} verified receipts</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Settled</CardTitle>
              <CheckCircle className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">${summary.totalSettled.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.settledCount} receipts completed</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Receipts in queue</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Attempts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.attemptsUsedToday} / {summary.attemptsLimit === null ? '∞' : summary.attemptsLimit}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tier: {summary.tier.toUpperCase()}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest protocol events for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center p-3 rounded-lg border border-border/50 bg-background/50">
                    <div className="mr-4 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-[#0a0a16] border-primary/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary font-mono">R0QQ3T</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">SYSTEM</span>
            </CardTitle>
            <CardDescription>Daily Insight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-black/50 border border-border font-mono text-sm leading-relaxed text-gray-300">
              <p>Cosmic alignments indicate a high probability of mean reversion today.</p>
              <p className="mt-4 text-primary">Awaiting your Starting 5 profile configuration to provide personalized settlement strategies.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
