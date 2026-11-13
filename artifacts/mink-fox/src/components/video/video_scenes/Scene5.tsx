import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-start px-20 z-20"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/fox-mink.png`}
          className="w-full h-full object-cover opacity-70"
          animate={{ scale: [1, 1.05], x: ['0%', '-2%'] }}
          transition={{ duration: 8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl">
        <motion.h2 
          className="text-[3vw] font-sans font-bold text-[#fbbf24] uppercase tracking-widest mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          STEP 4
        </motion.h2>

        <motion.h2 
          className="text-[6vw] font-display text-white uppercase leading-[1.1]"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          SETTLE FOR A TIER-BASED
        </motion.h2>
        
        <motion.h2 
          className="text-[6vw] font-display text-[hsl(var(--primary))] uppercase leading-[1.1] mt-2"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          FRACTION OF THE PAYOUT
        </motion.h2>
      </div>
    </motion.div>
  );
}
