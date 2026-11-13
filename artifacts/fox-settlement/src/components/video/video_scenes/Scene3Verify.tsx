import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3Verify() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-bg-dark"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Scanning effect background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <motion.div 
          className="w-full h-[2px] bg-primary shadow-[0_0_20px_var(--color-primary)]"
          animate={{ y: ['-10vh', '110vh'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwaC00MHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]"></div>
      </div>

      <div className="flex flex-col items-center justify-center z-10 w-full px-20">
        <motion.div
          className="text-[4vw] font-display font-bold uppercase tracking-tight text-white mb-12 flex gap-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span>SUBMIT</span>
          <span className="text-primary">RECEIPT</span>
        </motion.div>

        <div className="relative w-[30vw] h-[40vh] glass-panel rounded-xl overflow-hidden border-2 border-primary/30 mb-12">
          {/* Mock receipt */}
          <div className="p-6 text-sm font-mono text-white/50 h-full overflow-hidden flex flex-col gap-2 relative">
            <div>TICKET: #9834-8742-X</div>
            <div>STATUS: SETTLED - LOSS</div>
            <div className="border-b border-white/10 my-2"></div>
            <div>LEGS: 5</div>
            <div>HITS: 4</div>
            <div>MISS: 1</div>
            <div>ODDS: +4500</div>
            <div>WAGER: $50.00</div>
            
            <motion.div 
              className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div 
                className="w-full h-full flex flex-col items-center justify-center gap-4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="w-20 h-20 rounded-full border-4 border-success text-success flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="font-display font-bold text-2xl text-success tracking-widest uppercase">
                  VERIFIED
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h2 className="text-[5vw] font-display font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-white tracking-tighter">
            AUTO-VERIFIED INSTANTLY
          </h2>
        </motion.div>
      </div>
    </motion.div>
  );
}
