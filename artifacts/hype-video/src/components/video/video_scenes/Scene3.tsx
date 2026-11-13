import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background Video using import.meta.env.BASE_URL */}
      <video 
        autoPlay 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        src={`${import.meta.env.BASE_URL}videos/bg-data.mp4`}
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
          className="w-[1px] h-[20vh] bg-gradient-to-b from-transparent via-[var(--color-secondary)] to-transparent mb-8"
          initial={{ scaleY: 0 }}
          animate={phase >= 1 ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        
        <div className="overflow-hidden mb-4">
          <motion.div 
            className="text-2xl font-mono text-[var(--color-secondary)] tracking-[0.5em]"
            initial={{ y: '100%', opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
          >
            WELCOME TO
          </motion.div>
        </div>

        <motion.div 
          className="text-[8vw] font-black leading-none text-white tracking-tighter text-center"
          initial={{ filter: 'blur(20px)', scale: 1.2, opacity: 0 }}
          animate={phase >= 2 ? { filter: 'blur(0px)', scale: 1, opacity: 1 } : { filter: 'blur(20px)', scale: 1.2, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          THE NEAR-MISS<br/>
          <span className="text-gradient">ECONOMY</span>
        </motion.div>

        <motion.div 
          className="w-[1px] h-[20vh] bg-gradient-to-b from-transparent via-[var(--color-primary)] to-transparent mt-8"
          initial={{ scaleY: 0 }}
          animate={phase >= 2 ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>
    </motion.div>
  );
}