import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1Hook() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cinematic Dolly Push */}
      <motion.div
        className="absolute inset-0 origin-center"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1.15 }}
        transition={{ duration: 6, ease: 'linear' }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}images/fox-droptop.png`} 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Fox driving"
        />
        {/* Color Grading: Teal / Orange cinematic look */}
        <div className="absolute inset-0 mix-blend-color bg-gradient-to-tr from-[#0f2027] via-transparent to-[#f2c94c] opacity-50" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.85)_100%)]" />
      </motion.div>
      
      {/* Light Leaks */}
      <motion.div 
        className="absolute top-0 left-[10%] w-1/2 h-full bg-[#f2c94c] mix-blend-screen blur-[120px] opacity-20"
        animate={{ x: ['-20%', '20%', '-20%'], opacity: [0.1, 0.4, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Letterboxing (2.35:1) */}
      <div className="absolute top-0 left-0 w-full h-[12vh] bg-black z-40" />
      <div className="absolute bottom-0 left-0 w-full h-[12vh] bg-black z-40" />

      {/* Film grain */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-40 z-30 pointer-events-none mix-blend-overlay" />

      <motion.div 
        className="relative z-50 glass-panel px-12 py-8 rounded-3xl flex flex-col items-center border border-primary/30 shadow-[0_0_80px_rgba(210,168,255,0.2)]"
        initial={{ y: 50, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <motion.div 
          className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6"
          animate={{ scale: [1, 1.2, 1], boxShadow: ['0 0 0px #10B981', '0 0 40px #10B981', '0 0 0px #10B981'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h1 className="text-[4vw] font-display font-bold uppercase tracking-tight text-white mb-2 leading-none">
          Settlement
        </h1>
        <h2 className="text-[5vw] font-display font-black uppercase tracking-tighter text-secondary leading-none neon-border drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
          Secured
        </h2>

        <motion.div 
          className="mt-6 flex items-center gap-3 bg-bg-dark/80 px-6 py-3 rounded-full"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <span className="font-mono text-primary text-xl">N3PSQAL3 Protocol</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
