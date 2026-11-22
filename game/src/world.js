// The heist simulation: one thief, three patrolling guards, two sweeping cameras,
// one vault, one way out. Everything runs in fixed 1/60 s steps; the renderer only
// paints what this module computes. Guards and cameras are fully deterministic —
// the same inputs always give the same world, which is what makes the screenshots
// reproducible.

import { ALARM, CAMERA, FIELD, GUARD, LOOT, SNEAK_RANGE, THIEF, TIME_BONUS, TOOLS } from './config.js';
import { LEVEL } from './level.js';

export const EVENT_SPOTTED = 1;
export const EVENT_LOOT = 2;
export const EVENT_CRACK = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_BUSTED = 16;
export const EVENT_WIN = 32;
export const EVENT_TOOL = 64;

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Smallest signed angle from `from` to `to`, in (-PI, PI]. */
function angleDiff(from, to) {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d <= -Math.PI) d += TWO_PI;
  return d;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d2 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  const d3 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d4 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when the segment (x1,y1)-(x2,y2) touches rectangle r. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const { x, y, w, h } = r;
  return (
    segmentsCross(x1, y1, x2, y2, x, y, x + w, y) ||
    segmentsCross(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segmentsCross(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segmentsCross(x1, y1, x2, y2, x, y + h, x, y)
  );
}

/** True when the segment passes through the circle (cx, cy, r). */
function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(px - cx, py - cy) < r;
}

/** Push a circle of `radius` out of rectangle r; returns true when it overlapped. */
function pushOutOfRect(body, r, radius) {
  const cx = clamp(body.x, r.x, r.x + r.w);
  const cy = clamp(body.y, r.y, r.y + r.h);
  const dx = body.x - cx;
  const dy = body.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return false;
  if (d2 === 0) {
    // Centre inside the rectangle: push out along the shallowest side.
    const left = body.x - r.x;
    const right = r.x + r.w - body.x;
    const top = body.y - r.y;
    const bottom = r.y + r.h - body.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) body.x = r.x - radius;
    else if (min === right) body.x = r.x + r.w + radius;
    else if (min === top) body.y = r.y - radius;
    else body.y = r.y + r.h + radius;
    return true;
  }
  const d = Math.sqrt(d2);
  body.x = cx + (dx / d) * radius;
  body.y = cy + (dy / d) * radius;
  return true;
}

function makeGuard(def, index) {
  const first = def.waypoints[0];
  const second = def.waypoints[1];
  return {
    name: def.name,
    index,
    x: first.x,
    y: first.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    waypoints: def.waypoints,
    wp: 1,
    state: 'patrol', // patrol | investigate | chase
    pauseT: 0,
    lookT: 0,
    loseT: 0,
    lastSeen: { x: first.x, y: first.y },
    seesThief: false,
    spotted: false,
  };
}

function makeCamera(def, index) {
  return {
    index,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    phase: def.phase,
    angle: def.baseAngle,
    disabledT: 0,
    seesThief: false,
  };
}

/**
 * Would a guard or a camera see a thief standing at (x, y) right now, at the
 * given sneak state? Used by the screenshot stager so its thief waits for a
 * cone to pass instead of walking into it. Mirrors canSee's geometry, but for
 * an arbitrary point instead of the thief.
 */
export function pointIsWatched(state, x, y, sneak) {
  for (const guard of state.guards) {
    const reach = GUARD.range * (sneak ? SNEAK_RANGE : 1);
    if (distance(guard.x, guard.y, x, y) > reach) continue;
    if (Math.abs(angleDiff(guard.angle, Math.atan2(y - guard.y, x - guard.x))) > GUARD.halfAngle) continue;
    if (sightBlocked(state, guard.x, guard.y, x, y)) continue;
    return true;
  }
  for (const cam of state.cameras) {
    if (cam.disabledT > 0) continue;
    const reach = CAMERA.range * (sneak ? SNEAK_RANGE : 1);
    if (distance(cam.x, cam.y, x, y) > reach) continue;
    if (Math.abs(angleDiff(cam.angle, Math.atan2(y - cam.y, x - cam.x))) > CAMERA.halfAngle) continue;
    if (sightBlocked(state, cam.x, cam.y, x, y)) continue;
    return true;
  }
  return false;
}

/** True when smoke or an obstacle sits between (x1,y1) and (x2,y2). */
function sightBlocked(state, x1, y1, x2, y2) {
  for (const s of state.smokes) {
    if (segmentHitsCircle(x1, y1, x2, y2, s.x, s.y, s.r)) return true;
  }
  for (const o of LEVEL.obstacles) {
    if (segmentHitsRect(x1, y1, x2, y2, o)) return true;
  }
  return false;
}

