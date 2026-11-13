import { useEffect, useRef } from "react";
import {
  useGetMe,
  useServeAd,
  getServeAdQueryKey,
  useRecordAdEvent,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Droplets, ExternalLink } from "lucide-react";

export default function AdSlot({ placement }: { placement: string }) {
  const { data: me } = useGetMe();
  const isDemo = me?.tier === "demo";
  const { data: served } = useServeAd(
    { placement },
    {
      query: {
        queryKey: getServeAdQueryKey({ placement }),
        enabled: isDemo,
        staleTime: 60_000,
      },
    },
  );
  const recordEvent = useRecordAdEvent();
  const [, setLocation] = useLocation();
  const impressionSent = useRef<number | null>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  const ad = served?.mode === "house" ? served.ad : undefined;

  useEffect(() => {
    if (ad && impressionSent.current !== ad.id) {
      impressionSent.current = ad.id;
      recordEvent.mutate({ id: ad.id, data: { kind: "impression" } });
    }
  }, [ad?.id]);

  const networkUrl = served?.mode === "network" ? served.networkScriptUrl : undefined;
  const isDirectLink = !!networkUrl && !/\.js(\?|$)/.test(networkUrl);

  useEffect(() => {
    if (
      served?.mode === "network" &&
      networkUrl &&
      !isDirectLink &&
      networkRef.current &&
      networkRef.current.childElementCount === 0
    ) {
      const script = document.createElement("script");
      script.src = networkUrl;
      script.async = true;
      networkRef.current.appendChild(script);
    }
  }, [served?.mode, networkUrl, isDirectLink]);

  if (!isDemo || !served || served.mode === "none") return null;

  if (served.mode === "network") {
    if (isDirectLink && networkUrl) {
      return (
        <a
          href={networkUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="relative rounded-xl border border-secondary/30 bg-gradient-to-r from-secondary/10 via-card/60 to-primary/10 backdrop-blur-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden hover:border-secondary/60 transition-colors"
          data-ad-placement={placement}
        >
          <span className="absolute top-2 right-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Sponsored
          </span>
          <Droplets className="w-8 h-8 text-secondary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground leading-snug">
              Today&apos;s partner transmission has arrived.
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              A dispatch from beyond the oasis. Tap through to see what the
              sponsors are pumping into the waterworks.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-gradient-to-r from-primary to-secondary text-black">
            Open transmission
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </a>
      );
    }
    return (
      <div
        ref={networkRef}
        className="min-h-[90px] rounded-xl border border-border/50 bg-card/30 overflow-hidden"
        data-ad-placement={placement}
      />
    );
  }

  if (!ad) return null;

  const handleClick = () => {
    recordEvent.mutate({ id: ad.id, data: { kind: "click" } });
    if (ad.ctaUrl.startsWith("/")) {
      setLocation(ad.ctaUrl);
    } else {
      window.open(ad.ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="relative rounded-xl border border-secondary/30 bg-gradient-to-r from-secondary/10 via-card/60 to-primary/10 backdrop-blur-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden"
      data-ad-placement={placement}
    >
      <span className="absolute top-2 right-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
        {ad.kind === "affiliate" ? "Partner" : "Protocol Promo"}
      </span>
      <Droplets className="w-8 h-8 text-secondary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground leading-snug">{ad.headline}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{ad.body}</p>
      </div>
      <button
        onClick={handleClick}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold bg-gradient-to-r from-primary to-secondary text-black hover:opacity-90 transition-opacity"
      >
        {ad.ctaLabel}
        {!ad.ctaUrl.startsWith("/") && <ExternalLink className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
