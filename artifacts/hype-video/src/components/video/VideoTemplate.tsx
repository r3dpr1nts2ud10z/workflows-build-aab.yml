// src/components/video/VideoTemplate.tsx
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';

export const SCENE_DURATIONS = {
  heartbreak: 6000,
  turn: 5000,
  economy: 6000,
  ladder: 8000,
  verify: 6000,
  ascend: 6000,
  outro: 8000
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  heartbreak: Scene1,
  turn: Scene2,
  economy: Scene3,
  ladder: Scene4,
  verify: Scene5,
  ascend: Scene6,
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

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
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
    <div className="relative w-full h-screen overflow-hidden bg-black font-display text-white">
      {/* Persistent background layers */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20 pointer-events-none mix-blend-screen"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
          animate={{
            x: ['-20%', '50%', '-10%'],
            y: ['-10%', '20%', '50%'],
            scale: [1, 1.2, 0.8]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20 pointer-events-none mix-blend-screen"
          style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent)' }}
          animate={{
            x: ['80%', '20%', '60%'],
            y: ['60%', '-20%', '30%'],
            scale: [0.8, 1.3, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="absolute inset-0 z-10 opacity-30 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

      <div className="absolute inset-0 z-20">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

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
