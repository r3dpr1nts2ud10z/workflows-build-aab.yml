import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  hype: 5500,
  devastation: 4500,
  resurrection: 5000,
  valueProp: 4000,
  outro: 3500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hype: Scene1,
  devastation: Scene2,
  resurrection: Scene3,
  valueProp: Scene4,
  outro: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a14]">
      {/* Global Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <motion.div 
            className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-[0.05] bg-[#D946EF]"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
         />
         <motion.div 
            className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-[0.05] bg-[#06B6D4]"
            animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
         />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
