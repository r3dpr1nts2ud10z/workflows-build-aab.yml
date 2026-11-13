import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-20"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0">
        <video 
          src={`${import.meta.env.BASE_URL}videos/fox-driving.mp4`}
          className="w-full h-full object-cover opacity-70"
          autoPlay
          muted
          playsInline
          loop={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      <div className="relative z-10 text-center w-full px-12 flex flex-col items-center">
        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h1 
            className="text-[4vw] font-display text-white uppercase tracking-wider leading-none"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: '0%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            HOW TO SETTLE
          </motion.h1>
        </motion.div>
        
        <motion.div
          className="overflow-hidden mt-2"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h1 
            className="text-[6vw] font-display text-[hsl(var(--primary))] uppercase tracking-widest leading-none drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]"
            initial={{ y: '100%' }}
            animate={phase >= 2 ? { y: '0%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            WITH N3PSQAL3
          </motion.h1>
        </motion.div>
      </div>
    </motion.div>
  );
}
