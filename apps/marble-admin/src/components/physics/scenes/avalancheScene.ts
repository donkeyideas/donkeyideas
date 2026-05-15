import Matter from 'matter-js';
import type { SceneBuilder } from '../useMatterEngine';

const MARBLE_COLOR = '#ffc220';
const PEG_COLOR = 'rgba(110, 193, 255, 0.6)';
const WALL_COLOR = 'rgba(255, 255, 255, 0.08)';
const RAMP_COLOR = 'rgba(255, 255, 255, 0.12)';

export const avalancheScene: SceneBuilder = (_engine, world, W, H) => {
  // Walls
  const wallOpts = { isStatic: true, render: { fillStyle: WALL_COLOR } } as any;
  Matter.Composite.add(world, [
    Matter.Bodies.rectangle(W / 2, H + 25, W + 50, 50, wallOpts),
    Matter.Bodies.rectangle(-25, H / 2, 50, H + 50, wallOpts),
    Matter.Bodies.rectangle(W + 25, H / 2, 50, H + 50, wallOpts),
  ]);

  // Peg grid (avalanche pattern: offset rows)
  const pegRadius = 5;
  const cols = 10;
  const rows = 8;
  const spacingX = W / (cols + 1);
  const spacingY = (H - 80) / (rows + 1);
  const startY = 60;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : spacingX / 2;
    const numPegs = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < numPegs; col++) {
      const x = spacingX + col * spacingX + offset;
      const y = startY + row * spacingY;
      Matter.Composite.add(
        world,
        Matter.Bodies.circle(x, y, pegRadius, {
          isStatic: true,
          friction: 0.005,
          restitution: 0.3,
          render: { fillStyle: PEG_COLOR } as any,
        }),
      );
    }
  }

  // Angled ramps at bottom
  const rampOpts = {
    isStatic: true,
    friction: 0.005,
    restitution: 0.3,
    render: { fillStyle: RAMP_COLOR } as any,
  };
  Matter.Composite.add(world, [
    Matter.Bodies.rectangle(W * 0.25, H - 30, W * 0.4, 6, { ...rampOpts, angle: 0.15 }),
    Matter.Bodies.rectangle(W * 0.75, H - 30, W * 0.4, 6, { ...rampOpts, angle: -0.15 }),
  ]);

  function spawnMarble() {
    const x = 40 + Math.random() * (W - 80);
    const marble = Matter.Bodies.circle(x, -10, 7, {
      friction: 0.00001,
      frictionAir: 0.006,
      frictionStatic: 0.1,
      restitution: 0.52,
      density: 0.001,
      render: {
        fillStyle: MARBLE_COLOR,
        strokeStyle: 'rgba(255, 194, 32, 0.4)',
        lineWidth: 1,
      } as any,
    });
    Matter.Body.setVelocity(marble, {
      x: (Math.random() - 0.5) * 2,
      y: 1 + Math.random(),
    });
    Matter.Composite.add(world, marble);
  }

  // Initial batch
  for (let i = 0; i < 5; i++) {
    setTimeout(() => spawnMarble(), i * 200);
  }

  // Continuous spawning
  const spawnInterval = setInterval(() => {
    spawnMarble();
    // Remove off-screen marbles and cap at 25
    const bodies = Matter.Composite.allBodies(world);
    const dynamic = bodies.filter((b) => !b.isStatic);
    dynamic.forEach((b) => {
      if (b.position.y > H + 60) Matter.Composite.remove(world, b);
    });
    if (dynamic.length > 25) {
      Matter.Composite.remove(world, dynamic[0]);
    }
  }, 800);

  return () => clearInterval(spawnInterval);
};
