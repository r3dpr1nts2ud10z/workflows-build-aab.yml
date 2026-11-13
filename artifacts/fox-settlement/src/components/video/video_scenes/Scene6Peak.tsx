import { motion } from 'framer-motion';

export function Scene6Peak() {
  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cinematic Dolly Pull */}
      <motion.div
        className="absolute inset-0 origin-center"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      >
        <img 
          src={`${import.meta.env.BASE_URL}images/fox-droptop.png`} 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Fox driving"
        />
        {/* Color Grading: Deep contrast and vibrant highlights */}
        <div className="absolute inset-0 mix-blend-color bg-gradient-to-b from-[#2b1055] via-transparent to-[#7597de] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.9)_100%)]" />
      </motion.div>
      
      {/* Intense cinematic flares */}
      <motion.div 
        className="absolute bottom-0 left-[30%] w-[120%] h-[40%] bg-primary mix-blend-screen blur-[150px] opacity-30 origin-bottom"
        animate={{ opacity: [0.1, 0.6, 0.2], scaleY: [1, 1.5, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Letterboxing (2.35:1) */}
      <div className="absolute top-0 left-0 w-full h-[12vh] bg-black z-40" />
      <div className="absolute bottom-0 left-0 w-full h-[12vh] bg-black z-40" />

      {/* Film grain */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-40 z-30 pointer-events-none mix-blend-overlay" />

      <div className="relative z-50 flex flex-col items-center justify-end h-full pb-[18vh]">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
          className="text-center"
        >
          <h2 className="text-[8vw] font-display font-black uppercase text-white tracking-tighter leading-none italic drop-shadow-2xl">
            THE RIDE
          </h2>
          <h3 className="text-[6vw] font-display font-bold uppercase text-primary tracking-widest leading-none mt-2">
            CONTINUES
          </h3>
        </motion.div>
      </div>
    </motion.div>
  );
}
