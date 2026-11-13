import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2500),
      setTimeout(() => setPhase(5), 3000),
      setTimeout(() => setPhase(6), 4000),
      setTimeout(() => setPhase(7), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const legs = [
    { team: "LAKERS -5.5", odds: "-110", status: "win" },
    { team: "LEBRON O 25.5 PTS", odds: "-125", status: "win" },
    { team: "AD O 10.5 REB", odds: "-105", status: "win" },
    { team: "RUSSELL O 6.5 AST", odds: "+110", status: "win" },
    { team: "REAVES 3+ 3PM", odds: "+140", status: "loss" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full relative">
        <motion.div 
          className="w-full max-w-[40vw] bg-[#111] border border-white/10 rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          initial={{ y: 100, opacity: 0, rotateX: 20 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-mono text-white/50 tracking-widest">PARLAY TICKET</h2>
            <span className="text-2xl font-mono text-white">PAYOUT: $14,250</span>
          </div>

          <div className="space-y-4">
            {legs.map((leg, i) => {
              const isRevealed = phase > i;
              const isWin = leg.status === 'win';
              const isLossReveal = isRevealed && !isWin;
              
              return (
                <motion.div 
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-black/50 border border-white/5 relative overflow-hidden"
                  initial={{ x: -20, opacity: 0 }}
                  animate={isRevealed ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isLossReveal && (
                    <motion.div 
                      className="absolute inset-0 bg-[var(--color-accent)] opacity-20"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLossReveal ? 'bg-[var(--color-accent)]' : isRevealed ? 'bg-[#00ff66]' : 'bg-white/10'}`}>
                      {isLossReveal ? <X size={16} color="white" /> : isRevealed ? <Check size={16} color="black" /> : null}
                    </div>
                    <span className={`text-xl font-display font-bold ${isLossReveal ? 'text-white' : 'text-white/80'}`}>{leg.team}</span>
                  </div>
                  <span className="text-xl font-mono text-white/50 relative z-10">{leg.odds}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.h1 
            className="text-[12vw] font-black text-[var(--color-accent)] tracking-tighter"
            initial={{ scale: 1.5, opacity: 0 }}
            animate={phase >= 6 ? { scale: 1, opacity: 1 } : { scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            HEARTBREAK.
          </motion.h1>
        </motion.div>
      </div>
    </motion.div>
  );
}