import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),  // Glitch bg reveals
      setTimeout(() => setPhase(2), 1600), // Text 1
      setTimeout(() => setPhase(3), 2600), // Text 2
      setTimeout(() => setPhase(4), 3800), // Wipe
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Glitch BG */}
      <motion.div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/glitch_bg.png)` }}
        initial={{ opacity: 0, scale: 1.2, filter: 'contrast(1.5) brightness(0.5)' }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'contrast(1) brightness(0.8)' } : {}}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] to-transparent opacity-80" />

      <div className="relative z-10 w-full px-12 text-center flex flex-col items-center justify-center">
        <motion.h2 
          className="text-6xl font-display tracking-widest text-white mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          YOUR ALMOST-WINS
        </motion.h2>

        <motion.h1
          className="text-8xl font-display tracking-wider text-gradient"
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          WERE NEVER WORTHLESS
        </motion.h1>
      </div>

    </motion.div>
  );
}
