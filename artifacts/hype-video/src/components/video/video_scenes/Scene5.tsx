import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#050505] flex items-center justify-center"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-10 pointer-events-none">
        {Array.from({ length: 72 }).map((_, i) => (
          <div key={i} className="border-[0.5px] border-white/20" />
        ))}
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.div 
          className="text-center w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 1 && phase < 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-2xl font-mono text-[var(--color-primary)] mb-4">[ STEP 01 ]</div>
          <h1 className="text-[10vw] font-black text-white leading-none tracking-tighter uppercase">VERIFY.</h1>
        </motion.div>

        <motion.div 
          className="text-center w-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-2xl font-mono text-[var(--color-secondary)] mb-4">[ STEP 02 ]</div>
          <h1 className="text-[10vw] font-black text-white leading-none tracking-tighter uppercase text-gradient">SETTLE.</h1>
        </motion.div>
      </div>

      {phase >= 1 && (
        <motion.div 
          className="absolute top-0 bottom-0 w-1 bg-white/20 mix-blend-overlay"
          initial={{ left: '-10%' }}
          animate={{ left: '110%' }}
          transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}