export function createWorld() {
  const world = {
    state: null,
    reset,
    step,
  };
  reset();
  return world;

  function reset() {
    world.state = {
      time: 0,
      alarm: 0,
      score: 0,
      toolsUsed: 0,
      gemsGot: 0,
      hasLoot: false,
      crack: 0,
      over: false,
      won: false,
      loseKind: '',
      spottedOnce: false,
      thief: {
        x: LEVEL.entry.x,
        y: LEVEL.entry.y,
        angle: -Math.PI / 2,
        sneaking: false,
        moving: false,
      },
      guards: LEVEL.guards.map(makeGuard),
      cameras: LEVEL.cameras.map(makeCamera),
      gems: LEVEL.gems.map((g) => ({ ...g, taken: false })),
      smokes: [],
      tools: { smoke: TOOLS.smoke.count, emp: TOOLS.emp.count, selected: 'smoke' },
      hint: '',
    };
  }

  /** Can `viewer` (with a cone of `range` and `halfAngle` around `angle`) see the thief? */
  function canSee(state, viewer, range, halfAngle, angle) {
    const thief = state.thief;
    const reach = range * (thief.sneaking ? SNEAK_RANGE : 1);
    const d = distance(viewer.x, viewer.y, thief.x, thief.y);
    if (d > reach) return false;
    if (Math.abs(angleDiff(angle, Math.atan2(thief.y - viewer.y, thief.x - viewer.x))) > halfAngle) return false;
    // Smoke hides the thief: inside a cloud, or the sight line crossing one.
    for (const s of state.smokes) {
      if (distance(thief.x, thief.y, s.x, s.y) < s.r) return false;
      if (segmentHitsCircle(viewer.x, viewer.y, thief.x, thief.y, s.x, s.y, s.r)) return false;
    }
    for (const o of LEVEL.obstacles) {
      if (segmentHitsRect(viewer.x, viewer.y, thief.x, thief.y, o)) return false;
    }
    return true;
  }

  function moveBody(state, body, dx, dy, radius) {
    body.x += dx;
    for (const o of LEVEL.obstacles) pushOutOfRect(body, o, radius);
    body.x = clamp(body.x, FIELD.wall + radius, FIELD.width - FIELD.wall - radius);
    body.y += dy;
    for (const o of LEVEL.obstacles) pushOutOfRect(body, o, radius);
    body.y = clamp(body.y, FIELD.wall + radius, FIELD.height - FIELD.wall - radius);
  }

  function moveToward(state, body, tx, ty, speed, dt, radius) {
    const dx = tx - body.x;
    const dy = ty - body.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const stepLen = Math.min(d, speed * dt);
    moveBody(state, body, (dx / d) * stepLen, (dy / d) * stepLen, radius);
    body.angle = Math.atan2(dy, dx);
    return d - stepLen < 2;
  }

  function step(dt, input, demo) {
    const state = world.state;
    if (state.over) return 0;
    let events = 0;
    state.time += dt;

    // --- thief ---
    const thief = state.thief;
    thief.sneaking = !!input.sneak;
    const cracking = !!input.crack && !state.hasLoot && distance(thief.x, thief.y, LEVEL.vault.x, LEVEL.vault.y) < THIEF.useRange;
    let mx = 0;
    let my = 0;
    if (!demo && !cracking) {
      mx = input.dx || 0;
      my = input.dy || 0;
      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len;
        my /= len;
        const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.speed;
        moveBody(state, thief, mx * speed * dt, my * speed * dt, THIEF.radius);
        thief.angle = Math.atan2(my, mx);
        thief.moving = true;
      } else {
        thief.moving = false;
      }
    } else {
      thief.moving = false;
    }

    // --- vault cracking ---
    if (cracking) {
      state.crack += dt;
      if (state.crack >= THIEF.crackTime) {
        state.crack = 0;
        state.hasLoot = true;
        state.score += LOOT.vault;
        events |= EVENT_CRACK;
      }
    } else {
      state.crack = Math.max(0, state.crack - dt * 2);
    }

    // --- gems ---
    for (const gem of state.gems) {
      if (!gem.taken && distance(thief.x, thief.y, gem.x, gem.y) < 26) {
        gem.taken = true;
        state.gemsGot += 1;
        state.score += LOOT.gem;
        events |= EVENT_LOOT;
      }
    }

    // --- tools ---
    if (input.toolSelect === 'smoke' || input.toolSelect === 'emp') {
      state.tools.selected = input.toolSelect;
    }
    if (input.useTool) {
      if (state.tools.selected === 'smoke' && state.tools.smoke > 0) {
        state.tools.smoke -= 1;
        state.toolsUsed += 1;
        state.score = Math.max(0, state.score - TOOLS.smoke.cost);
        state.smokes.push({ x: thief.x, y: thief.y, r: TOOLS.smoke.radius, t: TOOLS.smoke.duration });
        events |= EVENT_TOOL;
      } else if (state.tools.selected === 'emp' && state.tools.emp > 0) {
        let best = null;
        let bestD = TOOLS.emp.range;
        for (const cam of state.cameras) {
          const d = distance(thief.x, thief.y, cam.x, cam.y);
          if (d < bestD) {
            bestD = d;
            best = cam;
          }
        }
        if (best) {
          state.tools.emp -= 1;
          state.toolsUsed += 1;
          state.score = Math.max(0, state.score - TOOLS.emp.cost);
          best.disabledT = TOOLS.emp.duration;
          events |= EVENT_TOOL;
        }
      }
    }
    for (let i = state.smokes.length - 1; i >= 0; i -= 1) {
      state.smokes[i].t -= dt;
      if (state.smokes[i].t <= 0) state.smokes.splice(i, 1);
    }

    // --- cameras ---
    let seenByCamera = false;
    for (const cam of state.cameras) {
      if (cam.disabledT > 0) {
        cam.disabledT -= dt;
        cam.seesThief = false;
        continue;
      }
      cam.angle = cam.baseAngle + Math.sin((state.time * TWO_PI) / CAMERA.sweepPeriod + cam.phase) * CAMERA.sweepArc;
      cam.seesThief = !demo && canSee(state, cam, CAMERA.range, CAMERA.halfAngle, cam.angle);
      if (cam.seesThief) seenByCamera = true;
    }

    // --- guards ---
    let seenByGuard = false;
    for (const guard of state.guards) {
      guard.seesThief = !demo && canSee(state, guard, GUARD.range, GUARD.halfAngle, guard.angle);
      if (guard.seesThief) {
        seenByGuard = true;
        guard.lastSeen = { x: thief.x, y: thief.y };
        guard.loseT = 0;
        guard.spotted = true;
        guard.state = state.alarm >= ALARM.chaseAt ? 'chase' : 'investigate';
        if (!state.spottedOnce) {
          state.spottedOnce = true;
          events |= EVENT_SPOTTED;
        }
      } else {
        guard.loseT += dt;
      }

      if (guard.state === 'chase') {
        if (guard.loseT > 4) guard.state = 'investigate';
        else moveToward(state, guard, thief.x, thief.y, GUARD.chaseSpeed, dt, GUARD.radius);
      } else if (guard.state === 'investigate') {
        const arrived = moveToward(state, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.patrolSpeed * 1.4, dt, GUARD.radius);
        if (arrived) {
          guard.lookT += dt;
          guard.angle += dt * 1.6;
          if (guard.lookT > 2) {
            guard.lookT = 0;
            guard.state = 'patrol';
          }
        } else {
          guard.lookT = 0;
        }
      } else {
        // Patrol: walk the waypoints, pausing at each to sweep the cone.
        if (guard.pauseT > 0) {
          guard.pauseT -= dt;
          const base = Math.atan2(
            guard.waypoints[guard.wp].y - guard.y,
            guard.waypoints[guard.wp].x - guard.x,
          );
          guard.angle = base + Math.sin(((GUARD.scanPause - guard.pauseT) / GUARD.scanPause) * Math.PI * 2) * GUARD.scanArc;
        } else {
          const target = guard.waypoints[guard.wp];
          const arrived = moveToward(state, guard, target.x, target.y, GUARD.patrolSpeed, dt, GUARD.radius);
          if (arrived) {
            guard.wp = (guard.wp + 1) % guard.waypoints.length;
            guard.pauseT = GUARD.scanPause;
          }
        }
      }

      // Caught: a guard close enough to grab the thief.
      if (!demo && distance(guard.x, guard.y, thief.x, thief.y) < GUARD.catchRange) {
        state.over = true;
        state.won = false;
        state.loseKind = 'caught';
        return events | EVENT_CAUGHT;
      }
    }

    // --- alarm ---
    if (seenByCamera || seenByGuard) {
      const rate = Math.max(seenByGuard ? ALARM.guardRate : 0, seenByCamera ? ALARM.cameraRate : 0);
      state.alarm = Math.min(ALARM.max, state.alarm + rate * dt);
      if (state.alarm >= ALARM.max) {
        state.over = true;
        state.won = false;
        state.loseKind = 'busted';
        return events | EVENT_BUSTED;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    }

    // --- exit ---
    const exitD = distance(thief.x, thief.y, LEVEL.exit.x, LEVEL.exit.y);
    if (exitD < 44) {
      if (state.hasLoot) {
        state.over = true;
        state.won = true;
        state.score += Math.max(0, Math.round(TIME_BONUS.start - state.time * TIME_BONUS.perSecond));
        return events | EVENT_WIN;
      }
      state.hint = 'Locked — crack the vault first.';
    } else if (distance(thief.x, thief.y, LEVEL.vault.x, LEVEL.vault.y) < THIEF.useRange && !state.hasLoot) {
      state.hint = 'Hold E to crack the vault.';
    } else {
      state.hint = '';
    }

    return events;
  }
}
