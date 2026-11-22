// The screenshot scenes behind ?shot=cover|play|stealth|getaway. Each one plays the
// real rules forward from a fresh world, steered by a scripted thief, so the frame
// is what a real game looks like — never posed by hand. Guards and cameras are
// deterministic, so the same shot always gives the same frame.
//
// The thief is not a blind playback: before each step it checks whether the next
// step would walk into a guard's or a camera's cone (world.pointIsWatched) and
// waits for the patrol to pass instead. A thief that is already seen runs at full
// speed rather than sneaking. Each scene stops the moment its frame is ready —
// the cover and stealth shots after the thief has held still for two seconds, the
// play shot halfway through the vault crack — instead of at a fixed time, so the
// crack bar and the alarm are caught mid-action.
//
// The routes were walked through against the patrols before they were written:
// Rocco owns the JEWELS wing up top, so every route hugs the west wall at x 70
// and sneaks past his scan pauses; the vault sits under camera C1's sweep, so the
// approach drops smoke at (1000,120); the getaway EMPs camera C2 before the exit
// corridor. A route that is seen or caught shows up here as a lose frame, which
// is how the first attempts were caught and fixed.
import { STEP, THIEF } from './config.js';
import { LEVEL } from './level.js';
import { pointIsWatched } from './world.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_WIN } from './render.js';

/**
 * A point is {x, y} plus any of:
 *   sneak — move at sneak speed (cones reach 0.7x as far)
 *   wait  — hold here for the rest of the scene
 *   crack — hold E here for this many seconds (the vault)
 *   smoke — drop a smoke bomb on arrival
 *   emp   — fire the EMP on arrival
 */
const PATHS = {
  cover: {
    seconds: 40,
    stop: 'hold',
    holdSeconds: 2,
    points: [
      { x: 70, y: 480, sneak: true },
      { x: 70, y: 300, sneak: true },
      { x: 150, y: 400, sneak: true },
      { x: 300, y: 400, sneak: true },
      { x: 300, y: 250, sneak: true },
      { x: 480, y: 250, sneak: true },
      { x: 720, y: 270, wait: true },
    ],
  },
  play: {
    seconds: 40,
    stop: 'crack',
    crackAt: 1.0,
    points: [
      { x: 70, y: 480, sneak: true },
      { x: 70, y: 300, sneak: true },
      { x: 150, y: 400, sneak: true },
      { x: 300, y: 400, sneak: true },
      { x: 480, y: 280, sneak: true },
      { x: 700, y: 250, sneak: true },
      { x: 900, y: 160, sneak: true, smoke: true },
      { x: 1090, y: 120, smoke: true, crack: 1.4 },
    ],
  },
  stealth: {
    seconds: 40,
    stop: 'hold',
    holdSeconds: 2,
    points: [
      { x: 70, y: 480, sneak: true },
      { x: 70, y: 300, sneak: true },
      { x: 150, y: 400, sneak: true },
      { x: 300, y: 400, sneak: true },
      { x: 480, y: 400, sneak: true },
      { x: 520, y: 400, sneak: true },
      { x: 520, y: 620, sneak: true },
      { x: 700, y: 620, sneak: true },
      { x: 1040, y: 600, wait: true },
    ],
  },
  getaway: {
    seconds: 60,
    stop: 'win',
    points: [
      { x: 70, y: 480, sneak: true },
      { x: 70, y: 300, sneak: true },
      { x: 150, y: 400, sneak: true },
      { x: 300, y: 400, sneak: true },
      { x: 480, y: 280, sneak: true },
      { x: 700, y: 250, sneak: true },
      { x: 900, y: 160, sneak: true, smoke: true },
      { x: 1090, y: 120, smoke: true, crack: 2.4 },
      { x: 1180, y: 300, emp: true },
      { x: 1190, y: 620, wait: true },
    ],
  },
};

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Any unknown name stages the cover.
 */
