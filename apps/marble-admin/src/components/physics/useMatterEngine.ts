'use client';

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export type SceneBuilder = (
  engine: Matter.Engine,
  world: Matter.World,
  width: number,
  height: number,
) => void | (() => void);

interface UseMatterEngineOptions {
  width: number;
  height: number;
  sceneBuilder: SceneBuilder;
  fps?: number;
  background?: string;
  gravity?: { x: number; y: number };
  pixelRatio?: number;
}

export function useMatterEngine(options: UseMatterEngineOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const {
      width,
      height,
      sceneBuilder,
      fps = 30,
      background = 'transparent',
      gravity = { x: 0, y: 1 },
      pixelRatio: pr = 1,
    } = options;

    const engine = Matter.Engine.create({
      gravity,
      positionIterations: 6,
      velocityIterations: 4,
    });

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width,
        height,
        pixelRatio: pr,
        background,
        wireframes: false,
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
      } as any,
    });

    const sceneCleanup = sceneBuilder(engine, engine.world, width, height);

    const runner = Matter.Runner.create({ delta: 1000 / fps } as any);

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    // Pause when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        (runner as any).enabled = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      if (typeof sceneCleanup === 'function') sceneCleanup();
      Matter.Runner.stop(runner);
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
      Matter.Composite.clear(engine.world, false);
    };
  }, [options.width, options.height, options.sceneBuilder, options.fps]);

  return { canvasRef };
}
