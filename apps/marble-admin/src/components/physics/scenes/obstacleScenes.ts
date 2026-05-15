import Matter from 'matter-js';
import type { SceneBuilder } from '../useMatterEngine';

/* ------------------------------------------------------------------ */
/*  Shared helpers — all sizes relative to W/H for any canvas size     */
/* ------------------------------------------------------------------ */

const MARBLE_OPTS: (color?: string) => Matter.IBodyDefinition = (color) => ({
  friction: 0.00001,
  frictionAir: 0.006,
  frictionStatic: 0.1,
  restitution: 0.52,
  density: 0.001,
  label: 'demo-marble',
  render: {
    fillStyle: color || '#ffc220',
    strokeStyle: color ? `${color}88` : 'rgba(255,194,32,0.4)',
    lineWidth: 1,
  } as any,
});

function addWalls(world: Matter.World, W: number, H: number) {
  const vis = { isStatic: true, render: { fillStyle: 'rgba(255,255,255,0.08)' } as any };
  const invis = { isStatic: true, render: { visible: false } as any };
  Matter.Composite.add(world, [
    Matter.Bodies.rectangle(W / 2, H + 25, W + 50, 50, vis),   // floor
    Matter.Bodies.rectangle(-25, H / 2, 50, H + 50, invis),    // left
    Matter.Bodies.rectangle(W + 25, H / 2, 50, H + 50, invis), // right
    Matter.Bodies.rectangle(W / 2, -25, W + 50, 50, invis),    // ceiling
  ]);
}

function marbleR(W: number) { return Math.max(3, W * 0.06); }

function createMarble(x: number, y: number, W: number): Matter.Body {
  return Matter.Bodies.circle(x, y, marbleR(W), MARBLE_OPTS());
}

function autoRespawn(world: Matter.World, W: number, H: number): () => void {
  const interval = setInterval(() => {
    const bodies = Matter.Composite.allBodies(world);
    bodies.forEach((b) => {
      if (!b.isStatic && b.label === 'demo-marble') {
        if (b.position.y > H + 15 || b.position.x < -15 || b.position.x > W + 15) {
          Matter.Body.setPosition(b, { x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: -5 });
          Matter.Body.setVelocity(b, { x: (Math.random() - 0.5) * 1.5, y: 0.8 });
        }
      }
    });
  }, 400);
  return () => clearInterval(interval);
}

/* ------------------------------------------------------------------ */
/*  Scene builders                                                     */
/* ------------------------------------------------------------------ */

