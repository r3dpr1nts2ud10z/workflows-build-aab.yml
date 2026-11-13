import { useListTiers, useCreateCheckout, useGetSubscription, useSyncSubscription, getGetMeQueryKey, getGetSubscriptionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export default function TiersPage() {
  const { data: tiers, isLoading: tiersLoading } = useListTiers();
  const { data: sub } = useGetSubscription();
  const createCheckout = useCreateCheckout();
  const syncSub = useSyncSubscription();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (window.location.search.includes("upgraded=1")) {
      syncSub.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSubscriptionQueryKey() });
          // Remove query param
          const url = new URL(window.location.href);
          url.searchParams.delete('upgraded');
          window.history.replaceState({}, '', url);
        }
      });
    }
  }, []);

  const handleUpgrade = (tierId: any) => {
    createCheckout.mutate({ data: { tierId } }, {
      onSuccess: (data) => {
        window.location.href = data.purchaseUrl;
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold tracking-tight mb-4">Protocol Tiers</h1>
        <p className="text-muted-foreground text-lg">
          Amplify your settlement power. Higher tiers unlock more daily attempts and a larger fraction of your near-miss payouts.
        </p>
      </div>

      {tiersLoading ? (
        <div className="grid md:grid-cols-3 gap-6">
           {[...Array(3)].map((_,i) => <div key={i} className="h-[400px] bg-card/50 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {tiers?.map((tier) => {
            const isCurrent = sub?.tier === tier.id;
            
            return (
              <Card key={tier.id} className={`flex flex-col bg-card/50 backdrop-blur-sm ${isCurrent ? 'border-primary neon-border relative' : 'border-border/50'}`}>
                {isCurrent && (
                  <div className="absolute -top-3 inset-x-0 flex justify-center">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Current Tier
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl font-bold uppercase tracking-widest">{tier.name}</CardTitle>
                  <CardDescription className="text-muted-foreground h-12 flex items-center justify-center">
                    {tier.monthlyPrice === 0 ? "Free" : <><span className="text-3xl font-bold text-foreground">${tier.monthlyPrice}</span>/mo</>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{tier.payoutLabel} Payout Fraction</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm">{tier.dailyAttempts === null ? "Unlimited" : tier.dailyAttempts} Daily Attempts</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button className="w-full" variant="secondary" disabled>Active</Button>
                  ) : tier.monthlyPrice > 0 ? (
                    <Button 
                      className="w-full bg-foreground text-background hover:bg-foreground/90" 
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? "Connecting..." : "Upgrade"}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>Default</Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}