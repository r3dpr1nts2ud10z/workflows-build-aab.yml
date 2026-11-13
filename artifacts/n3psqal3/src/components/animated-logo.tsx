import { useId } from "react";

const styles = `
@keyframes n3-orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes n3-rebel {
  0%   { transform: rotate(0deg) translateX(0px); }
  12%  { transform: rotate(-28deg) translateX(3px); }
  22%  { transform: rotate(10deg) translateX(-2px); }
  38%  { transform: rotate(140deg) translateX(5px); }
  47%  { transform: rotate(118deg) translateX(-3px); }
  62%  { transform: rotate(260deg) translateX(2px); }
  70%  { transform: rotate(238deg) translateX(6px); }
  84%  { transform: rotate(330deg) translateX(-2px); }
  92%  { transform: rotate(372deg) translateX(3px); }
  100% { transform: rotate(360deg) translateX(0px); }
}
@keyframes n3-rebel-bounce {
  0%, 100% { transform: scale(1); }
  10% { transform: scale(1.35, 0.75); }
  20% { transform: scale(0.8, 1.25); }
  30% { transform: scale(1.15, 0.9); }
  40% { transform: scale(1); }
  65% { transform: scale(1.3, 0.7); }
  75% { transform: scale(0.85, 1.2); }
  85% { transform: scale(1); }
}
@keyframes n3-twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.n3-ring { transform-origin: 50px 50px; animation: n3-orbit var(--n3-speed, 14s) linear infinite; }
.n3-rebel-ring { transform-origin: 50px 50px; animation: n3-rebel var(--n3-speed, 14s) ease-in-out infinite; }
.n3-rebel-dot { transform-origin: 50px 9.5px; animation: n3-rebel-bounce var(--n3-speed, 14s) ease-in-out infinite; }
.n3-green { animation: n3-twinkle 3.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .n3-ring, .n3-rebel-ring, .n3-rebel-dot, .n3-green { animation: none; }
}
`;

export function AnimatedLogo({
  className,
  speed = 14,
  decorative = false,
}: {
  className?: string;
  speed?: number;
  decorative?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `n3grad-${uid}`;
  const glowId = `n3redGlow-${uid}`;
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ "--n3-speed": `${speed}s` } as React.CSSProperties}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      focusable="false"
      aria-label={decorative ? undefined : "N3PSQAL3 logo: four green dots orbiting the diamond, one red dot flying off-script"}
    >
      <style>{styles}</style>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF3C00" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF3C00" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#${gradId})`} strokeWidth="4" />
      <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="50" cy="50" r="15" fill={`url(#${gradId})`} />
      <circle cx="50" cy="50" r="4" fill="#000000" />

      {/* 4 green legs — the ones that hit, orbiting clean like Paramount stars */}
      <g className="n3-ring">
        <circle className="n3-green" cx="12.9" cy="38" r="4.5" fill="#22C55E" style={{ animationDelay: "0s" }} />
        <circle className="n3-green" cx="87.1" cy="38" r="4.5" fill="#22C55E" style={{ animationDelay: "0.6s" }} />
        <circle className="n3-green" cx="72.9" cy="81.6" r="4.5" fill="#22C55E" style={{ animationDelay: "1.2s" }} />
        <circle className="n3-green" cx="27.1" cy="81.6" r="4.5" fill="#22C55E" style={{ animationDelay: "1.8s" }} />
      </g>

      {/* R3D — the near-miss leg. Rebels against the orbit, Tinkerbell with an attitude. */}
      <g className="n3-rebel-ring">
        <g className="n3-rebel-dot">
          <circle cx="50" cy="9.5" r="10" fill={`url(#${glowId})`} />
          <circle cx="50" cy="9.5" r="5.5" fill="#FF3C00" stroke="#FFD1C2" strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
}
