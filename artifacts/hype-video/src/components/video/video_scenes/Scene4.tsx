import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(5), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const tiers = [
    { name: 'DEMO', fraction: '1/16', color: 'text-white/40' },
    { name: 'BRONZE', fraction: '1/8', color: 'text-[#cd7f32]' },
    { name: 'SILVER', fraction: '1/4', color: 'text-[#c0c0c0]' },
    { name: 'GOLD', fraction: '1/3', color: 'text-[#ffd700]' },
    { name: 'DIAMOND', fraction: '1/2', color: 'text-[var(--color-secondary)]' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 bg-black flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <video 
        autoPlay 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        src={`${import.meta.env.BASE_URL}videos/bg-ascend.mp4`}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />

      <div className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center">
        <motion.h2 
          className="text-3xl font-mono text-[var(--color-primary)] tracking-[0.2em] mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          TIER MULTIPLIERS
        </motion.h2>

        <div className="flex flex-col w-full gap-4 relative">
          {/* Vertical connecting line */}
          <motion.div 
            className="absolute left-[50%] top-0 bottom-0 w-[2px] bg-white/10 -translate-x-1/2 z-0"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1 }}
            style={{ transformOrigin: 'top' }}
          />

          {tiers.map((tier, i) => {
            const isActive = phase > i;
            return (
              <motion.div 
                key={tier.name}
                className="flex items-center justify-center w-full relative z-10"
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="w-1/2 flex justify-end pr-8">
                  <span className={`text-4xl font-black tracking-tight ${isActive ? tier.color : 'text-white/20'}`}>
                    {tier.name}
                  </span>
                </div>
                
                {/* Node */}
                <motion.div 
                  className={`w-6 h-6 rounded-full border-4 border-black ${isActive ? 'bg-[var(--color-secondary)] shadow-[0_0_20px_var(--color-secondary)]' : 'bg-white/20'}`}
                  animate={isActive ? { scale: [1, 1.5, 1] } : {}}
                  transition={{ duration: 0.5 }}
                />

                <div className="w-1/2 flex justify-start pl-8">
                  <span className={`text-4xl font-mono ${isActive ? 'text-white' : 'text-white/20'}`}>
                    PAYOUT {tier.fraction}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}