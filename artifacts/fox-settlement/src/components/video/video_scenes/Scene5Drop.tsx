import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5Drop() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // SETTLE
      setTimeout(() => setPhase(2), 2500), // DROP
      setTimeout(() => setPhase(3), 3000), // Stats
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-bg-dark"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <img 
        src={`${import.meta.env.BASE_URL}images/gold-coins.png`} 
        className="absolute inset-0 w-full h-full object-cover"
        alt="Gold coins"
      />
      <div className="absolute inset-0 bg-bg-dark/60 backdrop-blur-sm z-0"></div>

      {phase >= 2 && (
        <motion.div 
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ duration: 2, ease: "linear", repeat: Infinity }}
        >
          <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iI2ZmZDcwMCIvPjwvc3ZnPg==')] opacity-30"></div>
        </motion.div>
      )}

      <div className="relative z-20 flex flex-col items-center">
        <motion.h1 
          className="text-[12vw] font-display font-black tracking-tighter text-secondary leading-none uppercase drop-shadow-[0_0_40px_rgba(255,215,0,0.6)]"
          initial={{ scale: 0, rotateX: 90 }}
          animate={phase >= 1 ? { scale: 1, rotateX: 0 } : { scale: 0, rotateX: 90 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          SETTLE
        </motion.h1>

        <motion.div
          className="mt-8 glass-panel px-12 py-6 rounded-full border-2 border-secondary bg-secondary/10 flex gap-12"
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex flex-col items-center">
            <span className="text-primary font-mono text-xl mb-1 uppercase tracking-widest">Potential</span>
            <span className="text-white font-display text-4xl font-bold">$2,250</span>
          </div>
          <div className="w-px bg-white/20"></div>
          <div className="flex flex-col items-center">
            <span className="text-secondary font-mono text-xl mb-1 uppercase tracking-widest">Secured</span>
            <span className="text-success font-display text-5xl font-black drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              $1,125
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
