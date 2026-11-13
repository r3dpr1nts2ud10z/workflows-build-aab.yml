import { motion } from 'framer-motion';

export function KineticCopy({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <motion.div
        className="relative flex items-center justify-center w-full h-full text-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.h2
          className="absolute font-display font-bold text-[5vh] text-white tracking-tight drop-shadow-[0_0_1.5vh_rgba(255,255,255,0.5)] max-w-[80vw]"
          initial={{ opacity: 0, scale: 0.9, y: '5vh' }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1.05, 1.1], y: ['5vh', '0vh', '-2vh', '-5vh'] }}
          transition={{ duration: 4, times: [0, 0.15, 0.85, 1], delay: 5.5 }}
        >
          Dont just vent, Verify your heartbreak
        </motion.h2>

        <motion.h2
          className="absolute font-display font-bold text-[5vh] text-[var(--color-secondary)] tracking-tight drop-shadow-[0_0_1.5vh_var(--color-secondary)] max-w-[80vw]"
          initial={{ opacity: 0, scale: 0.9, y: '5vh' }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1.05, 1.1], y: ['5vh', '0vh', '-2vh', '-5vh'] }}
          transition={{ duration: 4, times: [0, 0.15, 0.85, 1], delay: 10.0 }}
        >
          You Settle your pocket, We Settle your R0QQ3T
        </motion.h2>

        <motion.h2
          className="absolute font-display font-bold text-[8vh] text-[var(--color-accent)] tracking-tighter drop-shadow-[0_0_3vh_var(--color-accent)] max-w-[90vw] leading-none"
          initial={{ opacity: 0, scale: 0.8, y: '5vh', filter: 'blur(10px)' }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            scale: [0.8, 1.1, 1.2, 1.4], 
            y: ['5vh', '0vh', '-2vh', '-5vh'],
            filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(10px)']
          }}
          transition={{ duration: 4.5, times: [0, 0.15, 0.85, 1], delay: 14.5 }}
        >
          ASCEND BEYOND TIME
        </motion.h2>
      </motion.div>
    </div>
  );
}
