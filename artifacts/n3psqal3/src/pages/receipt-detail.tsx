import { useParams, Link, useLocation } from "wouter";
import { useGetReceipt, useSettleReceipt, getGetReceiptQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { data: receipt, isLoading } = useGetReceipt(id, { query: { enabled: !!id, queryKey: getGetReceiptQueryKey(id) } });
  const settleReceipt = useSettleReceipt();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!receipt) {
    return <div>Receipt not found.</div>;
  }

  const handleSettle = (isRetry = false) => {
    settleReceipt.mutate({ id }, {
      onSuccess: (updated) => {
        if (updated.status === "under_review") {
          toast({
            title: "Held for integrity review",
            description: "This settlement exceeds auto-clear limits and awaits operator review.",
          });
        } else {
          toast({ title: "Settlement successful", description: "Funds added to your balance." });
        }
        queryClient.invalidateQueries({ queryKey: getGetReceiptQueryKey(id) });
      },
      onError: (err: any) => {
        // Session tokens rotate every ~60s; a settle fired at the expiry
        // boundary can bounce with a 401. Retry once after the token refreshes.
        if (!isRetry && (err.status === 401 || err.response?.status === 401)) {
          setTimeout(() => handleSettle(true), 1500);
          return;
        }
        if (err.message?.includes("attempts") || err.error?.includes("attempts")) {
           toast({ 
             title: "Out of attempts", 
             description: "You've reached your daily limit. Upgrade your tier.",
             variant: "destructive",
             action: (
               <Button variant="outline" size="sm" onClick={() => setLocation("/tiers")}>
                 Upgrade
               </Button>
             )
           });
        } else {
          toast({ title: "Settlement failed", description: err.error || "Unknown error", variant: "destructive" });
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/receipts">
        <Button variant="ghost" className="pl-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Receipts
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{receipt.platform}</h1>
            <Badge variant={
              receipt.status === 'settled' ? 'default' : 
              receipt.status === 'rejected' ? 'destructive' : 
              receipt.status === 'verified' ? 'secondary' : 'outline'
            } className={`text-sm px-3 py-1 uppercase tracking-wider ${receipt.status === 'under_review' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : ''}`}>
              {receipt.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">Submitted {format(new Date(receipt.submittedAt), "MMM d, yyyy")}</p>
        </div>

        {receipt.status === 'verified' && (
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-secondary text-black font-bold border-0 relative group overflow-hidden"
            onClick={() => handleSettle()}
            disabled={settleReceipt.isPending}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Zap className="w-5 h-5 mr-2" />
            {settleReceipt.isPending ? "Settling..." : "Execute Settlement"}
          </Button>
        )}
      </div>

      {receipt.status === 'under_review' && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 flex items-start gap-3">
          <Clock className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">Held for Operator Integrity Review</h4>
            <p className="text-sm opacity-90">
              {receipt.statusReason || 'This settlement exceeds auto-clear limits and awaits operator review.'}
            </p>
            {receipt.quotedNet != null && (
              <p className="text-sm mt-1">
                Quoted settlement: <span className="font-bold">${receipt.quotedNet.toFixed(2)} net</span>
                {receipt.quotedGross != null && ` ($${receipt.quotedGross.toFixed(2)} gross)`}
              </p>
            )}
          </div>
        </div>
      )}

      {receipt.status === 'rejected' && receipt.statusReason && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">Verification Failed</h4>
            <p className="text-sm opacity-90">{receipt.statusReason}</p>
          </div>
        </div>
      )}

      {receipt.status === 'settled' && (
        <Card className="bg-primary/5 border-primary/20 neon-border">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Settlement Complete</h3>
                <p className="text-muted-foreground">Fraction: {receipt.settlementFraction}x</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold cosmic-gradient-text">${receipt.settlementAmount?.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Recovered Yield</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Parlay Legs ({receipt.legs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receipt.legs.map((leg, i) => (
                  <div key={i} className={`p-4 rounded-lg border flex items-start justify-between gap-4 ${leg.result === 'miss' ? 'bg-destructive/5 border-destructive/20' : leg.result === 'void' ? 'bg-muted/30 border-border/30 opacity-70' : 'bg-background/50 border-border/50'}`}>
                    <div>
                      <p className={`font-medium ${leg.result === 'void' ? 'line-through text-muted-foreground' : ''}`}>{leg.description}</p>
                      {leg.odds && <p className="text-sm text-muted-foreground">{leg.odds}</p>}
                    </div>
                    {leg.result === 'hit' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">HIT</Badge>
                    ) : leg.result === 'void' ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border">VOID</Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">MISS</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle>Wager Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Wager Amount</span>
                <span className="font-mono font-medium">${receipt.wagerAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Potential Payout</span>
                <span className="font-mono font-medium">${receipt.potentialPayout.toFixed(2)}</span>
              </div>
              {receipt.betDate && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Bet Date</span>
                  <span>{format(new Date(receipt.betDate), "MMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Ensure AlertCircle is imported, patching it above.
import { AlertCircle } from "lucide-react";