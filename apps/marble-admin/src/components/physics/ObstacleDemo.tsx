'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { OBSTACLE_SCENES } from './scenes/obstacleScenes';
import type { SceneBuilder } from './useMatterEngine';

const MatterCanvas = dynamic(
  () => import('./MatterCanvas').then((m) => ({ default: m.MatterCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="w-24 h-24 bg-white/[0.03] rounded-lg animate-pulse" />
    ),
  },
);

interface ObstacleDemoProps {
  id: string;
  color: string;
}

export function ObstacleDemo({ id, color }: ObstacleDemoProps) {
  const sceneBuilder = OBSTACLE_SCENES[id];

  const stableScene = useCallback<SceneBuilder>(
    (engine, world, W, H) => {
      if (sceneBuilder) return sceneBuilder(engine, world, W, H);
      return undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  if (!sceneBuilder) {
    return (
      <div className="w-24 h-24 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden bg-[#060e24] border border-white/[0.06]">
      <MatterCanvas
        width={96}
        height={96}
        sceneBuilder={stableScene}
        fps={30}
        background="transparent"
        pixelRatio={2}
      />
    </div>
  );
}
