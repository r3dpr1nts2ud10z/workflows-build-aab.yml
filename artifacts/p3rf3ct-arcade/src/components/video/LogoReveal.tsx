import { motion } from 'framer-motion';
import logoUrl from '@assets/generated_images/n3psqal3_logo.png';

export function LogoReveal() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="flex flex-col items-center justify-center"
        initial={{ y: "5vh", opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
      >
        {/* N3PSQAL3 Logo Image */}
        <motion.div
          className="w-[20vh] h-[20vh] mb-[4vh]"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
        >
          <img 
            src={logoUrl}
            alt="N3PSQAL3 Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_2vh_var(--color-primary)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </motion.div>

        {/* N3PSQAL3 Name */}
        <motion.h1 
          className="font-display font-bold text-[8vh] tracking-widest text-white drop-shadow-[0_0_1.5vh_rgba(255,255,255,0.5)]"
          initial={{ filter: "blur(1vh)", opacity: 0 }}
          animate={{ filter: "blur(0vh)", opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          N3PSQAL3
        </motion.h1>

        {/* Tagline */}
        <div className="flex gap-[2vh] mt-[3vh] overflow-hidden">
          {["Verify.", "Settle.", "Ascend."].map((word, i) => (
            <motion.span
              key={word}
              className="font-arcade text-[1.8vh] text-[var(--color-secondary)] tracking-widest"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
                delay: 1.8 + (i * 0.4) 
              }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
