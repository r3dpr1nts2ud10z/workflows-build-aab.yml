import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Hook } from './video_scenes/Scene1Hook';
import { Scene2Heartbreak } from './video_scenes/Scene2Heartbreak';
import { Scene3Verify } from './video_scenes/Scene3Verify';
import { Scene4Tiers } from './video_scenes/Scene4Tiers';
import { Scene5Drop } from './video_scenes/Scene5Drop';
import { Scene6Peak } from './video_scenes/Scene6Peak';
import { Scene7Outro } from './video_scenes/Scene7Outro';

export const SCENE_DURATIONS = {
  hook: 3000,
  heartbreak: 6000,
  verify: 6000,
  tiers: 8000,
  drop: 8000,
  peak: 5000,
  outro: 6000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook: Scene1Hook,
  heartbreak: Scene2Heartbreak,
  verify: Scene3Verify,
  tiers: Scene4Tiers,
  drop: Scene5Drop,
  peak: Scene6Peak,
  outro: Scene7Outro,
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
    audio.volume = 0.85;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-dark text-text-primary">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-30"
          style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
          animate={{ x: ['-20%', '80%', '10%'], y: ['10%', '60%', '-10%'], scale: [1, 1.2, 0.8] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 bottom-0 right-0"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
          animate={{ x: ['10%', '-50%', '5%'], y: ['-10%', '-80%', '20%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-20"></div>
      </div>

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
