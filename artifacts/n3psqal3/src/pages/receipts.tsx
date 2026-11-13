import { useState } from "react";
import {
  useListReceipts,
  useCreateReceipt,
  getListReceiptsQueryKey,
  useGetMe,
  getGetMeQueryKey,
  useAcceptTerms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt as ReceiptIcon, AlertCircle, SearchX, ScrollText } from "lucide-react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { combinedDecimalOdds, decimalToAmerican, crossCheckPayout } from "@workspace/odds";
import AdSlot from "@/components/ad-slot";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const legSchema = z.object({
  description: z.string().min(1, "Required"),
  odds: z.string().optional(),
  result: z.enum(["hit", "miss", "void"])
});

const formSchema = z.object({
  platform: z.string().min(1, "Required"),
  wagerAmount: z.coerce.number().min(0.01, "Must be at least 0.01"),
  potentialPayout: z.coerce.number().min(0.01, "Must be at least 0.01"),
  betDate: z.string().optional(),
  legs: z.array(legSchema).min(5, "Must have at least 5 legs")
}).refine(data => {
  const missCount = data.legs.filter(l => l.result === "miss").length;
  return missCount === 1;
}, {
  message: "Exactly ONE leg must be a miss",
  path: ["legs"]
}).refine(data => {
  const hitCount = data.legs.filter(l => l.result === "hit").length;
  return hitCount >= 4;
}, {
  message: "At least 4 legs must be hits (VOID legs don't count toward hits)",
  path: ["legs"]
});

export default function ReceiptsPage() {
  const { data: receipts, isLoading } = useListReceipts();
  const [open, setOpen] = useState(false);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground mt-1">Your submitted parlays.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" />
              Submit Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-primary/20">
            <DialogHeader>
              <DialogTitle>Submit Near-Miss Parlay</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              <TermsGate>
                <SubmitReceiptForm onSuccess={() => setOpen(false)} />
              </TermsGate>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <AdSlot placement="receipts" />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : receipts && receipts.length > 0 ? (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      <ReceiptIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{receipt.platform}</h3>
                      <p className="text-sm text-muted-foreground">
                        {receipt.legs.length} Legs • Wager: ${receipt.wagerAmount} • Potential: ${receipt.potentialPayout}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <Badge variant={
                      receipt.status === 'settled' ? 'default' : 
                      receipt.status === 'rejected' ? 'destructive' : 
                      'secondary'
                    }>
                      {receipt.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(receipt.submittedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 border-dashed flex flex-col items-center justify-center text-center bg-transparent">
          <SearchX className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No receipts yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Submit your first 5+ leg parlay that missed by exactly one leg to begin the settlement protocol.
          </p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Submit Receipt
          </Button>
        </Card>
      )}
    </div>
  );
}

function TermsGate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useGetMe();
  const [checked, setChecked] = useState(false);
  const acceptTerms = useAcceptTerms();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (me?.termsAcceptedAt) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
        <ScrollText className="w-5 h-5 mt-0.5 text-primary shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            One-time protocol agreement required
          </p>
          <p>
            Before submitting receipts you must accept the N3PSQAL3{" "}
            <Link href="/terms">
              <span className="underline underline-offset-4 text-primary cursor-pointer">
                Terms &amp; Conditions
              </span>
            </Link>
            , including receipt authenticity attestations, settlement risk
            controls, and the 20% Protocol Integrity &amp; Settlement fee.
          </p>
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer select-none text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          I confirm I am 21+, every receipt I submit is a truthful record of a
          wager I personally placed, and I agree to the Terms &amp; Conditions.
        </span>
      </label>
      <Button
        className="w-full h-11 bg-gradient-to-r from-primary to-secondary text-black font-bold"
        disabled={!checked || acceptTerms.isPending}
        onClick={() =>
          acceptTerms.mutate(undefined, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              toast({ title: "Terms accepted", description: "You can now submit receipts." });
            },
            onError: (err: any) => {
              toast({
                title: "Could not record acceptance",
                description: err?.error || err?.message || "Try again.",
                variant: "destructive",
              });
            },
          })
        }
      >
        {acceptTerms.isPending ? "Recording..." : "Accept & Continue"}
      </Button>
    </div>
  );
}

function SubmitReceiptForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createReceipt = useCreateReceipt();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "",
      wagerAmount: 0,
      potentialPayout: 0,
      betDate: new Date().toISOString().split("T")[0],
      legs: Array(5).fill({ description: "", odds: "", result: "hit" })
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "legs"
  });

  // Live sportsbook calculator — same math the books use:
  // combined decimal odds over live legs (voids excluded) x wager.
  const watchedLegs = useWatch({ control: form.control, name: "legs" });
  const watchedWager = useWatch({ control: form.control, name: "wagerAmount" });
  const watchedPayout = useWatch({ control: form.control, name: "potentialPayout" });
  const calcLegs = (watchedLegs ?? []).map((l) => ({ odds: l?.odds ?? null, result: (l?.result ?? "hit") as "hit" | "miss" | "void" }));
  const combined = combinedDecimalOdds(calcLegs);
  const wagerNum = Number(watchedWager) || 0;
  const computedPayout = combined != null && wagerNum > 0 ? Math.round(wagerNum * combined * 100) / 100 : null;
  const crossCheck = computedPayout != null ? crossCheckPayout(wagerNum, Number(watchedPayout) || 0, calcLegs) : null;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createReceipt.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Receipt submitted for verification" });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
        onSuccess();
      },
      onError: (err) => {
        toast({ title: "Submission failed", description: err.message || "Something went wrong", variant: "destructive" });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="platform" render={({ field }) => (
            <FormItem>
              <FormLabel>Platform</FormLabel>
              <FormControl><Input placeholder="DraftKings, FanDuel..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="betDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Bet Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="wagerAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Wager Amount ($)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="potentialPayout" render={({ field }) => (
            <FormItem>
              <FormLabel>Potential Payout ($)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {combined != null && computedPayout != null && (
          <div className={`p-3 rounded-md border text-sm space-y-1 ${crossCheck && !crossCheck.ok ? "bg-destructive/10 border-destructive/20" : "bg-primary/5 border-primary/20"}`}>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sportsbook calculator (live legs, voids excluded)</span>
              <span className="font-semibold">{decimalToAmerican(combined)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Computed payout on ${wagerNum.toFixed(2)}</span>
              <span className="font-semibold">${computedPayout.toFixed(2)}</span>
            </div>
            {crossCheck && !crossCheck.ok && (
              <p className="text-destructive flex items-center gap-2 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Entered payout doesn't reconcile with the leg odds — match your bet slip or{" "}
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-destructive underline" onClick={() => form.setValue("potentialPayout", computedPayout, { shouldValidate: true })}>
                  use ${computedPayout.toFixed(2)}
                </Button>
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Parlay Legs</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", odds: "", result: "hit" })}>
              Add Leg
            </Button>
          </div>
          
          {form.formState.errors.legs?.root && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm border border-destructive/20">
              <AlertCircle className="w-4 h-4" />
              {form.formState.errors.legs.root.message}
            </div>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3 p-3 bg-secondary/5 border border-border rounded-lg relative group">
                <div className="flex-1 grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-6">
                    <FormField control={form.control} name={`legs.${index}.description`} render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl><Input placeholder="Leg description..." {...field} className="h-8" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <FormField control={form.control} name={`legs.${index}.odds`} render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl><Input placeholder="Odds (e.g. -110)" {...field} className="h-8" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <FormField control={form.control} name={`legs.${index}.result`} render={({ field }) => (
                      <FormItem className="space-y-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className={`h-8 ${field.value === 'miss' ? 'bg-destructive/20 border-destructive/50 text-destructive' : ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hit">HIT</SelectItem>
                            <SelectItem value="miss">MISS</SelectItem>
                            <SelectItem value="void">VOID</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </div>
                {fields.length > 5 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => remove(index)}>
                    &times;
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-black font-bold text-lg" disabled={createReceipt.isPending}>
          {createReceipt.isPending ? "Submitting..." : "Submit Receipt for Verification"}
        </Button>
      </form>
    </Form>
  );
}