/* ---- PENDULUM ---- */
export const pendulumScene: SceneBuilder = (engine, world, W, H) => {
  addWalls(world, W, H);
  const anchorX = W / 2;
  const anchorY = H * 0.08;
  const length = H * 0.55;
  const bobR = W * 0.1;
  const bob = Matter.Bodies.circle(anchorX, anchorY + length, bobR, {
    density: 0.008,
    restitution: 0.8,
    friction: 0.005,
    frictionAir: 0.003,
    render: { fillStyle: 'rgba(231,76,60,0.85)', strokeStyle: '#e74c3c', lineWidth: 1 } as any,
    label: 'pendulum-bob',
  });
  const constraint = Matter.Constraint.create({
    pointA: { x: anchorX, y: anchorY },
    bodyB: bob,
    length,
    stiffness: 1,
    damping: 0,
    render: { strokeStyle: 'rgba(255,255,255,0.25)', lineWidth: 1 } as any,
  });
  Matter.Composite.add(world, [bob, constraint]);
  Matter.Body.setVelocity(bob, { x: 4, y: 0 });

  const marble = createMarble(W * 0.75, H * 0.1, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- TRAMPOLINE ---- */
export const trampolineScene: SceneBuilder = (engine, world, W, H) => {
  addWalls(world, W, H);
  const padW = W * 0.7;
  const padH = H * 0.06;
  const pad = Matter.Bodies.rectangle(W / 2, H - H * 0.15, padW, padH, {
    isStatic: true,
    restitution: 0.5,
    friction: 0.005,
    chamfer: { radius: 2 },
    render: { fillStyle: 'rgba(46,204,113,0.75)', strokeStyle: '#2ecc71', lineWidth: 1 } as any,
    label: 'trampoline',
  });
  Matter.Composite.add(world, pad);

  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair: any) => {
      const { bodyA, bodyB } = pair;
      let m: Matter.Body | null = null;
      if (bodyA.label === 'trampoline' && bodyB.label === 'demo-marble') m = bodyB;
      else if (bodyB.label === 'trampoline' && bodyA.label === 'demo-marble') m = bodyA;
      if (m) {
        Matter.Body.applyForce(m, m.position, {
          x: (Math.random() - 0.5) * 0.001 * m.mass,
          y: -0.005 * m.mass,
        });
      }
    });
  });

  const marble = createMarble(W / 2, H * 0.1, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- SPEED BURST ---- */
export const speedBurstScene: SceneBuilder = (engine, world, W, H) => {
  addWalls(world, W, H);
  const ramp = Matter.Bodies.rectangle(W / 2, H * 0.45, W * 0.75, H * 0.04, {
    isStatic: true,
    angle: 0.2,
    friction: 0.005,
    restitution: 0.3,
    render: { fillStyle: 'rgba(255,255,255,0.15)' } as any,
  });
  const burst = Matter.Bodies.rectangle(W * 0.68, H * 0.52, W * 0.2, H * 0.1, {
    isStatic: true,
    isSensor: true,
    label: 'speedburst',
    render: { fillStyle: 'rgba(255,194,32,0.35)', strokeStyle: '#ffc220', lineWidth: 1 } as any,
  });
  Matter.Composite.add(world, [ramp, burst]);

  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair: any) => {
      const { bodyA, bodyB } = pair;
      let m: Matter.Body | null = null;
      if (bodyA.label === 'speedburst' && bodyB.label === 'demo-marble') m = bodyB;
      else if (bodyB.label === 'speedburst' && bodyA.label === 'demo-marble') m = bodyA;
      if (m) {
        Matter.Body.applyForce(m, m.position, { x: 0.004 * m.mass, y: -0.001 * m.mass });
      }
    });
  });

  const marble = createMarble(W * 0.15, H * 0.1, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- BALL PIT ---- */
export const ballPitScene: SceneBuilder = (_engine, world, W, H) => {
  addWalls(world, W, H);
  const pitR = Math.max(2.5, W * 0.045);
  const cols = 3;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const ox = r % 2 === 0 ? 0 : W * 0.1;
    for (let c = 0; c < cols; c++) {
      const x = W * 0.2 + c * (W * 0.3) + ox;
      const y = H * 0.25 + r * (H * 0.22);
      Matter.Composite.add(
        world,
        Matter.Bodies.circle(x, y, pitR, {
          density: 0.001,
          restitution: 0.5,
          friction: 0.005,
          frictionAir: 0.01,
          render: { fillStyle: 'rgba(155,89,182,0.7)', strokeStyle: '#9b59b6', lineWidth: 0.5 } as any,
          label: 'pit-ball',
        }),
      );
    }
  }

  const marble = createMarble(W / 2, -5, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- CRADLE ---- */
export const cradleScene: SceneBuilder = (_engine, world, W, H) => {
  addWalls(world, W, H);
  const count = 5;
  const ballRadius = Math.max(4, W * 0.07);
  const spacing = ballRadius * 2.1;
  const length = H * 0.5;
  const anchorY = H * 0.1;
  const bobs: Matter.Body[] = [];

  for (let i = 0; i < count; i++) {
    const ballX = W / 2 - ((count - 1) * spacing) / 2 + i * spacing;
    const bob = Matter.Bodies.circle(ballX, anchorY + length, ballRadius, {
      inertia: Infinity,
      restitution: 1.0,
      friction: 0,
      frictionAir: 0,
      slop: ballRadius * 0.02,
      render: { fillStyle: 'rgba(110,193,255,0.85)', strokeStyle: '#6ec1ff', lineWidth: 1 } as any,
      label: 'cradle-bob',
    });
    const constraint = Matter.Constraint.create({
      pointA: { x: ballX, y: anchorY },
      bodyB: bob,
      length,
      stiffness: 1,
      damping: 0,
      render: { strokeStyle: 'rgba(255,255,255,0.2)', lineWidth: 1 } as any,
    });
    Matter.Composite.add(world, [bob, constraint]);
    bobs.push(bob);
  }
  Matter.Body.translate(bobs[0], { x: -spacing * 1.5, y: -length * 0.15 });

  return undefined;
};

/* ---- WINDMILL ---- */
export const windmillScene: SceneBuilder = (engine, world, W, H) => {
  addWalls(world, W, H);
  const blade = Matter.Bodies.rectangle(W / 2, H * 0.45, W * 0.8, H * 0.05, {
    isStatic: true,
    friction: 0.01,
    restitution: 0.5,
    render: { fillStyle: 'rgba(231,76,60,0.7)', strokeStyle: '#e74c3c', lineWidth: 1 } as any,
    label: 'windmill',
  });
  Matter.Composite.add(world, blade);

  Matter.Events.on(engine, 'beforeUpdate', () => {
    Matter.Body.rotate(blade, 0.03);
  });

  const marble = createMarble(W * 0.7, H * 0.05, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- BUMPER ---- */
export const bumperScene: SceneBuilder = (_engine, world, W, H) => {
  addWalls(world, W, H);
  const b1 = Matter.Bodies.circle(W / 2, H * 0.55, W * 0.15, {
    isStatic: true,
    restitution: 1.2,
    friction: 0.001,
    render: { fillStyle: 'rgba(231,76,60,0.7)', strokeStyle: '#e74c3c', lineWidth: 1.5 } as any,
    label: 'bumper',
  });
  const b2 = Matter.Bodies.circle(W * 0.25, H * 0.3, W * 0.1, {
    isStatic: true,
    restitution: 1.2,
    friction: 0.001,
    render: { fillStyle: 'rgba(231,76,60,0.5)', strokeStyle: '#e74c3c', lineWidth: 1 } as any,
  });
  Matter.Composite.add(world, [b1, b2]);

  const marble = createMarble(W * 0.6, H * 0.05, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- PEG ---- */
export const pegScene: SceneBuilder = (_engine, world, W, H) => {
  addWalls(world, W, H);
  const pegR = Math.max(2, W * 0.035);
  const rows = 4;
  const cols = 4;
  const sx = W / (cols + 1);
  const sy = (H - H * 0.3) / (rows + 1);
  const startY = H * 0.2;

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : sx / 2;
    const pegCount = row % 2 === 0 ? cols : cols - 1;
    for (let col = 0; col < pegCount; col++) {
      Matter.Composite.add(
        world,
        Matter.Bodies.circle(sx + col * sx + offset, startY + row * sy, pegR, {
          isStatic: true,
          friction: 0.001,
          restitution: 0.3,
          render: { fillStyle: 'rgba(110,193,255,0.6)', strokeStyle: '#6ec1ff', lineWidth: 0.5 } as any,
          label: 'peg',
        }),
      );
    }
  }

  const marble = createMarble(W / 2 + (Math.random() - 0.5) * W * 0.3, -3, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ---- SPRING ---- */
export const springScene: SceneBuilder = (engine, world, W, H) => {
  addWalls(world, W, H);
  const spring = Matter.Bodies.rectangle(W * 0.28, H * 0.5, W * 0.3, H * 0.08, {
    isStatic: true,
    isSensor: true,
    label: 'spring',
    render: { fillStyle: 'rgba(46,204,113,0.45)', strokeStyle: '#2ecc71', lineWidth: 1 } as any,
  });
  const ramp = Matter.Bodies.rectangle(W * 0.65, H * 0.35, W * 0.55, H * 0.04, {
    isStatic: true,
    angle: 0.25,
    friction: 0.005,
    restitution: 0.3,
    render: { fillStyle: 'rgba(255,255,255,0.15)' } as any,
  });
  Matter.Composite.add(world, [spring, ramp]);

  Matter.Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair: any) => {
      const { bodyA, bodyB } = pair;
      let m: Matter.Body | null = null;
      if (bodyA.label === 'spring' && bodyB.label === 'demo-marble') m = bodyB;
      else if (bodyB.label === 'spring' && bodyA.label === 'demo-marble') m = bodyA;
      if (m) {
        const toCenter = m.position.x < W / 2 ? 1 : -1;
        Matter.Body.applyForce(m, m.position, {
          x: toCenter * 0.003 * m.mass,
          y: -0.001 * m.mass,
        });
      }
    });
  });

  const marble = createMarble(W * 0.8, H * 0.05, W);
  Matter.Composite.add(world, marble);
  return autoRespawn(world, W, H);
};

/* ------------------------------------------------------------------ */
/*  Scene map                                                          */
/* ------------------------------------------------------------------ */

export const OBSTACLE_SCENES: Record<string, SceneBuilder> = {
  pendulum: pendulumScene,
  trampoline: trampolineScene,
  speedBurst: speedBurstScene,
  ballPit: ballPitScene,
  cradle: cradleScene,
  windmill: windmillScene,
  bumper: bumperScene,
  peg: pegScene,
  spring: springScene,
};
