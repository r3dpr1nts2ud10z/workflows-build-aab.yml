import { useGetZetaOverview, getGetZetaOverviewQueryKey, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Terminal, ArrowRight, Database, Activity } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

export function ZetaOverviewWidget() {
  const { data: me } = useGetMe();
  
  const { data, isLoading, error } = useGetZetaOverview({
    query: {
      queryKey: getGetZetaOverviewQueryKey(),
      enabled: !!me?.isAdmin,
      refetchInterval: 30000,
      refetchOnMount: true,
    }
  });

  if (!me?.isAdmin) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 neon-border" data-testid="zeta-entry-widget">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            ZETA Machine Intake
          </CardTitle>
          <CardDescription>Source-bound exact ticket clearinghouse telemetry</CardDescription>
        </div>
        <Link href="/command-center/zeta" className="shrink-0" data-testid="link-zeta-dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            Open Terminal <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
             <Skeleton className="h-16 w-full rounded-md" />
             <Skeleton className="h-16 w-full rounded-md" />
             <Skeleton className="h-16 w-full rounded-md" />
             <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            Failed to load ZETA telemetry. {(error as any)?.message || "Storage unavailable"}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="rounded-md border border-border/60 p-3 bg-background/50">
              <p className="text-muted-foreground text-xs flex items-center gap-1"><Database className="w-3 h-3"/> Total Tickets</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{data.totalTickets}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3 bg-background/50">
              <p className="text-muted-foreground text-xs flex items-center gap-1"><Activity className="w-3 h-3"/> 24h Ingest</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{data.ingestedLast24h}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3 bg-background/50">
              <p className="text-muted-foreground text-xs">Total Sources</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{data.totalSources}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3 bg-background/50">
              <p className="text-muted-foreground text-xs">Last Received</p>
              <p className="text-sm font-medium mt-1 truncate">
                {data.lastReceivedAt ? formatDistanceToNow(parseISO(data.lastReceivedAt), { addSuffix: true }) : 'Never'}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
