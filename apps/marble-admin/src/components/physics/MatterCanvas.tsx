'use client';

import { useMatterEngine, type SceneBuilder } from './useMatterEngine';

interface MatterCanvasProps {
  width: number;
  height: number;
  sceneBuilder: SceneBuilder;
  fps?: number;
  background?: string;
  gravity?: { x: number; y: number };
  pixelRatio?: number;
  className?: string;
}

export function MatterCanvas({
  width,
  height,
  sceneBuilder,
  fps = 30,
  background = 'transparent',
  gravity,
  pixelRatio,
  className = '',
}: MatterCanvasProps) {
  const { canvasRef } = useMatterEngine({
    width,
    height,
    sceneBuilder,
    fps,
    background,
    gravity,
    pixelRatio,
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
