import { useState } from "react";
import { useSearchReceipts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<any>(undefined);
  const [sort, setSort] = useState<any>("newest");
  
  const { data, isLoading } = useSearchReceipts({ q: q || undefined, status: status === "all" ? undefined : status, sort });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Refined Search</h1>
        <p className="text-muted-foreground mt-1">Query your receipt archives.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card/50 p-4 rounded-xl border border-border backdrop-blur-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search platforms, descriptions..." 
            className="pl-9 bg-background/50"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="payout_desc">High Payout</SelectItem>
            <SelectItem value="wager_desc">High Wager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : data?.receipts && data.receipts.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Found {data.total} receipts</p>
            {data.receipts.map((receipt) => (
              <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{receipt.platform}</span>
                        <Badge variant="outline" className="text-xs">{receipt.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {receipt.legs.map(l => l.description).join(" • ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-primary font-bold">${receipt.potentialPayout.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(receipt.submittedAt), "MMM d, yyyy")}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No receipts matched your search.
          </div>
        )}
      </div>
    </div>
  );
}