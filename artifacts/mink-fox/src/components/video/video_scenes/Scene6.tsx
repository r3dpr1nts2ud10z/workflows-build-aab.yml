import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-end px-20 z-20"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/fox-celebrating.png`}
          className="w-full h-full object-cover opacity-80"
          animate={{ scale: [1, 1.1], y: ['0%', '3%'] }}
          transition={{ duration: 8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/50 to-transparent" />
      </div>

      <div className="relative z-10 text-right max-w-4xl flex flex-col items-end">
        <motion.div
          className="w-20 h-2 bg-[#fbbf24] mb-8"
          initial={{ scaleX: 0, transformOrigin: 'right' }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        
        <motion.h2 
          className="text-[7vw] font-display text-white uppercase leading-none"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          AND LIVE
        </motion.h2>
        
        <motion.h2 
          className="text-[7vw] font-display text-[#fbbf24] uppercase leading-none mt-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          LIKE THE FOX.
        </motion.h2>
      </div>
    </motion.div>
  );
}
