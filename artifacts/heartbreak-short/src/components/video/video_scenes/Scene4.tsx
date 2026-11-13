import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),  // Logo reveals
      setTimeout(() => setPhase(2), 1200), // Verify
      setTimeout(() => setPhase(3), 1800), // Settle
      setTimeout(() => setPhase(4), 2400), // Ascend
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a14]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-row items-center justify-center gap-24">
        {/* N3PSQAL3 Logo / Branding */}
        <motion.div
          initial={{ opacity: 0, rotate: -90, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, rotate: 0, scale: 1 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-[400px] h-[400px] flex items-center justify-center"
        >
          {/* We'll use the logo SVG from n3psqal3 here */}
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="N3PSQAL3 Logo" className="w-full h-full object-contain" />
        </motion.div>

        {/* Tagline */}
        <div className="flex flex-col gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-6"
          >
            <div className="w-12 h-12 rounded-full bg-[#D946EF]/20 flex items-center justify-center text-[#D946EF] font-bold text-2xl">1</div>
            <h2 className="text-6xl font-display tracking-widest text-white">VERIFY.</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-6"
          >
            <div className="w-12 h-12 rounded-full bg-[#06B6D4]/20 flex items-center justify-center text-[#06B6D4] font-bold text-2xl">2</div>
            <h2 className="text-6xl font-display tracking-widest text-white">SETTLE.</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-6"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">3</div>
            <h2 className="text-6xl font-display tracking-widest text-white">ASCEND.</h2>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
