import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-end px-20 z-20"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0">
        <video 
          src={`${import.meta.env.BASE_URL}videos/fox-celebrating.mp4`}
          className="w-full h-full object-cover opacity-80"
          autoPlay
          muted
          playsInline
          loop={false}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/95 via-black/60 to-black/10" />
      </div>

      <div className="relative z-10 text-right max-w-4xl flex flex-col items-end">
        <motion.h2 
          className="text-[3vw] font-sans font-bold text-[#fbbf24] uppercase tracking-widest mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          STEP 2
        </motion.h2>

        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h2 
            className="text-[6vw] font-display text-white uppercase leading-none"
            initial={{ y: '100%', rotate: 5 }}
            animate={phase >= 1 ? { y: '0%', rotate: 0 } : { y: '100%', rotate: 5 }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
          >
            SUBMIT THE RECEIPT
          </motion.h2>
        </motion.div>
        
        <motion.div
          className="overflow-hidden mt-4"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h2 
            className="text-[5vw] font-display text-[hsl(var(--primary))] uppercase leading-none bg-black/50 px-6 py-4 rounded-xl border border-[hsl(var(--primary))]/30 backdrop-blur-md"
            initial={{ y: '100%', rotate: -5 }}
            animate={phase >= 2 ? { y: '0%', rotate: 0 } : { y: '100%', rotate: -5 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            TO N3PSQAL3
          </motion.h2>
        </motion.div>
      </div>
    </motion.div>
  );
}
