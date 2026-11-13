import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_50%)] opacity-20" />
      
      <div className="z-10 text-center flex flex-col items-center gap-4">
        <div className="overflow-hidden">
          <motion.h2 
            className="text-[6vw] font-black text-white leading-none uppercase tracking-tight"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            LOST BY <span className="text-[var(--color-accent)]">ONE LEG?</span>
          </motion.h2>
        </div>
        
        <div className="overflow-hidden h-[10vw]">
          <motion.h1 
            className="text-[8vw] font-black text-gradient leading-none uppercase tracking-tighter"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            GET PAID ANYWAY.
          </motion.h1>
        </div>
      </div>
      
      {phase >= 2 && (
        <motion.div 
          className="absolute inset-0 border-[1vw] border-[var(--color-secondary)] mix-blend-overlay pointer-events-none"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: [0, 1, 0.5, 1], scale: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.div>
  );
}