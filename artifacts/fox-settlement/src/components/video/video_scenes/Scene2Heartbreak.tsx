import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2Heartbreak() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3200), // The X
      setTimeout(() => setPhase(6), 4000), // Text reveal
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const legs = [
    { text: "LAL Moneyline", status: "win" },
    { text: "LeBron 25+ PTS", status: "win" },
    { text: "AD 10+ REB", status: "win" },
    { text: "DLo 2+ BLK", status: "win" },
    { text: "Reaves 3+ 3PM", status: "loss" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-dark opacity-90 z-0"></div>

      <div className="relative z-10 w-[40vw] max-w-[600px] flex flex-col gap-4">
        {legs.map((leg, i) => (
          <motion.div
            key={i}
            className={`glass-panel p-6 rounded-2xl flex items-center justify-between border ${i === 4 && phase >= 5 ? 'border-error/50 bg-error/10' : 'border-white/10'}`}
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= i + 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <span className="font-display text-2xl font-semibold">{leg.text}</span>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= i + 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.2 }}
            >
              {leg.status === "win" ? (
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={phase >= 5 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -90 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <svg className="w-10 h-10 text-error drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="absolute bottom-20 left-0 right-0 flex justify-center z-20"
        initial={{ opacity: 0, y: 50 }}
        animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <h2 className="text-[6vw] font-display font-black uppercase italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          MISSED BY <span className="text-error">ONE.</span>
        </h2>
      </motion.div>
    </motion.div>
  );
}
