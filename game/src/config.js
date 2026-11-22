// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
// "Velvet Vault" — a midnight museum heist: one big gallery, three patrolling guards,
// two sweeping cameras, one vault, one way out.

export const FIELD = { width: 1280, height: 720, wall: 24 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 14,
  speed: 210,
  sneakSpeed: 115,
  /** Seconds of holding E beside the vault to crack it. */
  crackTime: 2.0,
  /** How close the thief must stand to crack the vault or reach the exit. */
  useRange: 64,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  chaseSpeed: 152,
  /** Vision cone reach in pixels; sneaking shortens it (see SNEAK_RANGE). */
  range: 230,
  /** Half-angle of the vision cone, in radians. */
  halfAngle: 0.61,
  /** Seconds a guard pauses at a waypoint, sweeping its cone. */
  scanPause: 1.2,
  /** How far, in radians, the cone sweeps while scanning. */
  scanArc: 0.8,
  /** Touch distance that catches the thief. */
  catchRange: 28,
};

/** Sneaking multiplies a guard or camera's effective cone range by this. */
export const SNEAK_RANGE = 0.7;

export const CAMERA = {
  range: 260,
  halfAngle: 0.52,
  /** Seconds for one full sweep back and forth. */
  sweepPeriod: 4.5,
  /** How far, in radians, the camera sweeps either side of its base angle. */
  sweepArc: 0.78,
};

export const ALARM = {
  /** Points per second while a guard sees the thief. */
  guardRate: 30,
  /** Points per second while a camera sees the thief. */
  cameraRate: 40,
  /** Points per second the meter falls while nobody sees the thief. */
  decay: 12,
  /** At this level guards stop patrolling and hunt the thief. */
  chaseAt: 70,
  max: 100,
};

export const TOOLS = {
  smoke: { count: 2, radius: 90, duration: 5, cost: 25 },
  emp: { count: 1, duration: 10, range: 450, cost: 25 },
};

export const LOOT = { vault: 500, gem: 100 };

/** Time bonus at the getaway: 300 points, shrinking 2 a second. */
export const TIME_BONUS = { start: 300, perSecond: 2 };

export const PALETTE = {
  backdrop: '#0d0f14',
  floor: '#23202a',
  floorDark: '#1d1a24',
  carpet: '#5a1f2b',
  carpetEdge: '#8a6d2f',
  wall: '#3a3345',
  wallTop: '#4a4356',
  gold: '#c9a227',
  goldDim: '#8a6d2f',
  caseGlass: '#7fb3c8',
  caseFrame: '#6b5a2e',
  crate: '#7a5a34',
  statue: '#9aa0ad',
  bench: '#4a3a28',
  vault: '#2e3440',
  vaultGlow: '#ffd75e',
  exit: '#2fae5f',
  exitDark: '#1d7a40',
  thief: '#b06fd6',
  thiefDark: '#7d3fa8',
  guard: '#3f6fb5',
  guardAlert: '#e5534b',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneAlert: 'rgba(229, 83, 75, 0.28)',
  camera: '#e8862e',
  cameraOff: '#5a5f6a',
  smoke: 'rgba(180, 185, 195, 0.55)',
  gem: '#5ef2c8',
  panel: '#1a1d26',
  panelEdge: '#2e3342',
  text: '#eef1f5',
  muted: '#9aa1b0',
  alarmLow: '#3fbf6f',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';
