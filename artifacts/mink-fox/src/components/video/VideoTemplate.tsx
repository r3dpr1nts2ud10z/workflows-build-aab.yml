import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';

export const SCENE_DURATIONS = {
  intro: 5000,
  step1: 8000,
  step2: 4500,
  step3: 8000,
  step4: 8000,
  step4_cont: 8000,
  outro: 8500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  step1: Scene2,
  step2: Scene3,
  step3: Scene4,
  step4: Scene5,
  step4_cont: Scene6,
  outro: Scene7,
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
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#06060a]">
      {/* Persistent Background Effects */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-3xl mix-blend-screen"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent)' }}
          animate={{ x: ['-20%', '80%', '10%'], y: ['10%', '60%', '20%'], scale: [1, 1.2, 0.9] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
        />
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl mix-blend-screen right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} /* Gold accent */
          animate={{ x: ['10%', '-50%', '5%'], y: ['-10%', '-40%', '-10%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} 
        />
      </div>

      {/* Persistent Midground Shape */}
      <motion.div
        className="absolute w-[2px] bg-white/20 z-10"
        animate={{
          left: ['10%', '30%', '50%', '70%', '80%', '40%', '50%'][sceneIndex] || '50%',
          height: ['100%', '0%', '100%', '50%', '100%', '0%', '0%'][sceneIndex] || '0%',
          top: ['0%', '50%', '0%', '25%', '0%', '50%', '50%'][sceneIndex] || '50%',
          opacity: sceneIndex === 6 ? 0 : 0.5,
        }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

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
