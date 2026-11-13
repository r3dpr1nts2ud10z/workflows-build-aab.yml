import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4Tiers() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Show Demo
      setTimeout(() => setPhase(3), 3500), // Show Pro
      setTimeout(() => setPhase(4), 5000), // Show Diamond
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const tiers = [
    { name: "DEMO", fraction: "1/16", color: "text-white", bg: "bg-white/5", border: "border-white/20", phaseShow: 2 },
    { name: "PRO", fraction: "1/4", color: "text-primary", bg: "bg-primary/10", border: "border-primary/40", phaseShow: 3 },
    { name: "DIAMOND", fraction: "1/2", color: "text-secondary", bg: "bg-secondary/15", border: "border-secondary", phaseShow: 4, glow: true }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: '-100%' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="text-[4vw] font-display font-black uppercase text-white tracking-tight mb-16 text-center leading-tight"
        initial={{ opacity: 0, y: -30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.8 }}
      >
        YOUR TIER SETS <br />
        <span className="text-secondary">YOUR SETTLEMENT</span>
      </motion.div>

      <div className="flex gap-8 px-12 w-full max-w-[1200px] justify-center items-end h-[40vh]">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            className={`relative flex-1 flex flex-col items-center justify-end rounded-t-2xl border-t-2 border-l-2 border-r-2 ${tier.border} ${tier.bg} pb-8 overflow-hidden`}
            initial={{ height: 0, opacity: 0 }}
            animate={phase >= tier.phaseShow ? { height: `${(i + 1) * 33}%`, opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ 
              boxShadow: tier.glow && phase >= tier.phaseShow ? '0 -20px 60px rgba(255,215,0,0.3)' : 'none',
              zIndex: tier.glow ? 10 : 1
            }}
          >
            {tier.glow && (
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-transparent to-secondary/20"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            
            <motion.div 
              className={`font-display font-bold text-3xl tracking-widest ${tier.color} mb-4 relative z-10`}
              initial={{ opacity: 0 }}
              animate={phase >= tier.phaseShow ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.3 }}
            >
              {tier.name}
            </motion.div>
            
            <motion.div 
              className={`font-mono text-5xl font-black ${tier.color} relative z-10`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={phase >= tier.phaseShow ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
            >
              {tier.fraction}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
