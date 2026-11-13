import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import victoryScreenUrl from '@assets/image_(18)_1785949822976.jpg';

export function ArcadeCabinet({ currentScene }: { currentScene: number }) {
  const [showBlink, setShowBlink] = useState(true);

  // Genuinely blinking text
  useEffect(() => {
    const interval = setInterval(() => {
      setShowBlink(prev => !prev);
    }, 500); // 500ms on, 500ms off
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-[40vh] h-[70vh] flex flex-col items-center">
      {/* Cabinet Marquee */}
      <div className="relative w-[36vh] h-[10vh] bg-black border-[0.4vh] border-[#222] border-b-0 rounded-t-lg overflow-hidden shadow-[0_-1vh_3vh_rgba(255,0,60,0.3)] z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#ff003c] to-[#9d00ff] opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-[var(--font-arcade)] text-white text-[2.2vh] tracking-widest arcade-text-shadow opacity-90 drop-shadow-[0_0_1vh_white]">
            R3DPR1NT
          </span>
        </div>
        {/* Shine */}
        <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45" />
      </div>

      {/* Screen Bezel (slanted inwards) */}
      <div className="relative w-[38vh] h-[34vh] bg-[#0a0a0a] border-[0.8vh] border-[#111] border-t-[1.2vh] border-b-[1.6vh] shadow-[inset_0_0_4vh_rgba(0,0,0,1)] z-10 flex items-center justify-center perspective-[80vh]">
        
        {/* The Screen (CRT effect) */}
        <div className="relative w-[32vh] h-[28vh] bg-black overflow-hidden rounded-md shadow-[0_0_3vh_rgba(255,255,255,0.2)] crt-flicker">
          {/* Base Victory Screen Image */}
          <img 
            src={victoryScreenUrl} 
            alt="P3RF3CT Victory Screen"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          
          {/* Background Characters Bob (Left) */}
          <div className="absolute inset-0 bg-no-repeat bg-cover bg-center pointer-events-none sprite-bob-bg"
               style={{ 
                 backgroundImage: `url(${victoryScreenUrl})`, 
                 clipPath: 'inset(45% 75% 20% 0%)'
               }} />

          {/* Background Characters Bob (Right) */}
          <div className="absolute inset-0 bg-no-repeat bg-cover bg-center pointer-events-none sprite-bob-bg"
               style={{ 
                 backgroundImage: `url(${victoryScreenUrl})`, 
                 clipPath: 'inset(45% 0% 20% 75%)'
               }} />
               
          {/* Fox Fist/Arm Bob */}
          <div className="absolute inset-0 bg-no-repeat bg-cover bg-center pointer-events-none sprite-bob-arm"
               style={{ 
                 backgroundImage: `url(${victoryScreenUrl})`, 
                 clipPath: 'inset(35% 58% 35% 25%)'
               }} />
          
          {/* Scanlines Overlay */}
          <div className="absolute inset-0 z-10 crt-scanlines pointer-events-none" />
          
          {/* Screen Glare */}
          <div className="absolute inset-0 z-20 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

          {/* Blinking "INSERT COIN" Prompt */}
          <motion.div 
            className="absolute bottom-[2vh] left-0 right-0 z-30 flex justify-center"
            animate={{ opacity: showBlink ? 1 : 0 }}
            transition={{ duration: 0 }}
          >
            <span className="font-[var(--font-arcade)] text-[1vh] text-[#39ff14] drop-shadow-[0_0_0.5vh_#39ff14]">
              INSERT COIN / PRESS START
            </span>
          </motion.div>
        </div>
      </div>

      {/* Control Panel (slanted out) */}
      <div className="relative w-[40vh] h-[12vh] bg-[#1a1a1a] border-[0.4vh] border-[#222] shadow-[0_2vh_2vh_rgba(0,0,0,0.8)] z-30 rounded-b-sm flex items-start justify-center pt-[1.5vh] transform perspective-[100vh] rotate-x-12">
        <div className="absolute top-0 left-0 right-0 h-[0.8vh] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Joystick */}
        <div className="absolute left-[8vh] top-[4vh] w-[1.2vh] h-[4vh] bg-gray-500 rounded-sm shadow-[-0.2vh_0_0.5vh_rgba(0,0,0,0.5)]">
          <div className="absolute top-[-2vh] left-[-0.9vh] w-[3vh] h-[3vh] bg-[#ff003c] rounded-full shadow-[inset_-0.3vh_-0.3vh_0.5vh_rgba(0,0,0,0.5),_0_0.5vh_1vh_rgba(0,0,0,0.5)]" />
        </div>

        {/* Buttons */}
        <div className="absolute right-[6vh] top-[3.5vh] flex gap-[1.2vh]">
          {[1,2,3,4].map((i) => (
            <div key={i} className={`w-[2.4vh] h-[2.4vh] rounded-full shadow-[0_0.4vh_0_#111,inset_0_0.2vh_0.4vh_rgba(255,255,255,0.3)] ${i % 2 === 0 ? 'bg-[#39ff14]' : 'bg-[#00f3ff]'}`} style={{ transform: `translateY(${i % 2 === 0 ? '1vh' : '0'})` }} />
          ))}
        </div>
      </div>

      {/* Coin Door Area (Lower body) */}
      <div className="relative w-[36vh] h-[24vh] bg-[#0a0a0a] border-[0.4vh] border-[#151515] border-t-0 rounded-b-md z-10 flex flex-col items-center justify-start pt-[3vh]">
        <div className="w-[18vh] h-[14vh] bg-[#111] border-[0.2vh] border-[#222] flex gap-[1.5vh] p-[1.5vh] shadow-[inset_0_0.5vh_1.5vh_rgba(0,0,0,1)]">
          {/* Coin slots */}
          <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-sm relative shadow-[inset_0_0_1vh_rgba(0,0,0,0.8)]">
             <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[0.4vh] h-[2vh] bg-black" />
             <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[1.6vh] h-[0.8vh] bg-[#ff003c] shadow-[0_0_0.5vh_#ff003c]" />
          </div>
          <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-sm relative shadow-[inset_0_0_1vh_rgba(0,0,0,0.8)]">
             <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[0.4vh] h-[2vh] bg-black" />
             <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[1.6vh] h-[0.8vh] bg-[#ff003c] shadow-[0_0_0.5vh_#ff003c]" />
          </div>
        </div>
      </div>

      {/* Floor Glow */}
      <div className="absolute bottom-[-2vh] w-[50vh] h-[4vh] bg-[#9d00ff] blur-[4vh] opacity-20 pointer-events-none" />
    </div>
  );
}
