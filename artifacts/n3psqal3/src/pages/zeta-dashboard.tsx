import { useState } from "react";
import { 
  useGetMe, 
  useGetZetaOverview, 
  getGetZetaOverviewQueryKey,
  useListZetaTickets,
  getListZetaTicketsQueryKey,
  useGetZetaTicket,
  getGetZetaTicketQueryKey,
} from "@workspace/api-client-react";
import { Redirect, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, RefreshCw, AlertCircle, ArrowLeft, Search, X, Server, Hash, FileJson, Clock, ListChecks, ArrowRight
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatScaled(val: string | undefined | null) {
  if (!val) return "0.000000";
  const isNegative = val.startsWith("-");
  const absVal = isNegative ? val.slice(1) : val;
  const padded = absVal.padStart(7, "0");
  const integerPart = padded.slice(0, -6);
  const decimalPart = padded.slice(-6);
  return `${isNegative ? "-" : ""}${integerPart}.${decimalPart}`;
}

export default function ZetaDashboardPage() {
  const { data: me, isLoading: loadingMe, error: meError } = useGetMe();

  const [sourceIdFilter, setSourceIdFilter] = useState("");
  const [ticketIdFilter, setTicketIdFilter] = useState("");
  
  const [activeSourceId, setActiveSourceId] = useState("");
  const [activeTicketId, setActiveTicketId] = useState("");
  const [page, setPage] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState<{sourceId: string, ticketId: string} | null>(null);

  const overviewQuery = useGetZetaOverview({
    query: {
      queryKey: getGetZetaOverviewQueryKey(),
      enabled: !!me?.isAdmin,
      refetchInterval: 30000,
      refetchOnMount: true,
    }
  });

  const listParams = {
    ...(activeSourceId ? { sourceId: activeSourceId } : {}),
    ...(activeTicketId ? { ticketId: activeTicketId } : {}),
    page,
    pageSize: 50,
  };

  const ticketsQuery = useListZetaTickets(listParams, {
    query: {
      queryKey: getListZetaTicketsQueryKey(listParams),
      enabled: !!me?.isAdmin,
      refetchInterval: 30000,
      refetchOnMount: true,
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSourceId(sourceIdFilter.trim());
    setActiveTicketId(ticketIdFilter.trim());
    setPage(1);
  };

  const handleClear = () => {
    setSourceIdFilter("");
    setTicketIdFilter("");
    setActiveSourceId("");
    setActiveTicketId("");
    setPage(1);
  };

  if (loadingMe) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (meError) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-8 text-center text-destructive">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Profile Verification Failed</p>
          <p className="text-sm opacity-80 mt-1">{(meError as any)?.message || "Network error loading authentication context."}</p>
        </CardContent>
      </Card>
    );
  }

  if (!me?.isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/command-center">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Terminal className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ZETA Terminal</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Machine ticket intake clearinghouse (Read-only telemetry)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border px-3 py-1.5 rounded-full text-xs text-muted-foreground" data-testid="zeta-refresh-indicator">
          {ticketsQuery.isFetching ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          )}
          <span>
            {ticketsQuery.isFetching 
              ? "Syncing data..." 
              : `Last synced ${format(new Date(), "HH:mm:ss")} UTC`}
          </span>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-xs text-primary/80 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Notice:</strong> This terminal provides exact read-only telemetry for ingested tickets. 
          Information displayed here does not constitute settlement authorization or trading claims. 
          Use for source reconciliation and integrity verification only.
        </p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border" data-testid="zeta-filters">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Source ID (Exact Match)
              </label>
              <Input 
                list="zeta-sources-list" 
                value={sourceIdFilter}
                onChange={(e) => setSourceIdFilter(e.target.value)}
                placeholder="Search source UUID..."
                className="font-mono text-sm"
                data-testid="input-source-id"
              />
              <datalist id="zeta-sources-list">
                {overviewQuery.data?.sources?.map(s => (
                  <option key={s.sourceId} value={s.sourceId} />
                ))}
              </datalist>
            </div>
            
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Ticket ID (Substring)
              </label>
              <Input 
                value={ticketIdFilter}
                onChange={(e) => setTicketIdFilter(e.target.value)}
                placeholder="Search ticket UUID..."
                className="font-mono text-sm"
                data-testid="input-ticket-id"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="submit" className="flex-1 sm:flex-none gap-2" data-testid="button-search">
                <Search className="w-4 h-4" /> Filter
              </Button>
              {(activeSourceId || activeTicketId) && (
                <Button type="button" variant="outline" onClick={handleClear} className="flex-1 sm:flex-none" data-testid="button-clear">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ticketsQuery.error ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-8 text-center text-destructive">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Data Storage Unavailable</p>
              <p className="text-sm opacity-80 mt-1">{(ticketsQuery.error as any)?.message || "Could not retrieve ticket feed."}</p>
            </CardContent>
          </Card>
        ) : ticketsQuery.isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : ticketsQuery.data?.items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <FileJson className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p>No machine tickets found.</p>
              {(activeSourceId || activeTicketId) && (
                <p className="text-sm mt-1">Try clearing your filters.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-md overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket ID</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Stake (Scaled)</th>
                    <th className="px-4 py-3 font-medium">Legs</th>
                    <th className="px-4 py-3 font-medium">Received At</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ticketsQuery.data?.items.map((ticket) => (
                    <tr key={`${ticket.sourceId}-${ticket.ticketId}`} className="hover:bg-muted/30 transition-colors" data-testid={`row-ticket-${ticket.ticketId}`}>
                      <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate text-foreground" title={ticket.ticketId}>
                        {ticket.ticketId}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs max-w-[150px] truncate" title={ticket.sourceId}>
                        {ticket.sourceId}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatScaled(ticket.receipt.computedFinancials.stakeScaled)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono bg-background">
                          {ticket.receipt.normalizedLegsCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {ticket.createdAt ? format(parseISO(ticket.createdAt), "MMM d, HH:mm:ss") : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => setSelectedTicket({ sourceId: ticket.sourceId, ticketId: ticket.ticketId })}
                          data-testid={`btn-inspect-${ticket.ticketId}`}
                        >
                          Inspect <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {ticketsQuery.data && (
              <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground tabular-nums">
                  Page {ticketsQuery.data.page} — Total: {ticketsQuery.data.total}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!ticketsQuery.data.items.length || ticketsQuery.data.items.length < (ticketsQuery.data.pageSize || 50)} 
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTicket && (
        <TicketDetailModal 
          sourceId={selectedTicket.sourceId} 
          ticketId={selectedTicket.ticketId} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </div>
  );
}

function TicketDetailModal({ sourceId, ticketId, onClose }: { sourceId: string, ticketId: string, onClose: () => void }) {
  const { data, isLoading, error } = useGetZetaTicket(
    { sourceId, ticketId }, 
    { 
      query: { 
        queryKey: getGetZetaTicketQueryKey({ sourceId, ticketId }),
        enabled: !!sourceId && !!ticketId
      } 
    }
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-primary/20 neon-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Server className="w-5 h-5 text-primary" /> Ticket Inspection
          </DialogTitle>
          <DialogDescription>
            Immutable machine feed details
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-destructive bg-destructive/5 rounded-md border border-destructive/20 my-4">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Missing Detail Record</p>
            <p className="text-sm opacity-80 mt-1">{(error as any)?.message || "Detail payload missing (404) or storage unavailable."}</p>
          </div>
        ) : data ? (
          <div className="space-y-6 pt-4" data-testid="zeta-ticket-details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="w-3 h-3"/> Ticket UUID</span>
                <p className="font-mono text-sm break-all bg-muted/30 p-2 rounded border border-border/50">{data.ticketId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3"/> Source ID</span>
                <p className="font-mono text-sm break-all bg-muted/30 p-2 rounded border border-border/50">{data.sourceId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><FileJson className="w-3 h-3"/> Payload Hash</span>
                <p className="font-mono text-xs break-all bg-muted/30 p-2 rounded border border-border/50">{data.payloadHash}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Received At</span>
                <p className="font-mono text-sm bg-muted/30 p-2 rounded border border-border/50">
                  {data.createdAt ? format(parseISO(data.createdAt), "yyyy-MM-dd HH:mm:ss.SSS") + " UTC" : "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/30 border-border">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border">
                  <CardTitle className="text-sm font-medium">Computed Clearings (Scaled)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Stake Scaled</span>
                    <span className="font-mono text-sm">{formatScaled(data.receipt.computedFinancials.stakeScaled)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Odds Scaled</span>
                    <span className="font-mono text-sm">{formatScaled(data.receipt.computedFinancials.oddsScaled)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Payout Scaled</span>
                    <span className="font-mono text-sm text-primary">{formatScaled(data.receipt.computedFinancials.payoutScaled)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/30 border-border">
                <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border">
                  <CardTitle className="text-sm font-medium">Original Normalized Feed</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Raw Stake</span>
                    <span className="font-mono text-sm">{data.normalizedTicket.stake}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Total Odds</span>
                    <span className="font-mono text-sm">{data.normalizedTicket.totalOdds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Potential Payout</span>
                    <span className="font-mono text-sm text-secondary">{data.normalizedTicket.potentialPayout || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 border-b border-border pb-2">
                <ListChecks className="w-4 h-4 text-primary" /> Normalized Legs ({data.receipt.normalizedLegsCount})
              </h3>
              <div className="space-y-2">
                {data.normalizedTicket.legs.map((leg, idx) => (
                  <div key={leg.legId || idx} className="p-3 bg-muted/10 border border-border/60 rounded-md text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="font-mono text-xs font-semibold text-primary">{leg.eventSlug}</div>
                      <Badge variant="outline" className={
                        leg.status === "WIN" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        leg.status === "LOSS" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        leg.status === "PUSH" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-muted text-muted-foreground border-border"
                      }>
                        {leg.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Market</div>
                        <div className="font-mono text-xs mt-0.5 truncate" title={leg.market}>{leg.market}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Selection</div>
                        <div className="font-mono text-xs mt-0.5 truncate" title={leg.selection || "-"}>{leg.selection || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Target / Actual</div>
                        <div className="font-mono text-xs mt-0.5">{leg.targetValue} / {leg.actualValue}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Margin Delta</div>
                        <div className="font-mono text-xs mt-0.5">{leg.marginDelta}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
