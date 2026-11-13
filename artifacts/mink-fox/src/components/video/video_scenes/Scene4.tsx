import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ filter: 'blur(20px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/neon-city.png`}
          className="w-full h-full object-cover opacity-50"
          animate={{ scale: [1.1, 1], rotate: [0, -2] }}
          transition={{ duration: 8, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center max-w-5xl text-center">
        <motion.h2 
          className="text-[3vw] font-sans font-bold text-[#fbbf24] uppercase tracking-widest mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          STEP 3
        </motion.h2>

        <motion.h1 
          className="text-[8vw] font-display text-white uppercase leading-none drop-shadow-[0_0_30px_rgba(217,70,239,0.3)]"
          initial={{ opacity: 0, scale: 0.8, rotateX: -30 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotateX: 0 } : { opacity: 0, scale: 0.8, rotateX: -30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
          style={{ transformPerspective: 1000 }}
        >
          IT'S VERIFIED
        </motion.h1>

        <motion.div 
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[6vw] font-display text-[hsl(var(--primary))] uppercase tracking-widest">
            AUTOMATICALLY
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
