import { useEffect, useRef } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { ArcadeCabinet } from './ArcadeCabinet';
import { LogoReveal } from './LogoReveal';
import { KineticCopy } from './KineticCopy';

export const SCENE_DURATIONS = {
  pushIn: 19000,
  reveal: 5000,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({
    durations,
    loop,
  });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.85;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative flex items-center justify-center bg-black"
    >
      {/* Arcade Environment Background */}
      <motion.div 
        className="absolute inset-0 z-0 origin-center"
        animate={
          sceneIndex === 0 
            ? { scale: [1, 2], opacity: [1, 1] } 
            : { scale: 2, opacity: 1 }
        }
        transition={{ duration: 19, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1025] via-[#050508] to-black opacity-80" />
        {/* Fake Arcade Machines in Background */}
        <div className="absolute top-[30%] left-[10%] w-[10%] h-[40%] bg-black border border-purple-900/30 shadow-[0_0_50px_rgba(157,0,255,0.2)] blur-[2px]" />
        <div className="absolute top-[35%] right-[15%] w-[8%] h-[35%] bg-black border border-cyan-900/30 shadow-[0_0_40px_rgba(0,243,255,0.2)] blur-[3px]" />
      </motion.div>

      {/* The Camera Container that pushes in */}
      <motion.div
        className="absolute z-10 flex items-center justify-center origin-center"
        animate={
          sceneIndex === 0 
            ? { scale: [0.7, 3.2], y: ['5vh', '-12vh'] }
            : { scale: 3.2, y: '-12vh' }
        }
        transition={{
          duration: 19,
          ease: [0.3, 0, 0.1, 1], // Slow continuous ease
        }}
      >
        <ArcadeCabinet currentScene={sceneIndex} />
      </motion.div>

      {/* Foreground / HUD / Final Logo */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AnimatePresence mode="sync">
          {sceneIndex === 0 && <KineticCopy key={`kinetic-${currentSceneKey}`} active={true} />}
          {sceneIndex === 1 && <LogoReveal key={currentSceneKey} />}
        </AnimatePresence>
      </div>
      
      {/* Vignette */}
      <div className="absolute inset-0 z-30 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.8)_100%)] mix-blend-multiply" />

      {/* Loop Blackout Transition */}
      <motion.div 
        className="absolute inset-0 z-50 pointer-events-none bg-black"
        animate={
          sceneIndex === 1 
            ? { opacity: [0, 0, 1] } 
            : { opacity: [1, 0, 0] }
        }
        transition={
          sceneIndex === 1 
            ? { duration: 5, times: [0, 0.9, 1] } // Fade to black in the last 0.5s of Scene 1
            : { duration: 19, times: [0, 0.05, 1] } // Fade up from black in the first ~1s of Scene 0
        }
      />

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
