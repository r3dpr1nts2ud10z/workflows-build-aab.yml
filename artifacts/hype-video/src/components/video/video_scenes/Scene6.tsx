import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene6() {
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
      className="absolute inset-0 bg-black flex items-center justify-center"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ filter: 'blur(20px)', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="absolute inset-0 bg-[var(--color-primary)] mix-blend-screen opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      <div className="text-center relative z-10 w-full px-12">
        <div className="text-2xl font-mono text-[var(--color-secondary)] mb-4 uppercase tracking-[0.5em]">[ STEP 03 ]</div>
        <motion.div 
          className="relative inline-block"
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h1 className="text-[12vw] font-black text-white leading-none tracking-tighter uppercase z-10 relative">ASCEND.</h1>
          <motion.h1 
            className="text-[12vw] font-black text-transparent leading-none tracking-tighter uppercase absolute top-0 left-0"
            style={{ WebkitTextStroke: '2px var(--color-primary)' }}
            animate={phase >= 2 ? { x: 10, y: -10, opacity: 0.5 } : { x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            ASCEND.
          </motion.h1>
          <motion.h1 
            className="text-[12vw] font-black text-transparent leading-none tracking-tighter uppercase absolute top-0 left-0"
            style={{ WebkitTextStroke: '2px var(--color-secondary)' }}
            animate={phase >= 2 ? { x: -10, y: 10, opacity: 0.5 } : { x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            ASCEND.
          </motion.h1>
        </motion.div>
      </div>
    </motion.div>
  );
}