import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[#06060a] z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* N3PSQAL3 Logo representation */}
        <motion.div 
          className="w-48 h-48 relative mb-12"
          initial={{ scale: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        >
          <motion.div 
            className="absolute inset-0 rounded-full border-4 border-[hsl(var(--primary))] opacity-50"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute inset-0 rounded-full border-[6px] border-[#fbbf24] flex items-center justify-center shadow-[0_0_30px_#fbbf24]">
            <span className="font-display text-5xl text-white">N3</span>
          </div>
        </motion.div>

        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h2 
            className="text-[6vw] font-display text-white uppercase tracking-[0.2em] leading-none"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: '0%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
          >
            N3PSQAL3
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-8 neon-border bg-black/50 px-10 py-4 rounded-full"
        >
          <span className="text-[2vw] font-sans text-white uppercase tracking-widest font-bold">
            n3psqal3.replit.app
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
