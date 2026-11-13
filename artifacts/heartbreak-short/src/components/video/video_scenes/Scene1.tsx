import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Leg 1
      setTimeout(() => setPhase(2), 1200), // Leg 2
      setTimeout(() => setPhase(3), 1900), // Leg 3
      setTimeout(() => setPhase(4), 2600), // Leg 4
      setTimeout(() => setPhase(5), 3300), // Leg 5
      setTimeout(() => setPhase(6), 4000), // Leg 6
      setTimeout(() => setPhase(7), 4700), // Leg 7
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const legs = [
    { id: 1, text: "CHIEFS MONEYLINE", odds: "-140" },
    { id: 2, text: "OVER 45.5 TOTAL PTS", odds: "-110" },
    { id: 3, text: "KELCE ANYTIME TD", odds: "+115" },
    { id: 4, text: "MAHOMES 250+ YDS", odds: "-125" },
    { id: 5, text: "PACHECO 5+ REC", odds: "+100" },
    { id: 6, text: "RICE 60+ RUSH YDS", odds: "-115" },
    { id: 7, text: "CHIEFS 1ST HALF -3.5", odds: "-110" },
    { id: 8, text: "BUTKER OVER 1.5 FG", odds: "-130" }
  ];

  return (
    <motion.div 
      className="absolute inset-0 bg-[#0a0a14] flex flex-col items-center justify-center pt-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full max-w-2xl px-12 py-8 bg-[#111827] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Receipt Header */}
        <div className="border-b border-white/10 pb-6 mb-6 flex justify-between items-end">
          <div>
            <div className="text-white/40 text-sm font-bold tracking-widest mb-1 uppercase">Same Game Parlay</div>
            <div className="text-4xl font-display text-white tracking-wide">8 LEGS</div>
          </div>
          <div className="text-right">
            <div className="text-white/40 text-sm font-bold tracking-widest mb-1 uppercase">Payout</div>
            <div className="text-4xl font-display text-green-400 tracking-wide">+$45,200</div>
          </div>
        </div>

        {/* Legs List */}
        <div className="space-y-4">
          {legs.map((leg, i) => {
            const isVisible = phase >= i;
            const isHit = phase > i; // hits one phase after showing
            const isLast = i === 7;
            
            return (
              <motion.div 
                key={leg.id}
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-[#0a0a14]">
                    <AnimatePresence>
                      {isHit && !isLast && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full bg-green-500"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={`text-xl font-bold tracking-wide ${isHit && !isLast ? 'text-white' : 'text-white/40'}`}>
                    {leg.text}
                  </div>
                </div>
                <div className={`text-xl font-display ${isHit && !isLast ? 'text-white' : 'text-white/40'}`}>
                  {leg.odds}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  );
}
