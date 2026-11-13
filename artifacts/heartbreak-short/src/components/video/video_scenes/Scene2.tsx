import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // The miss X
      setTimeout(() => setPhase(2), 1500), // Devastated creature appears
      setTimeout(() => setPhase(3), 2000), // Meme text
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#0a0a14] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background creature */}
      <motion.div 
        className="absolute inset-0 opacity-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/devastated_creature.png)` }}
        animate={phase >= 2 ? { opacity: 0.6, scale: 1.05 } : { opacity: 0, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.div 
        className="absolute inset-0 bg-black/40"
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 w-full max-w-4xl px-12 text-center">
        {/* The Missed Leg */}
        <motion.div 
          className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-12 backdrop-blur-md"
          initial={{ opacity: 0, scale: 2 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-red-500 flex items-center justify-center bg-red-500/20 text-red-500 font-bold text-2xl">
                  ✕
                </div>
                <div className="text-3xl font-bold tracking-wide text-white">
                  BUTKER OVER 1.5 FG
                </div>
              </div>
              <div className="text-3xl font-display text-red-400">
                LOSS
              </div>
          </div>
        </motion.div>

        {/* Meme Text */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateZ: -5 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, rotateZ: 0 } : { opacity: 0, y: 50, rotateZ: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="mt-8"
        >
          <h1 className="text-[6rem] leading-none font-display text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-wide">
            WHEN THE 8-LEG PARLAY
            <br />
            MISSES BY <span className="text-red-500">ONE KICK</span>
          </h1>
        </motion.div>
      </div>
    </motion.div>
  );
}
