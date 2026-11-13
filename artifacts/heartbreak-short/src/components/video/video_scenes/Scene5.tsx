import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#0a0a14] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="N3PSQAL3 Logo" className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(217,70,239,0.4)]" />
        </motion.div>

        <motion.h1
          className="text-7xl font-display tracking-widest text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          N3PSQAL3
        </motion.h1>

        <motion.h2
          className="text-3xl font-body font-semibold tracking-widest text-[#06B6D4] uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
        >
          The Near-Miss Economy
        </motion.h2>
      </div>
    </motion.div>
  );
}
