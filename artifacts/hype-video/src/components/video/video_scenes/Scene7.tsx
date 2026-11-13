import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-black flex items-center justify-center"
      initial={{ filter: 'blur(20px)', opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_60%)] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-secondary)_0%,transparent_30%)] opacity-10 blur-xl" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
          className="text-[10vw] font-black tracking-tighter leading-none"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 1.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <span className="text-white">N3PSQ</span>
          <span className="text-[var(--color-secondary)]">AL3</span>
        </motion.div>

        <motion.div 
          className="h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent mt-8"
          initial={{ width: 0 }}
          animate={phase >= 2 ? { width: '40vw' } : { width: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />

        <motion.div 
          className="text-2xl font-mono text-white/60 tracking-widest mt-8 uppercase"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          THE NEAR-MISS ECONOMY
        </motion.div>
      </div>

      {phase >= 1 && (
        <motion.div 
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 2 }}
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />
      )}
    </motion.div>
  );
}