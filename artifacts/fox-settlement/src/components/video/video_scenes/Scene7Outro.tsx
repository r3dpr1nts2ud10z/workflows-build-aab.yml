import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene7Outro() {
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
      className="absolute inset-0 flex items-center justify-center bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      <img 
        src={`${import.meta.env.BASE_URL}images/dark-oasis-bg.png`} 
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        alt="Dark oasis background"
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* N3PSQAL3 Logo / Lockup */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 mb-8 bg-gradient-to-br from-primary to-accent rounded-3xl rotate-45 flex items-center justify-center shadow-[0_0_60px_rgba(157,78,221,0.5)]">
            <div className="w-24 h-24 bg-bg-dark rounded-2xl flex items-center justify-center -rotate-45">
              <span className="font-display font-black text-4xl text-white">N3</span>
            </div>
          </div>
          
          <h1 className="text-[6vw] font-display font-black tracking-widest text-white uppercase leading-none drop-shadow-2xl">
            N3PSQAL3
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="mt-12 glass-panel px-10 py-4 rounded-full border border-secondary/30"
        >
          <span className="font-mono text-3xl text-secondary tracking-widest drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            N3PSQAL3.replit.app
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
