import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useSyncSubscription, getGetMeQueryKey, getGetSubscriptionQueryKey } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ReceiptsPage from "@/pages/receipts";
import ReceiptDetailPage from "@/pages/receipt-detail";
import SearchPage from "@/pages/search";
import TiersPage from "@/pages/tiers";
import RoqqetPage from "@/pages/roqqet";
import AccountPage from "@/pages/account";
import CommandCenterPage from "@/pages/command-center";
import ZetaDashboardPage from "@/pages/zeta-dashboard";
import TermsPage from "@/pages/terms";
import Layout from "@/components/layout";
import { pingVisit } from "@/lib/visitTracker";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(280 100% 70%)",
    colorForeground: "hsl(0 0% 100%)",
    colorMutedForeground: "hsl(240 20% 70%)",
    colorDanger: "hsl(0 100% 60%)",
    colorBackground: "hsl(240 30% 8%)",
    colorInput: "hsl(240 30% 15%)",
    colorInputForeground: "hsl(0 0% 100%)",
    colorNeutral: "hsl(240 30% 18%)",
    fontFamily: "'Space Grotesk', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0b0b13] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#161626]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold tracking-tight",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-gray-300 font-medium",
    footerActionLink: "text-[#d946ef] hover:text-[#06b6d4] transition-colors",
    footerActionText: "text-gray-400",
    dividerText: "text-gray-500",
    identityPreviewEditButton: "text-[#d946ef]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-red-400",
    logoBox: "flex justify-center mb-4",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-[#161626] bg-[#12121f] hover:bg-[#1a1a2e] transition-colors text-white",
    formButtonPrimary: "bg-gradient-to-r from-[#d946ef] to-[#06b6d4] hover:opacity-90 text-black font-bold border-0",
    formFieldInput: "bg-[#12121f] border-[#161626] text-white focus:border-[#d946ef] focus:ring-[#d946ef]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#161626]",
    alert: "bg-red-950/30 border border-red-900",
    otpCodeFieldInput: "bg-[#12121f] border-[#161626] text-white",
    formFieldRow: "mb-4",
    main: "p-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

const SYNC_SESSION_KEY = "n3_checkout_synced";

function PendingCheckoutSync() {
  const syncSub = useSyncSubscription();
  const queryClient = useQueryClient();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    // Fire at most once per browser session: repeated reloads within a session
    // skip the reconciliation, but a payer returning in a fresh session (e.g.
    // after closing the tab mid-checkout) still triggers it.
    try {
      if (sessionStorage.getItem(SYNC_SESSION_KEY)) return;
      sessionStorage.setItem(SYNC_SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (private mode / blocked) — fall through and sync anyway.
    }
    syncSub.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSubscriptionQueryKey() });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    pingVisit();
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Access Terminal",
            subtitle: "Authenticate with N3PSQAL3 Protocol",
          },
        },
        signUp: {
          start: {
            title: "Initialize Connection",
            subtitle: "Join the Near-Miss Economy",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Show when="signed-in">
          <PendingCheckoutSync />
        </Show>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard">
            <ProtectedRoute component={DashboardPage} />
          </Route>
          <Route path="/receipts">
            <ProtectedRoute component={ReceiptsPage} />
          </Route>
          <Route path="/receipts/:id">
            <ProtectedRoute component={ReceiptDetailPage} />
          </Route>
          <Route path="/search">
            <ProtectedRoute component={SearchPage} />
          </Route>
          <Route path="/tiers">
            <ProtectedRoute component={TiersPage} />
          </Route>
          <Route path="/roqqet">
            <ProtectedRoute component={RoqqetPage} />
          </Route>
          <Route path="/account">
            <ProtectedRoute component={AccountPage} />
          </Route>
          <Route path="/command-center/zeta">
            <ProtectedRoute component={ZetaDashboardPage} />
          </Route>
          <Route path="/command-center">
            <ProtectedRoute component={CommandCenterPage} />
          </Route>

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