export function stageShot(name, world) {
  const path = PATHS[name] || PATHS.cover;
  world.reset();
  const state = world.state;
  let pointIndex = 0;
  let crackT = 0;
  let waited = 0;
  let holdT = 0;
  const fired = new Set();
  const total = Math.floor(path.seconds / STEP);
  for (let i = 0; i < total; i += 1) {
    if (state.over) break;
    if (path.stop === 'crack' && state.crack >= (path.crackAt ?? 1)) break;
    const point = path.points[pointIndex];
    let dx = 0;
    let dy = 0;
    let sneak = false;
    let crack = false;
    let useTool = false;
    let toolSelect = null;
    // Spotted: keep moving toward the objective, at full speed, instead of
    // falling back. A guard investigates the last place it saw the thief, so a
    // thief that keeps moving is gone by the time the guard arrives — while a
    // thief that retreats is re-spotted at the fallback point (tried both the
    // last waypoint and the entry; the guard walks to the last seen spot and
    // the fallback sits inside its search). The alarm only climbs while the
    // thief is actually in a cone, and it falls as soon as it is out of one.
    const seen = state.guards.some((g) => g.seesThief) || state.cameras.some((c) => c.seesThief);
    const target = point;
    if (target) {
      const px = target.x - state.thief.x;
      const py = target.y - state.thief.y;
      const d = Math.hypot(px, py);
      if (d < 14) {
        holdT += STEP;
        // Key the tool by the point the thief is standing on, not the index
        // after advancing: the previous point's tool used the incremented
        // index, which silently swallowed this point's tool.
        const key = pointIndex;
        if (target === point && point.crack && crackT < point.crack) {
          crack = true;
          crackT += STEP;
        } else if (target === point && point.wait) {
          if (path.stop === 'hold' && holdT >= (path.holdSeconds ?? 2)) break;
        } else if (target === point) {
          pointIndex += 1;
          holdT = 0;
        }
        if (target === point && !fired.has(key) && (point.smoke || point.emp)) {
          fired.add(key);
          useTool = true;
          toolSelect = point.smoke ? 'smoke' : 'emp';
        }
      } else {
        holdT = 0;
        // A guard about to walk into the thief: step away from it at full
        // speed, whatever the route says. Waiting in a guard's path while the
        // way ahead is blocked is how a careful thief gets grabbed.
        let nearest = null;
        let nearestD = 60;
        for (const g of state.guards) {
          const gd = Math.hypot(g.x - state.thief.x, g.y - state.thief.y);
          if (gd < nearestD) {
            nearestD = gd;
            nearest = g;
          }
        }
        let evading = false;
        let ux = px / d;
        let uy = py / d;
        if (nearest) {
          evading = true;
          const ex = state.thief.x - nearest.x;
          const ey = state.thief.y - nearest.y;
          const ed = Math.hypot(ex, ey) || 1;
          ux = ex / ed;
          uy = ey / ed;
        }
        sneak = !evading && !seen && !!target.sneak;
        const speed = sneak ? THIEF.sneakSpeed : THIEF.speed;
        const nx = state.thief.x + ux * speed * STEP;
        const ny = state.thief.y + uy * speed * STEP;
        // Sample the path ahead, not just the next step: a step can look safe
        // because a case blocks the sight line, while the step after it walks
        // out of the case's shadow straight into a cone — and a single far
        // lookahead can overshoot the danger zone entirely. Checking every
        // quarter-second out to 1.5 s catches the cone wherever it sits.
        let blocked = pointIsWatched(state, nx, ny, sneak);
        for (let s = 0.25; s <= 1.5 && !blocked; s += 0.25) {
          // Never sample past the target itself: the points beyond it can be
          // watched even when the target is safe, and the thief would never arrive.
          const sd = Math.min(speed * s, d);
          blocked = pointIsWatched(state, state.thief.x + ux * sd, state.thief.y + uy * sd, sneak);
        }
        if (evading || !blocked || seen) {
          dx = ux;
          dy = uy;
          waited = 0;
        } else {
          // A cone covers the next step: wait for the patrol to pass. After ten
          // seconds of waiting, push on anyway rather than stalling the scene.
          waited += STEP;
          if (waited > 10) {
            dx = ux;
            dy = uy;
            waited = 0;
          }
        }
      }
    }
    world.step(STEP, { dx, dy, sneak, crack, useTool, toolSelect }, false);
  }
  if (state.over) {
    return { screen: state.won ? SCREEN_WIN : SCREEN_LOSE, best: state.score };
  }
  return { screen: SCREEN_PLAY, best: state.score };
}
